/**
 * EPA AQS (Air Quality System) SDK — typed API client for ambient air quality data.
 *
 * Separated from the main EPA module because AQS requires its own API key + email,
 * while other EPA APIs (ECHO, TRI, GHG, SDWIS, UV) are keyless.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getAirQuality, getDailyAirQuality, getAirMonitors } from "us-gov-open-data-mcp/sdk/epa-aqs";
 *
 *   const annual = await getAirQuality({ state: "06", param: "44201", bdate: "20240101", edate: "20241231" });
 *   const daily  = await getDailyAirQuality({ state: "06", param: "88101", bdate: "20240601", edate: "20240630" });
 *   const monitors = await getAirMonitors({ state: "06", param: "44201", bdate: "20240101", edate: "20241231" });
 *
 * Requires AQS_API_KEY and AQS_EMAIL env vars.
 * Signup: https://aqs.epa.gov/data/api/signup?email=YOUR_EMAIL
 * Docs: https://aqs.epa.gov/aqsweb/documents/data_api.html
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const aqs = createClient({
  baseUrl: "https://aqs.epa.gov/data/api",
  name: "epa-aqs",
  auth: {
    type: "query",
    envParams: { key: "AQS_API_KEY", email: "AQS_EMAIL" },
  },
  // AQS: max 10 req/min with 5-second pause between requests
  rateLimit: { perSecond: 0.2, burst: 1 },
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours — AQS data is historical, not real-time
  checkError: (data) => {
    const d = data as { Header?: Array<{ status?: string; error?: string[] }> };
    const h = d?.Header?.[0];
    if (h?.status === "Failed") return h.error?.join("; ") ?? "AQS request failed";
    return null;
  },
});

// ─── Types ───────────────────────────────────────────────────────────

/** AQS API response wrapper. */
export interface AqsResponse<T = Record<string, unknown>> {
  Header: Array<{ status: string; rows?: number; request_time?: string }>;
  Data: T[];
}

/** AQS annual/daily/quarterly summary record. */
export interface AqsSummary {
  state_code?: string;
  county_code?: string;
  site_number?: string;
  parameter_code?: string;
  parameter_name?: string;
  poc?: number;
  latitude?: number;
  longitude?: number;
  datum?: string;
  state_name?: string;
  county_name?: string;
  cbsa_code?: string;
  city_name?: string;
  date_of_last_change?: string;
  [key: string]: unknown;
}

/** AQS monitor record. */
export interface AqsMonitor {
  state_code?: string;
  county_code?: string;
  site_number?: string;
  parameter_code?: string;
  parameter_name?: string;
  poc?: number;
  latitude?: number;
  longitude?: number;
  datum?: string;
  first_year_of_data?: number;
  last_sample_date?: string;
  monitor_type?: string;
  measurement_scale?: string;
  open_date?: string;
  close_date?: string;
  state_name?: string;
  county_name?: string;
  city_name?: string;
  cbsa_name?: string;
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Common AQS parameter codes for criteria pollutants. */
export const AQS_PARAMS = {
  "44201": "Ozone",
  "88101": "PM2.5 (FRM/FEM)",
  "88502": "PM2.5 (non-FRM, e.g. continuous)",
  "81102": "PM10",
  "42401": "SO2 (Sulfur Dioxide)",
  "42101": "CO (Carbon Monoxide)",
  "42602": "NO2 (Nitrogen Dioxide)",
  "14129": "Lead (Pb)",
} as const;

/** AQS data service types (endpoints). */
export const AQS_SERVICES = {
  annualData: "Annual summaries (yearly statistics per monitor)",
  dailyData: "Daily summaries (daily mean, max, etc.)",
  quarterlyData: "Quarterly summaries (quarterly statistics)",
  sampleData: "Raw sample data (hourly or finer grain)",
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Get air quality data from EPA's AQS (Air Quality System).
 * Returns annual, daily, quarterly, or sample-level data by state.
 *
 * State codes are 2-digit FIPS codes (with leading zero): '01'=AL, '06'=CA, '37'=NC, '48'=TX.
 * Parameter codes: 44201=Ozone, 88101=PM2.5, 42401=SO2, 42101=CO, 42602=NO2.
 * bdate/edate must be in same year (YYYYMMDD format).
 *
 * Example:
 *   const data = await getAirQuality({ state: "06", param: "44201", bdate: "20240101", edate: "20241231" });
 */
export async function getAirQuality(opts: {
  state: string;
  param: string;
  bdate: string;
  edate: string;
  county?: string;
  service?: string;
}): Promise<AqsSummary[]> {
  const service = opts.service ?? "annualData";
  const geo = opts.county ? "byCounty" : "byState";
  const params: Record<string, string> = {
    param: opts.param,
    bdate: opts.bdate,
    edate: opts.edate,
    state: opts.state,
  };
  if (opts.county) params.county = opts.county;

  const res = await aqs.get<AqsResponse<AqsSummary>>(`/${service}/${geo}`, params);
  return res?.Data ?? [];
}

/**
 * Get daily air quality summary data from AQS.
 * Convenience wrapper for getAirQuality with service="dailyData".
 *
 * Example:
 *   const data = await getDailyAirQuality({ state: "06", param: "88101", bdate: "20240601", edate: "20240630" });
 */
export async function getDailyAirQuality(opts: {
  state: string;
  param: string;
  bdate: string;
  edate: string;
  county?: string;
}): Promise<AqsSummary[]> {
  return getAirQuality({ ...opts, service: "dailyData" });
}

/**
 * Get air quality monitors from AQS.
 * Returns monitor locations, operational dates, and measurement capabilities.
 *
 * Example:
 *   const monitors = await getAirMonitors({ state: "06", param: "44201", bdate: "20240101", edate: "20241231" });
 */
export async function getAirMonitors(opts: {
  state: string;
  param: string;
  bdate: string;
  edate: string;
  county?: string;
}): Promise<AqsMonitor[]> {
  const geo = opts.county ? "byCounty" : "byState";
  const params: Record<string, string> = {
    param: opts.param,
    bdate: opts.bdate,
    edate: opts.edate,
    state: opts.state,
  };
  if (opts.county) params.county = opts.county;

  const res = await aqs.get<AqsResponse<AqsMonitor>>(`/monitors/${geo}`, params);
  return res?.Data ?? [];
}

/** Clear cached responses. */
export function clearCache(): void {
  aqs.clearCache();
}
