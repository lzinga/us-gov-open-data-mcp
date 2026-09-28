/**
 * NOAA climate data without a CDO key: station queries go to NCEI's keyless
 * Access Data Service and come back in CDO's shape.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  (await import("../src/apis/noaa/sdk.js")).clearCache();
});

function stubFetch(body: unknown) {
  const calls: { url: URL; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string, init?: RequestInit) => {
    calls.push({ url: new URL(u), init });
    return new Response(JSON.stringify(body), { status: 200 });
  }));
  return calls;
}

const ADS_DAILY = [
  { DATE: "2024-01-01", STATION: "USW00094728", TMAX: "47", TMAX_ATTRIBUTES: ",,W", TMIN: "35", TMIN_ATTRIBUTES: ",,W", PRCP: "0.03", PRCP_ATTRIBUTES: ",,W,2400", NAME: "NY CITY CENTRAL PARK, NY US" },
  { DATE: "2024-01-02", STATION: "USW00094728", TMAX: "42", TMIN: "29", PRCP: "0.00", WT01: " " },
];

describe("getClimateData without NOAA_API_KEY", () => {
  it("uses the Access Data Service for a station and returns CDO-shaped rows", async () => {
    vi.stubEnv("NOAA_API_KEY", "");
    const calls = stubFetch(ADS_DAILY);
    const { getClimateData } = await import("../src/apis/noaa/sdk.js");
    const res = await getClimateData({ datasetId: "GHCND", stationId: "GHCND:USW00094728", startDate: "2024-01-01", endDate: "2024-01-02" });

    const url = calls[0].url;
    expect(url.origin + url.pathname).toBe("https://www.ncei.noaa.gov/access/services/data/v1");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      dataset: "daily-summaries", stations: "USW00094728", startDate: "2024-01-01", endDate: "2024-01-02",
      format: "json", units: "standard", includeAttributes: "true",
    });
    expect(res.source).toBe("ads");
    expect(res.count).toBe(6);
    expect(res.data[0]).toEqual({ date: "2024-01-01T00:00:00", datatype: "PRCP", station: "GHCND:USW00094728", value: 0.03, attributes: ",,W,2400" });
    expect(res.data.map(d => `${d.date.slice(0, 10)} ${d.datatype}=${d.value}`)).toEqual([
      "2024-01-01 PRCP=0.03", "2024-01-01 TMAX=47", "2024-01-01 TMIN=35",
      "2024-01-02 PRCP=0", "2024-01-02 TMAX=42", "2024-01-02 TMIN=29",
    ]);
  });

  it("maps monthly and annual datasets and their dates", async () => {
    vi.stubEnv("NOAA_API_KEY", "");
    const calls = stubFetch([{ DATE: "2024-01", STATION: "USW00094728", TAVG: "37.0" }]);
    const { getClimateData } = await import("../src/apis/noaa/sdk.js");
    const monthly = await getClimateData({ datasetId: "GSOM", stationId: "USW00094728", startDate: "2024-01-01", endDate: "2024-01-31", datatypeId: "TAVG" });
    expect(calls[0].url.searchParams.get("dataset")).toBe("global-summary-of-the-month");
    expect(calls[0].url.searchParams.get("dataTypes")).toBe("TAVG");
    expect(monthly.data[0].date).toBe("2024-01-01T00:00:00");

    stubFetch([{ DATE: "2020", STATION: "USW00094728", PRCP: "45.39" }]);
    const annual = await getClimateData({ datasetId: "GSOY", stationId: "USW00094728", startDate: "2020-01-01", endDate: "2020-12-31" });
    expect(annual.data[0]).toMatchObject({ date: "2020-01-01T00:00:00", datatype: "PRCP", value: 45.39 });
  });

  it("applies the limit and keeps the full count", async () => {
    vi.stubEnv("NOAA_API_KEY", "");
    stubFetch(ADS_DAILY);
    const { getClimateData } = await import("../src/apis/noaa/sdk.js");
    const res = await getClimateData({ datasetId: "GHCND", stationId: "USW00094728", startDate: "2024-01-01", endDate: "2024-01-02", limit: 2 });
    expect(res.count).toBe(6);
    expect(res.data).toHaveLength(2);
  });

  it("still needs the key for location queries", async () => {
    vi.stubEnv("NOAA_API_KEY", "");
    const calls = stubFetch({ results: [] });
    const { getClimateData } = await import("../src/apis/noaa/sdk.js");
    await getClimateData({ datasetId: "GHCND", locationId: "FIPS:36", startDate: "2024-01-01", endDate: "2024-01-02" });
    expect(calls[0].url.href).toMatch(/^https:\/\/www\.ncei\.noaa\.gov\/cdo-web\/api\/v2\/data\?/);
  });
});

describe("getClimateData with NOAA_API_KEY", () => {
  it("uses Climate Data Online", async () => {
    vi.stubEnv("NOAA_API_KEY", "cdo-test-token");
    const calls = stubFetch({ metadata: { resultset: { offset: 1, count: 1, limit: 1000 } }, results: [{ date: "2024-01-01T00:00:00", datatype: "TMAX", station: "GHCND:USW00094728", value: 47, attributes: ",,W," }] });
    const { getClimateData } = await import("../src/apis/noaa/sdk.js");
    const res = await getClimateData({ datasetId: "GHCND", stationId: "GHCND:USW00094728", startDate: "2024-01-01", endDate: "2024-01-01" });
    expect(calls[0].url.pathname).toBe("/cdo-web/api/v2/data");
    expect((calls[0].init?.headers as Record<string, string>).token).toBe("cdo-test-token");
    expect(res).toMatchObject({ source: "cdo", count: 1 });
  });
});

describe("noaa_climate_data", () => {
  it("summarizes each station/data type separately and names the source", async () => {
    vi.stubEnv("NOAA_API_KEY", "");
    stubFetch(ADS_DAILY);
    const { tools } = await import("../src/apis/noaa/tools.js");
    const tool = tools.find(t => t.name === "noaa_climate_data")!;
    const out = JSON.parse(await tool.execute({ dataset_id: "GHCND", station_id: "GHCND:USW00094728", start_date: "2024-01-01", end_date: "2024-01-02", limit: 1000 } as any, {} as any) as string);
    expect(out.meta.source).toBe("NCEI Access Data Service (no key)");
    expect(out.summary).toContain("6 observations");
    // Rows say which data type each value is, and stats are per series (not TMAX mixed with PRCP).
    expect(out.data.columns).toEqual(["date", "value", "datatype", "station"]);
    expect(out.data.rows[1]).toEqual(["2024-01-01T00:00:00", 47, "TMAX", "GHCND:USW00094728"]);
    expect(out.stats).toBeNull();
    expect(out.seriesStats["GHCND:USW00094728 | TMAX"]).toMatchObject({ min: 42, max: 47 });
    expect(out.seriesStats["GHCND:USW00094728 | PRCP"]).toMatchObject({ min: 0, max: 0.03 });
  });
});
