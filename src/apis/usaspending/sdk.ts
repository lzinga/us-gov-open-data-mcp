/**
 * USAspending SDK — typed API client for USAspending.gov API v2.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchAwards, spendingByAgency } from "us-gov-open-data-mcp/sdk/usaspending";
 *
 *   const awards = await searchAwards({ keyword: "solar energy", awardType: "contracts" });
 *   console.log(awards.total, awards.awards);
 *
 * No API key required — completely open.
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.usaspending.gov/api/v2",
  name: "usaspending",
  // No auth — completely open API
  rateLimit: { perSecond: 5, burst: 15 },
  cacheTtlMs: 30 * 60 * 1000, // 30 min — data updates nightly
  timeoutMs: 60_000, // USAspending POST search endpoints can be slow
});

// ─── Types ───────────────────────────────────────────────────────────

/** Award. */
export interface Award {
  /** PIID or FAIN, as shown on USAspending. */
  awardId: string | null;
  /** Unique award key (e.g. "CONT_AWD_…"), for getAwardDetail. */
  awardKey: string | null;
  recipientName: string | null;
  awardAmount: number;
  totalOutlays: number;
  awardingAgency: string | null;
  awardType: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  state: string | null;
}

/** One award in detail: recipient, money, dates, agencies, place, industry codes. */
export interface AwardDetail {
  awardKey: string;
  awardId: string | null;
  category: string | null;
  type: string | null;
  description: string | null;
  recipient: string | null;
  recipientUei: string | null;
  parentRecipient: string | null;
  totalObligation: number | null;
  totalOutlay: number | null;
  baseAndAllOptions: number | null;
  subawardCount: number | null;
  totalSubawardAmount: number | null;
  dateSigned: string | null;
  startDate: string | null;
  endDate: string | null;
  potentialEndDate: string | null;
  awardingAgency: string | null;
  awardingSubAgency: string | null;
  fundingAgency: string | null;
  placeOfPerformance: string | null;
  naics: string | null;
  psc: string | null;
  parentAwardId: string | null;
  url: string;
}

/** Award Search Result. */
export interface AwardSearchResult {
  /** Total matches, when the API reports it (the award search usually doesn't). */
  total: number | null;
  /** True when another page of results exists. */
  hasNext: boolean;
  awards: Award[];
}

/** Category Item. */
export interface CategoryItem {
  name: string | null;
  amount: number;
}

/** State Spending Detail. */
export interface StateSpendingDetail {
  name: string | null;
  totalAwards: number;
  totalFaceValueLoans: number;
  awardCount: number;
  population: number;
  perCapita: number;
  medianHouseholdIncome: number;
}

/** State Spending Summary. */
export interface StateSpendingSummary {
  name: string | null;
  amount: number;
  perCapita: number;
  population: number;
}

/** Spending Period. */
export interface SpendingPeriod {
  /** Federal fiscal year (starts October 1 of the prior calendar year). */
  fiscalYear: number | null;
  /** Fiscal month, 1 = October (when grouped by month). */
  month: number | null;
  /** Fiscal quarter, 1 = Oct–Dec (when grouped by quarter). */
  quarter: number | null;
  /** Calendar month the period starts in, as YYYY-MM (e.g. FY2025 month 1 → "2024-10"). */
  periodStart: string | null;
  /** Human-readable fiscal label: "FY2025", "FY2025 Q1", or "FY2025 M01". */
  fiscalPeriod: string | null;
  amount: number;
}

/** Calendar start (YYYY-MM) and label for a fiscal year/quarter/month. */
export function fiscalPeriodInfo(
  fiscalYear: number | null,
  quarter: number | null,
  month: number | null,
): { periodStart: string | null; fiscalPeriod: string | null } {
  if (!fiscalYear) return { periodStart: null, fiscalPeriod: null };
  const ym = (year: number, calMonth: number) => `${year}-${String(calMonth).padStart(2, "0")}`;
  if (month) {
    // Fiscal month 1 = October of the prior calendar year.
    const calMonth = ((month + 8) % 12) + 1;
    const year = month <= 3 ? fiscalYear - 1 : fiscalYear;
    return { periodStart: ym(year, calMonth), fiscalPeriod: `FY${fiscalYear} M${String(month).padStart(2, "0")}` };
  }
  if (quarter) {
    const calMonth = [10, 1, 4, 7][quarter - 1] ?? 10;
    const year = quarter === 1 ? fiscalYear - 1 : fiscalYear;
    return { periodStart: ym(year, calMonth), fiscalPeriod: `FY${fiscalYear} Q${quarter}` };
  }
  return { periodStart: ym(fiscalYear - 1, 10), fiscalPeriod: `FY${fiscalYear}` };
}

