# thailand-data-mcp-server

MCP server exposing Thailand data tools for AI agents: official company-registry lookups, Thai address normalization, public holidays, and VAT/withholding-tax reference.

## Tools

| Tool | What it does |
|---|---|
| `thai_company_lookup` | Official DBD registry profile by 13-digit juristic ID: TH/EN name, type, status, registration date, registered/paid-up capital, business objective, registered address. Live data, cached 24h. |
| `thai_address_normalize` | Free-text Thai address (TH/EN) → structured province/district/subdistrict/postcode with official codes, confidence level, ambiguity candidates, and street-part extraction. Fully offline. |
| `thai_list_provinces` | Canonical list of all 77 provinces, bilingual, with codes. |
| `thai_holidays` | Thai public holidays (2025–2026) with lunar-holiday flags. |
| `thai_vat_reference` | VAT rate/threshold/filing + common WHT rates and the 50 ทวิ certificate rule. Reference only, not tax advice. |

## Install & run

```bash
pnpm install
pnpm build
node dist/index.js            # stdio (default)
TRANSPORT=http PORT=3000 node dist/index.js   # streamable HTTP at /mcp (binds 127.0.0.1)
```

Claude Code registration:

```bash
claude mcp add thailand-data -- node /path/to/thailand-data-mcp/dist/index.js
```

No API keys required.

## Example

```
thai_company_lookup {"juristic_id": "0107536000315"}
→ KASIKORNBANK PUBLIC COMPANY LIMITED | บริษัทมหาชนจำกัด | ยังดำเนินกิจการอยู่ | capital 30,246,820,970 THB | ...

thai_address_normalize {"address": "เลขที่ 5 ซอยสุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ"}
→ province กรุงเทพมหานคร / district วัฒนา / subdistrict คลองตันเหนือ / 10110 | confidence: high | street: "เลขที่ 5 ซอยสุขุมวิท 39"
```

## Data sources & licenses

- **Company registry**: [DBD Open Data](https://opendata.dbd.go.th/) `openapi.dbd.go.th` — used under the **DGA Open Government License**, which requires source attribution; every response therefore carries an `attribution` field. Do not strip it.
- **Geography**: [thailand-geography-data/thailand-geography-json](https://github.com/thailand-geography-data/thailand-geography-json) (MIT) — bundled in `data/`.
- **Holidays / VAT**: bundled reference data; verify critical values against official announcements (Royal Gazette, Revenue Department, Bank of Thailand).

## Behavior notes

- DBD lookups are cached in-memory for 24h (registry data changes slowly; also keeps request rates polite toward the WAF-fronted upstream).
- The DBD API mislabels JSON responses as `text/html`; the client parses bodies regardless.
- HTTP 403/429 from upstream = WAF/rate-limit → the tool returns a retry-later error, not a fabricated "not found".
- "Not found" is only reported on the registry's explicit `1004 No data available` status.

## Development

```bash
pnpm dev    # tsx watch
```

Stack: TypeScript, `@modelcontextprotocol/sdk`, Zod. No runtime dependencies beyond the SDK.
