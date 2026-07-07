import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DISCLAIMER_REFERENCE_DATA } from "../constants.js";
import { HOLIDAYS, VAT_REFERENCE } from "../reference-data.js";

const availableYears = Object.keys(HOLIDAYS).map(Number).sort();

const HolidaysInputSchema = z
  .object({
    year: z
      .number()
      .int()
      .refine((y) => availableYears.includes(y), {
        message: `Year must be one of: ${availableYears.join(", ")}`,
      })
      .describe(`Calendar year. Available: ${availableYears.join(", ")}`),
  })
  .strict();

const VatReferenceInputSchema = z.object({}).strict();

export function registerReferenceTools(server: McpServer): void {
  server.registerTool(
    "thai_holidays",
    {
      title: "Thai Public Holidays",
      description: `List Thai public holidays for a given year (${availableYears.join(", ")}), with dates, Thai/English names, and a flag for lunar-calendar holidays.

Args:
  - year (number): one of ${availableYears.join(", ")}

Returns structured JSON:
  { "year": number, "count": number, "holidays": [{ "date": "YYYY-MM-DD", "nameEn": string, "nameTh": string, "lunar": boolean }], "disclaimer": string }

Use when scheduling anything in Thailand: payment due dates, meeting planning, delivery estimates, contract deadlines. Lunar holidays (lunar: true) are fixed by annual announcement — verify for critical deadlines. Bank holidays can differ slightly from public holidays (Bank of Thailand publishes its own list).`,
      inputSchema: HolidaysInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ year }) => {
      const holidays = HOLIDAYS[year];
      const output = {
        year,
        count: holidays.length,
        holidays,
        disclaimer: DISCLAIMER_REFERENCE_DATA,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    "thai_vat_reference",
    {
      title: "Thai VAT & Withholding Tax Reference",
      description: `Reference card for Thai VAT and withholding tax (WHT) basics: standard VAT rate, registration threshold, filing forms and deadlines, and common WHT rates by payment category (services, rent, advertising, transport, dividends, etc.).

No arguments.

Returns structured JSON with "vat", "withholdingTax" (rates table + certificate requirement), and "disclaimers".

Use when: computing invoice amounts involving Thai WHT deduction, checking whether a business must register for VAT, or explaining the 50 ทวิ withholding certificate. Reference only — NOT tax advice; verify with the Revenue Department for filings.`,
      inputSchema: VatReferenceInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const output = { ...VAT_REFERENCE, disclaimer: DISCLAIMER_REFERENCE_DATA };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );
}
