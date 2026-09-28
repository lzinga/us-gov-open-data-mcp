/**
 * Live: timeseries stats on real data.
 */

import { describe, expect } from "vitest";
import { callTool, itWithKeys } from "./helpers.js";

describe("timeseries stats (live)", () => {
  itWithKeys(["FRED_API_KEY"])("CPI since 2015 is reported as increasing with a plausible CAGR", async () => {
    const res = await callTool("fred", "fred_series_data", { series_id: "CPIAUCSL", start_date: "2015-01-01", limit: 500 });
    expect(res.stats.trend).toBe("increasing");
    expect(res.stats.changePct).toBeGreaterThan(30);
    expect(res.stats.cagrPct).toBeGreaterThan(1);
    expect(res.stats.cagrPct).toBeLessThan(6);
    // The summary reports returned dates, not FRED's 9999-12-31 open-ended default.
    expect(res.summary).not.toContain("9999");
    expect(res.summary).toContain(res.stats.last.date);
  });

  itWithKeys(["EIA_API_KEY"])("EIA multi-state electricity prices don't get stats mixed across series", async () => {
    const res = await callTool("eia", "eia_electricity", { length: 300 });
    const seriesCount = new Set((res.data?.rows ?? []).map((r: unknown[]) => JSON.stringify(r.slice(2)))).size;
    if (seriesCount > 1) {
      expect(res.stats).toBeNull();
      expect(res.statsNote).toMatch(/series/);
    } else {
      expect(res.stats).not.toBeNull();
    }
  });
});
