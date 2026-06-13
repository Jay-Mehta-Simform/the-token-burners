import { runClaude } from "../lib/claudeRunner.js";
import { httpError } from "../lib/httpError.js";
import {
  GAP_ANALYSIS_SYSTEM_PROMPT,
  buildGapAnalysisUserPrompt,
  GAP_TYPES,
  GAP_SEVERITIES,
} from "../prompts/gapAnalysis.js";
import {
  CLAUDE_MODEL,
  CLAUDE_MAX_BUDGET_USD,
  CLAUDE_PERMISSION_MODE,
} from "../config/claude.js";
import type { RunMeta } from "../types/intentDrift.js";

export interface GapRow {
  gapKey: string;
  title: string;
  description: string;
  type: string;
  severity: string;
}

function parseJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw httpError(502, `Gap analysis did not return valid JSON:\n${raw.slice(0, 500)}`);
  }
}

function validateGaps(obj: unknown): GapRow[] {
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.gaps)) throw httpError(502, "Gap analysis output missing 'gaps' array.");

  return (o.gaps as unknown[]).map((g, i) => {
    const gap = g as Record<string, unknown>;
    const errs: string[] = [];
    if (typeof gap.id !== "string") errs.push("id must be a string");
    if (typeof gap.title !== "string") errs.push("title must be a string");
    if (typeof gap.description !== "string") errs.push("description must be a string");
    if (!GAP_TYPES.includes(gap.type as never)) errs.push(`type must be one of ${GAP_TYPES.join("|")}`);
    if (!GAP_SEVERITIES.includes(gap.severity as never)) errs.push(`severity must be one of ${GAP_SEVERITIES.join("|")}`);
    if (errs.length) throw httpError(502, `Gap[${i}] validation failed: ${errs.join("; ")}`);

    return {
      gapKey: gap.id as string,
      title: gap.title as string,
      description: gap.description as string,
      type: gap.type as string,
      severity: gap.severity as string,
    };
  });
}

export interface GapAnalysisRun {
  gaps: GapRow[];
  meta: RunMeta;
}

export async function generateGapAnalysis(
  reverseSpec: string,
  originalSpec: string
): Promise<GapAnalysisRun> {
  const run = await runClaude({
    systemPrompt: GAP_ANALYSIS_SYSTEM_PROMPT,
    prompt: buildGapAnalysisUserPrompt(originalSpec, reverseSpec),
    model: CLAUDE_MODEL,
    tools: [],
    permissionMode: CLAUDE_PERMISSION_MODE,
    maxBudgetUsd: CLAUDE_MAX_BUDGET_USD,
  });

  if (run.isError) {
    throw httpError(502, `Gap analysis Claude run failed. session=${run.sessionId}`);
  }

  const gaps = validateGaps(parseJson(run.result));

  return {
    gaps,
    meta: {
      costUsd: run.costUsd,
      numTurns: run.numTurns,
      durationMs: run.durationMs,
      sessionId: run.sessionId,
    },
  };
}
