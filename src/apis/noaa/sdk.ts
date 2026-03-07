/**
 * NOAA Climate Data Online SDK — weather, temperature, precipitation data.
 *
 * API docs: https://www.ncei.noaa.gov/cdo-web/webservices/v2
 * Get key: https://www.ncei.noaa.gov/cdo-web/token
 * Rate limit: 5 req/sec, 10,000 req/day
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

/** Get climate observations. */
export async function getClimateData(opts: {
  datasetId: string;
  startDate: string;
  endDate: string;
  stationId?: string;
  locationId?: string;
  datatypeId?: string;
  limit?: number;
}): Promise<{ count: number; data: NoaaDataPoint[] }> {
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
export function clearCache(): void { api.clearCache(); }
