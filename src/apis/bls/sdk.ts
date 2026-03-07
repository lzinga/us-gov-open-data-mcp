/**
 * BLS SDK — typed API client for the Bureau of Labor Statistics Public Data API v2.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getSeriesData, searchPopularSeries } from "us-gov-open-data-mcp/sdk/bls";
 *
 * Optional BLS_API_KEY env var — get one at https://www.bls.gov/developers/home.htm
 * Without key: 25 req/day, 10yr max range, no calculations.
 * With key: 500 req/day, 20yr range, calculations enabled.
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.bls.gov/publicAPI/v2",
  name: "bls",
  auth: {
    type: "body",
    envParams: { registrationkey: "BLS_API_KEY" },
    extraParams: { calculations: "true", annualaverage: "true" },
  },
  rateLimit: { perSecond: 2, burst: 5 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour — BLS data updates monthly
  checkError: (data) => {
    const d = data as any;
    return d?.status === "REQUEST_NOT_PROCESSED" ? (d.message?.join("; ") ?? "Error") : null;
  },
});

// ─── Types ───────────────────────────────────────────────────────────

/** Bls Observation. */
export interface BlsObservation {
  year: string;
  period: string;
  periodName: string;
  latest: string;
  value: string;
  footnotes: { code: string; text: string }[];
  calculations?: {
    net_changes?: Record<string, string>;
    pct_changes?: Record<string, string>;
  };
}

/** Bls Series. */
export interface BlsSeries {
  seriesID: string;
  data: BlsObservation[];
}

/** Bls Response. */
export interface BlsResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: BlsSeries[];
  };
}

/** Bls Popular Series. */
export interface BlsPopularSeries {
  id: string;
  name: string;
  category: string;
}

// ─── Reference data ──────────────────────────────────────────────────

/** BLS series ID prefix codes — identifies the survey/program a series belongs to. */
export const seriesPrefixes = {
  CES: "Current Employment Statistics (establishment survey — jobs by industry)",
  LNS: "Labor Force Statistics, seasonally adjusted (household survey)",
  LNU: "Labor Force Statistics, not seasonally adjusted",
  CU: "Consumer Price Index (CPI-U, urban consumers)",
  CW: "Consumer Price Index (CPI-W, wage earners)",
  WP: "Producer Price Index (PPI)",
  OE: "Occupational Employment and Wages (OES)",
  JT: "Job Openings and Labor Turnover Survey (JOLTS)",
  LA: "Local Area Unemployment Statistics (LAUS)",
  SM: "State and Metro Area Employment (CES)",
  EN: "Quarterly Census of Employment and Wages (QCEW)",
  PR: "Productivity and Costs",
  EI: "Employment Cost Index (ECI)",
  AP: "Average Price Data",
} as const;

/** Curated catalog of popular BLS series IDs with names and topic categories. Used by `searchPopularSeries()`. */
export const popularSeries: BlsPopularSeries[] = [
  // Employment
  { id: "CES0000000001", name: "Total nonfarm employment (thousands)", category: "employment" },
  { id: "CES0500000001", name: "Total private employment (thousands)", category: "employment" },
  { id: "CES1000000001", name: "Mining and logging", category: "employment" },
  { id: "CES2000000001", name: "Construction", category: "employment" },
  { id: "CES3000000001", name: "Manufacturing", category: "employment" },
  { id: "CES4000000001", name: "Trade, transportation, utilities", category: "employment" },
  { id: "CES5000000001", name: "Information", category: "employment" },
  { id: "CES5500000001", name: "Financial activities", category: "employment" },
  { id: "CES6000000001", name: "Professional and business services", category: "employment" },
  { id: "CES6500000001", name: "Education and health services", category: "employment" },
  { id: "CES7000000001", name: "Leisure and hospitality", category: "employment" },
  { id: "CES8000000001", name: "Other services", category: "employment" },
  { id: "CES9000000001", name: "Government", category: "employment" },
  // Unemployment
  { id: "LNS14000000", name: "Unemployment rate (seasonally adjusted)", category: "unemployment" },
  { id: "LNS14000003", name: "Unemployment rate - White", category: "unemployment" },
  { id: "LNS14000006", name: "Unemployment rate - Black/African American", category: "unemployment" },
  { id: "LNS14000009", name: "Unemployment rate - Hispanic/Latino", category: "unemployment" },
  { id: "LNS11300000", name: "Labor force participation rate", category: "unemployment" },
  { id: "LNS12300000", name: "Employment-population ratio", category: "unemployment" },
  { id: "LNS13023621", name: "U-6 (broader unemployment measure)", category: "unemployment" },
  // Wages
  { id: "CES0500000003", name: "Average hourly earnings, total private", category: "wages" },
  { id: "CES0500000011", name: "Average weekly earnings, total private", category: "wages" },
  { id: "CES0500000008", name: "Average hourly earnings, production workers", category: "wages" },
  { id: "CES3000000003", name: "Average hourly earnings, manufacturing", category: "wages" },
  { id: "CES6562000003", name: "Average hourly earnings, healthcare", category: "wages" },
  // CPI
  { id: "CUUR0000SA0", name: "CPI-U All Items", category: "cpi" },
  { id: "CUUR0000SA0L1E", name: "CPI-U All items less food and energy (core)", category: "cpi" },
  { id: "CUUR0000SAF1", name: "CPI-U Food", category: "cpi_components" },
  { id: "CUUR0000SAH1", name: "CPI-U Shelter/Housing", category: "cpi_components" },
  { id: "CUUR0000SETB01", name: "CPI-U Gasoline", category: "cpi_components" },
  { id: "CUUR0000SAM", name: "CPI-U Medical Care", category: "cpi_components" },
  { id: "CUUR0000SAE", name: "CPI-U Education & Communication", category: "cpi_components" },
  { id: "CUUR0000SAT", name: "CPI-U Transportation", category: "cpi_components" },
  { id: "CUUR0000SAR", name: "CPI-U Recreation", category: "cpi_components" },
  { id: "CUUR0000SAA", name: "CPI-U Apparel", category: "cpi_components" },
  // PPI
  { id: "WPUFD4", name: "PPI - Finished goods", category: "ppi" },
  { id: "WPUFD49104", name: "PPI - Finished consumer foods", category: "ppi" },
  { id: "WPSSOP3000", name: "PPI - Total services", category: "ppi" },
  // Productivity
  { id: "PRS85006092", name: "Nonfarm business labor productivity", category: "productivity" },
  { id: "PRS85006112", name: "Nonfarm business unit labor costs", category: "productivity" },
  // JOLTS
  { id: "JTS000000000000000JOR", name: "Job openings rate", category: "jolts" },
  { id: "JTS000000000000000HIR", name: "Hires rate", category: "jolts" },
  { id: "JTS000000000000000TSR", name: "Total separations rate", category: "jolts" },
  { id: "JTS000000000000000QUR", name: "Quits rate", category: "jolts" },
  { id: "JTS000000000000000LDR", name: "Layoffs and discharges rate", category: "jolts" },
];

