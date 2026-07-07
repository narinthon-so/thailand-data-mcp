/**
 * Thai administrative geography index + heuristic address parser.
 * Data: bundled JSON from thailand-geography-data/thailand-geography-json (MIT),
 * loaded once at startup from the project's data/ directory.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressMatch, District, Province, Subdistrict } from "../types.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data");

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(dataDir, file), "utf8")) as T;
}

export const provinces: Province[] = loadJson<Province[]>("provinces.json");
export const districts: District[] = loadJson<District[]>("districts.json");
export const subdistricts: Subdistrict[] = loadJson<Subdistrict[]>("subdistricts.json");

const districtsByCode = new Map(districts.map((d) => [d.districtCode, d]));
const provincesByCode = new Map(provinces.map((p) => [p.provinceCode, p]));

/** Aliases normalized before matching. Bangkok has many written forms. */
const BANGKOK_ALIASES = /กรุงเทพฯ|กรุงเทพมหานคร|กรุงเทพ|กทม\.?|bangkok|bkk/gi;

/** Administrative prefixes that precede names in written Thai addresses. */
const THAI_PREFIXES =
  /ตำบล|ต\.|แขวง|อำเภอ|อ\.|เขต|จังหวัด|จ\.|ถนน|ถ\.|ซอย|ซ\.|หมู่ที่|หมู่บ้าน|หมู่|ม\.|เลขที่|ตรอก/g;

function normalizeInput(input: string): string {
  return input
    .replace(BANGKOK_ALIASES, "กรุงเทพมหานคร")
    .replace(/\s+/g, " ")
    .trim();
}

/** Case-insensitive containment check that works for Thai (no case) and English. */
function contains(haystackLower: string, name: string): boolean {
  return name.length >= 2 && haystackLower.includes(name.toLowerCase());
}

interface SubdistrictHit {
  sub: Subdistrict;
  matchedName: string;
}

