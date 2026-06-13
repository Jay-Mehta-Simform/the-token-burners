/**
 * questionGenerationService — pipeline step 3.
 *
 * Turns the gaps from step 2 into exactly one resolving question per gap, as
 * structured JSON, then MERGES each question back onto its gap to produce the
 * frontend-ready `ResolvedGap[]` (gap + question + empty answer). The frontend
 * renders one question per gap with an inline answer field and gates submission
 * on every gap being answered (SPEC.md §5).
 */

import { runClaude } from "../lib/claudeRunner.js";
import { httpError } from "../lib/httpError.js";
import {
  QUESTION_GENERATION_SYSTEM_PROMPT,
  buildQuestionGenerationUserPrompt,
} from "../prompts/questionGeneration.js";
import {
  CLAUDE_MODEL,
  CLAUDE_MAX_BUDGET_USD,
  CLAUDE_PERMISSION_MODE,
} from "../config/claude.js";
import type {
  Gap,
  GapQuestion,
  QuestionSet,
  ResolvedGap,
  RunMeta,
} from "../types/intentDrift.js";

/** Strip accidental code fences, then JSON.parse. Throws (502) if unparseable. */
function parseJsonResult(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw httpError(502, `Model did not return valid JSON:\n${raw.slice(0, 500)}`);
  }
}

/** Validate the parsed object against the QuestionSet contract. */
function validateQuestionSet(obj: unknown): QuestionSet {
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.questions)) {
    throw httpError(502, "Question-generation output failed validation: questions must be an array.");
  }

  const questions: GapQuestion[] = o.questions.map((raw, i) => {
    const q = raw as Record<string, unknown>;
    const errs: string[] = [];
    if (typeof q.gap_id !== "string" || !q.gap_id.trim()) errs.push("gap_id must be a non-empty string");
    if (typeof q.question !== "string" || !q.question.trim()) errs.push("question must be a non-empty string");
    if (errs.length) {
      throw httpError(502, `Question-generation output failed validation (question #${i + 1}): ${errs.join("; ")}`);
    }
    return { gap_id: q.gap_id as string, question: q.question as string };
  });

  return { questions };
}

/**
 * Merge questions onto their gaps, producing one ResolvedGap per gap with the
 * answer initialised empty. Throws (502) if any gap has no matching question.
 */
function mergeQuestionsIntoGaps(gaps: Gap[], questions: GapQuestion[]): ResolvedGap[] {
  // First question wins if the model emits more than one for a gap.
  const byGap = new Map<string, string>();
  for (const q of questions) {
    if (!byGap.has(q.gap_id)) byGap.set(q.gap_id, q.question);
  }

  const missing = gaps.filter((g) => !byGap.has(g.id)).map((g) => g.id);
  if (missing.length) {
    throw httpError(502, `Question generation did not cover gap(s): ${missing.join(", ")}.`);
  }

  return gaps.map((g) => ({ ...g, question: byGap.get(g.id) as string, answer: "" }));
}

export interface QuestionGenerationRun {
  /** Frontend-ready gaps: each carries its question and an empty answer. */
  gaps: ResolvedGap[];
  meta: RunMeta;
}

/**
 * Generate one resolving question per gap and return the gaps with questions
 * merged in (answer empty), ready for the Respondent to answer.
 */
export async function generateQuestions(gaps: Gap[]): Promise<QuestionGenerationRun> {
  if (!Array.isArray(gaps) || gaps.length === 0) {
    // No gaps means nothing to ask — the implementation matches the spec.
    return {
      gaps: [],
      meta: { costUsd: 0, numTurns: 0, durationMs: 0, sessionId: "" },
    };
  }

  const run = await runClaude({
    systemPrompt: QUESTION_GENERATION_SYSTEM_PROMPT,
    prompt: buildQuestionGenerationUserPrompt(gaps),
    model: CLAUDE_MODEL,
    tools: [],
    permissionMode: CLAUDE_PERMISSION_MODE,
    maxBudgetUsd: CLAUDE_MAX_BUDGET_USD,
  });

  if (run.isError) {
    throw httpError(502, `Claude run reported an error (see budget/limits). session=${run.sessionId}`);
  }

  const { questions } = validateQuestionSet(parseJsonResult(run.result));
  const resolved = mergeQuestionsIntoGaps(gaps, questions);

  return {
    gaps: resolved,
    meta: {
      costUsd: run.costUsd,
      numTurns: run.numTurns,
      durationMs: run.durationMs,
      sessionId: run.sessionId,
    },
  };
}
