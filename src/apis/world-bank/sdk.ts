/**
 * World Bank SDK — international economic indicators for 200+ countries.
 *
 * API docs: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
 * No auth required. No published rate limit.
 *
 * Usage:
 *   import { getIndicator, searchIndicators } from "us-gov-open-data-mcp/sdk/world-bank";
 *   const gdp = await getIndicator("NY.GDP.MKTP.CD", { country: "US", dateRange: "2020:2024" });
 */

import { createClient } from "../../shared/client.js";

const api = createClient({
  baseUrl: "https://api.worldbank.org/v2",
  name: "world-bank",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours — data updates annually for most indicators
});

// ─── Types ───────────────────────────────────────────────────────────

/** World Bank indicator data point. */
export interface WBIndicatorValue {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

/** World Bank indicator metadata. */
export interface WBIndicatorInfo {
  id: string;
  name: string;
  unit: string;
  source: { id: string; value: string };
  sourceNote: string;
  sourceOrganization: string;
}

/** World Bank country metadata. */
export interface WBCountry {
  id: string;
  iso2Code: string;
  name: string;
  region: { id: string; value: string };
  incomeLevel: { id: string; value: string };
  capitalCity: string;
  longitude: string;
  latitude: string;
}

// World Bank wraps responses in [metadata, data] tuple
type WBResponse<T> = [{ page: number; pages: number; per_page: string; total: number }, T[]];

// ─── Public API ──────────────────────────────────────────────────────

/** Get indicator data for a country or set of countries. */
export async function getIndicator(indicatorId: string, opts: {
  country?: string;  // ISO2 code, "US", "GB", "all", or semicolon-separated "US;GB;DE"
  dateRange?: string; // "2020:2024" or single year "2024"
  perPage?: number;
} = {}): Promise<{ total: number; data: WBIndicatorValue[] }> {
  const country = opts.country ?? "US";
  const data = await api.get<WBResponse<WBIndicatorValue>>(
    `/country/${country}/indicator/${indicatorId}`,
    { format: "json", date: opts.dateRange, per_page: opts.perPage ?? 100 }
  );
  if (!Array.isArray(data) || data.length < 2) return { total: 0, data: [] };
  return { total: data[0].total, data: data[1] ?? [] };
}

/** Compare an indicator across multiple countries. */
export async function compareCountries(indicatorId: string, countries: string[], opts?: {
  dateRange?: string; perPage?: number;
}): Promise<{ total: number; data: WBIndicatorValue[] }> {
  return getIndicator(indicatorId, {
    country: countries.join(";"),
    dateRange: opts?.dateRange,
    perPage: opts?.perPage ?? 500,
  });
}

/**
 * Search for indicators by keyword.
 *
 * The World Bank API has no server-side text search, so we fetch the indicator
 * catalog and filter client-side over the full ≈29,000-indicator catalog
 * (2 requests, cached 24h). Pass `source` to scope to a single source database
 * (e.g. 2 = World Development Indicators) for tighter, faster results.
 */
export async function searchIndicators(query: string, opts: {
  limit?: number;
  source?: string | number; // restrict to a single source database (e.g. 2 = WDI)
} = {}): Promise<WBIndicatorInfo[]> {
  const limit = opts.limit ?? 30;
  const q = query.toLowerCase();
  const matches: WBIndicatorInfo[] = [];

  const baseParams: Record<string, string | number | undefined> = {
    format: "json",
    per_page: 20000,
    source: opts.source,
  };

  let page = 1;
  let pages = 1;
  do {
    const data = await api.get<WBResponse<WBIndicatorInfo>>("/indicator", { ...baseParams, page });
    if (!Array.isArray(data) || data.length < 2 || !data[1]) break;
    pages = data[0].pages;
    for (const i of data[1]) {
      if (
        i.name?.toLowerCase().includes(q) ||
        i.id?.toLowerCase().includes(q) ||
        i.sourceNote?.toLowerCase().includes(q)
      ) {
        matches.push(i);
      }
    }
    if (matches.length >= limit) break; // stop early once we have enough
    page++;
  } while (page <= pages);

  return matches.slice(0, limit);
}

/** List countries with metadata. */
export async function listCountries(perPage = 300): Promise<WBCountry[]> {
  const data = await api.get<WBResponse<WBCountry>>("/country", { format: "json", per_page: perPage });
  if (!Array.isArray(data) || data.length < 2) return [];
  return (data[1] ?? []).filter(c => c.region?.id !== "NA"); // filter out aggregates
}

/** Popular indicator IDs for quick reference. */
export const POPULAR_INDICATORS = {
  "NY.GDP.MKTP.CD": "GDP (current US$)",
  "NY.GDP.MKTP.KD.ZG": "GDP growth (annual %)",
  "NY.GDP.PCAP.CD": "GDP per capita (current US$)",
  "SP.POP.TOTL": "Population, total",
  "SP.DYN.LE00.IN": "Life expectancy at birth (years)",
  "SH.XPD.CHEX.PC.CD": "Health expenditure per capita (US$)",
  "SH.XPD.CHEX.GD.ZS": "Health expenditure (% of GDP)",
  "FP.CPI.TOTL.ZG": "Inflation, consumer prices (annual %)",
  "SL.UEM.TOTL.ZS": "Unemployment (% of labor force)",
  "GC.DOD.TOTL.GD.ZS": "Central gov't debt (% of GDP)",
  "NE.EXP.GNFS.ZS": "Exports of goods and services (% of GDP)",
  "NE.IMP.GNFS.ZS": "Imports of goods and services (% of GDP)",
  "SI.POV.GINI": "Gini index (income inequality)",
  "SE.XPD.TOTL.GD.ZS": "Education expenditure (% of GDP)",
  "EN.ATM.CO2E.PC": "CO2 emissions (metric tons per capita)",
  "IT.NET.USER.ZS": "Internet users (% of population)",
  "SM.POP.NETM": "Net migration",
} as const;

/**
 * Clear Cache.
 */
export function clearCache(): void { api.clearCache(); }