/** Agency Overview. */
export interface AgencyOverview {
  name: string | null;
  agencyCode: string;
  fiscalYear: number;
  mission: string | null;
  website: string | null;
  totalBudgetaryResources: number | null;
  obligationsIncurred: number | null;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Award type code groupings. The search API accepts codes from one group per request. */
export const awardTypes: Record<string, string[]> = {
  contracts: ["A", "B", "C", "D"],
  idvs: ["IDV_A", "IDV_B", "IDV_B_A", "IDV_B_B", "IDV_B_C", "IDV_C", "IDV_D", "IDV_E"],
  grants: ["02", "03", "04", "05"],
  loans: ["07", "08"],
  direct_payments: ["06", "10"],
  insurance: ["09"],
  other: ["11"],
};

/** Common toptier agency codes. */
export const agencyCodes = {
  "097": "Department of Defense",
  "075": "Department of Health and Human Services",
  "069": "Department of the Treasury",
  "089": "Department of Energy",
  "012": "Department of Agriculture",
  "015": "Department of Justice",
  "036": "Department of Veterans Affairs",
  "013": "Department of Commerce",
  "070": "Department of Homeland Security",
  "080": "NASA",
  "068": "Environmental Protection Agency",
  "014": "Department of the Interior",
  "086": "Department of Housing and Urban Development",
  "049": "National Science Foundation",
  "028": "Department of State",
  "073": "Small Business Administration",
  "024": "Department of Transportation",
  "091": "Department of Education",
  "016": "Department of Labor",
} as const;

/** US state/territory two-letter codes to FIPS codes. */
export const stateFips = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
  DE: "10", DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17",
  IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24",
  MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31",
  NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38",
  OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46",
  TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
  WI: "55", WY: "56", PR: "72", VI: "78", GU: "66", AS: "60", MP: "69",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────

/** Get the current federal fiscal year (Oct 1 – Sep 30). */
export function currentFiscalYear(): number {
  return new Date().getMonth() >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear();
}

/** Resolve an award_type string to API codes. */
export function resolveAwardTypeCodes(awardType: string): string[] {
  const lower = awardType.toLowerCase().trim();
  return (awardTypes as Record<string, string[]>)[lower] || awardType.split(",").map(s => s.trim());
}

function buildFiscalYearPeriod(fy: number): { start_date: string; end_date: string }[] {
  return [{ start_date: `${fy - 1}-10-01`, end_date: `${fy}-09-30` }];
}

// ─── Public API ──────────────────────────────────────────────────────

/** Search federal spending awards (contracts, grants, loans, direct payments). */
export async function searchAwards(params: {
  keyword?: string;
  awardType?: string;
  agency?: string;
  recipient?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  page?: number;
  sortField?: string;
}): Promise<AwardSearchResult> {
  const filters: Record<string, unknown> = {};

  if (params.keyword) filters.keywords = [params.keyword];
  // award_type_codes is required and may only hold one group's codes (mixing
  // groups is an HTTP 422), so the default is contracts.
  filters.award_type_codes = resolveAwardTypeCodes(params.awardType ?? "contracts");
  if (params.agency) filters.agencies = [{ type: "awarding", tier: "toptier", name: params.agency }];
  if (params.recipient) filters.recipient_search_text = [params.recipient];
  if (params.state) filters.place_of_performance_locations = [{ country: "USA", state: params.state.toUpperCase() }];

  // Date range — API minimum is 2007-10-01
  const fy = currentFiscalYear();
  let start = params.startDate || `${fy - 1}-10-01`;
  if (start < "2007-10-01") start = "2007-10-01";
  filters.time_period = [{ start_date: start, end_date: params.endDate || new Date().toISOString().split("T")[0] }];

  if (params.minAmount !== undefined || params.maxAmount !== undefined) {
    filters.award_amounts = [{ lower_bound: params.minAmount, upper_bound: params.maxAmount }];
  }

  const isLoan = params.awardType && ["loans", "07", "08"].includes(params.awardType.toLowerCase().trim());
  const body: Record<string, unknown> = {
    filters,
    fields: [
      "Award ID", "Recipient Name", "Awarding Agency", "Award Amount",
      "Total Outlays", "Description", "Start Date", "End Date",
      "Award Type", "recipient_id", "Place of Performance State Code", "generated_internal_id",
    ],
    limit: params.limit || 25,
    page: params.page || 1,
    sort: params.sortField || (isLoan ? "Loan Value" : "Award Amount"),
    order: "desc",
  };

  const res = await api.post<{ results?: Record<string, unknown>[]; page_metadata?: { total?: number; hasNext?: boolean } }>(
    "/search/spending_by_award/", body,
  );

  return {
    // The award search reports whether there is a next page, not a total.
    total: res.page_metadata?.total ?? null,
    hasNext: res.page_metadata?.hasNext ?? false,
    awards: (res.results ?? []).map(r => ({
      awardId: (r["Award ID"] as string) || null,
      /** Pass to usa_award_detail / getAwardDetail. */
      awardKey: (r["generated_internal_id"] as string) || null,
      recipientName: (r["Recipient Name"] as string) || null,
      awardAmount: Number(r["Award Amount"] || 0),
      totalOutlays: Number(r["Total Outlays"] || 0),
      awardingAgency: (r["Awarding Agency"] as string) || null,
      awardType: (r["Award Type"] as string) || null,
      description: r["Description"] ? String(r["Description"]).substring(0, 300) : null,
      startDate: (r["Start Date"] as string) || null,
      endDate: (r["End Date"] as string) || null,
      state: (r["Place of Performance State Code"] as string) || null,
    })),
  };
}

/** Award type groups searched, in order, when looking up a PIID/FAIN. */
const LOOKUP_GROUPS = ["contracts", "idvs", "grants", "loans", "direct_payments", "other", "insurance"];

/** USAspending's unique award keys: CONT_AWD_…, CONT_IDV_…, ASST_NON_…, ASST_AGG_… */
const isAwardKey = (id: string) => /^(CONT_AWD|CONT_IDV|ASST_NON|ASST_AGG)_/i.test(id);

/**
 * One award in detail. Takes the unique award key from searchAwards
 * (`awardKey`) or a PIID/FAIN (`awardId`), which is looked up first.
 */
export async function getAwardDetail(id: string): Promise<AwardDetail> {
  let key = id.trim();
  if (!isAwardKey(key)) {
    // The search takes one award type group at a time; stop at the first group with a match.
    let found: string | undefined;
    for (const group of LOOKUP_GROUPS) {
      const res = await api.post<{ results?: Record<string, unknown>[] }>("/search/spending_by_award/", {
        filters: { award_ids: [key], award_type_codes: awardTypes[group] },
        fields: ["Award ID", "generated_internal_id"],
        limit: 5,
        page: 1,
      });
      const results = res.results ?? [];
      const hit = results.find(r => String(r["Award ID"]).toUpperCase() === key.toUpperCase()) ?? results[0];
      if (hit?.generated_internal_id) { found = String(hit.generated_internal_id); break; }
    }
    if (!found) throw new Error(`No award found with ID "${id}". Use the awardKey from usa_spending_by_award.`);
    key = found;
  }

  type Code = { code?: string; description?: string } | undefined;
  const d = await api.get<Record<string, any>>(`/awards/${encodeURIComponent(key)}/`);
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  const code = (c: Code) => (c?.code ? `${c.code}${c.description ? ` ${c.description}` : ""}` : null);
  const pop = d.place_of_performance ?? {};
  const place = [pop.city_name, pop.state_code, pop.zip5, pop.location_country_code === "USA" ? null : pop.country_name].filter(Boolean).join(", ");
  const period = d.period_of_performance ?? {};
  return {
    awardKey: String(d.generated_unique_award_id ?? key),
    awardId: d.piid ?? d.fain ?? d.uri ?? null,
    category: d.category ?? null,
    type: d.type_description ?? null,
    description: d.description ?? null,
    recipient: d.recipient?.recipient_name ?? null,
    recipientUei: d.recipient?.recipient_uei ?? null,
    parentRecipient: d.recipient?.parent_recipient_name ?? null,
    totalObligation: num(d.total_obligation),
    totalOutlay: num(d.total_outlay),
    baseAndAllOptions: num(d.base_and_all_options),
    subawardCount: num(d.subaward_count),
    totalSubawardAmount: num(d.total_subaward_amount),
    dateSigned: d.date_signed ?? null,
    startDate: period.start_date ?? null,
    endDate: period.end_date ?? null,
    potentialEndDate: period.potential_end_date ? String(period.potential_end_date).slice(0, 10) : null,
    awardingAgency: d.awarding_agency?.toptier_agency?.name ?? null,
    awardingSubAgency: d.awarding_agency?.subtier_agency?.name ?? null,
    fundingAgency: d.funding_agency?.toptier_agency?.name ?? null,
    placeOfPerformance: place || null,
    naics: code(d.naics_hierarchy?.base_code),
    psc: code(d.psc_hierarchy?.base_code),
    parentAwardId: d.parent_award?.piid ?? null,
    url: `https://www.usaspending.gov/award/${encodeURIComponent(String(d.generated_unique_award_id ?? key))}`,
  };
}

/** Get federal spending broken down by awarding agency. */
export async function spendingByAgency(params: {
  fiscalYear?: number;
  state?: string;
  keyword?: string;
  awardType?: string;
  limit?: number;
}): Promise<CategoryItem[]> {
  const fy = params.fiscalYear || currentFiscalYear();
  const filters: Record<string, unknown> = { time_period: buildFiscalYearPeriod(fy) };

  if (params.state) filters.place_of_performance_locations = [{ country: "USA", state: params.state.toUpperCase() }];
  if (params.keyword) filters.keywords = [params.keyword];
  if (params.awardType && (awardTypes as Record<string, string[]>)[params.awardType.toLowerCase()]) {
    filters.award_type_codes = (awardTypes as Record<string, string[]>)[params.awardType.toLowerCase()];
  }

  const res = await api.post<{ results?: Record<string, unknown>[] }>(
    "/search/spending_by_category/awarding_agency/",
    { category: "awarding_agency", filters, limit: params.limit || 20, page: 1 },
  );

  return (res.results ?? []).map(r => ({
    name: (r.name as string) || null,
    amount: Number(r.amount || 0),
  }));
}

/** Get federal spending for a single state (GET) or all states (POST). */
export async function spendingByState(params: {
  state?: string;
  fiscalYear?: number;
}): Promise<{ detail: StateSpendingDetail } | { states: StateSpendingSummary[] }> {
  if (params.state) {
    const fips = (stateFips as Record<string, string>)[params.state.toUpperCase()];
    const path = `/recipient/state/${fips || params.state.toUpperCase()}/`;
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.fiscalYear) queryParams.year = params.fiscalYear;

    const res = await api.get<Record<string, unknown>>(path, queryParams);
    return {
      detail: {
        name: (res.name as string) || null,
        totalAwards: Number(res.total_prime_amount || 0),
        totalFaceValueLoans: Number(res.total_face_value_loan_amount || 0),
        awardCount: Number(res.total_prime_awards || 0),
        population: Number(res.population || 0),
        perCapita: Number(res.award_amount_per_capita || 0),
        medianHouseholdIncome: Number(res.median_household_income || 0),
      },
    };
  }

