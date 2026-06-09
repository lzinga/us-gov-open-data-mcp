/**
 * usgs MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchEarthquakes,
  countEarthquakes,
  getSignificantEarthquakes,
  getWaterData,
  getDailyWaterData,
  searchWaterSites,
  getWaterStatistics,
  WATER_PARAMS,
  ALERT_LEVELS,
  clearCache as sdkClearCache,
  type EarthquakeFeature,
} from "./sdk.js";
import { tableResponse, listResponse, recordResponse, emptyResponse } from "../../shared/response.js";
import { keysEnum, describeEnum } from "../../shared/enum-utils.js";

function earthquakeToRecord(f: EarthquakeFeature): Record<string, unknown> {
  const p = f.properties;
  const [lon, lat, depth] = f.geometry.coordinates;
  const record: Record<string, unknown> = {
    magnitude: p.mag ?? null,
    place: p.place ?? null,
    time: p.time ? new Date(p.time).toISOString() : null,
    depth: depth ?? null,
    latitude: lat ?? null,
    longitude: lon ?? null,
  };
  if (p.alert) record.alert = p.alert;
  if (p.tsunami === 1) record.tsunami = true;
  if (p.felt) record.felt = p.felt;
  if (p.url) record.url = p.url;
  return record;
}

export const tools: Tool<any, any>[] = [
  {
    name: "usgs_earthquakes",
    description:
      "Search for earthquakes by magnitude, location, date range, and more.\n" +
      "Returns magnitude, location, depth, time, alert level, tsunami risk, and felt reports.\n" +
      "Magnitude scale: 2.5+ felt by people, 4.0+ moderate, 5.0+ significant, 7.0+ major.",
    annotations: { title: "USGS: Earthquake Search", readOnlyHint: true },
    parameters: z.object({
      starttime: z.string().optional().describe("Start date ISO format: '2024-01-01'"),
      endtime: z.string().optional().describe("End date ISO format: '2024-12-31'"),
      minmagnitude: z.number().optional().describe("Minimum magnitude (e.g. 4.0, 5.0, 6.0)"),
      maxmagnitude: z.number().optional().describe("Maximum magnitude"),
      latitude: z.number().optional().describe("Center latitude for radius search"),
      longitude: z.number().optional().describe("Center longitude for radius search"),
      maxradiuskm: z.number().optional().describe("Search radius in km (requires lat/lon)"),
      alertlevel: z.enum(keysEnum(ALERT_LEVELS)).optional().describe(`PAGER alert level: ${describeEnum(ALERT_LEVELS)}`),
      limit: z.number().int().max(200).default(20).describe("Max results (default 20, max 200)"),
      orderby: z.enum(["time", "time-asc", "magnitude", "magnitude-asc"]).optional().describe("Sort order (default: time)"),
    }),
    execute: async (args) => {
      const data = await searchEarthquakes(args);
      if (!data.features.length) return emptyResponse("No earthquakes found matching the criteria.");
      const items = data.features.map(earthquakeToRecord);
      return listResponse(
        `${data.metadata?.count ?? data.features.length} earthquake(s) found`,
        { items, total: data.metadata?.count ?? data.features.length },
      );
    },
  },

  {
    name: "usgs_significant",
    description:
      "Get significant earthquakes from the past 30 days (typically M4.5+ or felt/damaging events).\n" +
      "Quick way to see the latest notable seismic activity worldwide.",
    annotations: { title: "USGS: Significant Earthquakes", readOnlyHint: true },
    parameters: z.object({}),
    execute: async () => {
      const data = await getSignificantEarthquakes();
      if (!data.features.length) return emptyResponse("No significant earthquakes in the past 30 days.");
      const items = data.features.map(earthquakeToRecord);
      return listResponse(
        `${data.features.length} significant earthquake(s) (past 30 days)`,
        { items, total: data.features.length },
      );
    },
  },

  {
    name: "usgs_earthquake_count",
    description:
      "Count earthquakes matching criteria without fetching full details.\n" +
      "Useful for statistics: 'How many M5+ earthquakes occurred in 2024?'",
    annotations: { title: "USGS: Earthquake Count", readOnlyHint: true },
    parameters: z.object({
      starttime: z.string().optional().describe("Start date: '2024-01-01'"),
      endtime: z.string().optional().describe("End date: '2024-12-31'"),
      minmagnitude: z.number().optional().describe("Minimum magnitude"),
      maxmagnitude: z.number().optional().describe("Maximum magnitude"),
      latitude: z.number().optional().describe("Center latitude for radius search"),
      longitude: z.number().optional().describe("Center longitude for radius search"),
      maxradiuskm: z.number().optional().describe("Search radius in km"),
    }),
    execute: async (args) => {
      const data = await countEarthquakes(args);
      return recordResponse(`Earthquake count: ${data.count}`, { count: data.count });
    },
  },

  {
    name: "usgs_water_data",
    description:
      "Get real-time water data (streamflow, gage height, temperature) from USGS monitoring sites.\n" +
      "13,000+ stations nationwide. Parameter codes: 00060=discharge (cfs), 00065=gage height (ft), 00010=water temp (°C).\n" +
      "Query by site ID, state, county, or hydrologic unit code (HUC).",
    annotations: { title: "USGS: Water Data", readOnlyHint: true },
    parameters: z.object({
      sites: z.string().optional().describe("USGS site number(s), comma-separated: '01646500' or '01646500,01647000'"),
      state_cd: z.string().optional().describe("Two-letter state code: 'CA', 'TX', 'NY'"),
      parameter_cd: z.string().optional().describe("Parameter code: '00060' (discharge), '00065' (gage height), '00010' (temp). Default: 00060"),
      period: z.string().optional().describe("ISO 8601 duration: 'P1D' (1 day, default), 'P7D' (7 days), 'P30D' (30 days)"),
      start_dt: z.string().optional().describe("Start date: '2024-01-01' (overrides period)"),
      end_dt: z.string().optional().describe("End date: '2024-01-31'"),
    }),
    execute: async (args) => {
      const data = await getWaterData({
        sites: args.sites,
        stateCd: args.state_cd,
        parameterCd: args.parameter_cd,
        period: args.period,
        startDT: args.start_dt,
        endDT: args.end_dt,
      });
      const series = data?.value?.timeSeries ?? [];
      if (!series.length) return emptyResponse("No water data found for the specified criteria.");

      const items = series.map((ts: any) => {
        const values = ts.values?.[0]?.value ?? [];
        const latest = values[values.length - 1];
        return {
          siteName: ts.sourceInfo?.siteName ?? null,
          siteCode: ts.sourceInfo?.siteCode?.[0]?.value ?? null,
          variable: ts.variable?.variableName ?? null,
          unit: ts.variable?.unit?.unitCode ?? null,
          latestValue: latest?.value ?? null,
          latestDateTime: latest?.dateTime ?? null,
          readingCount: values.length,
        };
      });
      return listResponse(`${series.length} water time series found`, { items, total: series.length });
    },
  },

  {
    name: "usgs_water_sites",
    description:
      "Search for USGS water monitoring sites by state, county, or hydrologic unit.\n" +
      "Site types: ST=stream, GW=groundwater, LK=lake, SP=spring.",
    annotations: { title: "USGS: Water Sites", readOnlyHint: true },
    parameters: z.object({
      state_cd: z.string().optional().describe("Two-letter state code: 'CA', 'TX'"),
      county_cd: z.string().optional().describe("County FIPS code"),
      site_type: z.enum(["ST", "GW", "LK", "SP"]).optional().describe("Site type: ST (stream), GW (groundwater), LK (lake), SP (spring)"),
    }),
    execute: async (args) => {
      const data = await searchWaterSites({
        stateCd: args.state_cd,
        countyCd: args.county_cd,
        siteType: args.site_type,
      });
      // RDB format comes back as a string — parse tab-separated rows into objects
      const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      const lines = text.split("\n").filter((l: string) => !l.startsWith("#"));
      // First non-comment line is the header, second is dashes, rest are data
      const header = lines[0]?.split("\t") ?? [];
      const dataLines = lines.slice(2); // skip header + dash line
      const rows = dataLines.map((line: string) => {
        const vals = line.split("\t");
        const obj: Record<string, unknown> = {};
        header.forEach((h: string, i: number) => { if (h) obj[h] = vals[i] ?? null; });
        return obj;
      }).filter((r: Record<string, unknown>) => Object.values(r).some(v => v));
      if (!rows.length) return emptyResponse("No water monitoring sites found.");
      return tableResponse(
        `Water monitoring sites: ${dataLines.length} total`,
        { rows, total: dataLines.length },
      );
    },
  },

  {
    name: "usgs_daily_water_data",
    description:
      "Get USGS daily value water data (historical daily averages).\n" +
      "Unlike real-time instantaneous values, these are aggregated daily means — better for trend analysis.\n" +
      "Parameter codes: 00060=discharge (cfs), 00065=gage height (ft), 00010=water temp (°C).",
    annotations: { title: "USGS: Daily Water Data", readOnlyHint: true },
    parameters: z.object({
      sites: z.string().optional().describe("USGS site number(s): '01646500'"),
      state_cd: z.string().optional().describe("Two-letter state code: 'CA', 'TX'"),
      parameter_cd: z.string().optional().describe("Parameter code: '00060' (discharge), '00065' (gage height). Default: 00060"),
      period: z.string().optional().describe("ISO 8601 duration: 'P30D' (default), 'P90D', 'P365D'"),
      start_dt: z.string().optional().describe("Start date: '2024-01-01' (overrides period)"),
      end_dt: z.string().optional().describe("End date: '2024-12-31'"),
    }),
    execute: async (args) => {
      const data = await getDailyWaterData({
        sites: args.sites,
        stateCd: args.state_cd,
        parameterCd: args.parameter_cd,
        period: args.period,
        startDT: args.start_dt,
        endDT: args.end_dt,
      });
      const series = data?.value?.timeSeries ?? [];
      if (!series.length) return emptyResponse("No daily water data found.");

      const items = series.map((ts: any) => {
        const values = ts.values?.[0]?.value ?? [];
        const latest = values[values.length - 1];
        const earliest = values[0];
        return {
          siteName: ts.sourceInfo?.siteName ?? null,
          siteCode: ts.sourceInfo?.siteCode?.[0]?.value ?? null,
          variable: ts.variable?.variableName ?? null,
          unit: ts.variable?.unit?.unitCode ?? null,
          dailyValueCount: values.length,
          latestValue: latest?.value ?? null,
          latestDate: latest?.dateTime?.split("T")[0] ?? null,
          earliestValue: earliest?.value ?? null,
          earliestDate: earliest?.dateTime?.split("T")[0] ?? null,
        };
      });
      return listResponse(`${series.length} daily water time series found`, { items, total: series.length });
    },
  },

  {
    name: "usgs_water_statistics",
    description:
      "Get period-of-record streamflow statistics for a USGS site — for each day of the year, the min/mean/max and p05–p95 percentiles across ALL years on record.\n" +
      "Answers 'is the current flow historically high or low for this date?' — far more analytically useful than raw readings for drought/flood context.\n" +
      "Parameter codes: 00060=discharge (cfs, default), 00065=gage height (ft). Optionally filter to a specific month/day.",
    annotations: { title: "USGS: Water Statistics", readOnlyHint: true },
    parameters: z.object({
      sites: z.string().describe("USGS site number(s), comma-separated: '01646500'"),
      parameter_cd: z.string().optional().describe("Parameter code: '00060' (discharge, default), '00065' (gage height)"),
      stat_report_type: z.enum(["daily", "monthly", "annual"]).default("daily").describe("Statistic granularity (default daily = per day-of-year)"),
      month: z.number().int().min(1).max(12).optional().describe("Filter to a specific month (1-12)"),
      day: z.number().int().min(1).max(31).optional().describe("Filter to a specific day of month (requires month; daily report only)"),
    }),
    execute: async ({ sites, parameter_cd, stat_report_type, month, day }) => {
      const text = await getWaterStatistics({ sites, parameterCd: parameter_cd, statReportType: stat_report_type });
      const lines = text.split("\n").filter((l: string) => l && !l.startsWith("#"));
      const header = lines[0]?.split("\t") ?? [];
      let rows = lines.slice(2).map((line: string) => {
        const vals = line.split("\t");
        const obj: Record<string, string> = {};
        header.forEach((h: string, i: number) => { if (h) obj[h] = vals[i] ?? ""; });
        return obj;
      }).filter((r) => r.site_no);
      if (month !== undefined) rows = rows.filter(r => Number(r.month_nu) === month);
      if (day !== undefined) rows = rows.filter(r => Number(r.day_nu) === day);
      if (!rows.length) return emptyResponse(`No statistics found for site ${sites}${month ? ` (month ${month}${day ? `, day ${day}` : ""})` : ""}.`);
      return tableResponse(
        `${stat_report_type ?? "daily"} streamflow statistics for site ${sites}: ${rows.length} row(s)`,
        {
          rows: rows.map(r => ({
            month: r.month_nu ?? null,
            day: r.day_nu ?? null,
            yearsOfRecord: r.count_nu ?? null,
            min: r.min_va ?? null,
            p05: r.p05_va ?? null,
            p25: r.p25_va ?? null,
            median_p50: r.p50_va ?? null,
            mean: r.mean_va ?? null,
            p75: r.p75_va ?? null,
            p95: r.p95_va ?? null,
            max: r.max_va ?? null,
          })),
          total: rows.length,
          meta: { site: sites, parameter: parameter_cd ?? "00060" },
        },
      );
    },
  },
];
