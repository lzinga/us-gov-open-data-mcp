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

/** Award Search Result. */
export interface AwardSearchResult {
  total: number;
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
  fiscalYear: number | null;
  month: number | null;
  quarter: number | null;
  amount: number;
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

/** Award type code groupings. */
export const awardTypes: Record<string, string[]> = {
  contracts: ["A", "B", "C", "D"],
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
  // award_type_codes is required by the API — default to all types
  filters.award_type_codes = params.awardType
    ? resolveAwardTypeCodes(params.awardType)
    : [...awardTypes.contracts, ...awardTypes.grants, ...awardTypes.loans, ...awardTypes.direct_payments, ...awardTypes.insurance, ...awardTypes.other];
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
      "Award Type", "recipient_id", "Place of Performance State Code",
    ],
    limit: params.limit || 25,
    page: params.page || 1,
    sort: params.sortField || (isLoan ? "Loan Value" : "Award Amount"),
    order: "desc",
  };

  const res = await api.post<{ results?: Record<string, unknown>[]; page_metadata?: { total?: number } }>(
    "/search/spending_by_award/", body,
  );

  return {
    total: res.page_metadata?.total ?? 0,
    awards: (res.results ?? []).map(r => ({
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
    return {
      fiscalYear: period?.fiscal_year ? Number(period.fiscal_year) : null,
      month: period?.month ? Number(period.month) : null,
      quarter: period?.quarter ? Number(period.quarter) : null,
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
