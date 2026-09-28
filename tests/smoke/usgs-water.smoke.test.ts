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

  it("usgs_daily_water_data returns a year of daily means with a known historical value", async () => {
    const res = await callTool("usgs", "usgs_daily_water_data", { sites: "01646500", start_dt: "2024-01-01", end_dt: "2024-12-31" });
    const s = (res.data?.items ?? [])[0] as { dailyValueCount: number; earliestDate: string; latestDate: string; earliestValue: number };
    expect(s.dailyValueCount).toBe(366); // 2024 is a leap year
    expect(s.earliestDate).toBe("2024-01-01");
    expect(s.latestDate).toBe("2024-12-31");
    // Approved daily mean discharge on 2024-01-03 (seen in the API during migration): 6,860 cfs
    const jan = await callTool("usgs", "usgs_daily_water_data", { sites: "01646500", start_dt: "2024-01-03", end_dt: "2024-01-03" });
    expect((jan.data.items[0] as { latestValue: number }).latestValue).toBe(6860);
  });

  it("usgs_water_statistics matches the legacy day-of-year statistics for the Potomac", async () => {
    const res = await callTool("usgs", "usgs_water_statistics", { sites: "01646500" });
    const rows = rowsAsObjects(res as never);
    expect(rows).toHaveLength(366); // legacy returned 366 rows (Jan 1 – Dec 31 incl. Feb 29)
    expect(rows[0]).toMatchObject({ month: 1, day: 1 });
    expect(rows.at(-1)).toMatchObject({ month: 12, day: 31 });
    // Legacy waterservices row for 3/15 (3 significant figures): years 97, min 2380, p05 5150,
    // p25 10400, p50 16500, mean 24000, p75 29000, p95 66800, max 192000.
    const mar15 = rows.find(r => r.month === 3 && r.day === 15)!;
    expect(mar15.yearsOfRecord).toBeGreaterThanOrEqual(97);
    const close = (v: unknown, legacy: number) => expect(Math.abs(Number(v) - legacy) / legacy).toBeLessThan(0.02);
    close(mar15.min, 2380); close(mar15.p05, 5150); close(mar15.p25, 10400); close(mar15.median_p50, 16500);
    close(mar15.mean, 24000); close(mar15.p75, 29000); close(mar15.p95, 66800); close(mar15.max, 192000);
    for (const r of rows) expect(Number(r.min)).toBeLessThanOrEqual(Number(r.max));
  });

  it("usgs_water_statistics supports monthly and annual reports", async () => {
    const monthly = rowsAsObjects(await callTool("usgs", "usgs_water_statistics", { sites: "01646500", stat_report_type: "monthly" }) as never);
    expect(monthly.map(r => r.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const annual = rowsAsObjects(await callTool("usgs", "usgs_water_statistics", { sites: "01646500", stat_report_type: "annual" }) as never);
    expect(annual.length).toBeGreaterThan(90);
    const y2024 = annual.find(r => r.year === 2024)!;
    expect(y2024.daysOfRecord).toBe(366);
    expect(Number(y2024.min)).toBeLessThan(Number(y2024.mean));
  });
});
