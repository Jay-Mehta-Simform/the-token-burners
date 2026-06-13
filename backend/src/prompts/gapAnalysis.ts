/**
 * Pipeline step 2 — Gap Analysis prompts. PLACEHOLDER (not yet wired).
 *
 * Future: compare the reverse spec (step 1) against the original specification
 * and return a list of gaps, each classified by type
 * (missing_feature | deviation | undocumented_addition) and severity.
 * See GapAnalysisResult in ../types/intentDrift.ts.
 */

// TODO(step 2): flesh out the system prompt + a buildGapAnalysisUserPrompt(reverseSpec, originalSpec).
export const GAP_ANALYSIS_SYSTEM_PROMPT = [
  "You are Intent Drift's gap-analysis engine.",
  "Compare a reverse specification (what the code does) against an original",
  "specification (what was planned) and identify every divergence.",
  "Output raw JSON only.",
].join(" ");
