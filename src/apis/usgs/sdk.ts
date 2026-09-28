/**
 * USGS SDK — typed API client for earthquake data and water data.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchEarthquakes, getWaterData } from "us-gov-open-data-mcp/sdk/usgs";
 *
 *   const quakes = await searchEarthquakes({ minmagnitude: 5, starttime: "2024-01-01" });
 *   const water = await getWaterData({ sites: "01646500", parameterCd: "00060" });
 *
 * Earthquakes need no key. The USGS Water Data APIs (api.waterdata.usgs.gov)
 * allow a few anonymous requests per hour; they run on api.data.gov, so an
 * existing DATA_GOV_API_KEY raises the limit to 1,000/hour.
 * Docs:
 *   Earthquake: https://earthquake.usgs.gov/fdsnws/event/1/
 *   Water Data APIs: https://api.waterdata.usgs.gov/docs/ogcapi/
 *     (replaces waterservices.usgs.gov, decommissioned Nov 2026–Feb 2027)
 */

import { createClient } from "../../shared/client.js";
import { resolveState } from "../../shared/geo.js";

// ─── Clients ─────────────────────────────────────────────────────────

const earthquakeApi = createClient({
  baseUrl: "https://earthquake.usgs.gov",
  name: "usgs-earthquake",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 5 * 60 * 1000, // 5 min — earthquake data updates frequently
});

/** Legacy NWIS WaterServices — being migrated to waterDataApi. */
const waterApi = createClient({
  baseUrl: "https://waterservices.usgs.gov/nwis",
  name: "usgs-water",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 15 * 60 * 1000, // 15 min
});

/** USGS Water Data APIs (OGC API - Features + statistics), behind api.data.gov. */
const waterDataApi = createClient({
  baseUrl: "https://api.waterdata.usgs.gov",
  name: "usgs-waterdata",
  auth: { type: "header", envParams: { "X-Api-Key": "DATA_GOV_API_KEY" } },
  rateLimit: { perSecond: 2, burst: 5 },
  cacheTtlMs: 15 * 60 * 1000, // 15 min
  timeoutMs: 60_000,
});

/** OGC API collections root. */
const OGC = "/ogcapi/v0/collections";

/** "01646500" or "USGS-01646500" → "USGS-01646500". */
export function toMonitoringLocationId(site: string): string {
  const s = site.trim();
  return /^[A-Z]+-/i.test(s) ? s.toUpperCase() : `USGS-${s}`;
}

/** "USGS-01646500" → "01646500". */
function siteNumber(monitoringLocationId: string): string {
  return monitoringLocationId.replace(/^[A-Z]+-/i, "");
}

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

/** One observation from the continuous or daily collections. */
export interface WaterObservation {
  monitoringLocationId: string;
  /** Identifies one sensor/record series; a site can have several per parameter. */
  timeSeriesId: string | null;
  parameterCode: string;
  statisticId: string | null;
  time: string;
  value: number | null;
  unit: string | null;
  approvalStatus: string | null;
}

/** Summary of one time series (site × parameter × statistic). */
export interface WaterSeries {
  monitoringLocationId: string;
  siteNo: string;
  siteName: string | null;
  parameterCode: string;
  statisticId: string | null;
  unit: string | null;
  count: number;
  earliest: { time: string; value: number | null } | null;
  latest: { time: string; value: number | null } | null;
  min: number | null;
  max: number | null;
  mean: number | null;
}

/** Most observations fetched per request (the API pages at 10 by default). */
export const WATER_OBSERVATION_LIMIT = 10_000;

/** Most site IDs resolved to names in one request. */
const MAX_NAME_LOOKUP = 250;

/** Build the `time` filter: an ISO 8601 duration ("P7D") or an interval ("2024-01-01/2024-01-31"). */
function timeFilter(period: string | undefined, start: string | undefined, end: string | undefined, fallback: string): string {
  if (start || end) return `${start ?? ".."}/${end ?? ".."}`;
  return period ?? fallback;
}

/** Fetch observations from a Water Data API collection, oldest first. */
async function fetchObservations(
  collection: "continuous" | "latest-continuous" | "daily",
  params: Record<string, string | number | undefined>,
): Promise<{ observations: WaterObservation[]; truncated: boolean }> {
  const res = await waterDataApi.get<{ features?: { properties?: Record<string, unknown> }[] }>(
    `${OGC}/${collection}/items`,
    {
      f: "json",
      skipGeometry: "true",
      sortby: "time",
      limit: WATER_OBSERVATION_LIMIT,
      properties: "time_series_id,monitoring_location_id,parameter_code,statistic_id,time,value,unit_of_measure,approval_status",
      ...params,
    },
  );
  const features = res.features ?? [];
  const observations = features.map((f): WaterObservation => {
    const p = f.properties ?? {};
    const raw = p.value;
    const num = raw === null || raw === undefined || raw === "" ? null : Number(raw);
    return {
      monitoringLocationId: String(p.monitoring_location_id ?? ""),
      timeSeriesId: (p.time_series_id as string) ?? null,
      parameterCode: String(p.parameter_code ?? ""),
      statisticId: (p.statistic_id as string) ?? null,
      time: String(p.time ?? ""),
      value: num !== null && Number.isFinite(num) ? num : null,
      unit: (p.unit_of_measure as string) ?? null,
      approvalStatus: (p.approval_status as string) ?? null,
    };
  });
  return { observations, truncated: features.length >= WATER_OBSERVATION_LIMIT };
}

