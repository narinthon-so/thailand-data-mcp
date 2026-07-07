#!/usr/bin/env node
/**
 * thailand-data-mcp-server — local entry point (no billing).
 *
 * Tools:
 *  - thai_company_lookup    — official DBD company registry (live, cached)
 *  - thai_address_normalize — free text → province/district/subdistrict/postcode
 *  - thai_list_provinces    — canonical province list
 *  - thai_holidays          — public holidays reference
 *  - thai_vat_reference     — VAT / withholding tax basics
 *
 * Transport: stdio (default) or streamable HTTP (TRANSPORT=http, stateless).
 * For the monetized Apify Standby entry point, see apify-main.ts.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";

async function runStdio(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("thailand-data-mcp-server running via stdio");
}

async function runHttp(): Promise<void> {
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );
  const { createServer } = await import("node:http");

  const port = parseInt(process.env.PORT ?? "3000", 10);
  const httpServer = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/mcp") {
      res.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      res.writeHead(400).end(JSON.stringify({ error: "invalid JSON" }));
      return;
    }
    // Stateless: fresh server+transport per request, no session state
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  });

  httpServer.listen(port, "127.0.0.1", () => {
    console.error(`thailand-data-mcp-server running on http://127.0.0.1:${port}/mcp`);
  });
}

const main = process.env.TRANSPORT === "http" ? runHttp : runStdio;
main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
