/**
 * analysisService — orchestrates the full Intent Drift step-1 pipeline:
 *   PR URL → gh pr diff → Claude reverse spec → Markdown → S3 upload → DB File record
 */

import { prisma } from "../lib/prisma.js";
import { fetchPrDiff } from "./githubService.js";
import { generateReverseSpec } from "./reverseSpecService.js";
import { uploadBuffer } from "./uploadService.js";
import { ReverseSpecResult, RunMeta } from "../types/intentDrift.js";
import { httpError } from "../lib/httpError.js";

export interface AnalysisResult {
  prNumber: number;
  repo: string;
  reverseSpec: ReverseSpecResult;
  meta: RunMeta;
  s3Url: string;
  s3Key: string;
  fileId: string;
}

/** Convert the reverse spec result to a human-readable Markdown document. */
function toMarkdown(
  prNumber: number,
  repo: string,
  result: ReverseSpecResult,
  generatedAt: string
): string {
  const fileList = result.files_changed.map((f) => `- ${f}`).join("\n");

  return [
    `# Reverse Spec — PR #${prNumber} (${repo})`,
    "",
    `**Confidence:** ${result.confidence}`,
    `**Files changed:** ${result.files_changed.length}`,
    `**Generated:** ${generatedAt}`,
    "",
    "## Files Changed",
    "",
    fileList,
    "",
    "## What This Change Actually Does",
    "",
    result.reverse_spec,
  ].join("\n");
}

/**
 * Run the full step-1 analysis for a PR:
 *   1. Fetch diff via `gh pr diff`
 *   2. Generate reverse spec via Claude headless
 *   3. Serialise to Markdown and upload to S3
 *   4. Save a File record in the DB linked to the project
 *
 * @param prUrl      Full GitHub PR URL, e.g. https://github.com/owner/repo/pull/123
 * @param projectId  DB Project.id — the project this analysis belongs to
 */
export async function runAnalysis(prUrl: string, projectId: string): Promise<AnalysisResult> {
  // Parse PR URL → owner/repo + prNumber
  const match = prUrl.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/);
  if (!match) {
    throw httpError(400, 'prUrl must be a valid GitHub PR URL, e.g. "https://github.com/owner/repo/pull/123".');
  }
  const repo = `${match[1]}/${match[2]}`;
  const prNumber = Number(match[3]);

  // Verify project exists before doing expensive work.
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw httpError(404, `Project ${projectId} not found.`);
  }

  // Step 1a: fetch diff.
  const diff = await fetchPrDiff(prNumber, repo);

  // Step 1b: run Claude reverse spec generation.
  const { result, meta } = await generateReverseSpec(diff);

  // Step 1c: serialise to Markdown and upload to S3.
  const generatedAt = new Date().toISOString();
  const markdown = toMarkdown(prNumber, repo, result, generatedAt);
  const buffer = Buffer.from(markdown, "utf-8");
  const safeRepo = repo.replace("/", "-");
  const s3Key = `analyses/${safeRepo}/pr-${prNumber}/${Date.now()}.md`;
  const s3Url = await uploadBuffer(buffer, s3Key, "text/markdown");

  // Step 1d: persist File record in DB.
  const file = await prisma.file.create({
    data: {
      name: `reverse-spec-pr-${prNumber}.md`,
      s3Key,
      s3Url,
      projectId,
    },
  });

  return { prNumber, repo, reverseSpec: result, meta, s3Url, s3Key, fileId: file.id };
}
