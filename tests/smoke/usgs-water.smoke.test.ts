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
});
