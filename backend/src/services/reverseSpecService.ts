/**
 * reverseSpecService — pipeline step 1.
 *
 * Hands a code diff to Claude (headless, subscription) with the reverse-spec
 * prompts and no tools. The model returns the reverse spec as plain Markdown
 * prose (not JSON), which is used verbatim by the comparison step.
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
import type { ReverseSpecResult, RunMeta } from "../types/intentDrift.js";

/**
 * Normalise the model's Markdown output. The reverse spec is consumed as prose,
 * so we only trim surrounding whitespace and peel off a single fenced block if
 * the model wrapped the entire response in one. Throws (502) if empty.
 */
function toReverseSpec(raw: string): ReverseSpecResult {
  let md = raw.trim();

  // If the whole response is a single ```...``` fence, unwrap it.
  const fenced = md.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/);
  if (fenced) md = fenced[1].trim();

  if (!md) {
    throw httpError(502, "Reverse-spec generation returned an empty response.");
  }

  return { reverse_spec: md };
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

  const result = toReverseSpec(run.result);

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
