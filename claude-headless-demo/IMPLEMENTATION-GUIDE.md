# Implementation Guide: Embedding Claude Code in a Project

How to drive Claude Code programmatically (headless) from an application, what
it can and can't do, and the integration patterns that work in practice.

> Verified against **Claude Code v2.1.177**. All examples use a **Claude
> subscription** for auth — no Anthropic API key.

---

## 1. The one idea that makes this possible

`claude` is interactive by default and will sit waiting for input forever. The
`-p` / `--print` flag turns it into a one-shot command: it takes a prompt, does
the work, prints a result, and exits. That single flag is what makes it callable
from code, scripts, and CI.

```bash
claude -p "summarize README.md" --output-format json
```

Everything else (system prompts, tools, permissions, sessions) is just flags on
top of that.

---

## 2. Authentication: subscription vs API key

| Mode | How | When |
|---|---|---|
| **Subscription (OAuth)** | Just be logged in (`claude` once interactively). The spawned CLI reuses the keychain token automatically. | Local dev, your own machine. |
| **Long-lived token** | Run `claude setup-token` once (needs a subscription) and store the token where the CLI/keychain can read it. | CI, servers, cron, containers. |
| **API key** | Set `ANTHROPIC_API_KEY`. | When you explicitly want per-call API billing. |

**Pitfalls**

- Do **not** pass `--bare` if you rely on subscription auth — it forces
  API-key-only auth and ignores OAuth.
- `total_cost_usd` in the output is an **estimate for visibility**, not a real
  charge on a subscription. Don't use it for billing; do use `--max-budget-usd`
  as a safety limiter.
- Headless/cron environments may not have an interactive OAuth session —
  provision a token with `setup-token` ahead of time.

---

## 3. Capability matrix

| You want to… | Flag | Wrapper option (`lib/claude-runner.js`) |
|---|---|---|
| Run once and exit | `--print` | always on |
| Get parsed result + cost + session id | `--output-format json` | `runClaude()` |
| Stream events live | `--output-format stream-json --verbose` | `streamClaude()` |
| Replace the system prompt | `--system-prompt` | `systemPrompt` |
| Extend the default system prompt | `--append-system-prompt` | `appendSystemPrompt` |
| Limit which built-in tools exist | `--tools "Read,Bash"` | `tools: [...]` (`[]` = none) |
| Fine-grained allow/deny | `--allowedTools` / `--disallowedTools` | `allowedTools` / `disallowedTools` |
| Control approval behavior | `--permission-mode` | `permissionMode` |
| Add custom tools | `--mcp-config` (+ `--strict-mcp-config`) | `mcpConfigs` / `strictMcpConfig` |
| Define inline subagents | `--agents '{...}'` | `agents` |
| Schema validation (see note §5b) | `--json-schema '{...}'` | `jsonSchema` |
| Pick the model | `--model opus\|sonnet\|<id>` | `model` |
| Cap spend | `--max-budget-usd` | `maxBudgetUsd` |
| Multi-turn / stateful chat | `--resume <id>` / `--continue` | `resumeSessionId` / `continueLast` |
| Widen file access | `--add-dir` | `addDirs` |

---

## 4. Permissions — the thing that bites people

There is **no human to click "Allow"** in headless mode. So any tool call that
would normally prompt is effectively blocked unless you pre-authorize it.

Permission modes:

- `default` — only pre-allowed tools run; everything else is refused.
- `acceptEdits` — auto-approves file edits (Write/Edit), still gates the rest.
- `plan` — read-only; Claude proposes a plan but changes nothing.
- `bypassPermissions` — runs everything without asking. **Sandboxes only.**
- `dontAsk` — proceeds without prompting using configured permissions.

**Recommended posture for app integration:** pick the *narrowest* set.

```js
// Read-only repo analysis — cannot modify anything:
{ tools: ["Read", "Glob", "Grep", "Bash"],
  allowedTools: ["Bash(ls *)", "Bash(cat *)", "Bash(rg *)", "Read", "Glob", "Grep"],
  disallowedTools: ["Edit", "Write"],
  permissionMode: "default" }

// Autonomous code-fixing in a disposable workspace:
{ tools: ["Read", "Edit", "Write", "Bash"],
  permissionMode: "acceptEdits" }   // or bypassPermissions in a sandbox/container
```

