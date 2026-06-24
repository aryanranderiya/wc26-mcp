#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { buildServer } from "./server.js";

// ── Start server (stdio) ────────────────────────────────────────────
//
// Default entry point: communicates over stdio for local MCP clients
// (Claude Desktop, `npx wc26-mcp`, etc.). For a hosted HTTP deployment
// use `dist/http.js` instead.

async function main() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
