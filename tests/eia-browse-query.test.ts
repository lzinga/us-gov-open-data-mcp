/**
 * EIA v2 route browser and generic query (eia_browse, eia_query).
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { normalizeRoute } from "../src/apis/eia/sdk.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
beforeEach(async () => (await import("../src/apis/eia/sdk.js")).clearCache());

function stubEia(route: (url: URL) => unknown) {
  const urls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    const url = new URL(u);
    urls.push(url);
    return new Response(JSON.stringify(route(url)), { status: 200 });
  }));
  return urls;
}

async function call(name: string, args: Record<string, unknown>) {
  vi.stubEnv("EIA_API_KEY", "k");
  const { tools } = await import("../src/apis/eia/tools.js");
  const t = tools.find(x => x.name === name)!;
  return JSON.parse(await t.execute(t.parameters.parse(args), {} as never) as string);
}

describe("normalizeRoute", () => {
  it("accepts slashes and a trailing /data", () => {
    expect(normalizeRoute("/electricity/retail-sales/data/")).toBe("electricity/retail-sales");
    expect(normalizeRoute("petroleum/pri/spt")).toBe("petroleum/pri/spt");
    expect(normalizeRoute("")).toBe("");
  });
});

describe("eia_browse", () => {
  it("lists sub-routes with full paths", async () => {
    const urls = stubEia(() => ({ response: { id: "electricity", name: "Electricity", routes: [{ id: "retail-sales", name: "Retail Sales", description: "…" }] } }));
    const out = await call("eia_browse", { route: "electricity" });
    expect(urls[0].pathname).toBe("/v2/electricity/");
    expect(out.record.routes).toEqual([{ id: "electricity/retail-sales", name: "Retail Sales", description: "…" }]);
    expect(out.summary).toBe("EIA electricity: 1 sub-route(s)");
  });

  it("describes a data route's facets, columns and period range", async () => {
    stubEia(() => ({ response: {
      id: "retail-sales", name: "Retail Sales",
      frequency: [{ id: "monthly", description: "One data point for each month." }],
      facets: [{ id: "stateid", description: "State" }, { id: "sectorid", description: "Sector" }],
      data: { price: { units: "cents per kilowatt-hour" }, sales: { units: "million kilowatt hours" } },
      startPeriod: "2001-01", endPeriod: "2026-07", defaultFrequency: "monthly",
    } }));
    const out = await call("eia_browse", { route: "electricity/retail-sales" });
    expect(out.record.data).toEqual([{ id: "price", units: "cents per kilowatt-hour" }, { id: "sales", units: "million kilowatt hours" }]);
    expect(out.summary).toBe("EIA electricity/retail-sales: data route: 2 data column(s), 2 facet(s), 2001-01 to 2026-07");
  });

  it("lists facet values", async () => {
    const urls = stubEia(() => ({ response: { facets: [{ id: "RES", name: "residential" }, { id: "COM", name: "commercial" }] } }));
    const out = await call("eia_browse", { route: "electricity/retail-sales", facet: "sectorid" });
    expect(urls[0].pathname).toBe("/v2/electricity/retail-sales/facet/sectorid/");
    expect(out.data.rows).toEqual([["RES", "residential"], ["COM", "commercial"]]);
  });
});

describe("eia_query", () => {
  it("sends data columns, facets and a newest-first sort, and summarizes per series", async () => {
    const urls = stubEia(() => ({ response: { total: "614", data: [
      { period: "2026-07", stateid: "CA", stateDescription: "California", sectorid: "RES", sectorName: "residential", price: "33.61", "price-units": "cents per kilowatt-hour" },
      { period: "2026-06", stateid: "CA", stateDescription: "California", sectorid: "RES", sectorName: "residential", price: "32.10", "price-units": "cents per kilowatt-hour" },
      { period: "2026-07", stateid: "TX", stateDescription: "Texas", sectorid: "RES", sectorName: "residential", price: "15.20", "price-units": "cents per kilowatt-hour" },
    ] } }));
    const out = await call("eia_query", { route: "/electricity/retail-sales/data", data: "price", facets: "stateid=CA,TX; sectorid=RES", frequency: "monthly", length: 3 });
    const p = urls[0].searchParams;
    expect(urls[0].pathname).toBe("/v2/electricity/retail-sales/data/");
    expect(p.getAll("data[]")).toEqual(["price"]);
    expect(p.getAll("facets[stateid][]")).toEqual(["CA", "TX"]);
    expect(p.getAll("facets[sectorid][]")).toEqual(["RES"]);
    expect(p.get("sort[0][column]")).toBe("period");
    expect(p.get("sort[0][direction]")).toBe("desc");
    expect(p.get("length")).toBe("3");
    expect(out.data.rows[0].slice(0, 2)).toEqual(["2026-07", 33.61]); // numeric
    expect(Object.keys(out.seriesStats)).toEqual(["CA | RES"]); // TX has one point
  });

  it("rejects malformed facet filters", async () => {
    stubEia(() => ({}));
    await expect(call("eia_query", { route: "electricity/retail-sales", facets: "stateid CA" })).rejects.toThrow(/Bad facet filter "stateid CA"/);
  });
});