/** State abbreviation to FIPS code mapping — used to construct LAUS employment series IDs. */
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

// ─── Public API ──────────────────────────────────────────────────────

/** Fetch time series data from BLS. Posts to /timeseries/data/ with series IDs. */
export async function getSeriesData(
  seriesIds: string[],
  opts: { startYear?: number; endYear?: number } = {},
): Promise<BlsResponse> {
  const body: Record<string, unknown> = {
    seriesid: seriesIds,
  };
  if (opts.startYear) body.startyear = String(opts.startYear);
  if (opts.endYear) body.endyear = String(opts.endYear);

  return api.post<BlsResponse>("/timeseries/data/", body);
}

/** Local lookup — search popular series by topic. No API call. */
export function searchPopularSeries(topic: string): BlsPopularSeries[] {
  const t = topic.toLowerCase();
  return popularSeries.filter(s => s.category === t);
}

/** Get state employment series IDs constructed from FIPS codes. */
export function getStateEmploymentSeries(stateCode: string): BlsPopularSeries[] | null {
  const fips = (stateFips as Record<string, string>)[stateCode.toUpperCase()];
  if (!fips) return null;
  const st = stateCode.toUpperCase();
  return [
    { id: `LASST${fips}0000000000003`, name: `${st} unemployment rate`, category: "state_employment" },
    { id: `LASST${fips}0000000000005`, name: `${st} employment`, category: "state_employment" },
    { id: `LASST${fips}0000000000006`, name: `${st} labor force`, category: "state_employment" },
    { id: `SMS${fips}000000000000001`, name: `${st} total nonfarm employment`, category: "state_employment" },
  ];
}

/** Get available topic categories. */
export function getAvailableTopics(): string[] {
  const cats = new Set(popularSeries.map(s => s.category));
  return [...cats, "state_employment"];
}

// ─── CPI series IDs + labels (used by cpi_breakdown tool) ───────────

/** CPI component series — series ID to human-readable label. Use `Object.keys()` for the ID list. */
export const cpiSeries = {
  "CUUR0000SA0": "All Items",
  "CUUR0000SAF1": "Food",
  "CUUR0000SAH1": "Shelter/Housing",
  "CUUR0000SETB01": "Gasoline",
  "CUUR0000SAM": "Medical Care",
  "CUUR0000SAE": "Education & Communication",
  "CUUR0000SAT": "Transportation",
  "CUUR0000SAR": "Recreation",
  "CUUR0000SAA": "Apparel",
} as const;

// ─── Employment by industry series IDs + labels ──────────────────────

/** Employment-by-industry series — series ID to sector label. Use `Object.keys()` for the ID list. */
export const industrySeries = {
  "CES0000000001": "Total Nonfarm",
  "CES1000000001": "Mining & Logging",
  "CES2000000001": "Construction",
  "CES3000000001": "Manufacturing",
  "CES4000000001": "Trade/Transport/Utilities",
  "CES5000000001": "Information",
  "CES5500000001": "Financial Activities",
  "CES6000000001": "Professional & Business Services",
  "CES6500000001": "Education & Health",
  "CES7000000001": "Leisure & Hospitality",
  "CES8000000001": "Other Services",
  "CES9000000001": "Government",
} as const;

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
