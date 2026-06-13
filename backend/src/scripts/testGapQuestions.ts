/**
 * Fast, no-HTTP test harness for pipeline steps 2 + 3 (gap analysis +
 * question generation).
 *
 * Usage:
 *   npm run test:gap-questions
 *
 * Feeds a fixed reverse spec plus TWO timestamped original-spec versions where
 * the newer version reverses an older decision. This exercises:
 *   - latest-spec prioritization (the superseded decision must NOT raise a gap),
 *   - JSON gap output on the 3-type taxonomy,
 *   - one structured question per gap merged onto the gap with an empty answer.
 *
 * Requires a Claude subscription login. No `gh` or network needed.
 */

import { compareSpec } from "../services/compareService.js";
import type { SpecVersion } from "../prompts/gapAnalysis.js";
import { GAP_TYPES } from "../prompts/gapAnalysis.js";

// What the code actually does (would normally come from Step 1).
const REVERSE_SPEC = `The notification scheduler dispatches queued notifications every 4 hours in
batches of 100. Failed deliveries are retried with exponential backoff capped at
15 minutes. A metrics endpoint exposes queue depth and dispatch latency. There is
no per-user rate limiting.`;

// OLD spec (superseded): demands hourly dispatch and a 5-minute backoff cap.
const SPEC_V1: SpecVersion = {
  label: "spec-2024-01-10.md",
  uploadedAt: "2024-01-10T09:00:00.000Z",
  content: `Notifications must be dispatched every HOUR. Retries use exponential backoff
capped at 5 minutes. Batches contain up to 100 notifications.`,
};

// NEW spec (authoritative): the team revised the cadence to every 4 hours and
// the backoff cap to 15 minutes. These supersede V1 — so the implementation
// matching them must NOT be reported as a gap.
const SPEC_V2: SpecVersion = {
  label: "spec-2024-03-22.md",
  uploadedAt: "2024-03-22T14:30:00.000Z",
  content: `Notifications must be dispatched every 4 HOURS (revised from the earlier hourly
cadence after provider guidance changed). Retries use exponential backoff capped
at 15 minutes. Batches contain up to 100 notifications. Every dispatch run must
write an audit record.`,
};

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`\n❌ ASSERTION FAILED: ${msg}`);
    process.exitCode = 1;
  } else {
    console.error(`✓ ${msg}`);
  }
}

async function main(): Promise<void> {
  console.error("Running gap analysis + question generation on 2 spec versions (latest wins)...\n");

  const { gaps, meta } = await compareSpec([SPEC_V1, SPEC_V2], REVERSE_SPEC);

  console.log("=== Resolved gaps (frontend-ready JSON) ===");
  console.log(JSON.stringify(gaps, null, 2));
  console.log("\n=== Run metadata ===");
  console.log(JSON.stringify(meta, null, 2));

  console.error("\n--- Validating output shape ---");
  for (const g of gaps) {
    assert(typeof g.id === "string" && !!g.id, `gap "${g.title}" has an id`);
    assert((GAP_TYPES as readonly string[]).includes(g.type), `gap "${g.title}" type "${g.type}" is in the 3-type taxonomy`);
    assert(["low", "medium", "high"].includes(g.severity), `gap "${g.title}" has a valid severity`);
    assert(typeof g.question === "string" && g.question.trim().length > 0, `gap "${g.title}" has a question`);
    assert(g.answer === "", `gap "${g.title}" answer starts empty`);
  }

  console.error("\n--- Validating latest-spec prioritization ---");
  const text = JSON.stringify(gaps).toLowerCase();
  // V2 (authoritative) matches the code on cadence (4h) and backoff (15m), so
  // neither should be raised as a gap against the latest spec.
  assert(!text.includes("hour"), "no gap demands hourly cadence (superseded V1 decision ignored)");
  assert(!text.includes("5 minute") && !text.includes("5-minute") && !text.includes("five minute"),
    "no gap demands a 5-minute backoff cap (superseded V1 decision ignored)");

  console.error(`\nDone. ${gaps.length} gap(s) produced.`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
