/**
 * reverseSpecController — POST /api/reverse-spec
 *
 * Accepts either:
 *   { prUrl: "https://github.com/owner/repo/pull/123" }   ← preferred
 *   { prNumber: 123, repo: "owner/repo" }                 ← backward compat
 *
 * Fetches the PR diff via gh, runs reverse-spec generation, returns the typed
 * result plus run metadata.
 */

import type { Request, Response, NextFunction } from "express";
import { fetchPrDiff } from "../services/githubService.js";
import { generateReverseSpec } from "../services/reverseSpecService.js";
import { httpError } from "../lib/httpError.js";

/** Parse a GitHub PR URL into { owner, repo, prNumber }. */
function parsePrUrl(url: string): { repo: string; prNumber: number } | null {
  const match = url.match(
    /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/
  );
  if (!match) return null;
  return { repo: `${match[1]}/${match[2]}`, prNumber: Number(match[3]) };
}

export async function reverseSpecController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body ?? {};
    let prNumber: number;
    let repo: string | undefined;

    if (body.prUrl !== undefined) {
      // Preferred: full GitHub PR URL.
      if (typeof body.prUrl !== "string") {
        throw httpError(400, "prUrl must be a string.");
      }
      const parsed = parsePrUrl(body.prUrl);
      if (!parsed) {
        throw httpError(
          400,
          'prUrl must be a valid GitHub PR URL, e.g. "https://github.com/owner/repo/pull/123".'
        );
      }
      prNumber = parsed.prNumber;
      repo = parsed.repo;
    } else {
      // Backward compat: explicit prNumber + optional repo.
      const n = Number(body.prNumber);
      if (!Number.isInteger(n) || n <= 0) {
        throw httpError(
          400,
          "Provide either prUrl (GitHub PR URL) or prNumber (positive integer)."
        );
      }
      prNumber = n;
      if (
        body.repo !== undefined &&
        (typeof body.repo !== "string" || !/^[^/\s]+\/[^/\s]+$/.test(body.repo))
      ) {
        throw httpError(400, 'repo must be a string in "owner/repo" format.');
      }
      repo = body.repo;
    }

    const diff = await fetchPrDiff(prNumber, repo);
    const { result, meta } = await generateReverseSpec(diff);

    res.json({ prNumber, repo: repo ?? null, result, meta });
  } catch (err) {
    next(err);
  }
}
