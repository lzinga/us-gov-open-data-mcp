/**
 * USGS water tools on the Water Data APIs (api.waterdata.usgs.gov), which
 * replace the decommissioned waterservices.usgs.gov (NWIS) endpoints.
 * Fixture-based: requests are inspected and canned responses returned.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  (await import("../src/apis/usgs/sdk.js")).clearCache();
});

type Handler = (url: URL, init?: RequestInit) => unknown;

/** Route fetches to handlers keyed by path suffix; returns the recorded calls. */
function stubWaterData(routes: Record<string, Handler>) {
  const calls: { url: URL; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string, init?: RequestInit) => {
    const url = new URL(u);
    calls.push({ url, init });
    for (const [suffix, handler] of Object.entries(routes)) {
      if (url.pathname.endsWith(suffix)) return new Response(JSON.stringify(handler(url, init)), { status: 200 });
    }
    return new Response(`no route for ${url.pathname}`, { status: 404 });
  }));
  return calls;
}

describe("usgs_water_sites (monitoring-locations)", () => {
  const feature = (id: string, name: string) => ({
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [-77.1276, 38.9497] },
    properties: {
      id, monitoring_location_number: id.replace("USGS-", ""), monitoring_location_name: name,
      site_type_code: "ST", site_type: "Stream", state_name: "Maryland", county_name: "Montgomery County",
      hydrologic_unit_code: "020700080101", drainage_area: "11560",
    },
  });

  it("queries by state FIPS and maps features to site rows", async () => {
    const calls = stubWaterData({
      "/monitoring-locations/items": () => ({ type: "FeatureCollection", features: [feature("USGS-01646500", "POTOMAC RIVER NEAR WASH, DC")] }),
    });
    const { tools } = await import("../src/apis/usgs/tools.js");
    const tool = tools.find(t => t.name === "usgs_water_sites")!;
    const out = JSON.parse(await tool.execute({ state_cd: "md", site_type: "ST", limit: 50 } as any, {} as any) as string);

    const params = calls[0].url.searchParams;
    expect(calls[0].url.hostname).toBe("api.waterdata.usgs.gov");
    expect(params.get("state_code")).toBe("24");
    expect(params.get("site_type_code")).toBe("ST");
    expect(params.get("limit")).toBe("50");

    expect(out.data.columns).toEqual(expect.arrayContaining(["site_no", "station_nm", "dec_lat_va", "dec_long_va", "monitoring_location_id"]));
    const row = Object.fromEntries(out.data.columns.map((c: string, i: number) => [c, out.data.rows[0][i]]));
    expect(row).toMatchObject({ site_no: "01646500", dec_lat_va: 38.9497, dec_long_va: -77.1276, drain_area_va: 11560, monitoring_location_id: "USGS-01646500" });
  });

  it("splits a 5-digit county FIPS into state and county codes", async () => {
    const calls = stubWaterData({ "/monitoring-locations/items": () => ({ features: [] }) });
    const { searchWaterSites } = await import("../src/apis/usgs/sdk.js");
    await searchWaterSites({ countyCd: "24031" });
    expect(calls[0].url.searchParams.get("state_code")).toBe("24");
    expect(calls[0].url.searchParams.get("county_code")).toBe("031");
  });

  it("reports truncation when the limit is reached", async () => {
    stubWaterData({
      "/monitoring-locations/items": () => ({ features: [feature("USGS-1", "A"), feature("USGS-2", "B")] }),
    });
    const { searchWaterSites } = await import("../src/apis/usgs/sdk.js");
    const res = await searchWaterSites({ stateCd: "Maryland", limit: 2 });
    expect(res.truncated).toBe(true);
  });

  it("requires a state or 5-digit county", async () => {
    const { searchWaterSites } = await import("../src/apis/usgs/sdk.js");
    await expect(searchWaterSites({})).rejects.toThrow(/state_cd or a 5-digit county_cd/);
    await expect(searchWaterSites({ stateCd: "Narnia" })).rejects.toThrow(/Unknown state_cd/);
  });

  it("sends DATA_GOV_API_KEY as X-Api-Key when set", async () => {
    vi.stubEnv("DATA_GOV_API_KEY", "test-key-123");
    const calls = stubWaterData({ "/monitoring-locations/items": () => ({ features: [] }) });
    const { searchWaterSites } = await import("../src/apis/usgs/sdk.js");
    await searchWaterSites({ stateCd: "VA" });
    expect(new Headers(calls[0].init?.headers).get("X-Api-Key")).toBe("test-key-123");
  });
});

