/**
 * claude-runner.js — a small, dependency-free wrapper around the Claude Code
 * CLI for programmatic (headless) use.
 *
 * Verified against Claude Code v2.1.177.
 *
 * WHY THIS EXISTS
 * ---------------
 * The `claude` binary normally opens an interactive REPL. Passing `--print`
 * turns it into a one-shot command that prints a result and exits — perfect for
 * calling from application code, scripts, or CI. This module wraps the spawn +
 * argument-building + output-parsing so the rest of your app deals with plain
 * JS objects instead of CLI strings.
 *
 * AUTH
 * ----
 * Uses whatever the local `claude` login is — including a Claude *subscription*
 * (OAuth token from the keychain). No API key is injected. The only thing that
 * breaks subscription auth is the `--bare` flag, which this module never sets.
 * For unattended environments, run `claude setup-token` once to mint a
 * long-lived subscription token.
 *
 * EXPORTS
 * -------
 *   runClaude(opts)        -> Promise<{ result, sessionId, costUsd, raw, ... }>
 *   streamClaude(opts)     -> async generator yielding parsed stream-json events
 *   buildArgs(opts)        -> string[]  (the argv we would pass to `claude`)
 */

const { spawn } = require("node:child_process");

/**
 * @typedef {Object} ClaudeOptions
 * @property {string}   prompt                  The user prompt. Required unless `stdin` is given.
 * @property {string}   [stdin]                 Prompt piped via stdin instead of as an argument.
 * @property {string}   [cwd]                   Working directory Claude operates in. Default: process.cwd().
 * @property {string}   [model]                 "opus" | "sonnet" | full id like "claude-sonnet-4-6".
 * @property {string}   [systemPrompt]          REPLACE the default system prompt entirely.
 * @property {string}   [appendSystemPrompt]    ADD to the default system prompt (keeps built-in tool/agent rules).
 * @property {string[]} [tools]                 Whitelist from the built-in tool set, e.g. ["Read","Bash"].
 *                                              Pass [] to disable all tools (pure text generation).
 * @property {string[]} [allowedTools]          Permission-scoped allow patterns, e.g. ["Bash(git *)","Edit"].
 * @property {string[]} [disallowedTools]       Permission-scoped deny patterns.
 * @property {"default"|"acceptEdits"|"bypassPermissions"|"plan"|"dontAsk"} [permissionMode]
 * @property {string[]} [addDirs]               Extra directories Claude may read, e.g. ["../shared"].
 * @property {string[]} [mcpConfigs]            Paths/JSON strings of MCP server configs (adds custom tools).
 * @property {boolean}  [strictMcpConfig]       Only use MCP servers from `mcpConfigs` (ignore global config).
 * @property {Object}   [agents]               Inline custom agent defs, e.g. { reviewer: { description, prompt } }.
 * @property {Object}   [jsonSchema]            JSON Schema to validate/shape the final result.
 * @property {number}   [maxBudgetUsd]          Hard spend cap for the run.
 * @property {string}   [resumeSessionId]       Resume a prior session by id (multi-turn).
 * @property {boolean}  [continueLast]          Continue the most recent session in cwd.
 * @property {string}   [sessionId]             Force a specific session UUID.
 * @property {boolean}  [forkSession]           When resuming, branch into a new session id.
 * @property {Object}   [env]                   Extra env vars merged over process.env.
 */

/**
 * Translate a ClaudeOptions object into the argv array for `claude`.
 * Exposed so callers can log/inspect exactly what would run.
 * The prompt is intentionally NOT included here — it is always sent via stdin.
 * Several CLI flags (`--tools`, `--allowedTools`, `--add-dir`, `--mcp-config`)
 * are *variadic* and would greedily swallow a trailing positional prompt as if
 * it were another value. Piping the prompt via stdin sidesteps that entirely.
 *
 * @param {ClaudeOptions} opts
 * @param {"json"|"text"|"stream-json"} outputFormat
 * @returns {string[]}
 */