export function normalizeAddress(rawInput: string): AddressMatch {
  const warnings: string[] = [];
  const input = normalizeInput(rawInput);
  const inputLower = input.toLowerCase();

  // 1. Postcode
  const postcodeMatch = input.match(/\b(\d{5})\b/);
  const postalCode = postcodeMatch ? Number(postcodeMatch[1]) : null;

  // 2. Province (longest matching name wins, TH preferred over EN implicitly by length)
  let province: Province | null = null;
  let provinceMatched = "";
  for (const p of provinces) {
    for (const name of [p.provinceNameTh, p.provinceNameEn]) {
      if (contains(inputLower, name) && name.length > provinceMatched.length) {
        province = p;
        provinceMatched = name;
      }
    }
  }

  // 3. Subdistrict candidates (scoped to province when known)
  const foundProvinceCode = province?.provinceCode;
  const subPool =
    foundProvinceCode !== undefined
      ? subdistricts.filter((s) => s.provinceCode === foundProvinceCode)
      : subdistricts;
  let subHits: SubdistrictHit[] = [];
  let longestSub = 0;
  for (const s of subPool) {
    for (const name of [s.subdistrictNameTh, s.subdistrictNameEn]) {
      if (contains(inputLower, name)) {
        if (name.length > longestSub) {
          subHits = [{ sub: s, matchedName: name }];
          longestSub = name.length;
        } else if (name.length === longestSub) {
          subHits.push({ sub: s, matchedName: name });
        }
      }
    }
  }

  // 4. District (scoped to province when known), used to disambiguate subdistricts
  const districtPool =
    foundProvinceCode !== undefined
      ? districts.filter((d) => d.provinceCode === foundProvinceCode)
      : districts;
  let district: District | null = null;
  let districtMatched = "";
  for (const d of districtPool) {
    for (const name of [d.districtNameTh, d.districtNameEn]) {
      // Guard against district name matching inside the already-matched subdistrict
      // name (e.g. subdistrict "คลองตันเหนือ" contains district "คลองตัน").
      if (contains(inputLower, name) && name.length > districtMatched.length) {
        district = d;
        districtMatched = name;
      }
    }
  }

  // 5. Disambiguate subdistrict hits using postcode, then district
  if (subHits.length > 1 && postalCode) {
    const byPost = subHits.filter((h) => h.sub.postalCode === postalCode);
    if (byPost.length > 0) subHits = byPost;
  }
  if (subHits.length > 1 && district) {
    const foundDistrictCode = district.districtCode;
    const byDistrict = subHits.filter((h) => h.sub.districtCode === foundDistrictCode);
    if (byDistrict.length > 0) subHits = byDistrict;
  }

  if (subHits.length > 1) {
    return {
      province: province
        ? {
            code: province.provinceCode,
            nameTh: province.provinceNameTh,
            nameEn: province.provinceNameEn,
          }
        : null,
      district: null,
      subdistrict: null,
      postalCode,
      confidence: "ambiguous",
      streetHint: null,
      warnings: [
        `Subdistrict name matches ${subHits.length} locations. Add a district, province, or postcode to disambiguate.`,
      ],
      candidates: subHits.slice(0, 5).map((h) => {
        const d = districtsByCode.get(h.sub.districtCode);
        const p = provincesByCode.get(h.sub.provinceCode);
        return {
          subdistrict: h.sub.subdistrictNameTh,
          district: d?.districtNameTh ?? "",
          province: p?.provinceNameTh ?? "",
          postalCode: h.sub.postalCode,
        };
      }),
    };
  }

  const subdistrict = subHits.length === 1 ? subHits[0].sub : null;

  // 6. Fill the chain upward from the most specific match
  if (subdistrict) {
    const impliedDistrict = districtsByCode.get(subdistrict.districtCode) ?? null;
    if (district && impliedDistrict && district.districtCode !== impliedDistrict.districtCode) {
      warnings.push(
        `District "${district.districtNameTh}" does not contain subdistrict "${subdistrict.subdistrictNameTh}"; using the subdistrict's actual district "${impliedDistrict.districtNameTh}".`
      );
    }
    district = impliedDistrict;
    province = provincesByCode.get(subdistrict.provinceCode) ?? province;
  } else if (district && !province) {
    province = provincesByCode.get(district.provinceCode) ?? null;
  }

  // 7. Postcode consistency
  if (postalCode && subdistrict && subdistrict.postalCode !== postalCode) {
    warnings.push(
      `Postcode ${postalCode} does not match subdistrict "${subdistrict.subdistrictNameTh}" (expected ${subdistrict.postalCode}).`
    );
  }

  // 8. Confidence
  let confidence: AddressMatch["confidence"];
  if (subdistrict && district && province && warnings.length === 0) {
    confidence = "high";
  } else if (subdistrict || (district && province)) {
    confidence = "medium";
  } else if (province || postalCode) {
    confidence = "low";
  } else {
    confidence = "none";
  }

  // 9. Street hint: strip matched administrative parts and prefixes
  let residual = input;
  for (const matched of [
    subdistrict?.subdistrictNameTh,
    subdistrict?.subdistrictNameEn,
    districtMatched,
    district?.districtNameTh,
    provinceMatched,
    province?.provinceNameTh,
    postcodeMatch?.[1],
  ]) {
    if (matched) residual = residual.split(matched).join(" ");
  }
  residual = residual.replace(THAI_PREFIXES, (m) =>
    /ถนน|ถ\.|ซอย|ซ\.|หมู่|ม\.|เลขที่|ตรอก|หมู่บ้าน/.test(m) ? m : " "
  );
  const streetHint = residual.replace(/\s+/g, " ").trim() || null;

  return {
    province: province
      ? {
          code: province.provinceCode,
          nameTh: province.provinceNameTh,
          nameEn: province.provinceNameEn,
        }
      : null,
    district: district
      ? {
          code: district.districtCode,
          nameTh: district.districtNameTh,
          nameEn: district.districtNameEn,
        }
      : null,
    subdistrict: subdistrict
      ? {
          code: subdistrict.subdistrictCode,
          nameTh: subdistrict.subdistrictNameTh,
          nameEn: subdistrict.subdistrictNameEn,
        }
      : null,
    postalCode: postalCode ?? subdistrict?.postalCode ?? null,
    confidence,
    streetHint,
    warnings,
  };
}
