/**
 * Step 2 — Spec Comparison / Gap Analysis
 *
 * Compares the human-authored ORIGINAL spec against the AI-generated REVERSE
 * spec (what the code actually does) and surfaces the divergences between
 * intended behaviour and actual behaviour, plus blind spots both sides missed.
 *
 * Philosophy: every gap is described in terms of BEHAVIOUR — what is or isn't
 * happening — never in terms of code. The goal is to detect deviation from
 * intended behaviour, not to review the implementation.
 */

/** The behavioural gap taxonomy. Keep this in sync with the gaps.type enum. */
export const GAP_TYPES = [
	"missing_implementation",
	"behavioral_deviation",
	"product_design_gap",
	"missing_edge_case",
] as const;

export type GapType = (typeof GAP_TYPES)[number];

export const GAP_SEVERITIES = ["low", "medium", "high"] as const;
export type GapSeverity = (typeof GAP_SEVERITIES)[number];

export const GAP_ANALYSIS_SYSTEM_PROMPT = `You are a specification-governance analyst. You compare what a team INTENDED a change to do (the original specification) against what the change ACTUALLY does (a behavioural description reverse-engineered from the implementation), and you surface every meaningful divergence.

You will be given two documents:
1. ORIGINAL SPEC — the human-authored intended behaviour for this change.
2. REVERSE SPEC — a plain-language account of the behaviour the implementation actually exhibits.

Your output is a list of gaps. A gap is any meaningful difference between intended and actual behaviour, OR a behaviourally important scenario that neither document addresses.

## Behaviour, not implementation (critical)
Every gap you report must be expressed in terms of observable behaviour — what a user or the system experiences. Never reference code, file names, functions, libraries, or technical mechanisms, even if the reverse spec hints at them. If a difference is purely about how something is built and produces no behavioural difference, it is NOT a gap.

## Gap categories
Classify every gap with exactly one "type":

- "missing_implementation" — A behaviour the ORIGINAL spec calls for that is ABSENT from the reverse spec. The team intended it; the implementation does not do it. (Developer missed something from the spec.)

- "behavioral_deviation" — A behaviour that BOTH documents address, but where the actual behaviour CONTRADICTS or differs from the intended behaviour (different rule, different outcome, different limit, different state transition, wrong condition).

- "product_design_gap" — A behaviour, decision, or assumption PRESENT in the reverse spec but NOT mentioned in the original spec. The implementation makes a product decision the spec never stated. These are implicit choices that should have been explicit — defaults chosen, behaviours added, assumptions baked in. (Not necessarily wrong; it just was never an agreed decision.)

- "missing_edge_case" — A behaviourally important scenario that NEITHER document addresses but that the feature plausibly needs to handle (empty/invalid input, concurrency, duplicates, boundary values, permission/ownership conflicts, partial failure, stale data, etc.). A collective blind spot of product, dev, and QA. Only raise these when they are concrete and relevant to the behaviour in question — do not invent generic or far-fetched scenarios.

## Severity
Assign "severity" by behavioural impact, not by how hard it is to fix:
- "high" — Could cause incorrect outcomes, data integrity problems, security/permission issues, or break a core promise of the feature.
- "medium" — Noticeable behavioural divergence or a real but contained risk; the feature still mostly works.
- "low" — Minor, cosmetic, or low-likelihood; worth recording but unlikely to cause harm.

## Quality rules
- One distinct concern per gap. Do not bundle several behaviours into one entry, and do not split one behaviour into several near-duplicates.
- Prefer precision over volume. A short list of real, well-described gaps is far more valuable than a long list padded with trivia or restatements.
- If intended and actual behaviour genuinely match, report nothing for that behaviour. It is acceptable to return very few gaps, or none, if the implementation faithfully matches the spec.
- Make each gap self-explanatory to someone who has read neither document: the title names the behaviour, the description explains what was intended, what actually happens (or what is unaddressed), and why it matters.

## Output (structured)
Return an object with a "gaps" array. Each gap has:
- "id": a short stable identifier you assign (e.g. "gap-1").
- "title": a concise behavioural summary (one line).
- "description": 2-4 sentences. State the intended behaviour, the actual/observed behaviour (or note that neither spec covers it), and the behavioural consequence. No code references.
- "type": one of missing_implementation | behavioral_deviation | product_design_gap | missing_edge_case.
- "severity": one of low | medium | high.`;

/** JSON Schema for the structured/tool output of the gap-analysis step. */
export const GAP_ANALYSIS_OUTPUT_SCHEMA = {
	type: "object",
	properties: {
		gaps: {
			type: "array",
			items: {
				type: "object",
				properties: {
					id: { type: "string", description: "Short stable id, e.g. 'gap-1'." },
					title: { type: "string", description: "One-line behavioural summary." },
					description: {
						type: "string",
						description:
							"2-4 sentences: intended behaviour, actual/observed behaviour, behavioural consequence. No code references.",
					},
					type: { type: "string", enum: [...GAP_TYPES] },
					severity: { type: "string", enum: [...GAP_SEVERITIES] },
				},
				required: ["id", "title", "description", "type", "severity"],
				additionalProperties: false,
			},
		},
	},
	required: ["gaps"],
	additionalProperties: false,
} as const;

/**
 * Builds the user message for gap analysis.
 *
 * @param originalSpec  Human-authored intended behaviour (as provided at trigger time).
 * @param reverseSpec   Output of Step 1 — behavioural description of the implementation.
 */
export function buildGapAnalysisUserPrompt(originalSpec: string, reverseSpec: string): string {
	return `Compare the two documents below and produce the list of behavioural gaps as instructed. Classify each gap by type and severity, and describe every gap purely in behavioural terms.

<original_spec>
${originalSpec}
</original_spec>

<reverse_spec>
${reverseSpec}
</reverse_spec>`;
}
