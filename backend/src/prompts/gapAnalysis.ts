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
 *
 * Spec versioning: original specs are uploaded additively — each upload is a
 * newer, timestamp-suffixed file rather than an overwrite. When more than one
 * version is supplied, the LATEST one is the authoritative source of intended
 * behaviour and supersedes all older ones (see "Spec versioning" below).
 */

/**
 * The behavioural gap taxonomy. Kept in sync with the `gaps.type` enum in the
 * data model (SPEC.md §6) and the frontend renderer (frontend/src/lib/meta.jsx).
 */
export const GAP_TYPES = [
	"missing_feature",
	"deviation",
	"undocumented_addition",
] as const;

export type GapType = (typeof GAP_TYPES)[number];

export const GAP_SEVERITIES = ["low", "medium", "high"] as const;
export type GapSeverity = (typeof GAP_SEVERITIES)[number];

/**
 * One uploaded version of the original spec. Uploads are additive: each new
 * upload carries a later timestamp and never overwrites earlier ones. `uploadedAt`
 * is the timestamp parsed from the file's suffix (epoch millis or an ISO string)
 * and is what determines which version is authoritative.
 */
export interface SpecVersion {
	/** The spec text itself. */
	content: string;
	/** Timestamp from the file's appended suffix — epoch millis or ISO string. */
	uploadedAt: number | string;
	/** Optional human label (e.g. the original file name) for traceability. */
	label?: string;
}

