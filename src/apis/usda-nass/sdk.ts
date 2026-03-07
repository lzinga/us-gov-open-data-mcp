/**
 * USDA NASS QuickStats SDK — agricultural production, crop prices, farm income.
 *
 * API docs: https://quickstats.nass.usda.gov/api
 * Get key: https://quickstats.nass.usda.gov/api#param_define
 * Rate limit: not documented, be conservative
 * Max 50,000 records per request.
 *
 * Usage:
 *   import { queryStats, getTopCommodities } from "us-gov-open-data-mcp/sdk/usda-nass";
 *   const corn = await queryStats({ commodity_desc: "CORN", year: 2024, state_alpha: "IA" });
 */

import { createClient } from "../../shared/client.js";

const api = createClient({
  baseUrl: "https://quickstats.nass.usda.gov",
  name: "usda-nass",
  auth: { type: "query", envParams: { key: "USDA_NASS_API_KEY" } },
  rateLimit: { perSecond: 2, burst: 5 },
  cacheTtlMs: 12 * 60 * 60 * 1000, // 12 hours — agricultural data updates infrequently
});

// ─── Types ───────────────────────────────────────────────────────────

/** Nass Record. */
export interface NassRecord {
  source_desc: string;
  sector_desc: string;
  group_desc: string;
  commodity_desc: string;
  class_desc: string;
  prodn_practice_desc: string;
  util_practice_desc: string;
  statisticcat_desc: string;
  unit_desc: string;
  short_desc: string;
  domain_desc: string;
  domaincat_desc: string;
  agg_level_desc: string;
  state_alpha: string;
  state_name: string;
  county_name: string;
  year: number;
  freq_desc: string;
  begin_code: string;
  end_code: string;
  reference_period_desc: string;
  Value: string;
  CV: string;
}

/** Nass Query Params. */
export interface NassQueryParams {
  source_desc?: string;        // SURVEY or CENSUS
  sector_desc?: string;        // CROPS, ANIMALS & PRODUCTS, ECONOMICS, etc.
  commodity_desc?: string;     // CORN, SOYBEANS, WHEAT, CATTLE, etc.
  statisticcat_desc?: string;  // AREA PLANTED, PRODUCTION, YIELD, PRICE RECEIVED, etc.
  unit_desc?: string;          // $, BU, ACRES, HEAD, etc.
  domain_desc?: string;        // TOTAL, ORGANIC STATUS, etc.
  state_alpha?: string;        // IA, IL, CA, US (national), etc.
  year?: number | string;      // single year or range
  freq_desc?: string;          // ANNUAL, MONTHLY, WEEKLY
  agg_level_desc?: string;     // NATIONAL, STATE, COUNTY
  format?: string;
}

// ─── Public API ──────────────────────────────────────────────────────

/** Get record count for a query (check before fetching — max 50,000). */
export async function getCount(params: NassQueryParams): Promise<number> {
  const data = await api.get<{ count: number }>("/api/get_counts", {
    ...params as any,
    format: "json",
  });
  return data.count ?? 0;
}

/** Query agricultural statistics. Returns up to 50,000 records. */
export async function queryStats(params: NassQueryParams): Promise<NassRecord[]> {
  const data = await api.get<{ data: NassRecord[] }>("/api/api_GET/", {
    ...params as any,
    format: "json",
  });
  return data.data ?? [];
}

/** Get valid values for a specific parameter (for discovery). */
export async function getParamValues(param: string, opts?: NassQueryParams): Promise<Record<string, string[]>> {
  const data = await api.get<Record<string, string[]>>(`/api/get_param_values/`, {
    param,
    ...opts as any,
    format: "json",
  });
  return data;
}

/** Convenience: get crop production data for a commodity + state + year. */
export async function getCropProduction(commodity: string, opts?: {
  state?: string; year?: number; category?: string;
}): Promise<NassRecord[]> {
  return queryStats({
    source_desc: "SURVEY",
    sector_desc: "CROPS",
    commodity_desc: commodity.toUpperCase(),
    statisticcat_desc: opts?.category ?? "PRODUCTION",
    state_alpha: opts?.state?.toUpperCase(),
    year: opts?.year,
    agg_level_desc: opts?.state ? "STATE" : "NATIONAL",
  });
}

/** Convenience: get livestock data. */
export async function getLivestockData(commodity: string, opts?: {
  state?: string; year?: number; category?: string;
}): Promise<NassRecord[]> {
  return queryStats({
    source_desc: "SURVEY",
    sector_desc: "ANIMALS & PRODUCTS",
    commodity_desc: commodity.toUpperCase(),
    statisticcat_desc: opts?.category,
    state_alpha: opts?.state?.toUpperCase(),
    year: opts?.year,
    agg_level_desc: opts?.state ? "STATE" : "NATIONAL",
  });
}

/** Convenience: get price received by farmers. */
export async function getPriceReceived(commodity: string, opts?: {
  state?: string; year?: number;
}): Promise<NassRecord[]> {
  return queryStats({
    source_desc: "SURVEY",
    commodity_desc: commodity.toUpperCase(),
    statisticcat_desc: "PRICE RECEIVED",
    state_alpha: opts?.state?.toUpperCase(),
    year: opts?.year,
    freq_desc: "ANNUAL",
  });
}

/**
 * Clear Cache.
 */
export function clearCache(): void { api.clearCache(); }
