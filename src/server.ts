import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAddressTools } from "./tools/address.js";
import { registerCompanyTools } from "./tools/company.js";
import { registerReferenceTools } from "./tools/reference.js";

/**
 * Fired by paid tools at their charge points. Implementations: no-op for
 * local/stdio use, Actor.charge() on Apify. Must throw ChargeLimitError
 * (or reject) to abort the tool call when the caller's budget is exhausted.
 */
export type ChargeFn = (eventName: "company-lookup" | "address-normalize") => Promise<void>;

export const noopCharge: ChargeFn = async () => {};

export function buildServer(charge: ChargeFn = noopCharge): McpServer {
  const server = new McpServer({
    name: "thailand-data-mcp-server",
    version: "0.1.0",
  });
  registerCompanyTools(server, charge);
  registerAddressTools(server, charge);
  registerReferenceTools(server);
  return server;
}
