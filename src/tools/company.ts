import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ATTRIBUTION_DBD } from "../constants.js";
import { DbdError, lookupJuristicPerson } from "../services/dbd.js";
import type { ChargeFn } from "../server.js";

const CompanyLookupInputSchema = z
  .object({
    juristic_id: z
      .string()
      .regex(/^\d{13}$/, "Must be exactly 13 digits (Thai juristic registration number)")
      .describe(
        "13-digit Thai juristic person registration number, e.g. '0107536000315'. Printed on invoices, contracts, and company documents; same number as the company's tax ID."
      ),
  })
  .strict();

export function registerCompanyTools(server: McpServer, charge: ChargeFn): void {
  server.registerTool(
    "thai_company_lookup",
    {
      title: "Thai Company Registry Lookup",
      description: `Look up a Thai company (juristic person) in the official DBD (Department of Business Development) registry by its 13-digit registration number.

Returns the official registry profile: Thai/English name, entity type, operating status, registration date, registered and paid-up capital (THB), business objective (bilingual, with TSIC-style code), and registered head-office address.

Args:
  - juristic_id (string): exactly 13 digits, e.g. "0107536000315"

Returns structured JSON:
  {
    "found": boolean,
    "company": {
      "juristicId": string,
      "nameTh": string, "nameEn": string,
      "type": string,            // e.g. "บริษัทจำกัด" (Co., Ltd.), "บริษัทมหาชนจำกัด" (PCL)
      "status": string,          // e.g. "ยังดำเนินกิจการอยู่" = still operating
      "registerDate": string,    // YYYYMMDD
      "registeredCapitalBaht": number, "paidUpCapitalBaht": number,
      "objective": { "code": string, "textTh": string, "textEn": string },
      "address": { ... }
    } | null,
    "fromCache": boolean,
    "attribution": string
  }

Examples:
  - Use when: verifying a Thai supplier/counterparty exists and is still operating (KYB / due diligence)
  - Use when: fetching official registered capital or address for a contract
  - Don't use when: you only have a company NAME — this tool requires the 13-digit ID (ask the counterparty or check their invoice/website footer)

Notes:
  - "found": false means the ID is not in the registry — it may be mistyped, or the entity may be a sole proprietor (not a juristic person).
  - Data is the live official registry, cached for 24h.`,
      inputSchema: CompanyLookupInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ juristic_id }) => {
      try {
        const { profile, fromCache } = await lookupJuristicPerson(juristic_id);
        // Charge only after the registry answered (found or confirmed
        // not-found) — upstream failures are not billed.
        await charge("company-lookup");
        const output = {
          found: profile !== null,
          company: profile,
          fromCache,
          attribution: ATTRIBUTION_DBD,
        };
        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const message =
          error instanceof DbdError
            ? `Error: ${error.message}`
            : `Error: unexpected failure during DBD lookup: ${error instanceof Error ? error.message : String(error)}`;
        return { isError: true, content: [{ type: "text", text: message }] };
      }
    }
  );
}
