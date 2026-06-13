/**
 * Example 01 — Basic one-shot call with a custom system prompt + JSON output.
 *
 * Demonstrates the minimum needed to call Claude Code from code:
 *   - headless (no interactive REPL)
 *   - a custom (appended) system prompt
 *   - parsed structured result with cost/session metadata
 *
 * Run: node claude-headless-demo/examples/01-basic.js "your prompt"
 */

const { runClaude } = require("../lib/claude-runner");

async function main() {
  const prompt =
    process.argv.slice(2).join(" ") ||
    "In one sentence, what is the capital of France and why is it notable?";

  const res = await runClaude({
    prompt,
    model: "sonnet",
    appendSystemPrompt: "You are terse. Answer in at most 2 sentences. No emojis.",
    tools: [], // pure text generation — no tools needed for this prompt
    maxBudgetUsd: 0.25,
  });

  console.log("Result:    ", res.result);
  console.log("Session:   ", res.sessionId);
  console.log("Cost (USD):", res.costUsd, "(estimate; not billed on a subscription)");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
