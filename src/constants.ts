export const DBD_API_BASE_URL = "https://openapi.dbd.go.th/api/v1";

export const CHARACTER_LIMIT = 25000;

/** DBD registry cache: registry data changes slowly; caching also keeps request
 *  rates polite toward the WAF-fronted upstream and keeps the service alive if
 *  the upstream is temporarily unavailable. */
export const DBD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const DBD_CACHE_MAX_ENTRIES = 5000;

export const REQUEST_TIMEOUT_MS = 30000;

/** Required by DGA Open Government License: attribution must accompany every
 *  use of the data. Do not remove from responses. */
export const ATTRIBUTION_DBD =
  "Source: Department of Business Development (DBD), Ministry of Commerce, Thailand — data used under the DGA Open Government License (data.go.th)";

export const ATTRIBUTION_GEOGRAPHY =
  "Source: thailand-geography-data/thailand-geography-json (MIT License), derived from official Thai geographic data";

export const DISCLAIMER_REFERENCE_DATA =
  "Bundled reference data. Verify critical values against official announcements (Royal Gazette / Revenue Department / Bank of Thailand).";
