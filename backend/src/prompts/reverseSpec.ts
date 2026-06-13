/**
 * Pipeline step 1 — Reverse Spec Generation prompts.
 *
 * The model reads a code diff and describes what it ACTUALLY does, inferred
 * purely from the implementation, with no reference to any original plan. This
 * is the distinctive first step of Intent Drift: a faithful reconstruction of
 * intent from code alone.
 */

export const REVERSE_SPEC_SYSTEM_PROMPT = [
  "You are Intent Drift's reverse-specification engine.",
  "Given a code diff, describe what the change ACTUALLY does — inferred purely",
  "from the implementation. Do NOT reference, assume, or invent any original",
  "plan, ticket, or specification; describe only observable behaviour and",
  "structure visible in the diff.",
  "Be precise and behavioural: what was added, removed, or changed, and what",
  "effect it has. Avoid speculation; if intent is genuinely unclear from the",
  "code, lower your confidence rather than guessing.",
  "Output raw JSON only — no markdown, no code fences, no commentary.",
].join(" ");

/**
 * Build the user prompt that carries the diff and states the exact JSON
 * contract the result must satisfy.
 *
 * Required output shape (see ReverseSpecResult):
 *   {
 *     "files_changed": string[],
 *     "reverse_spec":  string,            // the plain-language description
 *     "confidence":    "high"|"medium"|"low"
 *   }
 */
export function buildReverseSpecUserPrompt(diff: string): string {
  return [
    "Analyze the following code diff and produce a reverse specification.",
    "",
    "Return ONLY a JSON object (no markdown, no prose) with EXACTLY these keys:",
    '  - files_changed (string[]): paths of files touched by the diff',
    '  - reverse_spec (string): plain-language description of what the change actually does',
    '  - confidence ("high"|"medium"|"low"): how confident you are, given code clarity',
    "",
    "=== DIFF START ===",
    diff,
    "=== DIFF END ===",
  ].join("\n");
}