export const GAP_ANALYSIS_SYSTEM_PROMPT = `You are a specification-governance analyst. You compare what a team INTENDED a change to do (the original specification) against what the change ACTUALLY does (a behavioural description reverse-engineered from the implementation), and you surface every meaningful divergence.

You will be given two things:
1. ORIGINAL SPEC — the human-authored intended behaviour for this change. This may be supplied as a SINGLE document, or as SEVERAL timestamped versions (see "Spec versioning").
2. REVERSE SPEC — a plain-language account of the behaviour the implementation actually exhibits.

Your output is a list of gaps. A gap is any meaningful difference between intended and actual behaviour, OR a behaviourally important scenario that neither document addresses.

## Spec versioning (critical)
Original specs are uploaded additively: every upload is a NEWER, timestamp-suffixed version, never an overwrite. You may therefore receive multiple versions of the original spec, each tagged with the time it was uploaded.

When more than one version is present, the version with the LATEST (most recent) timestamp is the single authoritative statement of intended behaviour. Treat it as the current intent.

- Older versions are SUPERSEDED. Decisions, rules, limits, or requirements that appear only in an older version and were changed or removed in the latest version are REDUNDANT — they no longer represent what the team wants. Do NOT raise a gap because the implementation fails to match a superseded decision.
- When the latest version and an older version conflict, the latest version always wins. The implementation should be judged against the latest version only.
- Use older versions only as background to understand how intent evolved; never as a competing source of truth.
- If only one version is supplied, it is the authoritative spec.

## Behaviour, not implementation (critical)
Every gap you report must be expressed in terms of observable behaviour — what a user or the system experiences. Never reference code, file names, functions, libraries, or technical mechanisms, even if the reverse spec hints at them. If a difference is purely about how something is built and produces no behavioural difference, it is NOT a gap.

## Gap categories
Classify every gap with exactly one "type":

- "missing_feature" — A behaviour the AUTHORITATIVE (latest) spec calls for that is ABSENT from the reverse spec. The team intended it; the implementation does not do it. Also use this type for a behaviourally important scenario that NEITHER document addresses but that the feature plausibly needs to handle (empty/invalid input, concurrency, duplicates, boundary values, partial failure, stale data) — i.e. an expected behaviour that is simply missing. Only raise such blind-spot gaps when they are concrete and relevant; do not invent generic or far-fetched scenarios.

- "deviation" — A behaviour that BOTH documents address, but where the actual behaviour CONTRADICTS or differs from the intended behaviour in the authoritative spec (different rule, different outcome, different limit, different state transition, wrong condition).

- "undocumented_addition" — A behaviour, decision, or assumption PRESENT in the reverse spec but NOT mentioned in the authoritative spec. The implementation makes a product decision the spec never stated — defaults chosen, behaviours added, assumptions baked in. (Not necessarily wrong; it just was never an agreed decision.)

## Severity
Assign "severity" by behavioural impact, not by how hard it is to fix:
- "high" — Could cause incorrect outcomes, data integrity problems, security/permission issues, or break a core promise of the feature.
- "medium" — Noticeable behavioural divergence or a real but contained risk; the feature still mostly works.
- "low" — Minor, cosmetic, or low-likelihood; worth recording but unlikely to cause harm.

## Quality rules
- One distinct concern per gap. Do not bundle several behaviours into one entry, and do not split one behaviour into several near-duplicates.
- Prefer precision over volume. A short list of real, well-described gaps is far more valuable than a long list padded with trivia or restatements.
- If intended (latest spec) and actual behaviour genuinely match, report nothing for that behaviour. It is acceptable to return very few gaps, or none, if the implementation faithfully matches the authoritative spec.
- Make each gap self-explanatory to someone who has read neither document: the title names the behaviour, the description explains what was intended, what actually happens (or what is unaddressed), and why it matters.

## Output (structured)
Return an object with a "gaps" array. Each gap has:
- "id": a short stable identifier you assign (e.g. "gap-1").
- "title": a concise behavioural summary (one line).
- "description": 2-4 sentences. State the intended behaviour, the actual/observed behaviour (or note that neither spec covers it), and the behavioural consequence. No code references.
- "type": one of missing_feature | deviation | undocumented_addition.
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

/** Parse a spec version's timestamp into epoch millis for ordering. */
function toEpoch(uploadedAt: number | string): number {
	if (typeof uploadedAt === "number") return uploadedAt;
	const n = Number(uploadedAt);
	if (Number.isFinite(n)) return n; // numeric string (epoch millis)
	const parsed = Date.parse(uploadedAt);
	return Number.isNaN(parsed) ? 0 : parsed; // ISO/date string
}

/** Format a timestamp for display in the prompt. */
function formatTs(uploadedAt: number | string): string {
	const epoch = toEpoch(uploadedAt);
	if (!epoch) return String(uploadedAt);
	try {
		return new Date(epoch).toISOString();
	} catch {
		return String(uploadedAt);
	}
}

/**
 * Builds the user message for gap analysis.
 *
 * @param originalSpec  The human-authored intended behaviour. Pass either:
 *   - a single pre-assembled string (one version), or
 *   - an array of timestamped {@link SpecVersion}s. They are sorted oldest →
 *     newest and the most recent is explicitly marked as the authoritative
 *     version so the model judges the implementation against it and treats
 *     older versions as superseded.
 * @param reverseSpec   Output of Step 1 — behavioural description of the implementation.
 */
export function buildGapAnalysisUserPrompt(
	originalSpec: string | SpecVersion[],
	reverseSpec: string,
): string {
	let originalSpecBlock: string;

	if (typeof originalSpec === "string") {
		originalSpecBlock = `<original_spec>\n${originalSpec}\n</original_spec>`;
	} else {
		// Sort oldest → newest so the authoritative version is unambiguous.
		const sorted = [...originalSpec].sort(
			(a, b) => toEpoch(a.uploadedAt) - toEpoch(b.uploadedAt),
		);
		const lastIdx = sorted.length - 1;

		const versions = sorted
			.map((v, i) => {
				const authoritative = i === lastIdx;
				const tag = authoritative
					? "LATEST — AUTHORITATIVE: judge the implementation against this version"
					: "SUPERSEDED — older version, kept for context only";
				const label = v.label ? ` ${v.label}` : "";
				return `<spec_version index="${i + 1}" uploaded_at="${formatTs(
					v.uploadedAt,
				)}"${label ? ` label="${v.label}"` : ""} status="${
					authoritative ? "authoritative" : "superseded"
				}">
===== ${tag}${label} (uploaded ${formatTs(v.uploadedAt)}) =====
${v.content}
</spec_version>`;
			})
			.join("\n\n");

		originalSpecBlock = `The original spec was uploaded in ${sorted.length} version(s), ordered oldest to newest below. The LAST one is the authoritative, current spec; the earlier ones are superseded and must not be used to raise gaps.

<original_spec_versions>
${versions}
</original_spec_versions>`;
	}

	return `Compare the documents below and produce the list of behavioural gaps as instructed. Judge the implementation against the AUTHORITATIVE (latest) original spec, treat any older spec versions as superseded, classify each gap by type and severity, and describe every gap purely in behavioural terms.

${originalSpecBlock}

<reverse_spec>
${reverseSpec}
</reverse_spec>`;
}
