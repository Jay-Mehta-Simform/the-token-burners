/**
 * reverseSpecService — pipeline step 1.
 *
 * Hands a code diff to Claude (headless, subscription) with the reverse-spec
 * prompts and no tools, then parses + validates the structured JSON result.
 */

import { runClaude } from "../lib/claudeRunner.js";
import { httpError } from "../lib/httpError.js";
import {
  REVERSE_SPEC_SYSTEM_PROMPT,
  buildReverseSpecUserPrompt,
} from "../prompts/reverseSpec.js";
import {
  CLAUDE_MODEL,
  CLAUDE_MAX_BUDGET_USD,
  CLAUDE_PERMISSION_MODE,
  MAX_DIFF_CHARS,
} from "../config/claude.js";
import type { Confidence, ReverseSpecResult, RunMeta } from "../types/intentDrift.js";

const VALID_CONFIDENCE: Confidence[] = ["high", "medium", "low"];

/** Strip accidental code fences, then JSON.parse. Throws (502) if unparseable. */
function parseJsonResult(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw httpError(502, `Model did not return valid JSON:\n${raw.slice(0, 500)}`);
  }
}

/** Validate the parsed object against the ReverseSpecResult contract. */
function validateReverseSpec(obj: unknown): ReverseSpecResult {
  const o = obj as Record<string, unknown>;
  const errs: string[] = [];

  if (!Array.isArray(o.files_changed) || !o.files_changed.every((f) => typeof f === "string")) {
    errs.push("files_changed must be string[]");
  }
  if (typeof o.reverse_spec !== "string" || !o.reverse_spec.trim()) {
    errs.push("reverse_spec must be a non-empty string");
  }
  if (!VALID_CONFIDENCE.includes(o.confidence as Confidence)) {
    errs.push('confidence must be "high" | "medium" | "low"');
  }

  if (errs.length) {
    throw httpError(502, `Reverse-spec output failed validation: ${errs.join("; ")}`);
  }

  return {
    files_changed: o.files_changed as string[],
    reverse_spec: o.reverse_spec as string,
    confidence: o.confidence as Confidence,
  };
}

export interface ReverseSpecRun {
  result: ReverseSpecResult;
  meta: RunMeta;
}

/**
 * Generate a reverse specification from a code diff.
 */
export async function generateReverseSpec(diff: string): Promise<ReverseSpecRun> {
  if (!diff?.trim()) {
    throw httpError(400, "diff is empty — nothing to analyze.");
  }

  // Soft cap: very large diffs degrade quality and burn tokens.
  let effectiveDiff = diff;
  if (diff.length > MAX_DIFF_CHARS) {
    console.warn(
      `[reverseSpec] diff is ${diff.length} chars; truncating to ${MAX_DIFF_CHARS}.`
    );
    effectiveDiff = diff.slice(0, MAX_DIFF_CHARS);
  }

  const run = await runClaude({
    systemPrompt: REVERSE_SPEC_SYSTEM_PROMPT,
    prompt: buildReverseSpecUserPrompt(effectiveDiff),
    model: CLAUDE_MODEL,
    tools: [], // pure text analysis — no tools, no permission prompts
    permissionMode: CLAUDE_PERMISSION_MODE,
    maxBudgetUsd: CLAUDE_MAX_BUDGET_USD,
  });

  if (run.isError) {
    throw httpError(502, `Claude run reported an error (see budget/limits). session=${run.sessionId}`);
  }

  const result = validateReverseSpec(parseJsonResult(run.result));

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