function obs(site: string, time: string, value: string | null, extra: Record<string, unknown> = {}) {
  return {
    type: "Feature", geometry: null,
    properties: {
      monitoring_location_id: site, parameter_code: "00060", statistic_id: "00011",
      time, value, unit_of_measure: "ft^3/s", approval_status: "Provisional", ...extra,
    },
  };
}

const names = () => ({
  features: [
    { id: "USGS-01646500", properties: { monitoring_location_name: "POTOMAC RIVER NEAR WASH, DC" } },
    { id: "USGS-01638500", properties: { monitoring_location_name: "POTOMAC RIVER AT POINT OF ROCKS, MD" } },
  ],
});

describe("usgs_water_data (continuous)", () => {
  it("fetches a time window for sites and summarizes each series", async () => {
    const calls = stubWaterData({
      "/continuous/items": () => ({
        features: [
          obs("USGS-01646500", "2026-09-27T10:00:00Z", "4420"),
          obs("USGS-01638500", "2026-09-27T10:00:00Z", "3900"),
          obs("USGS-01646500", "2026-09-27T10:15:00Z", "4500"),
          obs("USGS-01638500", "2026-09-27T10:15:00Z", null),
          obs("USGS-01646500", "2026-09-27T10:30:00Z", "4300"),
        ],
      }),
      "/monitoring-locations/items": names,
    });
    const { tools } = await import("../src/apis/usgs/tools.js");
    const tool = tools.find(t => t.name === "usgs_water_data")!;
    const out = JSON.parse(await tool.execute({ sites: "01646500,USGS-01638500", period: "P1D" } as any, {} as any) as string);

    const data = calls.find(c => c.url.pathname.endsWith("/continuous/items"))!.url.searchParams;
    expect(data.get("monitoring_location_id")).toBe("USGS-01646500,USGS-01638500");
    expect(data.get("parameter_code")).toBe("00060");
    expect(data.get("time")).toBe("P1D");
    expect(data.get("sortby")).toBe("time");
    expect(data.get("skipGeometry")).toBe("true");

    const potomac = out.data.items.find((i: { siteCode: string }) => i.siteCode === "01646500");
    expect(potomac).toMatchObject({
      siteName: "POTOMAC RIVER NEAR WASH, DC", parameterCode: "00060", unit: "ft^3/s",
      latestValue: 4300, latestDateTime: "2026-09-27T10:30:00Z", readingCount: 3, min: 4300, max: 4500,
    });
    const rocks = out.data.items.find((i: { siteCode: string }) => i.siteCode === "01638500");
    expect(rocks.readingCount).toBe(2);
    expect(rocks.latestValue).toBeUndefined(); // null values are stripped from list items
  });

  it("uses a start/end interval when dates are given", async () => {
    const calls = stubWaterData({ "/continuous/items": () => ({ features: [] }), "/monitoring-locations/items": () => ({ features: [] }) });
    const { getWaterData } = await import("../src/apis/usgs/sdk.js");
    await getWaterData({ sites: "01646500", startDT: "2024-01-01", endDT: "2024-01-31" });
    expect(calls[0].url.searchParams.get("time")).toBe("2024-01-01/2024-01-31");
  });

  it("returns the latest reading per site for a state", async () => {
    const calls = stubWaterData({
      "/latest-continuous/items": () => ({ features: [obs("USGS-01646500", "2026-09-28T09:50:00Z", "3630")] }),
      "/monitoring-locations/items": names,
    });
    const { tools } = await import("../src/apis/usgs/tools.js");
    const tool = tools.find(t => t.name === "usgs_water_data")!;
    const out = JSON.parse(await tool.execute({ state_cd: "Maryland" } as any, {} as any) as string);
    expect(calls[0].url.searchParams.get("state_code")).toBe("24");
    expect(out.summary).toContain("Latest readings at 1 reporting site");
    expect(out.data.items[0]).toMatchObject({ siteCode: "01646500", latestValue: 3630 });
  });
});

