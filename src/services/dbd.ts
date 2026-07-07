/**
 * Client for the DBD (Department of Business Development) open API.
 * Endpoint: https://openapi.dbd.go.th/api/v1/juristic_person/{13-digit-id}
 * Open access, no API key. Fronted by a WAF — keep request rates polite,
 * which the TTL cache below also enforces.
 */
import {
  DBD_API_BASE_URL,
  DBD_CACHE_MAX_ENTRIES,
  DBD_CACHE_TTL_MS,
  REQUEST_TIMEOUT_MS,
} from "../constants.js";
import type { CompanyProfile } from "../types.js";

interface CacheEntry {
  value: CompanyProfile | null; // null = confirmed not found
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): CacheEntry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry;
}

function cacheSet(key: string, value: CompanyProfile | null): void {
  if (cache.size >= DBD_CACHE_MAX_ENTRIES) {
    // Evict oldest entry (Map preserves insertion order)
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + DBD_CACHE_TTL_MS });
}

/** Error with a message safe and useful to surface to the calling agent. */
export class DbdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbdError";
  }
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return null;
}

/** Extract a text field from DBD's nested code/text objects,
 *  e.g. {"cr:CityCode":"1014","cr:CityTextTH":"เขตพญาไท"}. */
function nestedText(value: unknown, textKey: string): string | null {
  if (value && typeof value === "object") {
    return text((value as Record<string, unknown>)[textKey]);
  }
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Flatten the DBD response's namespaced (cd:/td:/cr:) structure. */
function parseProfile(raw: Record<string, unknown>): CompanyProfile {
  const person = (raw["cd:OrganizationJuristicPerson"] ?? {}) as Record<string, unknown>;
  const objectiveWrap = person["cd:OrganizationJuristicObjective"] as
    | Record<string, unknown>
    | undefined;
  const objective = objectiveWrap?.["td:JuristicObjective"] as
    | Record<string, unknown>
    | undefined;
  const addressWrap = person["cd:OrganizationJuristicAddress"] as
    | Record<string, unknown>
    | undefined;
  const address = addressWrap?.["cr:AddressType"] as Record<string, unknown> | undefined;

  return {
    juristicId: text(person["cd:OrganizationJuristicID"]) ?? "",
    nameTh: text(person["cd:OrganizationJuristicNameTH"]),
    nameEn: text(person["cd:OrganizationJuristicNameEN"]),
    type: text(person["cd:OrganizationJuristicType"]),
    status: text(person["cd:OrganizationJuristicStatus"]),
    registerDate: text(person["cd:OrganizationJuristicRegisterDate"]),
    registeredCapitalBaht: num(person["cd:OrganizationJuristicRegisterCapital"]),
    paidUpCapitalBaht: num(person["cd:OrganizationJuristicPaidUpCapital"]),
    objective: objective
      ? {
          code: text(objective["td:JuristicObjectiveCode"]),
          textTh: text(objective["td:JuristicObjectiveTextTH"]),
          textEn: text(objective["td:JuristicObjectiveTextEN"]),
        }
      : null,
    branchName: text(person["cd:OrganizationJuristicBranchName"]),
    address: address
      ? {
          full: text(address["cd:Address"]),
          addressNo: text(address["cd:AddressNo"]),
          moo: text(address["cd:Moo"]),
          soi: text(address["cd:Soi"]),
          road: text(address["cd:Road"]),
          subdistrict: nestedText(address["cd:CitySubDivision"], "cr:CitySubDivisionTextTH"),
          district: nestedText(address["cd:City"], "cr:CityTextTH"),
          province: nestedText(address["cd:CountrySubDivision"], "cr:CountrySubDivisionTextTH"),
        }
      : null,
  };
}

export interface DbdLookupResult {
  profile: CompanyProfile | null; // null = not found in registry
  fromCache: boolean;
}

export async function lookupJuristicPerson(juristicId: string): Promise<DbdLookupResult> {
  const cached = cacheGet(juristicId);
  if (cached) return { profile: cached.value, fromCache: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${DBD_API_BASE_URL}/juristic_person/${juristicId}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "thailand-data-mcp-server/0.1",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new DbdError(
        "DBD API request timed out after 30s. The registry may be slow or unavailable — retry shortly."
      );
    }
    throw new DbdError(
      `Could not reach the DBD API (network error). The registry may be temporarily unavailable. Detail: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429 || response.status === 403) {
    throw new DbdError(
      `DBD API blocked the request (HTTP ${response.status}, WAF/rate limit). Wait before retrying; results are cached for 24h once fetched.`
    );
  }
  if (!response.ok) {
    throw new DbdError(
      `DBD API returned HTTP ${response.status}. The registry may be temporarily unavailable — retry shortly.`
    );
  }

  // The API labels JSON responses as text/html, so content-type cannot be
  // trusted — parse first, and only treat unparseable bodies (WAF challenge
  // pages are HTML) as errors.
  const rawBody = await response.text();
  let body: {
    status?: { code?: string; description?: string };
    data?: Array<Record<string, unknown>>;
  };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    throw new DbdError(
      "DBD API returned a non-JSON response (likely a WAF challenge from too many requests). Wait and retry."
    );
  }

  const statusCode = body.status?.code;
  if (statusCode !== "1000" || !Array.isArray(body.data) || body.data.length === 0) {
    // Registry answered but has no record for this ID
    cacheSet(juristicId, null);
    return { profile: null, fromCache: false };
  }

  const profile = parseProfile(body.data[0]);
  cacheSet(juristicId, profile);
  return { profile, fromCache: false };
}
