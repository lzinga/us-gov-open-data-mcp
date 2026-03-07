/**
 * @module FRED — Federal Reserve Economic Data
 *
 * Typed API client for FRED's 800K+ economic time series.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getObservations, searchSeries } from "us-gov-open-data-mcp/sdk/fred";
 *
 *   const gdp = await getObservations("GDP", { start: "2024-01-01" });
 *   console.log(gdp.observations);
 *
 * Requires `FRED_API_KEY` env var. Get one free at {@link https://fredaccount.stlouisfed.org/apikeys}.
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.stlouisfed.org",
  name: "fred",
  auth: { type: "query", envParams: { api_key: "FRED_API_KEY" }, extraParams: { file_type: "json" } },
  rateLimit: { perSecond: 2, burst: 5 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour — FRED data updates a few times/day at most
});

// ─── Types ───────────────────────────────────────────────────────────

/** Metadata for a FRED economic data series. */
export interface FredSeries {
  /** Series identifier (e.g. "GDP", "UNRATE", "CPIAUCSL"). */
  id: string;
  /** Human-readable title (e.g. "Gross Domestic Product"). */
  title: string;
  /** Data frequency: "Daily", "Weekly", "Monthly", "Quarterly", "Annual". */
  frequency: string;
  /** Units of measurement (e.g. "Billions of Dollars", "Percent"). */
  units: string;
  /** Seasonal adjustment status (e.g. "Seasonally Adjusted Annual Rate"). */
  seasonal_adjustment: string;
  /** ISO timestamp of the most recent update. */
  last_updated: string;
  /** Search popularity score (0–100). */
  popularity: number;
  /** Descriptive notes about the series. */
  notes: string;
  /** Earliest available observation date (YYYY-MM-DD). */
  observation_start: string;
  /** Latest available observation date (YYYY-MM-DD). */
  observation_end: string;
}

/** Result of a FRED series search. */
export interface FredSearchResult {
  /** Total number of matching series. */
  count: number;
  /** Array of matching series metadata. */
  seriess: FredSeries[];
}

/** A single data point in a FRED time series. */
export interface FredObservation {
  /** Observation date (YYYY-MM-DD). */
  date: string;
  /** Observation value as a string (use `parseFloat()` to convert). A value of "." indicates missing data. */
  value: string;
}

/** Response from a FRED observations query. */
export interface FredObservations {
  /** Total number of observations in the date range. */
  count: number;
  /** Start of the observation range (YYYY-MM-DD). */
  observation_start: string;
  /** End of the observation range (YYYY-MM-DD). */
  observation_end: string;
  /** Array of date/value observation pairs. */
  observations: FredObservation[];
}

/** A series within a FRED release, including its observations. */
export interface FredReleaseSeries {
  /** Series identifier. */
  series_id: string;
  /** Human-readable title. */
  title: string;
  /** Data frequency. */
  frequency: string;
  /** Units of measurement. */
  units: string;
  /** Seasonal adjustment status. */
  seasonal_adjustment: string;
  /** Observation data points for this series. */
  observations: FredObservation[];
}

/** Result of a FRED release data query. */
export interface FredReleaseResult {
  /** Whether more series are available beyond this page. */
  has_more: boolean;
  /** Cursor for fetching the next page of series. */
  next_cursor?: string;
  /** Release metadata. */
  release: { release_id: number; name: string };
  /** Series included in this release with their observations. */
  series: FredReleaseSeries[];
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search FRED's 800K+ economic time series by keyword.
 *
 * @param query - Search term (e.g. "GDP", "unemployment rate", "consumer price index")
 * @param limit - Maximum results to return (default: 20)
 * @returns Matching series with metadata including title, frequency, and units
 *
 * @example
 * ```typescript
 * const results = await searchSeries("consumer price index", 10);
 * console.log(results.seriess.map(s => `${s.id}: ${s.title}`));
 * ```
 */
export async function searchSeries(query: string, limit = 20): Promise<FredSearchResult> {
  return api.get<FredSearchResult>("/fred/series/search", {
    search_text: query, limit, order_by: "search_rank",
  });
}

/**
 * Get metadata for a single FRED series.
 *
 * @param seriesId - FRED series ID (e.g. "GDP", "UNRATE", "FEDFUNDS")
 * @returns Series metadata, or `null` if the series does not exist
 *
 * @example
 * ```typescript
 * const info = await getSeriesInfo("GDP");
 * console.log(`${info?.title} — ${info?.frequency}, ${info?.units}`);
 * ```
 */
export async function getSeriesInfo(seriesId: string): Promise<FredSeries | null> {
  const data = await api.get<{ seriess: FredSeries[] }>("/fred/series", {
    series_id: seriesId.toUpperCase(),
  });
  return data.seriess?.[0] ?? null;
}

/**
 * Get observation values (date/value pairs) for a FRED series.
 *
 * @param seriesId - FRED series ID (e.g. "GDP", "UNRATE", "CPIAUCSL")
 * @param opts - Query options
 * @param opts.start - Start date (YYYY-MM-DD). Defaults to 10 years ago.
 * @param opts.end - End date (YYYY-MM-DD). Defaults to latest available.
 * @param opts.limit - Maximum observations to return (default: 1000)
 * @param opts.sort - Sort order: "asc" (oldest first) or "desc" (newest first, default)
 * @param opts.frequency - Aggregate to frequency: "d", "w", "m", "q", "a"
 * @returns Observations with date/value pairs
 *
 * @example
 * ```typescript
 * // Latest 5 GDP readings
 * const gdp = await getObservations("GDP", { sort: "desc", limit: 5 });
 * for (const obs of gdp.observations) {
 *   console.log(`${obs.date}: $${obs.value}B`);
 * }
 * ```
 */
export async function getObservations(seriesId: string, opts: {
  start?: string;
  end?: string;
  limit?: number;
  sort?: "asc" | "desc";
  frequency?: string;
} = {}): Promise<FredObservations> {
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  return api.get<FredObservations>("/fred/series/observations", {
    series_id: seriesId.toUpperCase(),
    observation_start: opts.start ?? tenYearsAgo.toISOString().split("T")[0],
    observation_end: opts.end,
    limit: opts.limit ?? 1000,
    sort_order: opts.sort ?? "desc",
    frequency: opts.frequency,
  });
}

/**
 * Bulk fetch all series in a FRED release with their observations.
 *
 * @param releaseId - FRED release ID (e.g. 53 for GDP release)
 * @param limit - Maximum number of series to return
 * @returns Release metadata and series with observations
 *
 * @example
 * ```typescript
 * const release = await getReleaseData(53);
 * console.log(`${release.release.name}: ${release.series.length} series`);
 * ```
 */
export async function getReleaseData(releaseId: number, limit?: number): Promise<FredReleaseResult> {
  return api.get<FredReleaseResult>("/fred/v2/release/observations", {
    release_id: releaseId, format: "json", ...(limit ? { limit } : {}),
  });
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