  // All states via geography
  const fy = params.fiscalYear || currentFiscalYear();
  const res = await api.post<{ results?: Record<string, unknown>[] }>(
    "/search/spending_by_geography/",
    {
      scope: "place_of_performance",
      geo_layer: "state",
      filters: { time_period: buildFiscalYearPeriod(fy) },
    },
  );

  const sorted = (res.results ?? []).sort(
    (a, b) => Number(b.aggregated_amount || 0) - Number(a.aggregated_amount || 0),
  );

  return {
    states: sorted.slice(0, 30).map(r => ({
      name: (r.display_name as string) || (r.shape_code as string) || null,
      amount: Number(r.aggregated_amount || 0),
      perCapita: Number(r.per_capita || 0),
      population: Number(r.population || 0),
    })),
  };
}

/** Get the top recipients of federal spending. */
export async function topRecipients(params: {
  fiscalYear?: number;
  awardType?: string;
  state?: string;
  agency?: string;
  limit?: number;
}): Promise<CategoryItem[]> {
  const fy = params.fiscalYear || currentFiscalYear();
  const filters: Record<string, unknown> = { time_period: buildFiscalYearPeriod(fy) };

  if (params.awardType && (awardTypes as Record<string, string[]>)[params.awardType.toLowerCase()]) {
    filters.award_type_codes = (awardTypes as Record<string, string[]>)[params.awardType.toLowerCase()];
  }
  if (params.state) filters.place_of_performance_locations = [{ country: "USA", state: params.state.toUpperCase() }];
  if (params.agency) filters.agencies = [{ type: "awarding", tier: "toptier", name: params.agency }];

  const res = await api.post<{ results?: Record<string, unknown>[] }>(
    "/search/spending_by_category/recipient/",
    { category: "recipient", filters, limit: params.limit || 25, page: 1 },
  );

  return (res.results ?? []).map(r => ({
    name: (r.name as string) || null,
    amount: Number(r.amount || 0),
  }));
}

