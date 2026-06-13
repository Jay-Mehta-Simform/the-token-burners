/**
 * analysisService — orchestrates the full Intent Drift pipeline across all three steps.
 *
 * Step 1 (reverse spec) fires on POST /api/analyses.
 * Steps 2+3 (gap analysis + question generation) fire on PATCH /api/analyses/:id/spec.
 * All AI work runs in a fire-and-forget background job; the Analysis row tracks status.
 */

import { prisma } from "../lib/prisma.js";
import { fetchPrDiff } from "./githubService.js";
import { generateReverseSpec } from "./reverseSpecService.js";
import { generateGapAnalysis } from "./gapAnalysisService.js";
import { generateQuestions } from "./questionGenerationService.js";
import { httpError } from "../lib/httpError.js";
import type { GapForQuestionGen } from "../prompts/questionGeneration.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function markFailed(analysisId: string, message: string): Promise<void> {
  await prisma.analysis.update({
    where: { id: analysisId },
    data: { status: "failed", errorMessage: message },
  }).catch(() => {/* swallow — DB might be unavailable */});
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Trigger a new analysis for a PR.
 * Acquires per-PR lock (409 if already analyzing/comparing).
 * Returns immediately with { analysisId }; Step 1 runs in the background.
 */
export async function createAnalysis(
  projectId: string,
  prNumber: number,
  userId: string,
  originalSpec?: string
): Promise<{ analysisId: string }> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw httpError(404, `Project ${projectId} not found.`);

  // Per-PR lock: 409 if an active analysis already exists.
  const existing = await prisma.analysis.findUnique({
    where: { projectId_prNumber: { projectId, prNumber } },
  });
  if (existing && (existing.status === "analyzing" || existing.status === "comparing")) {
    throw httpError(409, `An analysis for PR #${prNumber} is already in progress (status: ${existing.status}).`);
  }

  let analysis;
  if (existing) {
    // Reset an existing completed/failed/ready row in-place.
    await prisma.gap.deleteMany({ where: { analysisId: existing.id } });
    analysis = await prisma.analysis.update({
      where: { id: existing.id },
      data: {
        respondentId: userId,
        prHeadSha: "pending",
        originalSpec: originalSpec ?? null,
        reverseSpec: null,
        status: "analyzing",
        isStale: false,
        errorMessage: null,
        costUsd: null,
        sessionId: null,
        completedAt: null,
      },
    });
  } else {
    analysis = await prisma.analysis.create({
      data: {
        projectId,
        prNumber,
        prHeadSha: "pending",
        respondentId: userId,
        originalSpec: originalSpec ?? null,
        status: "analyzing",
      },
    });
  }

  // Fire and forget — never await this.
  setImmediate(() =>
    runAnalysisPipeline(analysis.id).catch((err) =>
      markFailed(analysis.id, err?.message ?? "Unknown error")
    )
  );

  return { analysisId: analysis.id };
}

/**
 * Provide (or replace) the original spec on a ready analysis.
 * Triggers Steps 2+3 in the background.
 */
export async function provideSpec(
  analysisId: string,
  userId: string,
  spec: string
): Promise<void> {
  const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } });
  if (!analysis) throw httpError(404, "Analysis not found.");
  if (analysis.respondentId !== userId) {
    throw httpError(403, "Only the Respondent can provide the spec.");
  }
  if (analysis.status === "analyzing" || analysis.status === "comparing") {
    throw httpError(409, `Cannot provide spec while analysis is in progress (status: ${analysis.status}).`);
  }
  if (!analysis.reverseSpec) {
    throw httpError(422, "Reverse spec is not ready yet. Wait for status=ready before providing the original spec.");
  }

  // Clear existing gaps so a fresh comparison starts clean.
  await prisma.gap.deleteMany({ where: { analysisId } });

  await prisma.analysis.update({
    where: { id: analysisId },
    data: { originalSpec: spec, status: "comparing", errorMessage: null },
  });

  setImmediate(() =>
    runSpecComparison(analysisId).catch((err) =>
      markFailed(analysisId, err?.message ?? "Unknown error")
    )
  );
}

