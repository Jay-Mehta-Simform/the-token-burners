/**
 * gapAnalysisService — pipeline step 2.
 *
 * Hands the AUTHORITATIVE original spec (latest of any uploaded versions) plus
 * the reverse spec to Claude (headless, subscription) with the gap-analysis
 * prompts and no tools, then parses + validates the structured JSON result.
 *
 * Spec versioning: callers may pass several timestamped spec versions. The
 * prompt marks the most recent as authoritative and treats older ones as
 * superseded (see src/prompts/gapAnalysis.ts).
 */

import { runClaude } from "../lib/claudeRunner.js";
import { httpError } from "../lib/httpError.js";
import {
  GAP_TYPES,
  GAP_SEVERITIES,
  GAP_ANALYSIS_SYSTEM_PROMPT,
  buildGapAnalysisUserPrompt,
  type SpecVersion,
} from "../prompts/gapAnalysis.js";
import {
  CLAUDE_MODEL,
  CLAUDE_MAX_BUDGET_USD,
  CLAUDE_PERMISSION_MODE,
} from "../config/claude.js";
import type {
  Gap,
  GapType,
  GapSeverity,
  GapAnalysisResult,
  RunMeta,
} from "../types/intentDrift.js";

/** Strip accidental code fences, then JSON.parse. Throws (502) if unparseable. */
function parseJsonResult(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw httpError(502, `Model did not return valid JSON:\n${raw.slice(0, 500)}`);
  }
}

/** Validate the parsed object against the GapAnalysisResult contract. */
function validateGapAnalysis(obj: unknown): GapAnalysisResult {
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.gaps)) {
    throw httpError(502, "Gap-analysis output failed validation: gaps must be an array.");
  }

  const gaps: Gap[] = o.gaps.map((raw, i) => {
    const g = raw as Record<string, unknown>;
    const errs: string[] = [];

    if (typeof g.id !== "string" || !g.id.trim()) errs.push("id must be a non-empty string");
    if (typeof g.title !== "string" || !g.title.trim()) errs.push("title must be a non-empty string");
    if (typeof g.description !== "string" || !g.description.trim()) {
      errs.push("description must be a non-empty string");
    }
    if (!GAP_TYPES.includes(g.type as GapType)) {
      errs.push(`type must be one of ${GAP_TYPES.join(" | ")}`);
    }
    if (!GAP_SEVERITIES.includes(g.severity as GapSeverity)) {
      errs.push(`severity must be one of ${GAP_SEVERITIES.join(" | ")}`);
    }

    if (errs.length) {
      throw httpError(502, `Gap-analysis output failed validation (gap #${i + 1}): ${errs.join("; ")}`);
    }

    return {
      id: g.id as string,
      title: g.title as string,
      description: g.description as string,
      type: g.type as GapType,
      severity: g.severity as GapSeverity,
    };
  });

  return { gaps };
}

export interface GapAnalysisRun {
  result: GapAnalysisResult;
  meta: RunMeta;
}

/**
 * Compare the original spec against the reverse spec and produce behavioural gaps.
 *
 * @param originalSpec Either a single spec string, or timestamped versions —
 *   the latest is treated as authoritative and older ones as superseded.
 * @param reverseSpec  The Step 1 reverse-spec text.
 */
export async function generateGapAnalysis(
  originalSpec: string | SpecVersion[],
  reverseSpec: string,
): Promise<GapAnalysisRun> {
  const hasSpec = Array.isArray(originalSpec)
    ? originalSpec.some((v) => v.content?.trim())
    : originalSpec?.trim();
  if (!hasSpec) {
    throw httpError(400, "originalSpec is empty — nothing to compare against.");
  }
  if (!reverseSpec?.trim()) {
    throw httpError(400, "reverseSpec is empty — nothing to compare.");
  }

  const run = await runClaude({
    systemPrompt: GAP_ANALYSIS_SYSTEM_PROMPT,
    prompt: buildGapAnalysisUserPrompt(originalSpec, reverseSpec),
    model: CLAUDE_MODEL,
    tools: [], // pure text analysis — no tools, no permission prompts
    permissionMode: CLAUDE_PERMISSION_MODE,
    maxBudgetUsd: CLAUDE_MAX_BUDGET_USD,
  });

  if (run.isError) {
    throw httpError(502, `Claude run reported an error (see budget/limits). session=${run.sessionId}`);
  }

  const result = validateGapAnalysis(parseJsonResult(run.result));

  return {
    result,
    meta: {
      costUsd: run.costUsd,
      numTurns: run.numTurns,
      durationMs: run.durationMs,
      sessionId: run.sessionId,
    },
  };
}