/** Get federal spending aggregated by time period. */
export async function spendingOverTime(params: {
  group?: string;
  startDate?: string;
  endDate?: string;
  agency?: string;
  awardType?: string;
  state?: string;
  keyword?: string;
}): Promise<SpendingPeriod[]> {
  const defaultStart = new Date();
  defaultStart.setFullYear(defaultStart.getFullYear() - 3);

  const filters: Record<string, unknown> = {
    time_period: [{
      start_date: params.startDate || defaultStart.toISOString().split("T")[0],
      end_date: params.endDate || new Date().toISOString().split("T")[0],
    }],
  };

  if (params.agency) filters.agencies = [{ type: "awarding", tier: "toptier", name: params.agency }];
  if (params.awardType && (awardTypes as Record<string, string[]>)[params.awardType.toLowerCase()]) {
    filters.award_type_codes = (awardTypes as Record<string, string[]>)[params.awardType.toLowerCase()];
  }
  if (params.state) filters.place_of_performance_locations = [{ country: "USA", state: params.state.toUpperCase() }];
  if (params.keyword) filters.keywords = [params.keyword];

  const res = await api.post<{ results?: Record<string, unknown>[] }>(
    "/search/spending_over_time/",
    { group: params.group || "month", filters },
  );

  return (res.results ?? []).map(r => {
    const period = r.time_period as Record<string, unknown> | undefined;
    const fiscalYear = period?.fiscal_year ? Number(period.fiscal_year) : null;
    const month = period?.month ? Number(period.month) : null;
    const quarter = period?.quarter ? Number(period.quarter) : null;
    return {
      fiscalYear,
      month,
      quarter,
      ...fiscalPeriodInfo(fiscalYear, quarter, month),
      amount: Number(r.aggregated_amount || 0),
    };
  });
}