function buildArgs(opts, outputFormat) {
  const a = ["--print", "--output-format", outputFormat];

  if (outputFormat === "stream-json") {
    // stream-json requires verbose so every event is emitted.
    a.push("--verbose");
  }

  if (opts.model) a.push("--model", opts.model);

  // System prompt: replace vs append are mutually exclusive in practice.
  if (opts.systemPrompt) a.push("--system-prompt", opts.systemPrompt);
  if (opts.appendSystemPrompt) a.push("--append-system-prompt", opts.appendSystemPrompt);

  // Tool surface.
  if (opts.tools !== undefined) {
    // [] -> "" disables all tools; otherwise comma-join the names.
    a.push("--tools", opts.tools.length ? opts.tools.join(",") : "");
  }
  if (opts.allowedTools?.length) a.push("--allowedTools", opts.allowedTools.join(" "));
  if (opts.disallowedTools?.length) a.push("--disallowedTools", opts.disallowedTools.join(" "));

  // Permissions.
  if (opts.permissionMode) a.push("--permission-mode", opts.permissionMode);

  // Filesystem scope.
  if (opts.addDirs?.length) a.push("--add-dir", ...opts.addDirs);

  // Custom tools via MCP.
  if (opts.mcpConfigs?.length) a.push("--mcp-config", ...opts.mcpConfigs);
  if (opts.strictMcpConfig) a.push("--strict-mcp-config");

  // Inline custom agents.
  if (opts.agents) a.push("--agents", JSON.stringify(opts.agents));

  // Structured output validation.
  if (opts.jsonSchema) a.push("--json-schema", JSON.stringify(opts.jsonSchema));

  // Cost ceiling.
  if (typeof opts.maxBudgetUsd === "number") a.push("--max-budget-usd", String(opts.maxBudgetUsd));

  // Session continuity.
  if (opts.continueLast) a.push("--continue");
  if (opts.resumeSessionId) a.push("--resume", opts.resumeSessionId);
  if (opts.sessionId) a.push("--session-id", opts.sessionId);
  if (opts.forkSession) a.push("--fork-session");

  // NOTE: the prompt is sent via stdin (see runClaude/streamClaude), not here.
  return a;
}

/** Resolve the text to feed via stdin. */
function promptText(opts) {
  const text = opts.stdin !== undefined ? opts.stdin : opts.prompt;
  if (!text) throw new Error("runClaude: provide a `prompt` (or `stdin`)");
  return text;
}

/**
 * Run Claude Code once and resolve with the parsed result.
 * @param {ClaudeOptions} opts
 * @returns {Promise<{result: string, sessionId: string, costUsd: number, numTurns: number, durationMs: number, isError: boolean, raw: object}>}
 */
function runClaude(opts) {
  const args = buildArgs(opts, "json");
  const input = promptText(opts);

  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, {
      cwd: opts.cwd ?? process.cwd(),
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));

    child.stdin.write(input);
    child.stdin.end();

    child.on("error", (err) => reject(new Error(`Failed to spawn claude: ${err.message}`)));

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`claude exited with code ${code}\n${stderr || stdout}`));
      }
      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        return reject(new Error(`Could not parse JSON output:\n${stdout}`));
      }
      resolve({
        result: parsed.result,
        sessionId: parsed.session_id,
        costUsd: parsed.total_cost_usd,
        numTurns: parsed.num_turns,
        durationMs: parsed.duration_ms,
        isError: parsed.is_error,
        raw: parsed,
      });
    });
  });
}

/**
 * Run Claude Code in streaming mode, yielding each parsed stream-json event as
 * it arrives. Useful for live UIs / token-by-token display.
 *
 * Each yielded object is a Claude Code event, e.g.:
 *   { type: "system", subtype: "init", ... }
 *   { type: "assistant", message: { content: [...] } }
 *   { type: "result", subtype: "success", result, total_cost_usd, session_id }
 *
 * @param {ClaudeOptions} opts
 * @returns {AsyncGenerator<object>}
 */
async function* streamClaude(opts) {
  const args = buildArgs(opts, "stream-json");
  const input = promptText(opts);
  const child = spawn("claude", args, {
    cwd: opts.cwd ?? process.cwd(),
    env: { ...process.env, ...(opts.env ?? {}) },
    stdio: ["pipe", "pipe", "pipe"],
  });

  child.stdin.write(input);
  child.stdin.end();

  let buffer = "";
  const queue = [];
  let resolveNext = null;
  let done = false;
  let error = null;

  const push = (item) => {
    if (resolveNext) {
      resolveNext(item);
      resolveNext = null;
    } else {
      queue.push(item);
    }
  };

  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let nl;
    // stream-json is newline-delimited JSON: one event per line.
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        push(JSON.parse(line));
      } catch {
        /* ignore non-JSON lines */
      }
    }
  });

  child.stderr.on("data", () => {});
  child.on("error", (err) => {
    error = err;
    done = true;
    if (resolveNext) resolveNext(null);
  });
  child.on("close", () => {
    done = true;
    if (resolveNext) resolveNext(null);
  });

  while (true) {
    if (queue.length) {
      yield queue.shift();
      continue;
    }
    if (done) {
      if (error) throw error;
      return;
    }
    const next = await new Promise((res) => (resolveNext = res));
    if (next !== null) yield next;
  }
}

module.exports = { runClaude, streamClaude, buildArgs };