/** Look up monitoring-location names for up to MAX_NAME_LOOKUP IDs. */
async function siteNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)].slice(0, MAX_NAME_LOOKUP);
  if (!unique.length) return new Map();
  const res = await waterDataApi.get<{ features?: { id?: string; properties?: Record<string, unknown> }[] }>(
    `${OGC}/monitoring-locations/items`,
    { f: "json", skipGeometry: "true", id: unique.join(","), limit: unique.length, properties: "monitoring_location_name" },
  );
  const names = new Map<string, string>();
  for (const f of res.features ?? []) {
    const id = String(f.id ?? f.properties?.id ?? "");
    const name = f.properties?.monitoring_location_name;
    if (id && typeof name === "string") names.set(id, name);
  }
  return names;
}

/** Group observations into per-series summaries, adding site names. */
async function summarizeSeries(observations: WaterObservation[]): Promise<WaterSeries[]> {
  const groups = new Map<string, WaterObservation[]>();
  for (const o of observations) {
    const key = `${o.monitoringLocationId}|${o.parameterCode}|${o.statisticId ?? ""}|${o.timeSeriesId ?? ""}`;
    const group = groups.get(key);
    if (group) group.push(o);
    else groups.set(key, [o]);
  }
  let names = new Map<string, string>();
  try {
    names = await siteNames(observations.map(o => o.monitoringLocationId));
  } catch {
    // Names are a convenience; the data is still valid without them.
  }
  return [...groups.values()].map(group => {
    const sorted = [...group].sort((a, b) => a.time.localeCompare(b.time));
    const values = sorted.map(o => o.value).filter((v): v is number => v !== null);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return {
      monitoringLocationId: first.monitoringLocationId,
      siteNo: siteNumber(first.monitoringLocationId),
      siteName: names.get(first.monitoringLocationId) ?? null,
      parameterCode: first.parameterCode,
      statisticId: first.statisticId,
      unit: first.unit,
      count: sorted.length,
      earliest: { time: first.time, value: first.value },
      latest: { time: last.time, value: last.value },
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      mean: values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toPrecision(6)) : null,
    };
  });
}

/**
 * Get real-time ("continuous", formerly instantaneous-value) water data.
 *
 * With `sites`, returns every reading in the time window (default: last day).
 * With only `stateCd`, returns the latest reading of each reporting site in
 * the state (the window is ignored). The continuous collection allows at
 * most three years per request.
 *
 * Example:
 *   const { series } = await getWaterData({ sites: "01646500", parameterCd: "00060" });
 *   const { series } = await getWaterData({ stateCd: "CA", parameterCd: "00060" });
 */
export async function getWaterData(opts: {
  /** Site numbers or monitoring-location IDs, comma-separated. */
  sites?: string;
  /** State as USPS code, name, or FIPS (used when `sites` is omitted). */
  stateCd?: string;
  parameterCd?: string;
  /** ISO 8601 duration, default P1D. */
  period?: string;
  startDT?: string;
  endDT?: string;
}): Promise<{ series: WaterSeries[]; truncated: boolean; mode: "window" | "latest" }> {
  const parameterCode = opts.parameterCd ?? "00060";
  if (opts.sites) {
    const ids = opts.sites.split(",").map(s => s.trim()).filter(Boolean).map(toMonitoringLocationId);
    const { observations, truncated } = await fetchObservations("continuous", {
      monitoring_location_id: ids.join(","),
      parameter_code: parameterCode,
      time: timeFilter(opts.period, opts.startDT, opts.endDT, "P1D"),
    });
    return { series: await summarizeSeries(observations), truncated, mode: "window" };
  }
  if (opts.stateCd) {
    const { observations, truncated } = await fetchObservations("latest-continuous", {
      state_code: resolveState(opts.stateCd, "state_cd").fips,
      parameter_code: parameterCode,
    });
    return { series: await summarizeSeries(observations), truncated, mode: "latest" };
  }
  throw new Error("Provide sites or state_cd to get water data.");
}

/** A USGS monitoring location (from the Water Data APIs). */
export interface WaterSite {
  /** "USGS-01646500" */
  monitoringLocationId: string;
  /** "01646500" */
  siteNo: string;
  name: string | null;
  siteTypeCode: string | null;
  siteType: string | null;
  state: string | null;
  county: string | null;
  hucCode: string | null;
  /** Drainage area, square miles. */
  drainageArea: number | null;
  latitude: number | null;
  longitude: number | null;
}

