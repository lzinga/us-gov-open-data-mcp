/**
 * geo tools — address, coordinate, ZIP and county name to FIPS codes.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => vi.unstubAllGlobals());
beforeEach(async () => (await import("../src/apis/geo/sdk.js")).clearCache());

/**
 * Geography layers as the Census returns them. The congressional district and
 * legislative layers carry a number that changes with each new Congress and
 * vintage, so the parser must match them by pattern rather than exact name.
 */
const GEOGRAPHIES = {
  States: [{ GEOID: "53", NAME: "Washington", BASENAME: "Washington" }],
  Counties: [{ GEOID: "53033", NAME: "King County", BASENAME: "King", COUNTY: "033" }],
  "Census Tracts": [{ GEOID: "53033008200", NAME: "Census Tract 82" }],
  "2020 Census Blocks": [{ GEOID: "530330082003006", NAME: "Block 3006" }],
  "Incorporated Places": [{ GEOID: "5363000", NAME: "Seattle city" }],
  "County Subdivisions": [{ GEOID: "5303392560", NAME: "Seattle CCD" }],
  "120th Congressional Districts": [{ GEOID: "5307", NAME: "Congressional District 7", CDSESSN: "120" }],
  "2026 State Legislative Districts - Upper": [{ GEOID: "53043", NAME: "District 43" }],
  "Combined Statistical Areas": [{ GEOID: "500", NAME: "Seattle-Tacoma, WA CSA" }],
  "Urban Areas": [{ GEOID: "80389", NAME: "Seattle--Tacoma, WA Urban Area" }],
};

const ADDRESS_MATCH = {
  matchedAddress: "400 BROAD ST, SEATTLE, WA, 98109",
  coordinates: { x: -122.3493, y: 47.6205 },
  addressComponents: { zip: "98109" },
  geographies: GEOGRAPHIES,
};

/** Route stubbed responses by URL so multi-request calls can be asserted. */
function stubRoutes(routes: { match: RegExp; body: unknown }[]) {
  const urls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    const url = new URL(u);
    urls.push(url);
    const route = routes.find(r => r.match.test(u));
    if (!route) throw new Error(`unstubbed request: ${u}`);
    return new Response(JSON.stringify(route.body), { status: 200 });
  }));
  return urls;
}

async function call(name: string, args: Record<string, unknown>) {
  const { tools } = await import("../src/apis/geo/tools.js");
  const tool = tools.find(t => t.name === name)!;
  return JSON.parse(await tool.execute(tool.parameters.parse(args), {} as never) as string);
}

// ─── geo_locate ──────────────────────────────────────────────────────

describe("geo_locate", () => {
  it("sends the address with the current benchmark and normalizes the geographies", async () => {
    const urls = stubRoutes([
      { match: /onelineaddress/, body: { result: { addressMatches: [ADDRESS_MATCH] } } },
    ]);

    const out = await call("geo_locate", { address: "400 Broad St, Seattle, WA" });

    expect(urls[0].pathname).toBe("/geocoder/geographies/onelineaddress");
    expect(urls[0].searchParams.get("address")).toBe("400 Broad St, Seattle, WA");
    expect(urls[0].searchParams.get("benchmark")).toBe("Public_AR_Current");
    expect(urls[0].searchParams.get("vintage")).toBe("Current_Current");
    expect(urls[0].searchParams.get("format")).toBe("json");

    expect(out.record).toMatchObject({
      matchedAddress: "400 BROAD ST, SEATTLE, WA, 98109",
      latitude: 47.6205,
      longitude: -122.3493,
      zip: "98109",
      areas: {
        state: { fips: "53", usps: "WA", name: "Washington" },
        county: { fips: "53033", name: "King County" },
        tract: { fips: "53033008200", name: "Census Tract 82" },
        block: { fips: "530330082003006", name: "Block 3006" },
        place: { fips: "5363000", name: "Seattle city" },
      },
    });
  });

  it("reads the congressional and legislative layers despite their numbered names", async () => {
    stubRoutes([{ match: /onelineaddress/, body: { result: { addressMatches: [ADDRESS_MATCH] } } }]);
    const out = await call("geo_locate", { address: "400 Broad St, Seattle, WA" });

    expect(out.record.areas.congressionalDistrict).toEqual({
      fips: "5307", name: "Congressional District 7", session: "120",
    });
    expect(out.record.areas.stateLegislativeUpper).toEqual({ fips: "53043", name: "District 43" });
  });

  it("omits layers the Census did not return", async () => {
    stubRoutes([{
      match: /onelineaddress/,
      body: { result: { addressMatches: [{ ...ADDRESS_MATCH, geographies: { States: GEOGRAPHIES.States } }] } },
    }]);
    const out = await call("geo_locate", { address: "400 Broad St, Seattle, WA" });

    expect(Object.keys(out.record.areas)).toEqual(["state"]);
  });

  it("lists every match when the address is ambiguous, capped by limit", async () => {
    stubRoutes([{
      match: /onelineaddress/,
      body: { result: { addressMatches: [ADDRESS_MATCH, ADDRESS_MATCH, ADDRESS_MATCH] } },
    }]);
    const out = await call("geo_locate", { address: "Main St", limit: 2 });

    expect(out.data.total).toBe(2);
    expect(out.data.items).toHaveLength(2);
  });

  it("points at the other tools when nothing matches", async () => {
    stubRoutes([{ match: /onelineaddress/, body: { result: { addressMatches: [] } } }]);
    const out = await call("geo_locate", { address: "98101" });

    expect(out.summary).toContain("No Census match");
    expect(out.summary).toContain("geo_zip");
  });
});

