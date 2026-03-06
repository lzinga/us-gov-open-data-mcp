/**
 * EPA SDK — typed API client for EPA Envirofacts and ECHO (Enforcement & Compliance) APIs.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getAirQuality, searchFacilities, getUVIndex } from "us-gov-open-data-mcp/sdk/epa";
 *
 *   const aq = await getAirQuality({ state: "CA" });
 *   console.log(aq);
 *
 *   const facilities = await searchFacilities({ state: "NY", mediaType: "air", majorOnly: true });
 *   console.log(facilities);
 *
 *   const uv = await getUVIndex("10001");
 *   console.log(uv);
 *
 * No API key required.
 * Docs:
 *   Envirofacts: https://www.epa.gov/enviro/web-services
 *   ECHO: https://echo.epa.gov/tools/web-services
 */

import { createClient } from "../../shared/client.js";

// ─── Clients ─────────────────────────────────────────────────────────

const envirofacts = createClient({
  baseUrl: "https://enviro.epa.gov/enviro/efservice",
  name: "epa-envirofacts",
  rateLimit: { perSecond: 3, burst: 8 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

const echo = createClient({
  baseUrl: "https://echo.epa.gov/api",
  name: "epa-echo",
  rateLimit: { perSecond: 3, burst: 8 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

// ─── Types ───────────────────────────────────────────────────────────

/** Air Quality Measure. */
export interface AirQualityMeasure {
  
  STATE_ABBR?: string;
  
  STATE_NAME?: string;
  
  COUNTY_NAME?: string;
  
  CBSA_NAME?: string;
  
  MEASURE_NAME?: string;
  
  MEASURE_ID?: number;
  
  UNIT_OF_MEASURE?: string;
  VALUE?: number;
  YEAR?: number;
  [key: string]: unknown;
}

/** Echo Facility. */
export interface EchoFacility {
  CWPName?: string;
  RegistryID?: string;
  FacName?: string;
  FacStreet?: string;
  FacCity?: string;
  FacState?: string;
  FacZip?: string;
  FacLat?: number;
  FacLong?: number;
  FacSICCodes?: string;
  FacNAICSCodes?: string;
  CurrSvFlag?: string;
  CurrVioFlag?: string;
  Src?: string;
  [key: string]: unknown;
}

/** Echo Search Result. */
export interface EchoSearchResult {
  Results: {
    Message: string;
    TotalPenalties?: string;
    FEAFlag?: string;
    CVRows?: string;
    Facilities?: EchoFacility[];
    [key: string]: unknown;
  };
}

/** Echo Facility Detail. */
export interface EchoFacilityDetail {
  Results: {
    Message: string;
    Permits?: Record<string, unknown>[];
    Violations?: Record<string, unknown>[];
    Actions?: Record<string, unknown>[];
    [key: string]: unknown;
  };
}

/** UV index forecast data. */
export interface UVForecast {
  ZIP?: string;
  
  DATE_TIME?: string;
  
  UV_INDEX?: number;
  
  UV_ALERT?: number;
  ORDER?: number;
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Common Envirofacts tables for air quality data. */
export const AIR_TABLES = {
  AIR_QUALITY_MEASURES: "County-level air quality summary measures",
  GETGISAIR: "GIS-enabled air facility data",
} as const;

/** ECHO media types for facility searches. */
export const MEDIA_TYPES = {
  air: "Clean Air Act (CAA) facilities",
  water: "Clean Water Act (CWA) facilities",
} as const;

/** UV Index scale descriptions. */
export const UV_INDEX_SCALE = {
  "0-2": "Low — minimal danger for average person",
  "3-5": "Moderate — take precautions (hat, sunscreen)",
  "6-7": "High — protection required, reduce sun exposure",
  "8-10": "Very High — extra protection, avoid midday sun",
  "11+": "Extreme — unprotected skin can burn in minutes",
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Get air quality measures from EPA Envirofacts.
 *
 * Example:
 *   const data = await getAirQuality({ state: "CA" });
 *   const data = await getAirQuality({ state: "NY", rows: "0:49" });
 */
export async function getAirQuality(opts: {
  state: string;
  rows?: string;
  table?: string;
}): Promise<AirQualityMeasure[]> {
  const table = opts.table ?? "AIR_QUALITY_MEASURES";
  const rows = opts.rows ?? "0:99";
  return envirofacts.get<AirQualityMeasure[]>(
    `/${table}/STATE_ABBR/${opts.state.toUpperCase()}/ROWS/${rows}/JSON`,
  );
}

/**
 * Search EPA-regulated facilities via ECHO (Enforcement & Compliance History Online).
 *
 * Example:
 *   const air = await searchFacilities({ state: "TX", mediaType: "air", majorOnly: true });
 *   const water = await searchFacilities({ state: "CA", mediaType: "water", activeOnly: true });
 */
export async function searchFacilities(opts: {
  state: string;
  mediaType?: "air" | "water";
  majorOnly?: boolean;
  activeOnly?: boolean;
  responseset?: number;
  zip?: string;
  penaltyRange?: string;
}): Promise<EchoSearchResult> {
  const endpoint = opts.mediaType === "water"
    ? "/cwa-facility-search"
    : "/air-facility-search";

  const params: Record<string, string | number | undefined> = {
    output: "JSON",
    p_st: opts.state.toUpperCase(),
    responseset: opts.responseset ?? 20,
  };
  if (opts.majorOnly) params.p_pc = "MAJOR";
  if (opts.activeOnly) params.p_act = "Y";
  if (opts.zip) params.p_zip = opts.zip;
  if (opts.penaltyRange) params.p_penalty = opts.penaltyRange;

  return echo.get<EchoSearchResult>(endpoint, params);
}

/**
 * Get detailed facility report from ECHO including permits, violations, and enforcement actions.
 *
 * Example:
 *   const detail = await getFacilityDetail("110000350016");
 */
export async function getFacilityDetail(registryId: string): Promise<EchoFacilityDetail> {
  return echo.get<EchoFacilityDetail>("/detailed-facility-report", {
    p_id: registryId,
    output: "JSON",
  });
}

/**
 * Get UV index forecast by ZIP code from EPA Envirofacts.
 *
 * Example:
 *   const forecast = await getUVIndex("90210");
 */
export async function getUVIndex(zip: string): Promise<UVForecast[]> {
  return envirofacts.get<UVForecast[]>(
    `/getEnvirofactsUVDAILY/ZIP/${zip}/JSON`,
  );
}

/** Clear cached responses from both clients. */
export function clearCache(): void {
  envirofacts.clearCache();
  echo.clearCache();
}
