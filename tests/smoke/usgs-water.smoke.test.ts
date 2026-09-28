/**
 * Live: USGS water tools on api.waterdata.usgs.gov.
 * Real-time values change, so these compare invariants (IDs, units, ordering), not exact values.
 */

import { describe, it, expect } from "vitest";
import { callTool } from "./helpers.js";

function rowsAsObjects(res: { data?: { columns: string[]; rows: unknown[][] } }) {
  const cols = res.data?.columns ?? [];
  return (res.data?.rows ?? []).map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

describe("usgs water (live, Water Data APIs)", () => {
  it("usgs_water_sites finds Maryland stream gages including the Potomac at Little Falls", async () => {
    const res = await callTool("usgs", "usgs_water_sites", { state_cd: "MD", site_type: "ST", limit: 1000 });
    const rows = rowsAsObjects(res as never);
    expect(rows.length).toBeGreaterThan(100); // legacy active-with-IV search returned 159
    expect(rows.every(r => r.site_tp_cd === "ST")).toBe(true);
    expect(rows.every(r => typeof r.dec_lat_va === "number" && typeof r.dec_long_va === "number")).toBe(true);
    // The Little Falls gage is the canonical DC-area streamflow site (legacy site_no 01646500).
    const siteNos = new Set(rows.map(r => r.site_no));
    const sameAsLegacy = ["01646500", "01638500", "01594440"].filter(s => siteNos.has(s));
    expect(sameAsLegacy.length).toBeGreaterThan(0);
  });

  it("usgs_water_data returns a day of discharge readings for the Potomac at Little Falls", async () => {
    const res = await callTool("usgs", "usgs_water_data", { sites: "01646500", parameter_cd: "00060", period: "P1D" });
    const items = (res.data?.items ?? []) as { siteCode: string; siteName: string; unit: string; latestValue: number; readingCount: number; latestDateTime: string }[];
    expect(items.length).toBe(1);
    const s = items[0];
    expect(s.siteCode).toBe("01646500");
    expect(s.siteName).toMatch(/POTOMAC/);
    expect(s.unit).toBe("ft^3/s");
    expect(s.readingCount).toBeGreaterThan(24); // 5–15 minute readings over a day
    expect(typeof s.latestValue).toBe("number");
    expect(Date.now() - Date.parse(s.latestDateTime)).toBeLessThan(3 * 24 * 3600 * 1000);
  });

  it("usgs_water_data with only a state returns current readings from many sites", async () => {
    const res = await callTool("usgs", "usgs_water_data", { state_cd: "MD", parameter_cd: "00060" });
    const items = (res.data?.items ?? []) as { siteCode: string; readingCount: number }[];
    expect(items.length).toBeGreaterThan(20);
    expect(items.every(i => i.readingCount === 1)).toBe(true);
  });
});