// ─── geo_point ───────────────────────────────────────────────────────

describe("geo_point", () => {
  it("sends longitude as x and latitude as y", async () => {
    const urls = stubRoutes([
      { match: /geographies\/coordinates/, body: { result: { geographies: GEOGRAPHIES } } },
    ]);

    const out = await call("geo_point", { latitude: 47.6205, longitude: -122.3493 });

    expect(urls[0].searchParams.get("x")).toBe("-122.3493");
    expect(urls[0].searchParams.get("y")).toBe("47.6205");
    expect(out.summary).toContain("King County");
    expect(out.record.areas.county.fips).toBe("53033");
  });

  it("explains the likely sign error when the point is outside the US", async () => {
    stubRoutes([{ match: /geographies\/coordinates/, body: { result: { geographies: {} } } }]);
    const out = await call("geo_point", { latitude: 47.61, longitude: 122.33 });

    expect(out.summary).toContain("US longitudes are negative");
  });

  it("rejects an out-of-range latitude before calling the API", async () => {
    const { tools } = await import("../src/apis/geo/tools.js");
    const tool = tools.find(t => t.name === "geo_point")!;
    expect(tool.parameters.safeParse({ latitude: 200, longitude: -122 }).success).toBe(false);
  });
});

// ─── geo_zip ─────────────────────────────────────────────────────────

const ZCTA_POINT = { features: [{ attributes: { GEOID: "98101", INTPTLAT: "+47.6109020", INTPTLON: "-122.3364219" } }] };
const ZCTA_EXTENT = { extent: { xmin: -122.35, ymin: 47.6, xmax: -122.32, ymax: 47.62 } };
const NEARBY = { features: [{ attributes: { GEOID: "53033", NAME: "King County" } }] };

