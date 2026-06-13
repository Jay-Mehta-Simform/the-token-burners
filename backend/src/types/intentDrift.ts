/**
 * Shared types for the Intent Drift AI pipeline.
 *
 * Only `ReverseSpecResult` is wired today (pipeline step 1). The remaining
 * interfaces are stubs for the future steps so callers can be written against
 * a stable shape as the pipeline grows.
 */

/** Confidence the model assigns to its own reverse-spec reconstruction. */
export type Confidence = "high" | "medium" | "low";

/**
 * Step 1 — Reverse Spec Generation.
 * A plain-language description of what a diff ACTUALLY does, inferred purely
 * from the implementation.
 */
export interface ReverseSpecResult {
  files_changed: string[];
  reverse_spec: string;
  confidence: Confidence;
}

/** Metadata about a single Claude run, surfaced for cost/observability. */
export interface RunMeta {
  costUsd: number;
  numTurns: number;
  durationMs: number;
  sessionId: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Future pipeline steps (not yet wired). Shapes are provisional.
// ──────────────────────────────────────────────────────────────────────────

/** Step 2 — Gap Analysis (future). */
export type GapType = "missing_feature" | "deviation" | "undocumented_addition";
export type GapSeverity = "high" | "medium" | "low";

export interface Gap {
  type: GapType;
  severity: GapSeverity;
  description: string;
}

export interface GapAnalysisResult {
  gaps: Gap[];
}

/** Step 3 — Question Generation (future). */
export interface GapQuestion {
  gap: string;
  question: string;
}

export interface QuestionSet {
  questions: GapQuestion[];
}
