/**
 * Bundled reference data: Thai public holidays and VAT/WHT basics.
 * Static by design — verify critical values against official announcements
 * (Royal Gazette, Revenue Department, Bank of Thailand) before relying on them.
 */

export interface Holiday {
  date: string; // ISO YYYY-MM-DD
  nameEn: string;
  nameTh: string;
  /** Lunar-calendar holidays are set by annual announcement; dates here are
   *  the announced/expected ones and should be verified for critical use. */
  lunar: boolean;
}

export const HOLIDAYS: Record<number, Holiday[]> = {
  2025: [
    { date: "2025-01-01", nameEn: "New Year's Day", nameTh: "วันขึ้นปีใหม่", lunar: false },
    { date: "2025-02-12", nameEn: "Makha Bucha Day", nameTh: "วันมาฆบูชา", lunar: true },
    { date: "2025-04-07", nameEn: "Chakri Memorial Day (substitution)", nameTh: "ชดเชยวันจักรี", lunar: false },
    { date: "2025-04-13", nameEn: "Songkran Festival", nameTh: "วันสงกรานต์", lunar: false },
    { date: "2025-04-14", nameEn: "Songkran Festival", nameTh: "วันสงกรานต์", lunar: false },
    { date: "2025-04-15", nameEn: "Songkran Festival", nameTh: "วันสงกรานต์", lunar: false },
    { date: "2025-05-01", nameEn: "National Labour Day", nameTh: "วันแรงงานแห่งชาติ", lunar: false },
    { date: "2025-05-05", nameEn: "Coronation Day (substitution)", nameTh: "ชดเชยวันฉัตรมงคล", lunar: false },
    { date: "2025-05-12", nameEn: "Visakha Bucha Day (substitution)", nameTh: "ชดเชยวันวิสาขบูชา", lunar: true },
    { date: "2025-06-03", nameEn: "H.M. Queen Suthida's Birthday", nameTh: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี", lunar: false },
    { date: "2025-07-10", nameEn: "Asahna Bucha Day", nameTh: "วันอาสาฬหบูชา", lunar: true },
    { date: "2025-07-11", nameEn: "Buddhist Lent Day", nameTh: "วันเข้าพรรษา", lunar: true },
    { date: "2025-07-28", nameEn: "H.M. King Vajiralongkorn's Birthday", nameTh: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว", lunar: false },
    { date: "2025-08-12", nameEn: "H.M. Queen Sirikit The Queen Mother's Birthday / Mother's Day", nameTh: "วันแม่แห่งชาติ", lunar: false },
    { date: "2025-10-13", nameEn: "H.M. King Bhumibol Memorial Day", nameTh: "วันนวมินทรมหาราช", lunar: false },
    { date: "2025-10-23", nameEn: "King Chulalongkorn Memorial Day", nameTh: "วันปิยมหาราช", lunar: false },
    { date: "2025-12-05", nameEn: "H.M. King Bhumibol's Birthday / Father's Day", nameTh: "วันพ่อแห่งชาติ", lunar: false },
    { date: "2025-12-10", nameEn: "Constitution Day", nameTh: "วันรัฐธรรมนูญ", lunar: false },
    { date: "2025-12-31", nameEn: "New Year's Eve", nameTh: "วันสิ้นปี", lunar: false },
  ],
  2026: [
    { date: "2026-01-01", nameEn: "New Year's Day", nameTh: "วันขึ้นปีใหม่", lunar: false },
    { date: "2026-03-03", nameEn: "Makha Bucha Day", nameTh: "วันมาฆบูชา", lunar: true },
    { date: "2026-04-06", nameEn: "Chakri Memorial Day", nameTh: "วันจักรี", lunar: false },
    { date: "2026-04-13", nameEn: "Songkran Festival", nameTh: "วันสงกรานต์", lunar: false },
    { date: "2026-04-14", nameEn: "Songkran Festival", nameTh: "วันสงกรานต์", lunar: false },
    { date: "2026-04-15", nameEn: "Songkran Festival", nameTh: "วันสงกรานต์", lunar: false },
    { date: "2026-05-01", nameEn: "National Labour Day", nameTh: "วันแรงงานแห่งชาติ", lunar: false },
    { date: "2026-05-04", nameEn: "Coronation Day", nameTh: "วันฉัตรมงคล", lunar: false },
    { date: "2026-06-01", nameEn: "Visakha Bucha Day (substitution)", nameTh: "ชดเชยวันวิสาขบูชา", lunar: true },
    { date: "2026-06-03", nameEn: "H.M. Queen Suthida's Birthday", nameTh: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี", lunar: false },
    { date: "2026-07-28", nameEn: "H.M. King Vajiralongkorn's Birthday", nameTh: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว", lunar: false },
    { date: "2026-07-29", nameEn: "Asahna Bucha Day", nameTh: "วันอาสาฬหบูชา", lunar: true },
    { date: "2026-07-30", nameEn: "Buddhist Lent Day", nameTh: "วันเข้าพรรษา", lunar: true },
    { date: "2026-08-12", nameEn: "H.M. Queen Sirikit The Queen Mother's Birthday / Mother's Day", nameTh: "วันแม่แห่งชาติ", lunar: false },
    { date: "2026-10-13", nameEn: "H.M. King Bhumibol Memorial Day", nameTh: "วันนวมินทรมหาราช", lunar: false },
    { date: "2026-10-23", nameEn: "King Chulalongkorn Memorial Day", nameTh: "วันปิยมหาราช", lunar: false },
    { date: "2026-12-07", nameEn: "Father's Day (substitution)", nameTh: "ชดเชยวันพ่อแห่งชาติ", lunar: false },
    { date: "2026-12-10", nameEn: "Constitution Day", nameTh: "วันรัฐธรรมนูญ", lunar: false },
    { date: "2026-12-31", nameEn: "New Year's Eve", nameTh: "วันสิ้นปี", lunar: false },
  ],
};

export const VAT_REFERENCE = {
  vat: {
    standardRatePercent: 7,
    note: "Statutory rate is 10%, reduced to 7% by royal decree and extended repeatedly — confirm the current extension.",
    exportsRatePercent: 0,
    registrationThresholdBahtPerYear: 1_800_000,
    filing: "Monthly (PP.30), due the 15th of the following month (23rd via e-filing).",
  },
  withholdingTax: {
    note: "Common domestic WHT rates deducted by the payer. PND 3 (individuals) / PND 53 (juristic persons) filed monthly.",
    rates: [
      { category: "Services / hire of work", percent: 3 },
      { category: "Professional fees", percent: 3 },
      { category: "Rent", percent: 5 },
      { category: "Advertising", percent: 2 },
      { category: "Transport", percent: 1 },
      { category: "Dividends", percent: 10 },
      { category: "Interest (paid to juristic person)", percent: 1 },
      { category: "Prizes", percent: 5 },
    ],
    certificate:
      "Payer must issue a withholding tax certificate (หนังสือรับรองหักภาษี ณ ที่จ่าย, '50 ทวิ') to the payee.",
  },
  disclaimers: [
    "Reference only — not tax advice.",
    "Verify current rates with the Revenue Department (rd.go.th) before filing.",
  ],
};
