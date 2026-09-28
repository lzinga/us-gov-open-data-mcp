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
