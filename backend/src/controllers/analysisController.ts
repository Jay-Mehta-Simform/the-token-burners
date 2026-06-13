import { Response, NextFunction } from "express";
import Joi from "joi";
import { AuthRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import {
  createAnalysis,
  provideSpec,
  retriggerAnalysis,
} from "../services/analysisService.js";
import { getPrHeadSha } from "../services/githubService.js";
import { httpError } from "../lib/httpError.js";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const uuidParam = Joi.object({ id: Joi.string().uuid().required() });

const triggerSchema = Joi.object({
  project_id: Joi.string().uuid().required(),
  pr_number: Joi.number().integer().min(1).required(),
  original_spec: Joi.string().optional(),
});

const specSchema = Joi.object({
  spec: Joi.string().min(1).required(),
});

const answerSchema = Joi.object({
  question_id: Joi.string().uuid().required(),
  answer: Joi.string().min(1).required(),
});

// ---------------------------------------------------------------------------
// Respondent guard
// ---------------------------------------------------------------------------

function assertRespondent(respondentId: string, userId: string): void {
  if (respondentId !== userId) {
    throw httpError(403, "Only the Respondent can perform this action.");
  }
}

// ---------------------------------------------------------------------------
// Markdown export builder (mirrors frontend/src/lib/derive.js#buildMarkdown)
// ---------------------------------------------------------------------------

function buildMarkdown(analysis: {
  prNumber: number;
  reverseSpec: string | null;
  status: string;
  respondent: { name: string | null };
  project: { owner: string | null; name: string };
  gaps: Array<{
    title: string;
    type: string;
    severity: string;
    description: string;
    questions: Array<{ text: string; answer: string | null }>;
  }>;
}): string {
  const repo = analysis.project.owner
    ? `${analysis.project.owner}/${analysis.project.name}`
    : analysis.project.name;

  let md = `# Drift Report — PR #${analysis.prNumber}\n\n`;
  md += `- Repository: ${repo}\n`;
  md += `- Pull Request: #${analysis.prNumber}\n`;
  md += `- Respondent: ${analysis.respondent.name ?? "unknown"}\n`;
  md += `- Status: ${analysis.status}\n\n`;
  md += `## Reverse Spec\n\n${analysis.reverseSpec ?? "(not yet generated)"}\n\n`;
  md += `## Gaps & Decisions\n\n`;

  analysis.gaps.forEach((g, i) => {
    const typeLabel = g.type.replace(/_/g, " ");
    const firstQ = g.questions[0];
    md += `${i + 1}. **${g.title}** (${typeLabel}, ${g.severity})\n`;
    md += `   - ${g.description}\n`;
    md += `   - Q: ${firstQ?.text ?? "(no question)"}\n`;
    md += `   - A: ${firstQ?.answer ?? "(unanswered)"}\n\n`;
  });

  return md;
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/**
 * POST /api/analyses
 * Trigger a new analysis. Returns immediately with { analysis_id }.
 */
export async function triggerAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { error, value } = triggerSchema.validate(req.body);
    if (error) throw httpError(400, error.message);

    const { analysisId } = await createAnalysis(
      value.project_id,
      value.pr_number,
      req.userId!,
      value.original_spec
    );

    res.status(201).json({ analysis_id: analysisId });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analyses/:id
 * Polling endpoint. Returns full analysis with gaps and questions.
 * Also performs stale detection against the current PR head SHA.
 */
export async function getAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { error, value } = uuidParam.validate(req.params);
    if (error) throw httpError(400, error.message);

    const analysis = await prisma.analysis.findUnique({
      where: { id: value.id },
      include: {
        respondent: { select: { id: true, name: true, githubLogin: true, avatarUrl: true } },
        project: { select: { id: true, name: true, owner: true } },
        gaps: {
          orderBy: { createdAt: "asc" },
          include: {
            questions: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (!analysis) throw httpError(404, "Analysis not found.");

    // Stale detection: compare stored SHA against current PR head.
    let isStale = analysis.isStale;
    if (analysis.project.owner && analysis.prHeadSha && analysis.prHeadSha !== "pending") {
      const user = await prisma.user.findUnique({ where: { id: analysis.respondentId } });
      if (user?.oauthToken) {
        const currentSha = await getPrHeadSha(
          user.oauthToken,
          analysis.project.owner,
          analysis.project.name,
          analysis.prNumber
        );
        if (currentSha && currentSha !== analysis.prHeadSha) {
          isStale = true;
          await prisma.analysis.update({ where: { id: value.id }, data: { isStale: true } });
        }
      }
    }

    res.json({
      id: analysis.id,
      status: analysis.status,
      is_stale: isStale,
      error_message: analysis.errorMessage,
      respondent: analysis.respondent,
      reverse_spec: analysis.reverseSpec,
      original_spec: analysis.originalSpec,
      gaps: analysis.gaps.map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        severity: g.severity,
        description: g.description,
        questions: g.questions.map((q) => ({
          id: q.id,
          text: q.text,
          answer: q.answer,
        })),
      })),
      created_at: analysis.createdAt,
      completed_at: analysis.completedAt,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/analyses/:id/spec
 * Provide the original spec. Triggers gap analysis + question generation in background.
 */
export async function provideSpecController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const paramResult = uuidParam.validate(req.params);
    if (paramResult.error) throw httpError(400, paramResult.error.message);

    const bodyResult = specSchema.validate(req.body);
    if (bodyResult.error) throw httpError(400, bodyResult.error.message);

    await provideSpec(paramResult.value.id, req.userId!, bodyResult.value.spec);

    res.status(202).json({ message: "Spec accepted. Gap analysis running in background." });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/analyses/:id/answers
 * Save one answer. Respondent-only.
 */
export async function saveAnswer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const paramResult = uuidParam.validate(req.params);
    if (paramResult.error) throw httpError(400, paramResult.error.message);

    const bodyResult = answerSchema.validate(req.body);
    if (bodyResult.error) throw httpError(400, bodyResult.error.message);

    const analysisId = paramResult.value.id;
    const { question_id, answer } = bodyResult.value;

    const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } });
    if (!analysis) throw httpError(404, "Analysis not found.");
    assertRespondent(analysis.respondentId, req.userId!);

    const question = await prisma.question.findFirst({
      where: { id: question_id, gap: { analysisId } },
    });
    if (!question) throw httpError(404, "Question not found on this analysis.");

    await prisma.question.update({ where: { id: question_id }, data: { answer } });

    res.json({ message: "Answer saved." });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analyses/:id/submit
 * Mark analysis as completed. All questions must be answered. Respondent-only.
 */
export async function submitAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { error, value } = uuidParam.validate(req.params);
    if (error) throw httpError(400, error.message);

    const analysis = await prisma.analysis.findUnique({
      where: { id: value.id },
      include: { gaps: { include: { questions: true } } },
    });
    if (!analysis) throw httpError(404, "Analysis not found.");
    assertRespondent(analysis.respondentId, req.userId!);

    if (analysis.status !== "questions_ready") {
      throw httpError(422, `Cannot submit analysis with status="${analysis.status}". Must be questions_ready.`);
    }

    const allQuestions = analysis.gaps.flatMap((g) => g.questions);
    const unanswered = allQuestions.filter((q) => !q.answer);
    if (unanswered.length > 0) {
      throw httpError(422, `${unanswered.length} question(s) still unanswered. Answer all before submitting.`);
    }

    await prisma.analysis.update({
      where: { id: value.id },
      data: { status: "completed", completedAt: new Date() },
    });

    res.json({ message: "Analysis submitted successfully." });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analyses/:id/export
 * Stream the Decision Record as text/markdown.
 */
export async function exportAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { error, value } = uuidParam.validate(req.params);
    if (error) throw httpError(400, error.message);

    const analysis = await prisma.analysis.findUnique({
      where: { id: value.id },
      include: {
        respondent: { select: { name: true } },
        project: { select: { name: true, owner: true } },
        gaps: {
          orderBy: { createdAt: "asc" },
          include: { questions: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    if (!analysis) throw httpError(404, "Analysis not found.");

    const markdown = buildMarkdown(analysis);
    const filename = `pr-${analysis.prNumber}-drift-report.md`;

    res
      .setHeader("Content-Type", "text/markdown; charset=utf-8")
      .setHeader("Content-Disposition", `attachment; filename="${filename}"`)
      .send(markdown);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analyses/:id/retrigger
 * Re-run on the latest commit. Resets answers and clears isStale. Respondent-only.
 */
export async function retriggerController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { error, value } = uuidParam.validate(req.params);
    if (error) throw httpError(400, error.message);

    await retriggerAnalysis(value.id, req.userId!);

    res.status(202).json({ message: "Retrigger accepted. Pipeline running in background." });
  } catch (err) {
    next(err);
  }
}
