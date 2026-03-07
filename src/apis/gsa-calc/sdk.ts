/**
 * GSA CALC+ Ceiling Rates SDK - typed API client for federal labor rate data.
 *
 * Uses the CALC+ Quick Rate API ({@link https://api.gsa.gov/acquisition/calc/v3/api/ceilingrates/})
 * Docs: {@link https://open.gsa.gov/api/dx-calc-api/}
 *
 * Provides awarded ceiling rates (not-to-exceed, fully burdened hourly rates) for
 * labor categories on GSA Multiple Award Schedule (MAS) professional services contracts.
 * Data includes labor category title, vendor name, contract number (IDV PIID),
 * current price, education level, minimum years of experience, worksite type,
 * business size, and security clearance requirements.
 *
 * Standalone - no MCP server required. Usage:
 *
 *   import { searchCeilingRates } from "us-gov-open-data-mcp/sdk/gsa-calc";
 *
 *   const rates = await searchCeilingRates({ keyword: "software engineer" });
 *   console.log(rates.total, rates.hits);
 *
 * No API key required.
 *
 * Data is refreshed daily (overnight).
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.gsa.gov",
  name: "gsa-calc",
  // No auth required
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour - data refreshes daily
  timeoutMs: 30_000,
});

// ─── Constants ───────────────────────────────────────────────────────

/** Education level codes used in filter queries. */
export const educationLevels = {
  HS: "High School",
  AA: "Associates",
  BA: "Bachelors",
  MA: "Masters",
  PHD: "Doctorate",
} as const;

/** Business size codes. */
export const businessSizes = {
  S: "Small Business",
  O: "Other than Small Business",
} as const;

/** Worksite types for filter queries. */
export const worksiteTypes = {
  Contractor: "Contractor Facility",
  Customer: "Customer Facility",
  Both: "Both",
} as const;

/** Fields available for ordering results (from API Valid Fields table). */
export const orderableFields = {
  labor_category: "Labor category name",
  current_price: "Current hourly rate",
  education_level: "Education level required",
  keywords: "Keywords",
  certifications: "Certifications",
  min_years_experience: "Minimum years of experience",
  vendor_name: "Vendor/company name",
  schedule: "GSA schedule name",
} as const;

// ─── Types ───────────────────────────────────────────────────────────

/** A single ceiling rate record from the CALC+ API. */
export interface CeilingRate {
  id: number;
  laborCategory: string;
  vendorName: string;
  contractNumber: string;
  currentPrice: number;
  nextYearPrice: number | null;
  secondYearPrice: number | null;
  educationLevel: string | null;
  minYearsExperience: number | null;
  worksite: string | null;
  businessSize: string | null;
  securityClearance: string | null;
  schedule: string | null;
  sin: string | null;
  category: string | null;
  subcategory: string | null;
  contractStart: string | null;
  contractEnd: string | null;
}

/** Wage statistics from the aggregations. */
export interface WageStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number | null;
  stdDeviation: number;
}

/** Search result wrapper. */
export interface CeilingRateSearchResult {
  total: number;
  hits: CeilingRate[];
  wageStats?: WageStats;
  aggregations?: Record<string, unknown>;
}

