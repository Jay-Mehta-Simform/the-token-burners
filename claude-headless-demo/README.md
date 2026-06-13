# Claude Code — Headless / Programmatic Invocation Demo

Can we invoke Claude Code with a custom system prompt and a restricted tool set,
non-interactively, from code? **Yes.** This folder proves it and shows how.

> Verified against **Claude Code v2.1.177**. Uses your **subscription** login —
> no Anthropic API key required.

## TL;DR

```bash
# 30-second smoke test
node claude-headless-demo/run-claude.js
node claude-headless-demo/run-claude.js "summarize backend/src/index.ts"
```

The key flag is **`-p` / `--print`**: it runs one turn, prints the result, and
exits — so Claude Code never opens the interactive REPL that waits for input
forever. That's the "CI mode" you were asking about.

## What's here

| File | Purpose |
|---|---|
| **`FINDINGS.md`** | Investigation results — what works, plus the gotchas we hit. |
| **`IMPLEMENTATION-GUIDE.md`** | How to embed Claude Code in a project, patterns, prod checklist. |
| `lib/claude-runner.js` | Reusable, dependency-free wrapper: `runClaude`, `streamClaude`, `buildArgs`. |
| `run-claude.js` | Minimal end-to-end example. |
| `examples/01-basic.js` | Custom system prompt + JSON result. |
| `examples/02-restricted-tools.js` | Locked-down tools + safe permissions. |
| `examples/03-streaming.js` | Live `stream-json` event consumption. |
| `examples/04-multi-turn.js` | Stateful chat via session resume. |
| `examples/05-structured-output.js` | Schema-validated JSON output. |
| `examples/06-mcp-custom-tools.js` | Add your own tools via MCP. |

Run any example with `node claude-headless-demo/examples/<file>.js`.

## Auth: subscription, not API key

- The spawned `claude` reuses your existing OAuth login (the same one the
  interactive app uses). Nothing extra needed locally.
- **Do NOT use `--bare`** — it forces API-key auth and ignores the subscription
  token.
- For CI/servers, run `claude setup-token` once to mint a long-lived token.
- `total_cost_usd` in the output is an estimate for visibility, **not** a charge
  on a subscription.

## Flag cheat-sheet (v2.1.177)

| Goal | Flag |
|---|---|
| Non-interactive, print & exit | `-p`, `--print` |
| Output format | `--output-format text\|json\|stream-json` |
| Replace system prompt | `--system-prompt "<text>"` |
| Append to system prompt | `--append-system-prompt "<text>"` |
| System prompt from file | `--system-prompt-file` / `--append-system-prompt-file` |
| Limit built-in tools | `--tools "Read,Bash,Edit"` (`""` none, `"default"` all) |
| Permission-scoped allow/deny | `--allowedTools` / `--disallowedTools` (e.g. `"Bash(git *)"`) |
| Approval behavior | `--permission-mode default\|acceptEdits\|bypassPermissions\|plan\|dontAsk` |
| Custom tools (MCP) | `--mcp-config <file/json>` (+ `--strict-mcp-config`) |
| Inline custom agents | `--agents '{"reviewer":{"description":"...","prompt":"..."}}'` |
| Model | `--model opus\|sonnet\|<full-id>` |
| Spend cap | `--max-budget-usd <amt>` |
| Structured output | "JSON only" prompt + parse (see guide §5b; `--json-schema` is best-effort) |
| Session continuity | `--continue`, `--resume <id>`, `--session-id <uuid>`, `--fork-session` |
| Extra readable dirs | `--add-dir <dirs...>` |
| Settings | `--settings <file-or-json>`, `--setting-sources user,project,local` |
| Streaming input | `--input-format stream-json` |

## `--output-format json` shape

```jsonc
{
  "type": "result",
  "subtype": "success",
  "result": "…assistant's final text…",
  "session_id": "…",          // reuse with --resume
  "num_turns": 3,
  "total_cost_usd": 0.0123,
  "duration_ms": 8421,
  "is_error": false
}
```

## Input options

```bash
claude -p "explain this repo"           # prompt as argument
cat prompt.txt | claude -p              # prompt via stdin
claude -p --input-format stream-json \  # realtime streaming input
  --output-format stream-json
```

See **`IMPLEMENTATION-GUIDE.md`** for integration patterns, the permissions
deep-dive, a production checklist, and when to reach for the Claude Agent SDK
instead.
