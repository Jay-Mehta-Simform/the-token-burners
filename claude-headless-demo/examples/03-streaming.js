/**
 * Example 03 — Streaming output (token-by-token / event-by-event).
 *
 * Uses `--output-format stream-json`, which emits newline-delimited JSON events
 * as the run progresses. Ideal for live UIs, progress bars, or logging.
 *
 * Run: node claude-headless-demo/examples/03-streaming.js "explain async/await"
 */

const { streamClaude } = require("../lib/claude-runner");

async function main() {
  const prompt =
    process.argv.slice(2).join(" ") ||
    "Explain JavaScript promises in 3 short sentences.";

  let finalResult = null;

  for await (const event of streamClaude({
    prompt,
    model: "sonnet",
    tools: [],
    appendSystemPrompt: "Be clear and concise.",
  })) {
    switch (event.type) {
      case "system":
        if (event.subtype === "init") {
          console.error(`[init] session=${event.session_id} model=${event.model ?? "?"}`);
        }
        break;

      case "assistant": {
        // Stream the assistant's text chunks as they arrive.
        const parts = event.message?.content ?? [];
        for (const p of parts) {
          if (p.type === "text") process.stdout.write(p.text);
        }
        break;
      }

      case "result":
        finalResult = event;
        break;
    }
  }

  console.log("\n\n---");
  if (finalResult) {
    console.error(
      `[done] cost=$${finalResult.total_cost_usd} turns=${finalResult.num_turns}`,
    );
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
