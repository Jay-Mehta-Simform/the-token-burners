/**
 * mock-mcp-server.js — a minimal stdio MCP server exposing a single tool,
 * `add_numbers`, used by example 06 to demonstrate custom tooling.
 *
 * Requires: npm i @modelcontextprotocol/sdk
 *
 * This is intentionally tiny. A real server might wrap your database, an
 * internal REST API, a vector search, etc. The contract is the same: declare
 * tools, handle calls, return content.
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

const server = new McpServer({ name: "demo", version: "1.0.0" });

server.tool(
  "add_numbers",
  "Add two numbers and return the sum.",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  }),
);

const transport = new StdioServerTransport();
server.connect(transport);
