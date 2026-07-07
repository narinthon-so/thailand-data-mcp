import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ATTRIBUTION_GEOGRAPHY } from "../constants.js";
import { normalizeAddress, provinces } from "../services/geography.js";

const AddressNormalizeInputSchema = z
  .object({
    address: z
      .string()
      .min(2, "Address text is required")
      .max(500, "Address must not exceed 500 characters")
      .describe(
        "Free-text Thai address in Thai or English, e.g. '400/22 ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กทม 10400'. Partial addresses work — more components give higher confidence."
      ),
  })
  .strict();

const ListProvincesInputSchema = z.object({}).strict();

export function registerAddressTools(server: McpServer): void {
  server.registerTool(
    "thai_address_normalize",
    {
      title: "Normalize Thai Address",
      description: `Parse free-text Thai addresses (Thai or English) into the official administrative hierarchy: province (จังหวัด) → district (อำเภอ/เขต) → subdistrict (ตำบล/แขวง) → postal code, with bilingual names and official codes.

Handles common written forms: abbreviations (ต./อ./จ., กทม.), Bangkok's แขวง/เขต terminology, missing components, and postcode-only inputs. Matching is dictionary-based against the complete official geography (77 provinces, 928 districts, 7,436 subdistricts).

Args:
  - address (string): free-text address, 2-500 chars

Returns structured JSON:
  {
    "province":    { "code": number, "nameTh": string, "nameEn": string } | null,
    "district":    { ... } | null,
    "subdistrict": { ... } | null,
    "postalCode": number | null,
    "confidence": "high" | "medium" | "low" | "ambiguous" | "none",
    "streetHint": string | null,     // residual text after removing administrative parts (house no., road, soi)
    "warnings": string[],            // e.g. postcode/subdistrict mismatch
    "candidates": [...]              // present when confidence = "ambiguous"; add district/postcode and retry
  }

Examples:
  - Use when: filling a shipping form from a customer's pasted address
  - Use when: validating that district/province/postcode in a record are consistent
  - Use when: deduplicating customer records with differently-written addresses
  - Don't use when: you need geocoding to lat/long (not provided)

Error handling: confidence "none" means nothing matched — the text may not be a Thai address.`,
      inputSchema: AddressNormalizeInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ address }) => {
      const match = normalizeAddress(address);
      const output = { ...match, attribution: ATTRIBUTION_GEOGRAPHY };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    "thai_list_provinces",
    {
      title: "List Thai Provinces",
      description: `List all 77 Thai provinces with official codes and bilingual names.

Returns structured JSON: { "count": 77, "provinces": [{ "code": number, "nameTh": string, "nameEn": string }] }

Use when you need the canonical province list for validation, dropdowns, or mapping Thai/English province spellings.`,
      inputSchema: ListProvincesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const output = {
        count: provinces.length,
        provinces: provinces.map((p) => ({
          code: p.provinceCode,
          nameTh: p.provinceNameTh,
          nameEn: p.provinceNameEn,
        })),
        attribution: ATTRIBUTION_GEOGRAPHY,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );
}
