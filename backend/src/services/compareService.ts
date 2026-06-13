/**
 * compareService — runs pipeline steps 2 + 3 together.
 *
 *   original spec (latest of N versions) + reverse spec
 *     → gap analysis (step 2)
 *     → question generation (step 3, one question per gap)
 *     → frontend-ready ResolvedGap[] (gap + question + empty answer)
 *
 * This is the work behind the "Compare against spec" action: it takes the spec
 * the user provided (which may be the latest of several timestamped uploads)
 * and the already-generated reverse spec, and returns the gaps + questions the
 * Respondent answers.
 */

import { generateGapAnalysis } from "./gapAnalysisService.js";
import { generateQuestions } from "./questionGenerationService.js";
import type { SpecVersion } from "../prompts/gapAnalysis.js";
import type { CompareResult, RunMeta } from "../types/intentDrift.js";

export interface CompareRun extends CompareResult {
  meta: {
    gapAnalysis: RunMeta;
    questionGeneration: RunMeta;
  };
}

/**
 * Compare the original spec against the reverse spec and return resolved gaps.
 *
 * @param originalSpec Single spec string, or timestamped versions (latest wins).
 * @param reverseSpec  The Step 1 reverse-spec text.
 */
export async function compareSpec(
  originalSpec: string | SpecVersion[],
  reverseSpec: string,
): Promise<CompareRun> {
  const { result: gapResult, meta: gapMeta } = await generateGapAnalysis(originalSpec, reverseSpec);

  const { gaps, meta: questionMeta } = await generateQuestions(gapResult.gaps);

  return {
    gaps,
    meta: { gapAnalysis: gapMeta, questionGeneration: questionMeta },
  };
}
