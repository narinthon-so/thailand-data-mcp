/**
 * Apify Standby entry point — monetized deployment.
 *
 * Runs the MCP server over streamable HTTP at /mcp (stateless, fresh
 * server+transport per request) and charges pay-per-event on paid tools:
 *   company-lookup, address-normalize (reference tools stay free).
 *
 * Charging only happens on the Apify platform (Actor.isAtHome()); local runs
 * of this entry are free, so the same image can be smoke-tested anywhere.
 */
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Actor, log } from "apify";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { buildServer, type ChargeFn } from "./server.js";

await Actor.init();

// Apify auto-tests published Actors daily with a default (non-standby) run and
// expects a non-empty default dataset within minutes. A standby web server
// would just wait and fail that test — so for platform runs that are NOT
// standby, emit one informational item and exit successfully instead.
if (Actor.isAtHome() && Actor.getEnv().metaOrigin !== "STANDBY") {
  await Actor.pushData({
    note: "This Actor is an MCP server and runs in Standby mode.",
    usage:
      "Connect an MCP client to the standby endpoint (POST /mcp) or via mcp.apify.com. Tools: thai_company_lookup, thai_address_normalize, thai_list_provinces, thai_holidays, thai_vat_reference.",
  });
  await Actor.exit("Standby MCP server — nothing to do in a standard run.");
}

const charge: ChargeFn = async (eventName) => {
  if (!Actor.isAtHome()) {
    log.info(`[local] would charge event: ${eventName}`);
    return;
  }
  const result = await Actor.charge({ eventName });
  if (result.eventChargeLimitReached) {
    // Surfaced to the calling agent as a tool error by the tool's catch path.
    throw new Error(
      "Charge limit reached for this run. Raise the Actor's max charge limit to continue using paid tools."
    );
  }
};

const app = express();
app.use(express.json());
app.use(cors({ origin: "*", exposedHeaders: ["Mcp-Session-Id"] }));

// Apify Standby readiness probe
app.get("/", (req: Request, res: Response) => {
  if (req.headers["x-apify-container-server-readiness-probe"]) {
    res.end("ok\n");
    return;
  }
  res
    .status(200)
    .type("text/plain")
    .end(
      "thailand-data-mcp-server — MCP endpoint at POST /mcp\n" +
        "Tools: thai_company_lookup, thai_address_normalize, thai_list_provinces, thai_holidays, thai_vat_reference\n"
    );
});

app.post("/mcp", async (req: Request, res: Response) => {
  const server = buildServer(charge);
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    log.error("Error handling MCP request", { error });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

for (const method of ["get", "delete"] as const) {
  app[method]("/mcp", (_req: Request, res: Response) => {
    res
      .writeHead(405)
      .end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method not allowed." },
          id: null,
        })
      );
  });
}

const port = parseInt(process.env.APIFY_CONTAINER_PORT ?? "3000", 10);
app.listen(port, () => {
  log.info(`thailand-data-mcp-server (Apify standby) listening on port ${port}`);
});

process.on("SIGINT", () => {
  process.exit(0);
});