describe("usgs_daily_water_data (daily)", () => {
  it("requests daily means for the window and summarizes first/last/min/max/mean", async () => {
    const calls = stubWaterData({
      "/daily/items": () => ({
        features: [
          obs("USGS-01646500", "2026-09-25", "3560", { statistic_id: "00003" }),
          obs("USGS-01646500", "2026-09-26", "3670", { statistic_id: "00003" }),
          obs("USGS-01646500", "2026-09-27", "4470", { statistic_id: "00003" }),
        ],
      }),
      "/monitoring-locations/items": names,
    });
    const { tools } = await import("../src/apis/usgs/tools.js");
    const tool = tools.find(t => t.name === "usgs_daily_water_data")!;
    const out = JSON.parse(await tool.execute({ sites: "01646500", period: "P3D" } as any, {} as any) as string);

    const params = calls[0].url.searchParams;
    expect(calls[0].url.pathname).toMatch(/\/daily\/items$/);
    expect(params.get("statistic_id")).toBe("00003");
    expect(params.get("time")).toBe("P3D");
    expect(out.data.items[0]).toMatchObject({
      siteCode: "01646500", siteName: "POTOMAC RIVER NEAR WASH, DC", dailyValueCount: 3,
      earliestDate: "2026-09-25", earliestValue: 3560, latestDate: "2026-09-27", latestValue: 4470,
      min: 3560, max: 4470, mean: 3900,
    });
  });

  it("defaults to a 30-day window", async () => {
    const calls = stubWaterData({ "/daily/items": () => ({ features: [] }), "/monitoring-locations/items": () => ({ features: [] }) });
    const { getDailyWaterData } = await import("../src/apis/usgs/sdk.js");
    await getDailyWaterData({ sites: "01646500" });
    expect(calls[0].url.searchParams.get("time")).toBe("P30D");
  });
});

