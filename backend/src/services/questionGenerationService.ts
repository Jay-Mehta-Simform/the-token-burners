import { runClaude } from "../lib/claudeRunner.js";
import { httpError } from "../lib/httpError.js";
import {
  QUESTION_GENERATION_SYSTEM_PROMPT,
  buildQuestionGenerationUserPrompt,
  GapForQuestionGen,
} from "../prompts/questionGeneration.js";
import {
  CLAUDE_MODEL,
  CLAUDE_MAX_BUDGET_USD,
  CLAUDE_PERMISSION_MODE,
} from "../config/claude.js";
import type { RunMeta } from "../types/intentDrift.js";

export interface QuestionRow {
  questionKey: string;
  gapKey: string;
  text: string;
}

function parseJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw httpError(502, `Question generation did not return valid JSON:\n${raw.slice(0, 500)}`);
  }
}

function validateQuestions(obj: unknown, validGapKeys: Set<string>): QuestionRow[] {
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.questions)) {
    throw httpError(502, "Question generation output missing 'questions' array.");
  }

  return (o.questions as unknown[]).map((q, i) => {
    const question = q as Record<string, unknown>;
    const errs: string[] = [];
    if (typeof question.id !== "string") errs.push("id must be a string");
    if (typeof question.gap_id !== "string") errs.push("gap_id must be a string");
    if (typeof question.text !== "string") errs.push("text must be a string");
    if (question.gap_id && !validGapKeys.has(question.gap_id as string)) {
      errs.push(`gap_id "${question.gap_id}" does not match any provided gap`);
    }
    if (errs.length) throw httpError(502, `Question[${i}] validation failed: ${errs.join("; ")}`);

    return {
      questionKey: question.id as string,
      gapKey: question.gap_id as string,
      text: question.text as string,
    };
  });
}

export interface QuestionGenerationRun {
  questions: QuestionRow[];
  meta: RunMeta;
}

export async function generateQuestions(
  gaps: GapForQuestionGen[]
): Promise<QuestionGenerationRun> {
  const run = await runClaude({
    systemPrompt: QUESTION_GENERATION_SYSTEM_PROMPT,
    prompt: buildQuestionGenerationUserPrompt(gaps),
    model: CLAUDE_MODEL,
    tools: [],
    permissionMode: CLAUDE_PERMISSION_MODE,
    maxBudgetUsd: CLAUDE_MAX_BUDGET_USD,
  });

  if (run.isError) {
    throw httpError(502, `Question generation Claude run failed. session=${run.sessionId}`);
  }

  const validGapKeys = new Set(gaps.map((g) => g.id));
  const questions = validateQuestions(parseJson(run.result), validGapKeys);

  return {
    questions,
    meta: {
      costUsd: run.costUsd,
      numTurns: run.numTurns,
      durationMs: run.durationMs,
      sessionId: run.sessionId,
    },
  };
}
