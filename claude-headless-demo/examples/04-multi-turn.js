/**
 * Example 04 — Multi-turn conversation via session resume.
 *
 * The first call returns a `sessionId`. Passing it as `resumeSessionId` on the
 * next call continues the SAME conversation with full context — this is how you
 * build a stateful chat / agent loop on top of the CLI.
 *
 * Run: node claude-headless-demo/examples/04-multi-turn.js
 */

const { runClaude } = require("../lib/claude-runner");

async function main() {
  // Turn 1 — establish context.
  const t1 = await runClaude({
    prompt: "My favorite number is 7. Remember it. Reply with just 'ok'.",
    model: "sonnet",
    tools: [],
  });
  console.log("Turn 1:", t1.result, `(session ${t1.sessionId})`);

  // Turn 2 — resume the same session; Claude still knows the number.
  const t2 = await runClaude({
    prompt: "What is my favorite number multiplied by 6?",
    model: "sonnet",
    tools: [],
    resumeSessionId: t1.sessionId,
  });
  console.log("Turn 2:", t2.result);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
