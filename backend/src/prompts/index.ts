/**
 * Prompts for the Intent Drift 3-step AI pipeline.
 *
 *   Step 1  reverseSpec       — infer behaviour from the PR's changed files (no original spec given).
 *   Step 2  gapAnalysis       — compare original spec vs reverse spec, surface behavioural gaps.
 *   Step 3  questionGeneration — turn each gap into specific, answerable questions for the Respondent.
 *
 * All prompts describe and probe BEHAVIOUR, never implementation details.
 */

export * from "./gapAnalysis.js";
export * from "./questionGeneration.js";
export * from "./reverseSpec.js";
