/**
 * Fast, no-HTTP test harness for the reverse-spec pipeline step.
 *
 * Usage (PR URL — preferred):
 *   npm run test:reverse-spec -- https://github.com/owner/repo/pull/123
 *
 * Usage (legacy):
 *   npm run test:reverse-spec -- <prNumber> [owner/repo]
 *
 * Fetches the PR diff via gh, runs reverse-spec generation, prints the result.
 * Requires gh installed + authenticated and a Claude subscription login.
 */

import { fetchPrDiff } from "../services/githubService.js";
import { generateReverseSpec } from "../services/reverseSpecService.js";

function parsePrUrl(url: string): { repo: string; prNumber: number } | null {
  const match = url.match(
    /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/
  );
  if (!match) return null;
  return { repo: `${match[1]}/${match[2]}`, prNumber: Number(match[3]) };
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  let prNumber: number;
  let repo: string | undefined;

  if (arg && arg.startsWith("http")) {
    const parsed = parsePrUrl(arg);
    if (!parsed) {
      console.error("Invalid PR URL. Expected: https://github.com/owner/repo/pull/123");
      process.exit(1);
    }
    prNumber = parsed.prNumber;
    repo = parsed.repo;
  } else {
    prNumber = Number(arg);
    repo = process.argv[3];
    if (!Number.isInteger(prNumber) || prNumber <= 0) {
      console.error("Usage: npm run test:reverse-spec -- https://github.com/owner/repo/pull/123");
      console.error("       npm run test:reverse-spec -- <prNumber> [owner/repo]");
      process.exit(1);
    }
  }

  console.error(`Fetching diff for PR #${prNumber}${repo ? ` in ${repo}` : ""}...`);
  const diff = await fetchPrDiff(prNumber, repo);
  console.error(`Diff fetched (${diff.length} chars). Running reverse-spec generation...\n`);

  const { result, meta } = await generateReverseSpec(diff);

  console.log("=== Reverse Spec (Markdown) ===");
  console.log(result.reverse_spec);
  console.log("\n=== Run metadata ===");
  console.log(meta);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
