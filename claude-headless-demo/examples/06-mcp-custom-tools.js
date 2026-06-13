/**
 * Example 06 — Adding your OWN tools via MCP (Model Context Protocol).
 *
 * Built-in tools (Read/Bash/Edit/...) are not the limit. Any MCP server you
 * point Claude at exposes its tools as `mcp__<server>__<tool>`, which you can
 * then allow like any other tool.
 *
 * This example uses an inline MCP config that references `./mock-mcp-server.js`
 * (a tiny stdio MCP server bundled alongside this file). Replace it with a real
 * server (a database gateway, an internal API, a search index, etc.).
 *
 * Run: node claude-headless-demo/examples/06-mcp-custom-tools.js
 *
 * NOTE: This requires the `@modelcontextprotocol/sdk` package for the demo
 * server to run. If it's not installed, the example explains how. The point is
 * to show the wiring, not to ship a production MCP server.
 */

const path = require("node:path");
const fs = require("node:fs");
const { runClaude } = require("../lib/claude-runner");

async function main() {
  const serverPath = path.resolve(__dirname, "./mock-mcp-server.js");

  // Inline MCP config (could also be a path to a .json file).
  const mcpConfig = JSON.stringify({
    mcpServers: {
      demo: { command: "node", args: [serverPath] },
    },
  });

  try {
    const res = await runClaude({
      prompt: "Use the add_numbers tool to compute 21 + 21, then state the result.",
      model: "sonnet",
      mcpConfigs: [mcpConfig],
      strictMcpConfig: true, // ignore any globally-configured MCP servers
      // Allow only our custom MCP tool.
      tools: ["mcp__demo__add_numbers"],
      allowedTools: ["mcp__demo__add_numbers"],
      maxBudgetUsd: 0.3,
    });
    console.log(res.result);
  } catch (err) {
    if (/Cannot find module|MODULE_NOT_FOUND|modelcontextprotocol/.test(err.message)) {
      console.error(
        "Demo MCP server needs the MCP SDK. Install it first:\n" +
          "  npm i @modelcontextprotocol/sdk\n" +
          "Then re-run this example.",
      );
      return;
    }
    throw err;
  }

  void fs; // (kept for clarity; not otherwise used)
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
