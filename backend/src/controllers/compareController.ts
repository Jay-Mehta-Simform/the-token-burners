/**
 * compareController — POST /api/compare-spec
 *
 * Stateless step-2 + step-3 endpoint (no DB). Given the reverse spec and the
 * original spec, returns the behavioural gaps each with its resolving question
 * and an empty answer — the exact JSON the frontend renders and answers.
 *
 * Body:
 *   {
 *     reverseSpec: string,                       // required (Step 1 output)
 *     // provide ONE of:
 *     originalSpec?: string,                     // a single spec document, OR
 *     originalSpecs?: Array<{                     // timestamped versions; latest wins
 *       content: string,
 *       uploadedAt: number | string,            // epoch millis or ISO string
 *       label?: string
 *     }>
 *   }
 *
 * Returns: { gaps: ResolvedGap[], meta }
 */

import type { Request, Response, NextFunction } from "express";
import { compareSpec } from "../services/compareService.js";
import type { SpecVersion } from "../prompts/gapAnalysis.js";
import { httpError } from "../lib/httpError.js";

function parseSpecVersions(raw: unknown): SpecVersion[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw httpError(400, "originalSpecs must be a non-empty array of { content, uploadedAt }.");
  }
  return raw.map((v, i) => {
    const o = (v ?? {}) as Record<string, unknown>;
    if (typeof o.content !== "string" || !o.content.trim()) {
      throw httpError(400, `originalSpecs[${i}].content must be a non-empty string.`);
    }
    if (typeof o.uploadedAt !== "number" && typeof o.uploadedAt !== "string") {
      throw httpError(400, `originalSpecs[${i}].uploadedAt must be a number (epoch ms) or string.`);
    }
    return {
      content: o.content,
      uploadedAt: o.uploadedAt as number | string,
      label: typeof o.label === "string" ? o.label : undefined,
    };
  });
}

export async function compareController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body ?? {};

    if (typeof body.reverseSpec !== "string" || !body.reverseSpec.trim()) {
      throw httpError(400, "reverseSpec is required.");
    }

    let originalSpec: string | SpecVersion[];
    if (body.originalSpecs !== undefined) {
      originalSpec = parseSpecVersions(body.originalSpecs);
    } else if (typeof body.originalSpec === "string" && body.originalSpec.trim()) {
      originalSpec = body.originalSpec;
    } else {
      throw httpError(400, "Provide originalSpec (string) or originalSpecs (timestamped array).");
    }

    const result = await compareSpec(originalSpec, body.reverseSpec);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
