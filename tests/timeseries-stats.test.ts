/**
 * Timeseries statistics: time-aware trend classification, change/CAGR, and
 * per-series stats when a response mixes several series.
 */

import { describe, it, expect } from "vitest";
import { timeseriesResponse, parsePeriod } from "../src/shared/response.js";

type Stats = {
  count: number; first: { date: string; value: number }; last: { date: string; value: number };
  change: number | null; changePct: number | null; cagrPct: number | null; trend: string | null;
};

function statsFor(rows: { date: string; value: number | string }[]): Stats {
  return JSON.parse(timeseriesResponse("t", { rows, dateKey: "date", valueKey: "value" })).stats;
}

/** Monthly ISO dates starting Jan 2015. */
function monthly(values: number[]): { date: string; value: number }[] {
  return values.map((value, i) => {
    const y = 2015 + Math.floor(i / 12);
    const m = String((i % 12) + 1).padStart(2, "0");
    return { date: `${y}-${m}-01`, value };
  });
}

describe("parsePeriod", () => {
  it("parses common period labels", () => {
    expect(parsePeriod("2024")).toBe(Date.UTC(2024, 0, 1));
    expect(parsePeriod("2024-03")).toBe(Date.UTC(2024, 2, 1));
    expect(parsePeriod("2024-03-15")).toBe(Date.UTC(2024, 2, 15));
    expect(parsePeriod("2024 Q3")).toBe(Date.UTC(2024, 6, 1));
    expect(parsePeriod("2024Q1")).toBe(Date.UTC(2024, 0, 1));
    expect(parsePeriod("2024M11")).toBe(Date.UTC(2024, 10, 1));
    expect(parsePeriod("FY2024")).toBe(Date.UTC(2023, 9, 1));
    expect(parsePeriod("2024-01-01T00:00:00")).not.toBeNull();
    expect(parsePeriod("Week 12")).toBeNull();
  });
});

describe("trend classification", () => {
  it("labels 10 years of steadily rising monthly CPI as increasing (was 'stable')", () => {
    // ~234.7 → ~334 over 139 months, like CPIAUCSL 2015–2026.
    const values = Array.from({ length: 139 }, (_, i) => 234.7 + i * 0.715 + Math.sin(i) * 0.4);
    const s = statsFor(monthly(values));
    expect(s.trend).toBe("increasing");
    expect(s.first.date).toBe("2015-01-01");
    expect(s.last.date).toBe("2026-07-01");
    expect(s.changePct).toBeGreaterThan(40);
    expect(s.cagrPct).toBeGreaterThan(2.5);
    expect(s.cagrPct).toBeLessThan(4);
  });

  it("labels a steady decline as decreasing", () => {
    const s = statsFor(monthly(Array.from({ length: 48 }, (_, i) => 100 - i * 0.5)));
    expect(s.trend).toBe("decreasing");
    expect(s.change).toBeCloseTo(-23.5, 5);
  });

  it("labels a flat series with tiny noise as stable", () => {
    const s = statsFor(monthly(Array.from({ length: 60 }, (_, i) => 100 + (i % 2 ? 0.2 : -0.2))));
    expect(s.trend).toBe("stable");
  });

  it("labels large swings without a direction as volatile", () => {
    const s = statsFor(monthly(Array.from({ length: 60 }, (_, i) => (i % 2 ? 150 : 50))));
    expect(s.trend).toBe("volatile");
  });

  it("does not depend on observation frequency", () => {
    // Same 20% rise over 5 years, sampled annually vs monthly.
    const annual = statsFor([2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => ({ date: String(y), value: 100 + i * 4 })));
    const month = statsFor(monthly(Array.from({ length: 61 }, (_, i) => 100 + i * (20 / 60))));
    expect(annual.trend).toBe("increasing");
    expect(month.trend).toBe("increasing");
  });

  it("orders by parsed time, not by label text", () => {
    const s = statsFor([
      { date: "2024 Q4", value: 4 }, { date: "2024 Q1", value: 1 },
      { date: "2024 Q3", value: 3 }, { date: "2024 Q2", value: 2 },
    ]);
    expect(s.first).toEqual({ date: "2024 Q1", value: 1 });
    expect(s.last).toEqual({ date: "2024 Q4", value: 4 });
  });

  it("handles series centred on zero", () => {
    const s = statsFor(monthly(Array.from({ length: 36 }, (_, i) => -3 + i * (6 / 35))));
    expect(s.trend).toBe("increasing");
    expect(s.changePct).toBeCloseTo(200, 0);
  });

  it("omits CAGR for non-positive values or spans under a year", () => {
    expect(statsFor(monthly([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9])).cagrPct).toBeNull();
    expect(statsFor(monthly([100, 101, 102, 103])).cagrPct).toBeNull();
  });

  it("skips FRED '.' placeholders and returns null trend for < 3 points", () => {
    const s = statsFor([{ date: "2024-01-01", value: "." }, { date: "2024-02-01", value: "1.5" }, { date: "2024-03-01", value: "1.7" }]);
    expect(s.count).toBe(2);
    expect(s.trend).toBeNull();
  });
});

describe("multiple series", () => {
  it("computes per-series stats instead of mixing series", () => {
    const rows = [
      ...monthly(Array.from({ length: 24 }, (_, i) => 10 + i)).map(r => ({ ...r, state: "CA" })),
      ...monthly(Array.from({ length: 24 }, (_, i) => 50 - i)).map(r => ({ ...r, state: "TX" })),
    ];
    const out = JSON.parse(timeseriesResponse("t", { rows, dateKey: "date", valueKey: "value", extraFields: ["state"], seriesKeys: ["state"] }));
    expect(out.stats).toBeNull();
    expect(out.seriesStats.CA.trend).toBe("increasing");
    expect(out.seriesStats.TX.trend).toBe("decreasing");
    expect(out.statsNote).toContain("2 series");
  });

  it("keeps single-series stats when seriesKeys resolve to one series", () => {
    const rows = monthly([1, 2, 3, 4]).map(r => ({ ...r, state: "CA" }));
    const out = JSON.parse(timeseriesResponse("t", { rows, dateKey: "date", valueKey: "value", seriesKeys: ["state"] }));
    expect(out.stats.trend).toBe("increasing");
    expect(out.seriesStats).toBeUndefined();
  });

  it("omits per-series stats when every series has a single observation", () => {
    const rows = ["CA", "TX", "NY"].map((state, i) => ({ date: "2026-07", value: 10 + i, state }));
    const out = JSON.parse(timeseriesResponse("t", { rows, dateKey: "date", valueKey: "value", seriesKeys: ["state"] }));
    expect(out.stats).toBeNull();
    expect(out.seriesStats).toBeUndefined();
    expect(out.statsNote).toContain("3 series with one observation each");
  });
});