describe("usgs_water_statistics (statistics API)", () => {
  const normal = (toy: string, n: number, extra: Record<string, unknown> = {}) => [
    { time_of_year: toy, value: String(n * 1.5), sample_count: 97, computation: "arithmetic_mean" },
    { time_of_year: toy, value: String(n * 10), sample_count: 97, computation: "maximum" },
    { time_of_year: toy, value: String(n), sample_count: 97, computation: "median" },
    { time_of_year: toy, value: String(n / 10), sample_count: 97, computation: "minimum" },
    {
      time_of_year: toy, computation: "percentile", sample_count: 97,
      values: ["1", "2", "3", String(n), "5", "6", "7"], percentiles: ["5", "10", "25", "50", "75", "90", "95"],
    },
    ...Object.keys(extra).length ? [extra] : [],
  ];
  const feature = (id: string, values: unknown[], parent = "00003") => ({
    type: "Feature",
    properties: { monitoring_location_id: id, data: [{ parameter_code: "00060", parent_statistic_id: parent, values }] },
  });

  it("pivots day-of-year normals into the legacy columns plus p10/p90", async () => {
    const calls = stubWaterData({
      "/observationNormals": () => ({ features: [feature("USGS-01646500", [...normal("03-15", 16500), ...normal("03-14", 16000)])] }),
    });
    const { tools } = await import("../src/apis/usgs/tools.js");
    const tool = tools.find(t => t.name === "usgs_water_statistics")!;
    const out = JSON.parse(await tool.execute({ sites: "01646500", stat_report_type: "daily" } as any, {} as any) as string);

    const params = calls[0].url.searchParams;
    expect(calls[0].url.pathname).toBe("/statistics/v0/observationNormals");
    expect(params.get("monitoring_location_id")).toBe("USGS-01646500");
    expect(params.get("normal_type")).toBe("DOY");
    expect(params.get("parameter_code")).toBe("00060");
    expect(out.data.columns).toEqual(["month", "day", "yearsOfRecord", "min", "p05", "p10", "p25", "median_p50", "mean", "p75", "p90", "p95", "max"]);
    const rows = out.data.rows.map((r: unknown[]) => Object.fromEntries(out.data.columns.map((c: string, i: number) => [c, r[i]])));
    expect(rows.map((r: any) => r.day)).toEqual([14, 15]);
    expect(rows[1]).toEqual({
      month: 3, day: 15, yearsOfRecord: 97, min: 1650, p05: 1, p10: 2, p25: 3,
      median_p50: 16500, mean: 24750, p75: 5, p90: 6, p95: 7, max: 165000,
    });
  });

  it("narrows a month/day filter server-side and client-side", async () => {
    const calls = stubWaterData({
      "/observationNormals": () => ({ features: [feature("USGS-01646500", [...normal("02-28", 1), ...normal("02-29", 2)])] }),
    });
    const { getWaterStatistics } = await import("../src/apis/usgs/sdk.js");
    const res = await getWaterStatistics({ sites: "01646500", month: 2, day: 29 });
    expect(calls[0].url.searchParams.get("start_date")).toBe("02-29");
    expect(calls[0].url.searchParams.get("end_date")).toBe("02-29");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toMatchObject({ month: 2, day: 29 });

    await getWaterStatistics({ sites: "01646500", month: 2 });
    expect(calls[1].url.searchParams.get("start_date")).toBe("02-01");
    expect(calls[1].url.searchParams.get("end_date")).toBe("02-29");
  });

  it("rejects day without month and impossible dates", async () => {
    const { getWaterStatistics } = await import("../src/apis/usgs/sdk.js");
    await expect(getWaterStatistics({ sites: "01646500", day: 3 })).rejects.toThrow(/requires month/);
    await expect(getWaterStatistics({ sites: "01646500", month: 4, day: 31 })).rejects.toThrow(/no day 31/);
  });

  it("uses month-of-year normals for monthly and adds a site column for multiple sites", async () => {
    const calls = stubWaterData({
      "/observationNormals": () => ({
        features: [
          feature("USGS-01646500", normal("01", 100)),
          feature("USGS-01638500", normal("01", 200)),
          feature("USGS-01638500", normal("01", 999), "00001"),
        ],
      }),
    });
    const { tools } = await import("../src/apis/usgs/tools.js");
    const tool = tools.find(t => t.name === "usgs_water_statistics")!;
    const out = JSON.parse(await tool.execute({ sites: "01646500,01638500", stat_report_type: "monthly" } as any, {} as any) as string);

    expect(calls[0].url.searchParams.get("normal_type")).toBe("MOY");
    expect(calls[0].url.searchParams.getAll("monitoring_location_id")).toEqual(["USGS-01646500", "USGS-01638500"]);
    expect(out.data.columns[0]).toBe("site");
    expect(out.data.columns).not.toContain("day");
    const rows = out.data.rows.map((r: unknown[]) => Object.fromEntries(out.data.columns.map((c: string, i: number) => [c, r[i]])));
    expect(rows).toHaveLength(2);
    expect(rows.find((r: any) => r.site === "01638500").median_p50).toBe(200);
  });

  it("returns one row per calendar year for annual statistics", async () => {
    const interval = (year: number, computation: string, value: string, days = 365) =>
      ({ start_date: `${year}-01-01`, end_date: `${year}-12-31`, computation, value, sample_count: days });
    const calls = stubWaterData({
      "/observationIntervals": () => ({
        features: [feature("USGS-01646500", [
          interval(1931, "arithmetic_mean", "5709.414"), interval(1931, "minimum", "700"),
          interval(1931, "maximum", "50000"), interval(1931, "median", "3000"),
          { ...interval(1930, "arithmetic_mean", "3466.788", 306), start_date: "1930-03-01" },
        ])],
      }),
    });
    const { getWaterStatistics } = await import("../src/apis/usgs/sdk.js");
    const res = await getWaterStatistics({ sites: "01646500", statReportType: "annual" });
    expect(calls[0].url.pathname).toBe("/statistics/v0/observationIntervals");
    expect(calls[0].url.searchParams.get("interval_type")).toBe("CY");
    expect(res.rows).toEqual([
      { site: "01646500", year: 1930, mean: 3466.788, min: null, max: null, median: null, daysOfRecord: 306 },
      { site: "01646500", year: 1931, mean: 5709.414, min: 700, max: 50000, median: 3000, daysOfRecord: 365 },
    ]);
  });
});
