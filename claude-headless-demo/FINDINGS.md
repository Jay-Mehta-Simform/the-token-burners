# Findings: Can we invoke Claude Code programmatically?

**Question:** Can we drive Claude Code from code with a custom system prompt and
a restricted tool set, non-interactively (no REPL that hangs waiting for input),
using a Claude *subscription* (no API key)?

**Answer: Yes — fully.** All claims below were verified by running the bundled
demo against **Claude Code v2.1.177** on macOS.

## What works (verified)

| Capability | Verified how | Verdict |
|---|---|---|
| Non-interactive run that auto-exits | `-p`/`--print`; demo exits cleanly | ✅ |
| Subscription auth, no API key | Ran with only the OAuth login present | ✅ |
| Custom system prompt | `--append-system-prompt` / `--system-prompt` honored | ✅ |
| Restricted tool set | `--tools "Read,Glob,Bash"` limited capabilities | ✅ |
| Permission scoping | `--allowedTools`/`--disallowedTools` + `--permission-mode` | ✅ |
| Structured JSON result | `--output-format json` → `result`, `session_id`, cost, turns | ✅ |
| Streaming events | `--output-format stream-json --verbose` consumed live | ✅ |
| Multi-turn / stateful | `--resume <session_id>` preserved context (7×6 → 42) | ✅ |
| Reliable JSON output | "JSON only" prompt + parse + validate | ✅ |
| Custom tools via MCP | `--mcp-config` + `mcp__<server>__<tool>` (wiring shown) | ✅ |

## Gotchas discovered (these would have bitten a naive integration)

1. **Variadic flags swallow a trailing prompt.** `--tools`, `--allowedTools`,
   `--add-dir`, and `--mcp-config` consume *all* following args. A prompt placed
   after them is parsed as a tool name and the run fails with "Input must be
   provided…". **Fix used:** always pipe the prompt via **stdin**, never as a
   trailing positional arg.

2. **`--json-schema` does not reliably force schema-shaped output** on v2.1.177 —
   the model can still return prose. **Fix used:** instruct "JSON only" in the
   prompt and validate the parsed object in our own code.

3. **`--bare` breaks subscription auth** (forces API-key/`apiKeyHelper`). Never
   set it when relying on the subscription token.

4. **`total_cost_usd` is an estimate for visibility, not a real charge** on a
   subscription. Use `--max-budget-usd` as a runaway guard regardless.

5. **No interactive approver in headless mode.** Anything not pre-allowed is
   effectively blocked — design the allowlist/permission-mode deliberately.

6. **Unattended environments** (CI/cron) may lack an interactive OAuth session;
   provision a long-lived token once with `claude setup-token`.

## Recommendation

For most app needs, spawning the CLI with the wrapper in `lib/claude-runner.js`
is sufficient and quick. Move to the **Claude Agent SDK** only when you need
in-process custom tools, programmatic permission callbacks, or typed streaming
in a long-lived service. See `IMPLEMENTATION-GUIDE.md` for patterns and a
production checklist.
