/**
 * USGS SDK — typed API client for earthquake data and water services.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchEarthquakes, getWaterData } from "us-gov-open-data-mcp/sdk/usgs";
 *
 *   const quakes = await searchEarthquakes({ minmagnitude: 5, starttime: "2024-01-01" });
 *   const water = await getWaterData({ sites: "01646500", parameterCd: "00060" });
 *
 * No API key required.
 * Docs:
 *   Earthquake: https://earthquake.usgs.gov/fdsnws/event/1/
 *   Water Services: https://waterservices.usgs.gov/
 */

import { createClient } from "../../shared/client.js";

// ─── Clients ─────────────────────────────────────────────────────────

const earthquakeApi = createClient({
  baseUrl: "https://earthquake.usgs.gov",
  name: "usgs-earthquake",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 5 * 60 * 1000, // 5 min — earthquake data updates frequently
});

const waterApi = createClient({
  baseUrl: "https://waterservices.usgs.gov/nwis",
  name: "usgs-water",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 15 * 60 * 1000, // 15 min
});

// ─── Types ───────────────────────────────────────────────────────────

/** Earthquake Feature. */
export interface EarthquakeFeature {
  type: "Feature";
  properties: {
    mag?: number;
    place?: string;
    time?: number;
    updated?: number;
    tz?: number;
    url?: string;
    detail?: string;
    felt?: number;
    cdi?: number;
    mmi?: number;
    alert?: string;
    status?: string;
    tsunami?: number;
    sig?: number;
    net?: string;
    code?: string;
    ids?: string;
    sources?: string;
    types?: string;
    nst?: number;
    dmin?: number;
    rms?: number;
    gap?: number;
    magType?: string;
    type?: string;
    title?: string;
    [key: string]: unknown;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number, number]; // [lon, lat, depth]
  };
  id: string;
}

/** Earthquake Response. */
export interface EarthquakeResponse {
  type: "FeatureCollection";
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: EarthquakeFeature[];
}

/** Earthquake Count. */
export interface EarthquakeCount {
  count: number;
  maxAllowed: number;
}

/** Water Value. */
export interface WaterValue {
  value: string;
  qualifiers: string[];
  dateTime: string;
}

/** Water Time Series. */
export interface WaterTimeSeries {
  sourceInfo: {
    siteName?: string;
    siteCode?: Array<{ value: string; network?: string; agencyCode?: string }>;
    geoLocation?: {
      geogLocation?: { latitude: number; longitude: number };
    };
    [key: string]: unknown;
  };
  variable: {
    variableCode?: Array<{ value: string; variableID?: number }>;
    variableName?: string;
    unit?: { unitCode?: string };
    [key: string]: unknown;
  };
  values: Array<{
    value: WaterValue[];
    method?: Array<{ methodDescription?: string; methodID?: number }>;
  }>;
}

