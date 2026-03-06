/**
 * FDIC SDK — typed API client for the Federal Deposit Insurance Corporation
 * BankFind Suite API.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchInstitutions, getBankFailures, getFinancials } from "us-gov-open-data-mcp/sdk/fdic";
 *
 *   const banks = await searchInstitutions({ filters: "STNAME:\"California\"", limit: 10 });
 *   const failures = await getBankFailures({ limit: 25 });
 *
 * No API key required.
 * Docs: https://banks.data.fdic.gov/docs/
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const client = createClient({
  baseUrl: "https://banks.data.fdic.gov/api",
  name: "fdic",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

// ─── Types ───────────────────────────────────────────────────────────

/** Fdic API Response. */
export interface FdicApiResponse<T = Record<string, unknown>> {
  meta: {
    total: number;
    parameters: Record<string, unknown>;
    index?: string;
    [key: string]: unknown;
  };
  data: Array<{ data: T; score?: number }>;
  totals?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Institution. */
export interface Institution {
  CERT?: number;
  REPDTE?: string;
  INSTNAME?: string;
  CITY?: string;
  STNAME?: string;
  STALP?: string;
  ZIP?: string;
  WEBADDR?: string;
  INSTCAT?: number;
  SPECGRP?: number;
  ASSET?: number;
  DEP?: number;
  DEPDOM?: number;
  NETINC?: number;
  ROA?: number;
  ROE?: number;
  RISESSION?: number;
  
  CHARTER_CLASS?: string;
  
  FED_RSSD?: number;
  ACTIVE?: number;
  REGAGENT?: string;
  FDICREGION?: string;
  HCTMULT?: string;
  OFFDOM?: number;
  [key: string]: unknown;
}

/** Bank Failure. */
export interface BankFailure {
  CERT?: number;
  INSTNAME?: string;
  CITY?: string;
  ST?: string;
  FAILDATE?: string;
  SAVR?: string;
  COST?: number;
  RESTYPE?: string;
  RESTYPE1?: string;
  QBFASSET?: number;
  QBFDEP?: number;
  PSTALP?: string;
  [key: string]: unknown;
}

/** Financial Record. */
export interface FinancialRecord {
  CERT?: number;
  REPDTE?: string;
  INSTNAME?: string;
  ASSET?: number;
  DEP?: number;
  DEPDOM?: number;
  NETINC?: number;
  INTINC?: number;
  EINTEXP?: number;
  ELNATR?: number;
  NITEFDS?: number;
  NONII?: number;
  ROA?: number;
  ROE?: number;
  LNLSGR?: number;
  LNLSNET?: number;
  [key: string]: unknown;
}

/** Sod Record. */
export interface SodRecord {
  CERT?: number;
  REPDTE?: string;
  INSTNAME?: string;
  BRNUM?: number;
  BRSERTYP?: number;
  STNAME?: string;
  STALP?: string;
  CITY?: string;
  COUNTY?: string;
  ZIPBR?: string;
  DEPSUMBR?: number;
  BKMO?: number;
  [key: string]: unknown;
}

/** History Event. */
export interface HistoryEvent {
  CERT?: number;
  INSTNAME?: string;
  PCITY?: string;
  PSTALP?: string;
  EFFDATE?: string;
  ACESSION?: string;
  
  ACT_NAME?: string;
  CHARTEFDS?: string;
  [key: string]: unknown;
}

/** Demographic Record. */
export interface DemographicRecord {
  CERT?: number;
  REPDTE?: string;
  INSTNAME?: string;
  STALP?: string;
  STNAME?: string;
  
  MSA_NO?: string;
  TRACT?: string;
  
