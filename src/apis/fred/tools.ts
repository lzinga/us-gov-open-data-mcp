/**
 * FRED MCP tools — search, metadata, observations, and release data.
 *
 * Tools return raw JSON data — no markdown formatting.
 * The client decides how to present it.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import { searchSeries, getSeriesInfo, getObservations, getReleaseData, getReleaseDates } from "./sdk.js";
import { timeseriesResponse, listResponse, recordResponse, emptyResponse, tableResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "fred_search",
    description: "Search FRED series by keyword.\nExamples: 'GDP', 'unemployment', 'CPI', 'mortgage rate'",
    annotations: { title: "FRED: Search", readOnlyHint: true },
    parameters: z.object({
      query: z.string().describe("Keywords"),
      limit: z.number().int().max(100).default(20).describe("Max results (default 20)"),
    }),
    execute: async ({ query, limit }) => {
      const data = await searchSeries(query, limit ?? 20);
      if (!data.seriess?.length) return emptyResponse(`No series found for "${query}".`);
      return listResponse(
        `FRED search "${query}": ${data.count} total, showing ${data.seriess.length}`,
        { items: data.seriess, total: data.count },
      );
    },
  },

  {
    name: "fred_series_info",
    description: "Get metadata for a FRED series — title, units, frequency, range, notes.",
    annotations: { title: "FRED: Series Info", readOnlyHint: true },
    parameters: z.object({
      series_id: z.string().describe("e.g. 'GDP', 'UNRATE', 'CPIAUCSL'"),
    }),
    execute: async ({ series_id }) => {
      const s = await getSeriesInfo(series_id);
      if (!s) return emptyResponse(`"${series_id}" not found.`);
      return recordResponse(
        `${s.id}: ${s.title} (${s.frequency}, ${s.units}, ${s.observation_start}–${s.observation_end})`,
        s,
      );
    },
  },

  {
    name: "fred_series_data",
    description: "Get observations for a FRED series.\nPopular: GDP, UNRATE, CPIAUCSL, FEDFUNDS, DGS10, MORTGAGE30US\n" +
      "units transforms the values server-side, e.g. pc1 = % change from a year ago (CPI inflation), pch = % change from the previous period.",
    annotations: { title: "FRED: Series Data", readOnlyHint: true },
    parameters: z.object({
      series_id: z.string().describe("Series ID"),
      limit: z.number().int().max(100000).default(1000).describe("Max obs (default 1000)"),
      sort_order: z.enum(["asc", "desc"]).optional().describe("default: desc"),
      frequency: z.enum(["d", "w", "bw", "m", "q", "sa", "a"]).optional().describe("d=daily, w=weekly, bw=biweekly, m=monthly, q=quarterly, sa=semiannual, a=annual"),
      aggregation_method: z.enum(["avg", "sum", "eop"]).optional().describe("With frequency: avg (default), sum, or eop (end of period)"),
      units: z.enum(["lin", "chg", "ch1", "pch", "pc1", "pca", "cch", "cca", "log"]).optional().describe(
        "lin=levels (default), chg=change, ch1=change from a year ago, pch=% change, pc1=% change from a year ago, " +
        "pca=compounded annual rate of change, cch=continuously compounded rate of change, cca=continuously compounded annual rate, log=natural log",
      ),
      start_date: z.string().optional().describe("YYYY-MM-DD"),
      end_date: z.string().optional().describe("YYYY-MM-DD"),
    }),
    execute: async ({ series_id, limit, sort_order, frequency, aggregation_method, units, start_date, end_date }) => {
      const data = await getObservations(series_id, {
        start: start_date, end: end_date, limit, sort: sort_order, frequency, units, aggregationMethod: aggregation_method,
      });
      if (!data.observations?.length) return emptyResponse(`No observations for "${series_id}".`);
      // observation_start/end echo the request (end defaults to 9999-12-31), so
      // report the dates actually returned.
      const dates = data.observations.map(o => o.date).sort();
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      const unitNote = units && units !== "lin" ? ` (units: ${units})` : "";
      return timeseriesResponse(
        `${series_id.toUpperCase()}${unitNote}: ${data.observations.length} of ${data.count} observations, ${firstDate} to ${lastDate}`,
        {
          rows: data.observations,
          dateKey: "date",
          valueKey: "value",
          total: data.count,
          meta: { seriesId: series_id.toUpperCase(), firstDate, lastDate, units: units ?? "lin", frequency: frequency ?? null, aggregationMethod: aggregation_method ?? null },
        },
      );
    },
  },

  {
    name: "fred_release_calendar",
    description: "When economic data comes out: FRED's release calendar, including scheduled future dates.\n" +
      "With release_id, the next dates for that release (e.g. 50 = Employment Situation, 10 = CPI, 53 = GDP). " +
      "Without it, every release between start_date and end_date (default: the next 14 days).",
    annotations: { title: "FRED: Release Calendar", readOnlyHint: true },
    parameters: z.object({
      release_id: z.number().int().positive().optional().describe("e.g. 50 (Employment Situation), 10 (CPI), 53 (GDP)"),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD (default today)"),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD (default: 14 days out; no limit for one release)"),
      limit: z.number().int().min(1).max(1000).default(100).describe("Max dates (default 100)"),
    }),
    execute: async ({ release_id, start_date, end_date, limit }) => {
      const data = await getReleaseDates({ releaseId: release_id, start: start_date, end: end_date, limit });
      const dates = data.release_dates ?? [];
      if (!dates.length) return emptyResponse(`No release dates found${release_id ? ` for release ${release_id}` : ""}.`);
      return tableResponse(
        `${dates.length} of ${data.count} release date(s)${release_id ? ` for release ${release_id}` : ""}, ${dates[0].date} to ${dates[dates.length - 1].date}`,
        { rows: dates.map(d => ({ date: d.date, releaseId: d.release_id, release: d.release_name ?? null })), total: data.count },
      );
    },
  },

  {
    name: "fred_release_data",
    description: "Bulk fetch a FRED release.\nCommon: 53 (GDP), 50 (Employment), 10 (CPI), 18 (Rates)",
    annotations: { title: "FRED: Release Data", readOnlyHint: true },
    parameters: z.object({
      release_id: z.number().int().positive().describe("e.g. 53 (GDP)"),
      limit: z.number().int().max(500000).optional().describe("Max obs"),
    }),
    execute: async ({ release_id, limit }) => {
      const data = await getReleaseData(release_id, limit);
      const series = data.series ?? [];
      if (!series.length) return emptyResponse(`No series found for release ${release_id}.`);
      return listResponse(
        `${data.release?.name ?? `Release ${release_id}`}: ${series.length} series, has_more: ${data.has_more}`,
        {
          items: series,
          meta: { release: data.release, hasMore: data.has_more, nextCursor: data.next_cursor ?? null },
        },
      );
    },
  },
];
