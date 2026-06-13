/**
 * analysisController — POST /api/v1/analyses
 *
 * Authenticated. Body: { prUrl: string, projectId: string }
 *
 * Triggers the full step-1 Intent Drift pipeline:
 *   PR diff → reverse spec → Markdown → S3 → DB File record
 *
 * Returns the reverse spec result, run metadata, and the S3 location.
 */

import type { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { runAnalysis } from "../services/analysisService.js";
import { httpError } from "../lib/httpError.js";

export async function analysisController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { prUrl, projectId } = req.body ?? {};

    if (!prUrl || typeof prUrl !== "string") {
      throw httpError(400, "prUrl is required (e.g. https://github.com/owner/repo/pull/123).");
    }
    if (!projectId || typeof projectId !== "string") {
      throw httpError(400, "projectId is required.");
    }

    const result = await runAnalysis(prUrl, projectId);

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