/** Default and maximum sites returned by searchWaterSites. */
export const WATER_SITES_DEFAULT_LIMIT = 200;
export const WATER_SITES_MAX_LIMIT = 1000;

/**
 * Search USGS water monitoring locations by state, county, and site type.
 * Includes inactive/historical sites (the Water Data APIs have no "active"
 * filter). `truncated` is true when the limit was reached.
 *
 * Example:
 *   const { sites } = await searchWaterSites({ stateCd: "MD", siteType: "ST" });
 */
export async function searchWaterSites(opts: {
  /** State as USPS code, name, or FIPS. */
  stateCd?: string;
  /** County FIPS: 5 digits (state + county, e.g. "24031") or 3 digits with stateCd. */
  countyCd?: string;
  /** ST (stream, default), GW (groundwater), LK (lake), SP (spring), etc. */
  siteType?: string;
  limit?: number;
}): Promise<{ sites: WaterSite[]; truncated: boolean }> {
  let stateFips = opts.stateCd ? resolveState(opts.stateCd, "state_cd").fips : undefined;
  let countyCode: string | undefined;
  if (opts.countyCd) {
    const digits = opts.countyCd.trim();
    if (/^\d{5}$/.test(digits)) {
      stateFips = digits.slice(0, 2);
      countyCode = digits.slice(2);
    } else if (/^\d{1,3}$/.test(digits) && stateFips) {
      countyCode = digits.padStart(3, "0");
    } else {
      throw new Error(`county_cd "${opts.countyCd}" must be a 5-digit county FIPS (e.g. "24031") or a 3-digit code with state_cd.`);
    }
  }
  if (!stateFips) throw new Error("Provide state_cd or a 5-digit county_cd to search water monitoring sites.");

  const limit = Math.min(opts.limit ?? WATER_SITES_DEFAULT_LIMIT, WATER_SITES_MAX_LIMIT);
  const res = await waterDataApi.get<{ features?: { id?: string; geometry?: { coordinates?: number[] } | null; properties?: Record<string, unknown> }[] }>(
    `${OGC}/monitoring-locations/items`,
    {
      f: "json",
      state_code: stateFips,
      county_code: countyCode,
      site_type_code: (opts.siteType ?? "ST").toUpperCase(),
      limit,
      properties: "id,monitoring_location_number,monitoring_location_name,site_type_code,site_type,state_name,county_name,hydrologic_unit_code,drainage_area",
    },
  );

  const features = res.features ?? [];
  const sites = features.map((f): WaterSite => {
    const p = f.properties ?? {};
    const [lon, lat] = f.geometry?.coordinates ?? [];
    const id = String(f.id ?? p.id ?? "");
    return {
      monitoringLocationId: id,
      siteNo: String(p.monitoring_location_number ?? siteNumber(id)),
      name: (p.monitoring_location_name as string) ?? null,
      siteTypeCode: (p.site_type_code as string) ?? null,
      siteType: (p.site_type as string) ?? null,
      state: (p.state_name as string) ?? null,
      county: (p.county_name as string) ?? null,
      hucCode: (p.hydrologic_unit_code as string) ?? null,
      drainageArea: p.drainage_area != null && p.drainage_area !== "" ? Number(p.drainage_area) : null,
      latitude: typeof lat === "number" ? lat : null,
      longitude: typeof lon === "number" ? lon : null,
    };
  });
  return { sites, truncated: features.length >= limit };
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

/**
 * Get USGS streamflow/water statistics (period-of-record percentiles) for a site
 * and parameter. Returns raw RDB (tab-delimited) text. For statReportType="daily"
 * each row is a day-of-year with min/mean/max and p05–p95 percentiles across all
 * years on record — the basis for "is today's flow historically high or low?".
 *
 * Docs: https://waterservices.usgs.gov/docs/statistics/
 */
export async function getWaterStatistics(opts: {
  sites?: string;
  stateCd?: string;
  parameterCd?: string;
  statReportType?: "daily" | "monthly" | "annual";
  statTypeCd?: string; // "all", "mean", "min", "max", "median", etc.
}): Promise<string> {
  const params: Record<string, string | number | undefined> = {
    format: "rdb",
    sites: opts.sites,
    stateCd: opts.stateCd,
    parameterCd: opts.parameterCd ?? "00060",
    statReportType: opts.statReportType ?? "daily",
    statTypeCd: opts.statTypeCd ?? "all",
  };
  return waterApi.getText("/stat/", params);
}

/** Clear all USGS caches. */
export function clearCache(): void {
  earthquakeApi.clearCache();
  waterApi.clearCache();
  waterDataApi.clearCache();
}
