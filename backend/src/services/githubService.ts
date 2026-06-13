/**
 * githubService — fetches a PR's diff via the GitHub CLI (`gh`).
 *
 * The backend fetches the diff itself (rather than letting the model run `gh`),
 * so we control auth, the target repo/PR, and error handling, and can hand the
 * model pure text.
 *
 * Requires `gh` to be installed and authenticated (`gh auth login` or GH_TOKEN).
 */

import { spawn } from "node:child_process";
import { httpError } from "../lib/httpError.js";

/** Repo root, so `gh` can resolve the current repository when `repo` is omitted. */
const REPO_ROOT = process.cwd().endsWith("/backend")
  ? process.cwd().slice(0, -"/backend".length)
  : process.cwd();

/**
 * Fetch the unified diff for a pull request.
 *
 * @param prNumber PR number (positive integer).
 * @param repo     Optional "owner/repo". If omitted, `gh` resolves it from the
 *                 repo at REPO_ROOT.
 */
export function fetchPrDiff(prNumber: number, repo?: string): Promise<string> {
  const args = ["pr", "diff", String(prNumber)];
  if (repo) args.push("--repo", repo);

  return new Promise((resolve, reject) => {
    const child = spawn("gh", args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));

    child.on("error", (err) => {
      // gh not installed / not on PATH.
      reject(httpError(502, `Failed to run gh: ${err.message}. Is the GitHub CLI installed?`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(
          httpError(502, `gh pr diff failed (exit ${code}): ${stderr.trim() || "unknown error"}`)
        );
      }
      const diff = stdout.trim();
      if (!diff) {
        return reject(httpError(502, `PR #${prNumber} returned an empty diff.`));
      }
      resolve(diff);
    });
  });
}
