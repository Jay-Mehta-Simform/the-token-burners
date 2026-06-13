/**
 * claudeRunner.ts — TypeScript port of the verified headless Claude Code wrapper
 * (see claude-headless-demo/lib/claude-runner.js).
 *
 * Drives the `claude` CLI non-interactively (`--print`) so application code gets
 * plain objects instead of CLI strings. Uses the local Claude *subscription*
 * login (OAuth) — no API key is injected.
 *
 * Verified safeguards kept from the demo:
 *   - The prompt is ALWAYS sent via stdin, never as a trailing positional arg,
 *     because `--tools`/`--allowedTools`/`--add-dir`/`--mcp-config` are variadic
 *     and would otherwise swallow it.
 *   - We never pass `--bare` (it forces API-key auth and ignores the subscription).
 *
 * Verified against Claude Code v2.1.177.
 */

import { spawn } from "node:child_process";

export type PermissionMode =
  | "default"
  | "acceptEdits"
  | "bypassPermissions"
  | "plan"
  | "dontAsk";

export interface ClaudeOptions {
  /** The user prompt. Required unless `stdin` is given. */
  prompt?: string;
  /** Prompt piped via stdin instead of as an argument. Overrides `prompt`. */
  stdin?: string;
  /** Working directory Claude operates in. Default: process.cwd(). */
  cwd?: string;
  /** "opus" | "sonnet" | full id like "claude-sonnet-4-6". */
  model?: string;
  /** REPLACE the default system prompt entirely. */
  systemPrompt?: string;
  /** ADD to the default system prompt (keeps built-in tool/agent rules). */
  appendSystemPrompt?: string;
  /** Whitelist from the built-in tool set, e.g. ["Read","Bash"]. [] disables all tools. */
  tools?: string[];
  /** Permission-scoped allow patterns, e.g. ["Bash(git *)","Edit"]. */
  allowedTools?: string[];
  /** Permission-scoped deny patterns. */
  disallowedTools?: string[];
  permissionMode?: PermissionMode;
  /** Extra directories Claude may read. */
  addDirs?: string[];
  /** Hard spend cap for the run (runaway guard). */
  maxBudgetUsd?: number;
  /** Resume a prior session by id (multi-turn). */
  resumeSessionId?: string;
  /** Continue the most recent session in cwd. */
  continueLast?: boolean;
  /** Extra env vars merged over process.env. */
  env?: Record<string, string>;
}

export interface ClaudeResult {
  result: string;
  sessionId: string;
  costUsd: number;
  numTurns: number;
  durationMs: number;
  isError: boolean;
  raw: Record<string, unknown>;
}

type OutputFormat = "json" | "text" | "stream-json";

/**
 * Translate ClaudeOptions into the argv array for `claude`.
 * The prompt is intentionally NOT included here — it is always sent via stdin.
 */
export function buildArgs(opts: ClaudeOptions, outputFormat: OutputFormat): string[] {
  const a: string[] = ["--print", "--output-format", outputFormat];

  if (outputFormat === "stream-json") {
    // stream-json requires verbose so every event is emitted.
    a.push("--verbose");
  }

  if (opts.model) a.push("--model", opts.model);

  // System prompt: replace vs append are mutually exclusive in practice.
  if (opts.systemPrompt) a.push("--system-prompt", opts.systemPrompt);
  if (opts.appendSystemPrompt) a.push("--append-system-prompt", opts.appendSystemPrompt);

  // Tool surface. [] -> "" disables all tools; otherwise comma-join the names.
  if (opts.tools !== undefined) {
    a.push("--tools", opts.tools.length ? opts.tools.join(",") : "");
  }
  if (opts.allowedTools?.length) a.push("--allowedTools", opts.allowedTools.join(" "));
  if (opts.disallowedTools?.length) a.push("--disallowedTools", opts.disallowedTools.join(" "));

  if (opts.permissionMode) a.push("--permission-mode", opts.permissionMode);

  if (opts.addDirs?.length) a.push("--add-dir", ...opts.addDirs);

  if (typeof opts.maxBudgetUsd === "number") a.push("--max-budget-usd", String(opts.maxBudgetUsd));

  // Session continuity.
  if (opts.continueLast) a.push("--continue");
  if (opts.resumeSessionId) a.push("--resume", opts.resumeSessionId);

  // NOTE: the prompt is sent via stdin (see runClaude), not here.
  return a;
}

function promptText(opts: ClaudeOptions): string {
  const text = opts.stdin !== undefined ? opts.stdin : opts.prompt;
  if (!text) throw new Error("runClaude: provide a `prompt` (or `stdin`)");
  return text;
}

/**
 * Run Claude Code once and resolve with the parsed result.
 */
export function runClaude(opts: ClaudeOptions): Promise<ClaudeResult> {
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
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        return reject(new Error(`Could not parse JSON output:\n${stdout}`));
      }
      resolve({
        result: String(parsed.result ?? ""),
        sessionId: String(parsed.session_id ?? ""),
        costUsd: Number(parsed.total_cost_usd ?? 0),
        numTurns: Number(parsed.num_turns ?? 0),
        durationMs: Number(parsed.duration_ms ?? 0),
        isError: Boolean(parsed.is_error),
        raw: parsed,
      });
    });
  });
}

/**
 * Run Claude Code in streaming mode, yielding each parsed stream-json event.
 * Provided for future use (e.g. streaming progress to a UI). Not used by the
 * reverse-spec endpoint, which uses the one-shot `runClaude`.
 */
export async function* streamClaude(opts: ClaudeOptions): AsyncGenerator<Record<string, unknown>> {
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
  const queue: Record<string, unknown>[] = [];
  let resolveNext: ((item: Record<string, unknown> | null) => void) | null = null;
  let done = false;
  let error: Error | null = null;

  const push = (item: Record<string, unknown>) => {
    if (resolveNext) {
      resolveNext(item);
      resolveNext = null;
    } else {
      queue.push(item);
    }
  };

  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let nl: number;
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
      yield queue.shift() as Record<string, unknown>;
      continue;
    }
    if (done) {
      if (error) throw error;
      return;
    }
    const next = await new Promise<Record<string, unknown> | null>((res) => (resolveNext = res));
    if (next !== null) yield next;
  }
}