  INCOME_LVL?: string;
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Available FDIC API datasets/endpoints. */
export const DATASETS = {
  institutions: "Currently open and insured depository institutions — filterable by state, assets, charter type",
  failures: "All FDIC-insured bank failures since 1934",
  financials: "Call report financial data (assets, deposits, income, ratios) by quarter",
  summary: "Aggregate banking statistics by state or charter type across time",
  sod: "Summary of Deposits — branch-level deposit data, annual (June 30)",
  history: "Institution event history — mergers, name changes, charter changes",
  locations: "Physical branch and office locations",
  demographics: "Community Reinvestment Act assessment area demographics",
} as const;

/** Common filter field names for the institutions endpoint. */
export const INSTITUTION_FIELDS = {
  STALP: "State abbreviation (CA, TX, NY)",
  STNAME: "State full name",
  INSTNAME: "Institution name",
  ACTIVE: "Active status (1=active)",
  INSTCAT: "Institution category (1=commercial bank, 2=savings, 5=state charter, 9=national bank)",
  ASSET: "Total assets (in thousands)",
  DEP: "Total deposits (in thousands)",
  NETINC: "Net income (in thousands)",
  CHARTER_CLASS: "Charter class (N=national, SM=state member, NM=state non-member, SB=savings bank, SL=savings & loan)",
  CITY: "City name",
  ZIP: "ZIP code",
} as const;

/** Filter syntax examples. */
export const FILTER_EXAMPLES = {
  "State filter": 'STALP:"CA"',
  "Active only": "ACTIVE:1",
  "Large banks": "ASSET:[1000000 TO *]",
  "Multiple": 'STALP:"TX" AND ACTIVE:1',
  "Name search": 'INSTNAME:"Wells Fargo"',
  "Charter type": 'CHARTER_CLASS:"N"',
  "Asset range": "ASSET:[100000 TO 500000]",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────

async function queryEndpoint<T>(
  endpoint: string,
  opts: {
    filters?: string;
    fields?: string;
    sort_by?: string;
    sort_order?: string;
    limit?: number;
    offset?: number;
    search?: string;
    agg_by?: string;
    agg_term_fields?: string;
    agg_sum_fields?: string;
    agg_limit?: number;
  } = {},
): Promise<FdicApiResponse<T>> {
  const params: Record<string, string | number | undefined> = {};

  if (opts.filters) params.filters = opts.filters;
  if (opts.fields) params.fields = opts.fields;
  if (opts.sort_by) params.sort_by = opts.sort_by;
  if (opts.sort_order) params.sort_order = opts.sort_order;
  if (opts.limit !== undefined) params.limit = opts.limit;
  if (opts.offset !== undefined) params.offset = opts.offset;
  if (opts.search) params.search = opts.search;
  if (opts.agg_by) params.agg_by = opts.agg_by;
  if (opts.agg_term_fields) params.agg_term_fields = opts.agg_term_fields;
  if (opts.agg_sum_fields) params.agg_sum_fields = opts.agg_sum_fields;
  if (opts.agg_limit !== undefined) params.agg_limit = opts.agg_limit;

  return client.get<FdicApiResponse<T>>(`/${endpoint}`, params);
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search FDIC-insured institutions (banks, savings & loans).
 *
 * Example:
 *   const banks = await searchInstitutions({ filters: 'STALP:"CA" AND ACTIVE:1', limit: 25 });
 *   const large = await searchInstitutions({ filters: 'ASSET:[1000000 TO *]', sort_by: 'ASSET', sort_order: 'DESC' });
 */
export async function searchInstitutions(opts: {
  filters?: string;
  fields?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<FdicApiResponse<Institution>> {
  return queryEndpoint<Institution>("institutions", {
    ...opts,
    limit: opts.limit ?? 25,
    sort_order: opts.sort_order ?? "DESC",
  });
}

/**
 * Get FDIC-insured bank failures since 1934.
 *
 * Example:
 *   const recent = await getBankFailures({ limit: 20, sort_by: "FAILDATE", sort_order: "DESC" });
 *   const byState = await getBankFailures({ filters: 'PSTALP:"GA"' });
 */
export async function getBankFailures(opts: {
  filters?: string;
  fields?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<FdicApiResponse<BankFailure>> {
  return queryEndpoint<BankFailure>("failures", {
    ...opts,
    limit: opts.limit ?? 25,
    sort_by: opts.sort_by ?? "FAILDATE",
    sort_order: opts.sort_order ?? "DESC",
  });
}

/**
 * Get quarterly financial reports (Call Report data) for banks.
 *
 * Example:
 *   const financials = await getFinancials({ filters: 'CERT:3511', limit: 10 });
 *   const stateFinancials = await getFinancials({ filters: 'STALP:"CA" AND REPDTE:20240331', limit: 50 });
 */
export async function getFinancials(opts: {
  filters?: string;
  fields?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<FdicApiResponse<FinancialRecord>> {
  return queryEndpoint<FinancialRecord>("financials", {
    ...opts,
    limit: opts.limit ?? 25,
    sort_by: opts.sort_by ?? "REPDTE",
    sort_order: opts.sort_order ?? "DESC",
  });
}

/**
 * Get aggregate banking statistics (industry totals by state, charter type, etc.).
 *
 * Example:
 *   const summary = await getSummary({ filters: 'STALP:"TX"', limit: 10 });
 */
export async function getSummary(opts: {
  filters?: string;
  fields?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
  agg_by?: string;
  agg_term_fields?: string;
  agg_sum_fields?: string;
  agg_limit?: number;
} = {}): Promise<FdicApiResponse> {
  return queryEndpoint("summary", {
    ...opts,
    limit: opts.limit ?? 25,
  });
}

/**
 * Get Summary of Deposits — branch-level deposit data (annual, as of June 30).
 *
 * Example:
 *   const deposits = await getDeposits({ filters: 'STALP:"NY"', sort_by: 'DEPSUMBR', sort_order: 'DESC', limit: 20 });
 */
export async function getDeposits(opts: {
  filters?: string;
  fields?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<FdicApiResponse<SodRecord>> {
  return queryEndpoint<SodRecord>("sod", {
    ...opts,
    limit: opts.limit ?? 25,
    sort_order: opts.sort_order ?? "DESC",
  });
}

/**
 * Get institution event history (mergers, name changes, charter changes).
 *
 * Example:
 *   const history = await getHistory({ filters: 'CERT:3511', limit: 50 });
 */
export async function getHistory(opts: {
  filters?: string;
  fields?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<FdicApiResponse<HistoryEvent>> {
  return queryEndpoint<HistoryEvent>("history", {
    ...opts,
    limit: opts.limit ?? 25,
  });
}

/** Clear cached responses. */
export function clearCache(): void {
  client.clearCache();
}