/** Water Response. */
export interface WaterResponse {
  name: string;
  declaredType: string;
  value: {
    timeSeries: WaterTimeSeries[];
    [key: string]: unknown;
  };
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Common USGS water parameter codes. */
export const WATER_PARAMS = {
  "00060": "Discharge (cubic feet per second)",
  "00065": "Gage height (feet)",
  "00010": "Temperature, water (°C)",
  "00400": "pH",
  "00300": "Dissolved oxygen (mg/L)",
  "00095": "Specific conductance (µS/cm)",
  "00045": "Precipitation (inches)",
  "72019": "Depth to water level (feet below land surface)",
} as const;

/** Earthquake alert levels. */
export const ALERT_LEVELS = {
  green: "Limited impact — no damage expected",
  yellow: "Regional impact — some damage possible",
  orange: "National/international impact — significant damage likely",
  red: "Massive impact — extensive damage and casualties expected",
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search for earthquakes using USGS FDSN Event Web Service.
 *
 * Example:
 *   const quakes = await searchEarthquakes({ minmagnitude: 5, starttime: "2024-01-01" });
 *   const nearby = await searchEarthquakes({ latitude: 37.77, longitude: -122.42, maxradiuskm: 100 });
 */
export async function searchEarthquakes(opts: {
  starttime?: string;
  endtime?: string;
  minmagnitude?: number;
  maxmagnitude?: number;
  mindepth?: number;
  maxdepth?: number;
  latitude?: number;
  longitude?: number;
  maxradiuskm?: number;
  minlatitude?: number;
  maxlatitude?: number;
  minlongitude?: number;
  maxlongitude?: number;
  limit?: number;
  orderby?: "time" | "time-asc" | "magnitude" | "magnitude-asc";
  alertlevel?: "green" | "yellow" | "orange" | "red";
}): Promise<EarthquakeResponse> {
  const params: Record<string, string | number | undefined> = {
    format: "geojson",
    starttime: opts.starttime,
    endtime: opts.endtime,
    minmagnitude: opts.minmagnitude,
    maxmagnitude: opts.maxmagnitude,
    mindepth: opts.mindepth,
    maxdepth: opts.maxdepth,
    latitude: opts.latitude,
    longitude: opts.longitude,
    maxradiuskm: opts.maxradiuskm,
    minlatitude: opts.minlatitude,
    maxlatitude: opts.maxlatitude,
    minlongitude: opts.minlongitude,
    maxlongitude: opts.maxlongitude,
    limit: opts.limit ?? 20,
    orderby: opts.orderby ?? "time",
    alertlevel: opts.alertlevel,
  };
  return earthquakeApi.get<EarthquakeResponse>("/fdsnws/event/1/query", params);
}

/**
 * Count earthquakes matching the given criteria.
 *
 * Example:
 *   const count = await countEarthquakes({ minmagnitude: 4, starttime: "2024-01-01" });
 */
export async function countEarthquakes(opts: {
  starttime?: string;
  endtime?: string;
  minmagnitude?: number;
  maxmagnitude?: number;
  latitude?: number;
  longitude?: number;
  maxradiuskm?: number;
}): Promise<EarthquakeCount> {
  const params: Record<string, string | number | undefined> = {
    format: "geojson",
    starttime: opts.starttime,
    endtime: opts.endtime,
    minmagnitude: opts.minmagnitude,
    maxmagnitude: opts.maxmagnitude,
    latitude: opts.latitude,
    longitude: opts.longitude,
    maxradiuskm: opts.maxradiuskm,
  };
  return earthquakeApi.get<EarthquakeCount>("/fdsnws/event/1/count", params);
}

/**
 * Get the latest significant earthquakes (last 30 days, magnitude 4.5+).
 */
export async function getSignificantEarthquakes(): Promise<EarthquakeResponse> {
  return earthquakeApi.get<EarthquakeResponse>(
    "/earthquakes/feed/v1.0/summary/significant_month.geojson",
  );
}

/**
 * Get USGS water data (streamflow, water level, temperature, etc.) from monitoring sites.
 *
 * Example:
 *   const data = await getWaterData({ sites: "01646500", parameterCd: "00060" });
 *   const data = await getWaterData({ stateCd: "CA", parameterCd: "00060", period: "P7D" });
 */
export async function getWaterData(opts: {
  sites?: string;
  stateCd?: string;
  countyCd?: string;
  huc?: string;
  parameterCd?: string;
  period?: string;
  startDT?: string;
  endDT?: string;
  siteType?: string;
  siteStatus?: "all" | "active" | "inactive";
}): Promise<WaterResponse> {
  const params: Record<string, string | number | undefined> = {
    format: "json",
    sites: opts.sites,
    stateCd: opts.stateCd,
    countyCd: opts.countyCd,
    huc: opts.huc,
    parameterCd: opts.parameterCd ?? "00060",
    period: opts.period ?? "P1D",
    startDT: opts.startDT,
    endDT: opts.endDT,
    siteType: opts.siteType,
    siteStatus: opts.siteStatus ?? "active",
  };
  // Remove period if explicit date range is given
  if (opts.startDT || opts.endDT) delete params.period;
  return waterApi.get<WaterResponse>("/iv/", params);
}

/**
 * Search for USGS water monitoring sites.
 *
 * Example:
 *   const sites = await searchWaterSites({ stateCd: "CA", siteType: "ST" });
 */
export async function searchWaterSites(opts: {
  stateCd?: string;
  countyCd?: string;
  huc?: string;
  siteType?: string;
  siteStatus?: "all" | "active" | "inactive";
  hasDataTypeCd?: string;
}): Promise<unknown> {
  const params: Record<string, string | number | undefined> = {
    format: "rdb",
    stateCd: opts.stateCd,
    countyCd: opts.countyCd,
    huc: opts.huc,
    siteType: opts.siteType ?? "ST",
    siteStatus: opts.siteStatus ?? "active",
    hasDataTypeCd: opts.hasDataTypeCd ?? "iv",
    siteOutput: "expanded",
  };
  // RDB is tab-delimited but easier to parse than the alternatives
  return waterApi.get("/site/", params);
}

/**
 * Get USGS daily value water data (historical daily averages).
 * Unlike instantaneous values (iv), these are aggregated daily means.
 *
 * Example:
 *   const data = await getDailyWaterData({ sites: '01646500', parameterCd: '00060', period: 'P30D' });
 *   const data = await getDailyWaterData({ stateCd: 'CA', parameterCd: '00065', startDT: '2024-01-01', endDT: '2024-12-31' });
 */
export async function getDailyWaterData(opts: {
  sites?: string;
  stateCd?: string;
  countyCd?: string;
  huc?: string;
  parameterCd?: string;
  period?: string;
  startDT?: string;
  endDT?: string;
  siteType?: string;
  siteStatus?: "all" | "active" | "inactive";
  statCd?: string;
}): Promise<WaterResponse> {
  const params: Record<string, string | number | undefined> = {
    format: "json",
    sites: opts.sites,
    stateCd: opts.stateCd,
    countyCd: opts.countyCd,
    huc: opts.huc,
    parameterCd: opts.parameterCd ?? "00060",
    period: opts.period ?? "P30D",
    startDT: opts.startDT,
    endDT: opts.endDT,
    siteType: opts.siteType,
    siteStatus: opts.siteStatus ?? "active",
    statCd: opts.statCd,
  };
  if (opts.startDT || opts.endDT) delete params.period;
  return waterApi.get<WaterResponse>("/dv/", params);
}

/** Clear all USGS caches. */
export function clearCache(): void {
  earthquakeApi.clearCache();
  waterApi.clearCache();
}
