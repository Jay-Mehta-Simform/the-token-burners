/**
 * Example 05 — Getting structured (JSON) output you can rely on.
 *
 * The robust, version-independent way to get machine-readable output is to
 * instruct the model to return ONLY JSON and then parse `result`. We also pin
 * tools to none and a tight system prompt so nothing else gets in the way.
 *
 * (There is also a `--json-schema` flag — exposed as `jsonSchema` in the
 * runner — intended for schema validation. In testing on v2.1.177 it did NOT
 * reliably coerce the result into the schema on its own, so prefer the explicit
 * "JSON only" instruction below and optionally validate the parsed object in
 * your own code.)
 *
 * Run: node claude-headless-demo/examples/05-structured-output.js
 */

const { runClaude } = require("../lib/claude-runner");

// A schema you enforce in YOUR code after parsing (here: a tiny hand check).
function validate(obj) {
  const errs = [];
  if (typeof obj.language !== "string") errs.push("language must be string");
  if (typeof obj.framework !== "string") errs.push("framework must be string");
  if (typeof obj.hasDatabase !== "boolean") errs.push("hasDatabase must be boolean");
  if (typeof obj.summary !== "string") errs.push("summary must be string");
  return errs;
}

async function main() {
  const res = await runClaude({
    prompt:
      "This project is an Express + TypeScript backend using Prisma with PostgreSQL.\n" +
      "Return ONLY a JSON object (no markdown, no prose) with exactly these keys:\n" +
      '  language (string), framework (string), hasDatabase (boolean), summary (string).',
    model: "sonnet",
    tools: [],
    appendSystemPrompt:
      "You output raw JSON only. No code fences, no commentary, no leading text.",
  });

  // Be defensive: strip accidental code fences before parsing.
  const cleaned = res.result.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const data = JSON.parse(cleaned);

  const errors = validate(data);
  if (errors.length) {
    console.error("Schema validation failed:", errors);
    process.exit(1);
  }

  console.log("Parsed & validated object:");
  console.log(data);
  console.log("\nlanguage =", data.language, "| hasDatabase =", data.hasDatabase);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
