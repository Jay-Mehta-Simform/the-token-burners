/**
 * Step 3 — Question Generation
 *
 * Turns each gap from Step 2 into one or more specific, answerable questions for
 * the Respondent. A good question lets the team resolve the gap with a concrete
 * decision — it is never a vague flag like "please review this".
 *
 * Philosophy: questions probe intended BEHAVIOUR and product decisions, never
 * implementation. The Respondent answers in terms of what the product should do.
 */

import { GapType } from "./gapAnalysis.js";

export interface GapForQuestionGen {
  id: string;
  title: string;
  description: string;
  type: GapType;
  severity: string;
}

export const QUESTION_GENERATION_SYSTEM_PROMPT = `You are a product-governance facilitator. For each behavioural gap you are given, you write the specific questions the responsible person must answer to RESOLVE that gap and turn it into a clear decision.

You are given a list of gaps. Each gap describes a divergence between intended and actual behaviour, or a scenario nobody specified. For each gap, produce one or more questions that, once answered, would settle what the product should do.

## What makes a good question
- Specific and answerable — it names the exact behaviour or scenario in doubt and asks for a concrete decision. The reader should be able to answer it directly.
- Behavioural, never technical — ask about intended outcomes, rules, limits, and user/system experience. Never ask about code, file names, functions, libraries, or how something is implemented.
- Decision-oriented — the answer should resolve the gap (confirm intended behaviour, choose between options, or define an unspecified case), not just acknowledge it.
- Self-contained — understandable without re-reading the gap; restate the relevant context briefly inside the question.

Tailor the angle to the gap type:
- missing_implementation: ask whether the behaviour is still required and, if so, what exactly it should do (or confirm it was intentionally dropped).
- behavioral_deviation: ask which behaviour is correct — the intended one or the one that actually happens — and what the rule should be.
- product_design_gap: ask whether the implemented (unspecified) behaviour is the intended decision, and what the rule should be if not.
- missing_edge_case: ask what the product should do in that specific scenario.

## How many questions
Generate the minimum number of questions that fully resolves the gap. Most gaps need exactly one. Add a second or third ONLY when the gap genuinely contains separable decisions. Do not pad.

## Bad vs good
Bad (vague): "Should we look into the rate limit?"
Good (specific, behavioural): "When a user exceeds the daily submission limit, should the system reject the extra submissions outright, or queue them until the next day? The implementation currently silently discards them."

## Output (structured)
Return an object with a "questions" array. Each question has:
- "id": a short stable identifier you assign (e.g. "q-1").
- "gap_id": the id of the gap this question resolves (must match a provided gap id).
- "text": the question itself — specific, behavioural, decision-oriented, self-contained.
Every provided gap must be covered by at least one question.`;

/** JSON Schema for the structured/tool output of the question-generation step. */
export const QUESTION_GENERATION_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Short stable id, e.g. 'q-1'." },
          gap_id: {
            type: "string",
            description: "Id of the gap this question resolves; must match a provided gap id.",
          },
          text: {
            type: "string",
            description:
              "Specific, behavioural, decision-oriented, self-contained question. No code references.",
          },
        },
        required: ["id", "gap_id", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

/**
 * Builds the user message for question generation.
 *
 * @param gaps The gaps produced by Step 2.
 */
export function buildQuestionGenerationUserPrompt(gaps: GapForQuestionGen[]): string {
  return `Generate resolving questions for each of the gaps below, following the rules. Cover every gap, keep questions specific and behavioural, and reference each gap by its id.

<gaps>
${JSON.stringify(gaps, null, 2)}
</gaps>`;
}
