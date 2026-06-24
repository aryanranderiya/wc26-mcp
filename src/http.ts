#!/usr/bin/env node

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { buildServer } from "./server.js";

// ── Streamable HTTP entry point ─────────────────────────────────────
//
// Serves the MCP protocol over HTTP for hosted deployments (Manufact,
// Smithery, etc.). Runs in stateless mode: each request gets its own
// server + transport, so there is no shared session state to leak
// across clients. The server exposes no per-session data — every tool
// is a pure read over static tournament data — so stateless is exact.

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const MCP_PATH = "/mcp";

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}

async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  const body = req.method === "POST" ? await readJsonBody(req) : undefined;
  await transport.handleRequest(req, res, body);
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

const httpServer = createServer((req, res) => {
  const url = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`,
  );

  if (url.pathname === "/" || url.pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "wc26-mcp",
      endpoint: MCP_PATH,
    });
    return;
  }

  if (url.pathname === MCP_PATH) {
    handleMcpRequest(req, res).catch((err) => {
      console.error("MCP request error:", err);
      if (!res.headersSent) {
        sendJson(res, 500, {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

httpServer.listen(PORT, HOST, () => {
  console.error(
    `wc26-mcp HTTP server listening on http://${HOST}:${PORT}${MCP_PATH}`,
  );
});
