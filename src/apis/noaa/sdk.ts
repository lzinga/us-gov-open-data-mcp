/**
 * NOAA Climate Data Online SDK — weather, temperature, precipitation data.
 *
 * API docs: https://www.ncei.noaa.gov/cdo-web/webservices/v2
 * Get key: https://www.ncei.noaa.gov/cdo-web/token
 * Rate limit: 5 req/sec, 10,000 req/day
 *
 * Without NOAA_API_KEY, station data for GHCND/GSOM/GSOY comes from NCEI's
 * keyless Access Data Service instead (https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation).
 * Dataset, station and location searches still need the CDO key.
 *
 * Usage:
 *   import { getClimateData, searchStations } from "us-gov-open-data-mcp/sdk/noaa";
 *   const data = await getClimateData({ datasetId: "GHCND", stationId: "GHCND:USW00094728", startDate: "2025-01-01", endDate: "2025-12-31" });
 */

import { createClient } from "../../shared/client.js";

const api = createClient({
  baseUrl: "https://www.ncei.noaa.gov/cdo-web/api/v2",
  name: "noaa",
  auth: { type: "header", envParams: { token: "NOAA_API_KEY" } },
  rateLimit: { perSecond: 5, burst: 5 },
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours — historical weather doesn't change
});

/** NCEI Access Data Service (no key): station data by dataset and date range. */
const ads = createClient({
  baseUrl: "https://www.ncei.noaa.gov/access/services/data",
  name: "noaa-ads",
  rateLimit: { perSecond: 5, burst: 5 },
  cacheTtlMs: 24 * 60 * 60 * 1000,
  timeoutMs: 60_000,
});

/** CDO dataset IDs and their Access Data Service equivalents. */
const ADS_DATASETS: Record<string, string> = {
  GHCND: "daily-summaries",
  GSOM: "global-summary-of-the-month",
  GSOY: "global-summary-of-the-year",
};

/** Access Data Service columns that describe the row rather than a data type. */
const ADS_ROW_FIELDS = new Set(["DATE", "STATION", "NAME", "LATITUDE", "LONGITUDE", "ELEVATION"]);

// ─── Types ───────────────────────────────────────────────────────────

/** Noaa Dataset. */
export interface NoaaDataset {
  id: string;
  name: string;
  datacoverage: number;
  mindate: string;
  maxdate: string;
}

/** Noaa Station. */
export interface NoaaStation {
  id: string;
  name: string;
  datacoverage: number;
  elevation: number;
  elevationUnit: string;
  latitude: number;
  longitude: number;
  mindate: string;
  maxdate: string;
}

/** Noaa Data Point. */
export interface NoaaDataPoint {
  date: string;
  datatype: string;
  station: string;
  value: number;
  attributes: string;
}

interface NoaaResponse<T> {
  metadata?: { resultset: { offset: number; count: number; limit: number } };
  results?: T[];
}

// ─── Public API ──────────────────────────────────────────────────────

/** List available datasets (GHCND, GSOM, GSOY, etc.) */
export async function listDatasets(): Promise<NoaaDataset[]> {
  const data = await api.get<NoaaResponse<NoaaDataset>>("/datasets", { limit: 50 });
  return data.results ?? [];
}

/** Search for weather stations by location or dataset. */
export async function searchStations(opts: {
  datasetId?: string;
  locationId?: string;
  extent?: string; // lat,lon bounding box
  limit?: number;
}): Promise<NoaaStation[]> {
  const data = await api.get<NoaaResponse<NoaaStation>>("/stations", {
    datasetid: opts.datasetId,
    locationid: opts.locationId,
    extent: opts.extent,
    limit: opts.limit ?? 25,
  });
  return data.results ?? [];
}

/** CDO-style date for an Access Data Service DATE: "2024-01" → "2024-01-01T00:00:00". */
function cdoDate(date: string): string {
  if (/^\d{4}$/.test(date)) return `${date}-01-01T00:00:00`;
  if (/^\d{4}-\d{2}$/.test(date)) return `${date}-01T00:00:00`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date}T00:00:00`;
  return date;
}

/**
 * Station observations from the keyless Access Data Service, reshaped into
 * CDO's one-row-per-observation form. ADS returns every row at once, so
 * `limit` is applied here.
 */
async function getClimateDataFromAds(opts: {
  datasetId: string;
  startDate: string;
  endDate: string;
  stationId: string;
  datatypeId?: string;
  limit?: number;
}): Promise<{ count: number; data: NoaaDataPoint[] }> {
  const rows = await ads.get<Record<string, string>[]>("/v1", {
    dataset: ADS_DATASETS[opts.datasetId],
    stations: opts.stationId.split(",").map(s => s.trim().replace(/^[A-Za-z]+:/, "")).join(","),
    startDate: opts.startDate,
    endDate: opts.endDate,
    dataTypes: opts.datatypeId,
    format: "json",
    units: "standard",
    includeAttributes: "true",
  });
  const points: NoaaDataPoint[] = [];
  for (const row of rows ?? []) {
    const types = Object.keys(row).filter(k => !ADS_ROW_FIELDS.has(k) && !k.endsWith("_ATTRIBUTES")).sort();
    for (const datatype of types) {
      const raw = String(row[datatype] ?? "").trim();
      const value = Number(raw);
      if (raw === "" || !Number.isFinite(value)) continue;
      points.push({
        date: cdoDate(row.DATE),
        datatype,
        station: `GHCND:${row.STATION}`,
        value,
        attributes: row[`${datatype}_ATTRIBUTES`] ?? "",
      });
    }
  }
  return { count: points.length, data: points.slice(0, opts.limit ?? 1000) };
}

/**
 * Get climate observations. Uses CDO with NOAA_API_KEY; without a key,
 * station queries on GHCND/GSOM/GSOY go to the keyless Access Data Service
 * and come back in the same shape (`source` says which one answered).
 */
export async function getClimateData(opts: {
  datasetId: string;
  startDate: string;
  endDate: string;
  stationId?: string;
  locationId?: string;
  datatypeId?: string;
  limit?: number;
}): Promise<{ count: number; data: NoaaDataPoint[]; source: "cdo" | "ads" }> {
  if (!process.env.NOAA_API_KEY && opts.stationId && !opts.locationId && ADS_DATASETS[opts.datasetId]) {
    return { ...(await getClimateDataFromAds({ ...opts, stationId: opts.stationId })), source: "ads" };
  }
  const data = await api.get<NoaaResponse<NoaaDataPoint>>("/data", {
    datasetid: opts.datasetId,
    startdate: opts.startDate,
    enddate: opts.endDate,
    stationid: opts.stationId,
    locationid: opts.locationId,
    datatypeid: opts.datatypeId,
    limit: opts.limit ?? 1000,
    units: "standard",
  });
  return {
    count: data.metadata?.resultset?.count ?? 0,
    data: data.results ?? [],
    source: "cdo",
  };
}

/** Search locations (states, cities, countries, etc.) */
export async function searchLocations(opts: {
  categoryId?: string; // CITY, ST, CNTRY, etc.
  datasetId?: string;
  limit?: number;
}): Promise<{ id: string; name: string; datacoverage: number; mindate: string; maxdate: string }[]> {
  const data = await api.get<NoaaResponse<any>>("/locations", {
    locationcategoryid: opts.categoryId,
    datasetid: opts.datasetId,
    limit: opts.limit ?? 50,
    sortfield: "name",
  });
  return data.results ?? [];
}

/**
 * Clear Cache.
 */
export function clearCache(): void {
  api.clearCache();
  ads.clearCache();
}
