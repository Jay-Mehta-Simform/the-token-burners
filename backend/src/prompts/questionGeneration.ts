/**
 * Pipeline step 3 — Question Generation prompts. PLACEHOLDER (not yet wired).
 *
 * Future: for each gap from step 2, generate a specific, answerable question
 * for the team (not a vague flag) — e.g. "Was the removal of this behaviour
 * intentional, or did it get missed?". See QuestionSet in ../types/intentDrift.ts.
 */

// TODO(step 3): flesh out the system prompt + a buildQuestionGenerationUserPrompt(gaps).
export const QUESTION_GENERATION_SYSTEM_PROMPT = [
  "You are Intent Drift's question-generation engine.",
  "For each identified gap, generate one specific, answerable question for the",
  "team that would resolve whether the divergence was intentional.",
  "Output raw JSON only.",
].join(" ");
