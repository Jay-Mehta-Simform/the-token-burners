/**
 * Configuration for the Claude Code headless engine used by the Intent Drift
 * pipeline. All values are env-overridable so they can be tuned without code
 * changes; sensible defaults let the foundation run out of the box.
 */

import type { PermissionMode } from "../lib/claudeRunner.js";

/**
 * Model passed to `claude --model`.
 * "sonnet" is a good speed/cost default on a subscription; switch to "opus"
 * (set CLAUDE_MODEL=opus) for higher-quality reverse specs on complex diffs.
 */
export const CLAUDE_MODEL: string = process.env.CLAUDE_MODEL ?? "sonnet";

/** Hard spend cap per run, as a runaway guard (estimate-based on subscription). */
export const CLAUDE_MAX_BUDGET_USD: number = Number(process.env.CLAUDE_MAX_BUDGET_USD ?? 1.0);

/**
 * Permission mode. The reverse-spec step hands Claude the diff as text and
 * grants no tools, so "default" is correct — nothing needs pre-approval.
 */
export const CLAUDE_PERMISSION_MODE: PermissionMode = "default";

/**
 * Soft cap on the diff size (characters) handed to the model. Very large PRs
 * produce less precise reverse specs and burn tokens; we log a warning and
 * truncate above this. Tune as needed.
 */
export const MAX_DIFF_CHARS: number = Number(process.env.MAX_DIFF_CHARS ?? 200_000);
