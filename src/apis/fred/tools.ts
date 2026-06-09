/**
 * FRED MCP tools — search, metadata, observations, and release data.
 *
 * Tools return raw JSON data — no markdown formatting.
 * The client decides how to present it.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import { searchSeries, getSeriesInfo, getObservations, getReleaseData } from "./sdk.js";
import { timeseriesResponse, listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

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
    description: "Get observations for a FRED series.\nPopular: GDP, UNRATE, CPIAUCSL, FEDFUNDS, DGS10, MORTGAGE30US",
    annotations: { title: "FRED: Series Data", readOnlyHint: true },
    parameters: z.object({
      series_id: z.string().describe("Series ID"),
      limit: z.number().int().max(100000).default(1000).describe("Max obs (default 1000)"),
      sort_order: z.enum(["asc", "desc"]).optional().describe("default: desc"),
      frequency: z.string().optional().describe("d, w, bw, m, q, sa, a"),
      start_date: z.string().optional().describe("YYYY-MM-DD"),
      end_date: z.string().optional().describe("YYYY-MM-DD"),
    }),
    execute: async ({ series_id, limit, sort_order, frequency, start_date, end_date }) => {
      const data = await getObservations(series_id, {
        start: start_date, end: end_date, limit, sort: sort_order, frequency,
      });
      if (!data.observations?.length) return emptyResponse(`No observations for "${series_id}".`);
      return timeseriesResponse(
        `${series_id.toUpperCase()}: ${data.count} observations, ${data.observation_start} to ${data.observation_end}`,
        {
          rows: data.observations,
          dateKey: "date",
          valueKey: "value",
          total: data.count,
          meta: { seriesId: series_id.toUpperCase(), start: data.observation_start, end: data.observation_end },
        },
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