describe("geo_zip", () => {
  it("resolves the ZIP's internal point, its geographies and the counties around it", async () => {
    const urls = stubRoutes([
      { match: /returnExtentOnly=true/, body: ZCTA_EXTENT },
      { match: /PUMA_TAD_TAZ_UGA_ZCTA/, body: ZCTA_POINT },
      { match: /State_County/, body: NEARBY },
      { match: /geographies\/coordinates/, body: { result: { geographies: GEOGRAPHIES } } },
    ]);

    const out = await call("geo_zip", { zip: "98101" });

    const zcta = urls.find(u => u.pathname.includes("PUMA_TAD_TAZ_UGA_ZCTA"))!;
    expect(zcta.searchParams.get("where")).toBe("GEOID='98101'");

    const counties = urls.find(u => u.pathname.includes("State_County"))!;
    expect(counties.searchParams.get("geometry")).toBe("-122.35,47.6,-122.32,47.62");
    expect(counties.searchParams.get("spatialRel")).toBe("esriSpatialRelIntersects");
    expect(counties.searchParams.get("inSR")).toBe("4326");

    expect(out.record).toMatchObject({
      zip: "98101",
      latitude: 47.610902,
      longitude: -122.3364219,
      areas: { county: { fips: "53033", name: "King County" } },
      nearbyCounties: [{ fips: "53033", name: "King County" }],
    });
  });

  it("reverse-geocodes the ZIP's own internal point", async () => {
    const urls = stubRoutes([
      { match: /returnExtentOnly=true/, body: ZCTA_EXTENT },
      { match: /PUMA_TAD_TAZ_UGA_ZCTA/, body: ZCTA_POINT },
      { match: /State_County/, body: NEARBY },
      { match: /geographies\/coordinates/, body: { result: { geographies: GEOGRAPHIES } } },
    ]);

    await call("geo_zip", { zip: "98101" });

    const point = urls.find(u => u.pathname.includes("geographies/coordinates"))!;
    expect(point.searchParams.get("y")).toBe("47.610902");
    expect(point.searchParams.get("x")).toBe("-122.3364219");
  });

  it("suggests an address lookup for a ZIP with no ZCTA", async () => {
    stubRoutes([{ match: /PUMA_TAD_TAZ_UGA_ZCTA/, body: { features: [] } }]);
    const out = await call("geo_zip", { zip: "00501" });

    expect(out.summary).toContain("No Census ZIP area");
    expect(out.summary).toContain("geo_locate");
  });

  it("still returns the ZIP when the nearby-county lookup comes back empty", async () => {
    stubRoutes([
      { match: /returnExtentOnly=true/, body: {} },
      { match: /PUMA_TAD_TAZ_UGA_ZCTA/, body: ZCTA_POINT },
      { match: /geographies\/coordinates/, body: { result: { geographies: GEOGRAPHIES } } },
    ]);

    const out = await call("geo_zip", { zip: "98101" });

    expect(out.record.nearbyCounties).toEqual([]);
    expect(out.record.areas.county.fips).toBe("53033");
  });

  it("rejects a ZIP that is not 5 digits", async () => {
    const { tools } = await import("../src/apis/geo/tools.js");
    const tool = tools.find(t => t.name === "geo_zip")!;
    expect(tool.parameters.safeParse({ zip: "9810" }).success).toBe(false);
    expect(tool.parameters.safeParse({ zip: "98101-1234" }).success).toBe(false);
  });
});

// ─── geo_counties ────────────────────────────────────────────────────

const TX_COUNTIES = {
  features: [
    { attributes: { GEOID: "48201", NAME: "Harris County", BASENAME: "Harris", COUNTY: "201", INTPTLAT: "+29.8574", INTPTLON: "-095.3925" } },
    { attributes: { GEOID: "48203", NAME: "Harrison County", BASENAME: "Harrison", COUNTY: "203" } },
    { attributes: { GEOID: "48453", NAME: "Travis County", BASENAME: "Travis", COUNTY: "453" } },
  ],
};

describe("geo_counties", () => {
  it.each(["Texas", "tx", "48"])("accepts the state as %s and queries by FIPS", async state => {
    const urls = stubRoutes([{ match: /State_County/, body: TX_COUNTIES }]);

    const out = await call("geo_counties", { state });

    expect(urls[0].searchParams.get("where")).toBe("STATE='48'");
    expect(out.data.total).toBe(3);
    expect(out.data.items[0]).toMatchObject({
      fips: "48201",
      name: "Harris County",
      stateFips: "48",
      stateUsps: "TX",
      countyCode: "201",
      latitude: 29.8574,
      longitude: -95.3925,
    });
  });

  it("filters by name without a second request", async () => {
    const urls = stubRoutes([{ match: /State_County/, body: TX_COUNTIES }]);

    const out = await call("geo_counties", { state: "TX", name: "harris" });

    expect(urls).toHaveLength(1);
    expect(out.data.items.map((c: { fips: string }) => c.fips)).toEqual(["48201", "48203"]);
  });

  it("says how to list them all when the name matches nothing", async () => {
    stubRoutes([{ match: /State_County/, body: TX_COUNTIES }]);
    const out = await call("geo_counties", { state: "TX", name: "Kings" });

    expect(out.summary).toContain("No county in TX");
    expect(out.summary).toContain("without name");
  });

  it("rejects an unknown state before calling the API", async () => {
    const fetchFn = stubRoutes([{ match: /State_County/, body: TX_COUNTIES }]);
    const { tools } = await import("../src/apis/geo/tools.js");
    const tool = tools.find(t => t.name === "geo_counties")!;

    await expect(tool.execute({ state: "Atlantis" }, {} as never)).rejects.toThrow(/Unknown state/);
    expect(fetchFn).toHaveLength(0);
  });
});