/**
 * Re-run the full pipeline on the latest commit.
 * Resets the row in-place, clears all gaps/questions.
 */
export async function retriggerAnalysis(
  analysisId: string,
  userId: string
): Promise<void> {
  const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } });
  if (!analysis) throw httpError(404, "Analysis not found.");
  if (analysis.respondentId !== userId) {
    throw httpError(403, "Only the Respondent can retrigger an analysis.");
  }
  if (analysis.status === "analyzing" || analysis.status === "comparing") {
    throw httpError(409, `Analysis is already in progress (status: ${analysis.status}).`);
  }

  await prisma.gap.deleteMany({ where: { analysisId } });
  await prisma.analysis.update({
    where: { id: analysisId },
    data: {
      prHeadSha: "pending",
      reverseSpec: null,
      originalSpec: null,
      status: "analyzing",
      isStale: false,
      errorMessage: null,
      costUsd: null,
      sessionId: null,
      completedAt: null,
    },
  });

  setImmediate(() =>
    runAnalysisPipeline(analysisId).catch((err) =>
      markFailed(analysisId, err?.message ?? "Unknown error")
    )
  );
}

// ---------------------------------------------------------------------------
// Background jobs (never called from controllers directly)
// ---------------------------------------------------------------------------

async function runAnalysisPipeline(analysisId: string): Promise<void> {
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { project: true },
  });
  if (!analysis) return;

  const { project, prNumber, originalSpec } = analysis;
  const repo = project.owner && project.name ? `${project.owner}/${project.name}` : undefined;

  // Step 1: fetch diff and generate reverse spec.
  const diff = await fetchPrDiff(prNumber, repo);
  const { result, meta } = await generateReverseSpec(diff);

  await prisma.analysis.update({
    where: { id: analysisId },
    data: {
      reverseSpec: result.reverse_spec,
      costUsd: meta.costUsd,
      sessionId: meta.sessionId,
      status: originalSpec ? "comparing" : "ready",
    },
  });

  if (originalSpec) {
    await runSpecComparison(analysisId);
  }
}

async function runSpecComparison(analysisId: string): Promise<void> {
  const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } });
  if (!analysis?.reverseSpec || !analysis?.originalSpec) {
    await markFailed(analysisId, "Cannot run spec comparison: reverseSpec or originalSpec is missing.");
    return;
  }

  // Step 2: gap analysis.
  const { gaps: gapRows } = await generateGapAnalysis(analysis.reverseSpec, analysis.originalSpec);

  const createdGaps = await Promise.all(
    gapRows.map((g) =>
      prisma.gap.create({
        data: {
          analysisId,
          gapKey: g.gapKey,
          title: g.title,
          description: g.description,
          type: g.type,
          severity: g.severity,
        },
      })
    )
  );

  // Step 3: question generation.
  const gapsForQuestions: GapForQuestionGen[] = createdGaps.map((g) => ({
    id: g.gapKey,
    title: g.title,
    description: g.description,
    type: g.type as GapForQuestionGen["type"],
    severity: g.severity,
  }));

  const { questions: questionRows } = await generateQuestions(gapsForQuestions);

  const gapKeyToId = new Map(createdGaps.map((g) => [g.gapKey, g.id]));

  await Promise.all(
    questionRows.map((q) => {
      const gapId = gapKeyToId.get(q.gapKey);
      if (!gapId) return Promise.resolve();
      return prisma.question.create({
        data: {
          gapId,
          questionKey: q.questionKey,
          text: q.text,
        },
      });
    })
  );

  await prisma.analysis.update({
    where: { id: analysisId },
    data: { status: "questions_ready" },
  });
}