/** Suggestion result. */
export interface SuggestResult {
  field: string;
  values: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function mapHit(raw: Record<string, unknown>): CeilingRate {
  const src = (raw._source ?? raw) as Record<string, unknown>;
  return {
    id: Number(src.id ?? raw._id ?? 0),
    laborCategory: String(src.labor_category ?? ""),
    vendorName: String(src.vendor_name ?? ""),
    contractNumber: String(src.idv_piid ?? ""),
    currentPrice: Number(src.current_price ?? 0),
    nextYearPrice: src.next_year_price != null ? Number(src.next_year_price) : null,
    secondYearPrice: src.second_year_price != null ? Number(src.second_year_price) : null,
    educationLevel: (src.education_level as string) || null,
    minYearsExperience: src.min_years_experience != null ? Number(src.min_years_experience) : null,
    worksite: (src.worksite as string) || null,
    businessSize: (src.business_size as string) || null,
    securityClearance: (src.security_clearance as string) || null,
    schedule: (src.schedule as string) || null,
    sin: (src.sin as string) || null,
    category: (src.category as string) || null,
    subcategory: (src.subcategory as string) || null,
    contractStart: (src.contract_start as string) || null,
    contractEnd: (src.contract_end as string) || null,
  };
}

function extractWageStats(aggs: Record<string, unknown>): WageStats | undefined {
  const ws = aggs.wage_stats as Record<string, unknown> | undefined;
  if (!ws) return undefined;
  const med = aggs.median_price as Record<string, unknown> | undefined;
  const medValues = med?.values as Record<string, number> | undefined;
  return {
    count: Number(ws.count ?? 0),
    min: Number(ws.min ?? 0),
    max: Number(ws.max ?? 0),
    avg: Number(ws.avg ?? 0),
    median: medValues?.["50.0"] ?? null,
    stdDeviation: Number(ws.std_deviation ?? 0),
  };
}

/**
 * Build repeated filter params: filter=education_level:BA&filter=price_range:10,80
 * Our client supports string[] for repeated query params.
 */
function buildFilterParams(filters: Record<string, string>): string[] {
  return Object.entries(filters)
    .filter(([, v]) => v !== "" && v !== undefined)
    .map(([k, v]) => `${k}:${v}`);
}

// ─── API functions ───────────────────────────────────────────────────

/**
 * Search GSA CALC+ ceiling rates.
 *
 * Three search modes:
 * - `keyword`: wildcard search across labor_category, vendor_name, and idv_piid
 * - `search`: exact match on a specific field (labor_category, vendor_name, or idv_piid)
 * - No search params: returns all rates (with optional filters)
 *
 * Filters narrow results by education, experience, price, worksite, business size,
 * security clearance, SIN, category, or subcategory.
 *
 * Results include aggregations with wage statistics (min, max, avg, median, std deviation).
 */
export async function searchCeilingRates(params: {
  /** Wildcard keyword search across labor_category, vendor_name, idv_piid (2 char min) */
  keyword?: string;
  /** Exact match search as "field:value" - e.g. "labor_category:Engineer II" */
  search?: string;
  /** Education level filter: HS, AA, BA, MA, PHD. Use pipe for multiple: "BA|MA" */
  educationLevel?: string;
  /** Experience range as "min,max" - e.g. "3,10" */
  experienceRange?: string;
  /** Exact minimum years of experience - e.g. "5" */
  minYearsExperience?: string;
  /** Price range as "min,max" - e.g. "50,150" */
  priceRange?: string;
  /** Exact current price - e.g. "85.00" */
  currentPrice?: string;
  /** Worksite: "Contractor", "Customer", or "Both" */
  worksite?: string;
  /** Business size: "S" (small) or "O" (other than small) */
  businessSize?: string;
  /** Security clearance: "yes" or "no" */
  securityClearance?: string;
  /** GSA SIN (Special Item Number) - e.g. "541330ENG" */
  sin?: string;
  /** Service category - e.g. "Professional Services" */
  category?: string;
  /** Service subcategory - e.g. "IT Services" */
  subcategory?: string;
  /** Field to order by: current_price, labor_category, vendor_name, education_level, min_years_experience */
  ordering?: string;
  /** Sort direction: "asc" or "desc" (default: asc on current_price) */
  sort?: "asc" | "desc";
  /** Page number (default 1) */
  page?: number;
  /** Results per page (default 20) */
  pageSize?: number;
  /** Pipe-separated record IDs to exclude - e.g. "6275099|6275111" */
  exclude?: string;
}): Promise<CeilingRateSearchResult> {
  const queryParams: Record<string, string | number | string[]> = {};

  // Search modes
  if (params.keyword) queryParams.keyword = params.keyword;
  if (params.search) queryParams.search = params.search;

  // Build filters as repeated params
  const filters: Record<string, string> = {};
  if (params.educationLevel) filters.education_level = params.educationLevel;
  if (params.experienceRange) filters.experience_range = params.experienceRange;
  if (params.minYearsExperience) filters.min_years_experience = params.minYearsExperience;
  if (params.priceRange) filters.price_range = params.priceRange;
  if (params.currentPrice) filters.current_price = params.currentPrice;
  if (params.worksite) filters.worksite = params.worksite;
  if (params.businessSize) filters.business_size = params.businessSize;
  if (params.securityClearance) filters.security_clearance = params.securityClearance;
  if (params.sin) filters.sin = params.sin;
  if (params.category) filters.category = params.category;
  if (params.subcategory) filters.subcategory = params.subcategory;

  const filterArr = buildFilterParams(filters);
  if (filterArr.length) queryParams.filter = filterArr;

  // Ordering
  if (params.ordering) queryParams.ordering = params.ordering;
  if (params.sort) queryParams.sort = params.sort;

  // Pagination
  queryParams.page = params.page ?? 1;
  queryParams.page_size = params.pageSize ?? 20;

  // Exclusions
  if (params.exclude) queryParams.exclude = params.exclude;

  const res = await api.get<Record<string, unknown>>(
    "/acquisition/calc/v3/api/ceilingrates/",
    queryParams,
  );

  // Response has nested hits structure
  const hitsObj = (res.hits ?? res) as Record<string, unknown>;
  const totalObj = hitsObj.total as Record<string, unknown> | undefined;
  const total = totalObj ? Number(totalObj.value ?? 0) : Number(hitsObj.total ?? 0);
  const rawHits = Array.isArray(hitsObj.hits) ? hitsObj.hits : [];
  const hits = rawHits.map((h: Record<string, unknown>) => mapHit(h));

  // Extract aggregations and wage stats
  const aggs = res.aggregations as Record<string, unknown> | undefined;
  const wageStats = aggs ? extractWageStats(aggs) : undefined;

  return { total, hits, wageStats, aggregations: aggs };
}

/**
 * Autocomplete/suggest values for a field using "suggest-contains" (recommended).
 *
 * Returns matching values as aggregation buckets from the CEILINGRATES dataset.
 *
 * @param field - Field to suggest: "labor_category", "vendor_name", or "idv_piid"
 * @param prefix - Search prefix (2 character minimum)
 */
export async function suggestValues(
  field: "labor_category" | "vendor_name" | "idv_piid",
  prefix: string,
): Promise<SuggestResult> {
  const res = await api.get<Record<string, unknown>>(
    "/acquisition/calc/v3/api/ceilingrates/",
    { "suggest-contains": `${field}:${prefix}` },
  );

  // Suggestions come back as aggregation buckets under aggregations.[field].buckets
  const aggs = res.aggregations as Record<string, Record<string, unknown>> | undefined;
  const fieldAgg = aggs?.[field];
  const buckets = Array.isArray(fieldAgg?.buckets) ? fieldAgg.buckets : [];
  const values = buckets.map((b: Record<string, unknown>) => String(b.key ?? "")).filter(Boolean);

  return { field, values };
}

/**
 * Get all ceiling rates for a specific GSA MAS contract by its IDV PIID.
 *
 * @param piid - Contract number (e.g. "GS10F0303V")
 * @param pageSize - Max results (default 100)
 */
export async function getRatesByContract(
  piid: string,
  pageSize: number = 100,
): Promise<CeilingRateSearchResult> {
  return searchCeilingRates({
    search: `idv_piid:${piid}`,
    pageSize,
  });
}

// ─── Cache management ────────────────────────────────────────────────

/** Clear the in-memory + disk cache for GSA CALC requests. */
export function clearCache(): void {
  api.clearCache();
}