/** Get an overview of a federal agency's spending, including budgetary resources. */
export async function agencyOverview(
  agencyCode: string,
  fiscalYear?: number,
): Promise<AgencyOverview> {
  const queryParams: Record<string, string | number | undefined> = {};
  if (fiscalYear) queryParams.fiscal_year = fiscalYear;

  const res = await api.get<Record<string, unknown>>(`/agency/${agencyCode}/`, queryParams);

  const fy = fiscalYear || (res.fiscal_year as number) || new Date().getFullYear();

  // Also fetch budgetary resources
  let totalBudgetaryResources: number | null = null;
  let obligationsIncurred: number | null = null;
  try {
    const budgetRes = await api.get<{ agency_budgetary_resources?: Record<string, unknown>[] }>(
      `/agency/${agencyCode}/budgetary_resources/`, { fiscal_year: fy },
    );
    const resources = budgetRes.agency_budgetary_resources;
    if (resources?.length) {
      totalBudgetaryResources = Number(resources[0].agency_total_obligated || 0);
      obligationsIncurred = Number(resources[0].agency_obligation || 0);
    }
  } catch {
    // Budget data not always available
  }

  return {
    name: (res.name as string) || null,
    agencyCode,
    fiscalYear: fy,
    mission: (res.mission as string) || null,
    website: (res.website as string) || null,
    totalBudgetaryResources,
    obligationsIncurred,
  };
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
