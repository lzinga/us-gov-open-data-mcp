/**
 * Live: FRED unit transformations and release calendar.
 */

import { describe, expect } from "vitest";
import { callTool, itWithKeys } from "./helpers.js";

const rowsOf = (res: { data?: { columns: string[]; rows: unknown[][] } }) =>
  (res.data?.rows ?? []).map(r => Object.fromEntries((res.data?.columns ?? []).map((c, i) => [c, r[i]])));

describe("FRED (live)", () => {
  itWithKeys(["FRED_API_KEY"])("fred_series_data units=pc1 returns CPI inflation in percent", async () => {
    const res = await callTool("fred", "fred_series_data", { series_id: "CPIAUCSL", units: "pc1", limit: 3 });
    const [latest] = rowsOf(res as never);
    const value = Number(latest.value);
    expect(value).toBeGreaterThan(-5); // a year-over-year rate, not an index level (~300+)
    expect(value).toBeLessThan(20);
    expect(res.meta?.units).toBe("pc1");
  }, 60_000);

  itWithKeys(["FRED_API_KEY"])("fred_release_calendar lists upcoming Employment Situation dates", async () => {
    const res = await callTool("fred", "fred_release_calendar", { release_id: 50, limit: 3 });
    const dates = rowsOf(res as never).map(r => String(r.date));
    expect(dates.length).toBeGreaterThan(0);
    const today = new Date().toISOString().slice(0, 10);
    for (const d of dates) expect(d >= today).toBe(true);
  }, 60_000);
});
