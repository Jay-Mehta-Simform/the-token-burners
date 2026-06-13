#!/usr/bin/env node
/**
 * run-claude.js — the 30-second "does this work?" entry point.
 *
 * A single headless call using the shared runner in ./lib/claude-runner.js.
 * For focused, copy-pasteable patterns see ./examples/*.js.
 *
 * Auth: uses your existing Claude Code *subscription* login. No API key needed.
 *       (The only thing that would break that is `--bare`, which we never set.)
 *
 * Usage:
 *   node run-claude.js "your prompt here"
 *   node run-claude.js            # uses the default demo prompt
 */

const { runClaude, buildArgs } = require("./lib/claude-runner");

async function main() {
  const prompt =
    process.argv.slice(2).join(" ") ||
    "List the files in the current directory and tell me, in one sentence, what kind of project this is.";

  const opts = {
    prompt,
    model: "sonnet",
    appendSystemPrompt: "You are a terse assistant. Answer in at most 2 sentences. No emojis.",
    tools: ["Read", "Glob", "Bash"],
    allowedTools: ["Bash(ls *)", "Bash(cat *)", "Read", "Glob"],
    permissionMode: "acceptEdits",
    maxBudgetUsd: 0.5,
  };

  // Show exactly what CLI invocation this maps to (the prompt is piped via stdin).
  console.error(`$ echo "<prompt>" | claude ${buildArgs(opts, "json").join(" ")}\n`);

  const res = await runClaude(opts);

  console.log("=== Result ===");
  console.log(res.result);
  console.log("\n=== Metadata ===");
  console.log({
    sessionId: res.sessionId,
    numTurns: res.numTurns,
    costUsd: res.costUsd,
    durationMs: res.durationMs,
    isError: res.isError,
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