---

## 5. Integration patterns

### a) Synchronous request → JSON result (most common)

```js
const { runClaude } = require("./claude-headless-demo/lib/claude-runner");

const { result, sessionId, costUsd } = await runClaude({
  prompt: "Review the diff in CHANGES.md and list risks.",
  appendSystemPrompt: "You are a senior reviewer. Be specific.",
  tools: ["Read"],
});
```

Use in: an Express route, a queue worker, a build step.

### b) Streaming to a UI / log

```js
for await (const ev of streamClaude({ prompt, tools: [] })) {
  if (ev.type === "assistant") pushTextChunksToClient(ev.message.content);
}
```

Use in: chat UIs, SSE/WebSocket endpoints, long-running tasks with progress.

### c) Stateful multi-turn agent

Capture `sessionId` from turn 1, pass it as `resumeSessionId` on later turns.
The full conversation context is preserved server-side by Claude Code.

### d) Structured extraction / classification

Instruct the model to return **JSON only**, parse `result`, and validate in your
own code. See `examples/05`.

> **§5b — about `--json-schema`:** the flag exists and is intended for schema
> validation, but on v2.1.177 it did **not** reliably coerce `result` into the
> schema by itself (the model can still return prose). Treat it as best-effort;
> the dependable approach is an explicit "JSON only" prompt plus your own
> `JSON.parse` + validation.

### e) Custom domain tools via MCP

Stand up an MCP server (DB gateway, internal API, search). Point Claude at it
with `mcpConfigs` and allow `mcp__<server>__<tool>`. See `examples/06`.

---

## 6. Production checklist

- [ ] **Auth provisioned for the runtime** (subscription token via `setup-token`
      for servers/CI; interactive login is fine locally).
- [ ] **Tool surface minimized** — only the tools the task needs.
- [ ] **Permission mode chosen deliberately** — never `bypassPermissions`
      outside an isolated sandbox/container.
- [ ] **`--max-budget-usd` set** as a runaway guard, plus a process **timeout**.
- [ ] **`cwd` scoped** to the right directory; use `--add-dir` only when needed.
- [ ] **Untrusted input is sandboxed** — treat prompts from end users as
      potentially adversarial; isolate the filesystem and network.
- [ ] **Errors handled** — non-zero exit, `is_error: true`, budget exceeded,
      and unpar'seable output are all real cases.
- [ ] **Concurrency bounded** — each call spawns a process; pool/limit them.
- [ ] **For unattended jobs**, consider `--no-session-persistence` if you don't
      need resumable sessions.

---

## 7. When to use the Agent SDK instead of spawning the CLI

Spawning the CLI (this demo) is the fastest path and needs nothing beyond the
`claude` binary. Switch to the **Claude Agent SDK**
(`@anthropic-ai/claude-agent-sdk` for TypeScript, or the Python package) when
you want:

- In-process **custom tools** defined as functions (no separate MCP server),
- Programmatic **permission callbacks** (decide allow/deny in your own code),
- Typed streaming events instead of parsing stdout,
- Tighter lifecycle control in a long-lived service.

Both share the same engine and both honor subscription auth. Start with the CLI;
graduate to the SDK when the wiring above starts feeling like a framework you're
re-implementing.

---

## 8. Files in this demo

| File | Purpose |
|---|---|
| `lib/claude-runner.js` | Reusable, dependency-free wrapper (`runClaude`, `streamClaude`, `buildArgs`). |
| `run-claude.js` | 30-second smoke test. |
| `examples/01-basic.js` | Minimal call + custom system prompt. |
| `examples/02-restricted-tools.js` | Locked-down tool surface + permissions. |
| `examples/03-streaming.js` | Live `stream-json` consumption. |
| `examples/04-multi-turn.js` | Session resume for stateful chat. |
| `examples/05-structured-output.js` | Schema-validated JSON output. |
| `examples/06-mcp-custom-tools.js` | Custom tools via an MCP server. |
| `examples/mock-mcp-server.js` | Tiny example MCP server. |
| `README.md` | Flag cheat-sheet + quick start. |
