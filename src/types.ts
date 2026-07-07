export interface Province {
  id: number;
  provinceCode: number;
  provinceNameEn: string;
  provinceNameTh: string;
}

export interface District {
  id: number;
  provinceCode: number;
  districtCode: number;
  districtNameEn: string;
  districtNameTh: string;
  postalCode: number;
}

export interface Subdistrict {
  id: number;
  provinceCode: number;
  districtCode: number;
  subdistrictCode: number;
  subdistrictNameEn: string;
  subdistrictNameTh: string;
  postalCode: number;
}

export interface CompanyProfile {
  juristicId: string;
  nameTh: string | null;
  nameEn: string | null;
  type: string | null;
  status: string | null;
  registerDate: string | null;
  registeredCapitalBaht: number | null;
  paidUpCapitalBaht: number | null;
  objective: {
    code: string | null;
    textTh: string | null;
    textEn: string | null;
  } | null;
  branchName: string | null;
  address: {
    full: string | null;
    addressNo: string | null;
    moo: string | null;
    soi: string | null;
    road: string | null;
    subdistrict: string | null;
    district: string | null;
    province: string | null;
  } | null;
}

export interface AddressMatch {
  province: { code: number; nameTh: string; nameEn: string } | null;
  district: { code: number; nameTh: string; nameEn: string } | null;
  subdistrict: { code: number; nameTh: string; nameEn: string } | null;
  postalCode: number | null;
  confidence: "high" | "medium" | "low" | "ambiguous" | "none";
  streetHint: string | null;
  warnings: string[];
  candidates?: Array<{
    subdistrict: string;
    district: string;
    province: string;
    postalCode: number;
  }>;
}
