/**
 * Shared types for the Intent Drift AI pipeline.
 *
 * Step 1 (`ReverseSpecResult`), Step 2 (`Gap`/`GapAnalysisResult`) and Step 3
 * (`GapQuestion`/`QuestionSet`, merged into `ResolvedGap`/`CompareResult`) are
 * all wired. The taxonomy here mirrors src/prompts/gapAnalysis.ts and the
 * frontend renderer (frontend/src/lib/meta.jsx).
 */

/**
 * Step 1 — Reverse Spec Generation.
 * A plain-language, Markdown-formatted description of what a diff ACTUALLY does,
 * inferred purely from the implementation. The model returns prose (not JSON);
 * `reverse_spec` holds that Markdown verbatim and is fed straight into the gap
 * analysis step and rendered as-is on the frontend.
 */
export interface ReverseSpecResult {
  reverse_spec: string;
}

/** Metadata about a single Claude run, surfaced for cost/observability. */
export interface RunMeta {
  costUsd: number;
  numTurns: number;
  durationMs: number;
  sessionId: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Steps 2 & 3 — Gap Analysis + Question Generation.
//
// Output is structured JSON the frontend consumes directly (SPEC.md §5):
// each resolved gap carries its `type`/`severity` classification, a single
// `question`, and the Respondent's `answer`. Taxonomy is kept in sync with
// src/prompts/gapAnalysis.ts (GAP_TYPES) and frontend/src/lib/meta.jsx.
// ──────────────────────────────────────────────────────────────────────────

/** Step 2 — Gap Analysis. */
export type GapType = "missing_feature" | "deviation" | "undocumented_addition";
export type GapSeverity = "high" | "medium" | "low";

export interface Gap {
  id: string;
  title: string;
  description: string;
  type: GapType;
  severity: GapSeverity;
}

export interface GapAnalysisResult {
  gaps: Gap[];
}

/** Step 3 — Question Generation. Exactly one question per gap. */
export interface GapQuestion {
  gap_id: string;
  question: string;
}

export interface QuestionSet {
  questions: GapQuestion[];
}

/**
 * A gap merged with its resolving question and the Respondent's answer — the
 * shape rendered/answered on the frontend and serialised into the Decision
 * Record. `answer` starts empty and is filled in by the Respondent.
 */
export interface ResolvedGap extends Gap {
  question: string;
  answer: string;
}

/** Combined result of the compare step (gap analysis + question generation). */
export interface CompareResult {
  gaps: ResolvedGap[];
}
