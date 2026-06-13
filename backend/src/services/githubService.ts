/**
 * githubService — GitHub API interactions via Octokit (per-user OAuth token)
 * and a legacy gh-CLI path for PR diffs.
 */

import { spawn } from "node:child_process";
import { Octokit } from "@octokit/rest";
import { httpError } from "../lib/httpError.js";

// ---------------------------------------------------------------------------
// Legacy: fetch PR diff via local gh CLI (used by reverseSpecService)
// ---------------------------------------------------------------------------

const REPO_ROOT = process.cwd().endsWith("/backend")
  ? process.cwd().slice(0, -"/backend".length)
  : process.cwd();

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

// ---------------------------------------------------------------------------
// Octokit-based helpers (require user's OAuth token)
// ---------------------------------------------------------------------------

export interface GitHubRepo {
  githubRepoId: string;
  name: string;
  owner: string;
  fullName: string;
  defaultBranch: string;
  lang: string | null;
  private: boolean;
}

export interface GitHubPR {
  number: number;
  title: string;
  author: string;
  branch: string;
  add: number;
  del: number;
  files: number;
}

/** List all repos accessible to the authenticated user. */
export async function listUserRepos(oauthToken: string): Promise<GitHubRepo[]> {
  const octokit = new Octokit({ auth: oauthToken });

  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: "updated",
    affiliation: "owner,collaborator,organization_member",
  });

  return repos.map((r) => ({
    githubRepoId: String(r.id),
    name: r.name,
    owner: r.owner.login,
    fullName: r.full_name,
    defaultBranch: r.default_branch,
    lang: r.language ?? null,
    private: r.private,
  }));
}

/**
 * Fetch the current head SHA for a pull request.
 * Returns empty string on failure so stale detection is non-blocking.
 */
export async function getPrHeadSha(
  oauthToken: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string> {
  try {
    const octokit = new Octokit({ auth: oauthToken });
    const { data } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
    return data.head.sha;
  } catch {
    return "";
  }
}

/** List open PRs for a repo, including additions/deletions from individual PR calls. */
export async function listOpenPulls(
  oauthToken: string,
  owner: string,
  repo: string
): Promise<GitHubPR[]> {
  const octokit = new Octokit({ auth: oauthToken });

  const pulls = await octokit.paginate(octokit.pulls.list, {
    owner,
    repo,
    state: "open",
    per_page: 50,
  });

  // Fetch full PR details (adds additions/deletions/changed_files) in parallel
  const detailed = await Promise.all(
    pulls.map((pr) =>
      octokit.pulls
        .get({ owner, repo, pull_number: pr.number })
        .then((r) => r.data)
        .catch(() => null)
    )
  );

  return detailed
    .filter((pr): pr is NonNullable<typeof pr> => pr !== null)
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      author: pr.user?.login ?? "",
      branch: pr.head.ref,
      add: pr.additions,
      del: pr.deletions,
      files: pr.changed_files,
    }));
}
