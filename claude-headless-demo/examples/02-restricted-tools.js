/**
 * Example 02 — Restricting the tool surface + safe permissions.
 *
 * Shows how to give Claude a *limited* set of capabilities so it can inspect
 * the repo but cannot, say, edit files or run arbitrary shell commands.
 *
 *   - `tools`          : whitelist from the built-in tool set
 *   - `allowedTools`   : permission-scoped patterns (e.g. only `ls`/`cat` bash)
 *   - `permissionMode` : how unmatched permission requests are handled
 *
 * In headless mode there is no human to approve tool use, so anything not
 * pre-allowed is effectively blocked — design the allowlist deliberately.
 *
 * Run: node claude-headless-demo/examples/02-restricted-tools.js
 */

const path = require("node:path");
const { runClaude } = require("../lib/claude-runner");

async function main() {
  const res = await runClaude({
    prompt:
      "List the top-level files of this project and summarize the tech stack in 2 bullet points.",
    cwd: path.resolve(__dirname, "../.."), // run against the repo root
    model: "sonnet",
    appendSystemPrompt: "You are a precise codebase analyst. Be concise.",

    // Only these built-in tools are even available:
    tools: ["Read", "Glob", "Bash"],

    // Of Bash, only read-only commands are pre-approved. Anything else is denied
    // because there is no interactive approver in headless mode.
    allowedTools: ["Bash(ls *)", "Bash(cat *)", "Bash(find *)", "Read", "Glob"],

    // Belt-and-suspenders: explicitly forbid mutating tools.
    disallowedTools: ["Edit", "Write"],

    // `plan` would make it fully read-only; `acceptEdits` auto-approves edits.
    // Here we keep `default` and rely on the allow/deny lists above.
    permissionMode: "default",

    maxBudgetUsd: 0.3,
  });

  console.log(res.result);
  console.log("\n[turns: %d, cost: $%s]", res.numTurns, res.costUsd);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
