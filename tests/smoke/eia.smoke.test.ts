/**
 * Live: EIA v2 route browser and generic query.
 */

import { describe, expect } from "vitest";
import { callTool, itWithKeys } from "./helpers.js";

describe("EIA browse/query (live)", () => {
  itWithKeys(["EIA_API_KEY"])("browses from the root to a data route and its facet values", async () => {
    const root = await callTool("eia", "eia_browse", {});
    expect((root.record.routes as { id: string }[]).map(r => r.id)).toContain("electricity");
    const leaf = await callTool("eia", "eia_browse", { route: "electricity/retail-sales" });
    expect((leaf.record.data as { id: string }[]).map(d => d.id)).toContain("price");
    const sectors = await callTool("eia", "eia_browse", { route: "electricity/retail-sales", facet: "sectorid" });
    expect(JSON.stringify(sectors.data.rows)).toContain("RES");
  }, 60_000);

  itWithKeys(["EIA_API_KEY"])("queries residential electricity prices for two states", async () => {
    const res = await callTool("eia", "eia_query", {
      route: "electricity/retail-sales", data: "price", facets: "stateid=CA,TX; sectorid=RES", frequency: "monthly", length: 24,
    });
    const cols: string[] = res.data.columns;
    const rows = (res.data.rows as unknown[][]).map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
    expect(new Set(rows.map(r => r.stateid))).toEqual(new Set(["CA", "TX"]));
    for (const r of rows) expect(typeof r.price).toBe("number");
    expect(Object.keys(res.seriesStats as object)).toEqual(expect.arrayContaining(["CA | RES", "TX | RES"]));
  }, 60_000);
});
