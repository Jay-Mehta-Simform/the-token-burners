/**
 * Step 3 — Question Generation
 *
 * Turns each gap from Step 2 into ONE specific, answerable question for the
 * Respondent. A good question lets the team resolve the gap with a concrete
 * decision — it is never a vague flag like "please review this".
 *
 * Output is STRUCTURED JSON, not Markdown. The frontend parses this JSON to
 * render one question per gap with an inline answer field, tracks each answer
 * against its gap, and gates submission on every gap being answered (see
 * frontend/src/pages/AnalysisWorkspace.jsx and SPEC.md §5). The questions are
 * therefore merged back onto their gaps so each gap carries exactly one
 * `question` and one (initially empty) `answer`.
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

export const QUESTION_GENERATION_SYSTEM_PROMPT = `You are a product-governance facilitator. For each behavioural gap you are given, you write THE question the responsible person must answer to RESOLVE that gap and turn it into a clear decision.

You are given a list of gaps. Each gap describes a divergence between intended and actual behaviour, or a scenario nobody specified. For each gap, produce exactly ONE question that, once answered, would settle what the product should do.

## One question per gap (critical)
Produce exactly one question for each gap — no more, no fewer. The answer is collected in a single inline field per gap, so the question must be the single most decision-unlocking thing to ask. If a gap appears to contain separable sub-decisions, fold them into one well-scoped question (you may ask a primary question and, in the same text, name the specific sub-choices that the answer should cover). Every gap you are given must have a question, and every question must reference exactly one gap by its id.

## What makes a good question
- Specific and answerable — it names the exact behaviour or scenario in doubt and asks for a concrete decision. The reader should be able to answer it directly.
- Behavioural, never technical — ask about intended outcomes, rules, limits, and user/system experience. Never ask about code, file names, functions, libraries, or how something is implemented.
- Decision-oriented — the answer should resolve the gap (confirm intended behaviour, choose between options, or define an unspecified case), not just acknowledge it.
- Self-contained — understandable without re-reading the gap; restate the relevant context briefly inside the question.

Tailor the angle to the gap type:
- missing_feature: ask whether the behaviour is still required and, if so, what exactly it should do (or confirm it was intentionally dropped).
- deviation: ask which behaviour is correct — the intended one or the one that actually happens — and what the rule should be.
- undocumented_addition: ask whether the implemented (unspecified) behaviour is the intended decision, and what the rule should be if not.

## Bad vs good
Bad (vague): "Should we look into the rate limit?"
Good (specific, behavioural): "When a user exceeds the daily submission limit, should the system reject the extra submissions outright, or queue them until the next day? The implementation currently silently discards them."

## Output (structured JSON — not Markdown)
Return a JSON object with a "questions" array. Each entry has:
- "gap_id": the id of the gap this question resolves (must match exactly one provided gap id).
- "question": the question itself — specific, behavioural, decision-oriented, self-contained. Plain text (inline Markdown such as **bold** or \`code\` is allowed, but do NOT return a Markdown document, headings, or bullet lists).
Provide exactly one entry per provided gap. Do not include answers — answers are filled in later by the Respondent.`;

/**
 * JSON Schema for the structured output of the question-generation step.
 * One question per gap; the backend merges each `question` onto its gap.
 */
export const QUESTION_GENERATION_OUTPUT_SCHEMA = {
	type: "object",
	properties: {
		questions: {
			type: "array",
			items: {
				type: "object",
				properties: {
					gap_id: {
						type: "string",
						description: "Id of the gap this question resolves; must match a provided gap id.",
					},
					question: {
						type: "string",
						description:
							"The single, specific, behavioural, decision-oriented, self-contained question for this gap. No code references.",
					},
				},
				required: ["gap_id", "question"],
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
	return `Generate exactly one resolving question for each of the gaps below, following the rules. Cover every gap, keep each question specific and behavioural, reference each gap by its id, and return structured JSON (not Markdown).

<gaps>
${JSON.stringify(gaps, null, 2)}
</gaps>`;
}
