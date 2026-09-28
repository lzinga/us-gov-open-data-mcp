/**
 * usa_spending_over_time: rows must carry the period and amount (the tool
 * previously asked for fields that didn't exist and returned empty rows).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { fiscalPeriodInfo } from "../src/apis/usaspending/sdk.js";

afterEach(() => vi.unstubAllGlobals());

describe("fiscalPeriodInfo", () => {
  it("maps fiscal months (1 = October) to calendar months", () => {
    expect(fiscalPeriodInfo(2025, null, 1)).toEqual({ periodStart: "2024-10", fiscalPeriod: "FY2025 M01" });
    expect(fiscalPeriodInfo(2025, null, 3)).toEqual({ periodStart: "2024-12", fiscalPeriod: "FY2025 M03" });
    expect(fiscalPeriodInfo(2025, null, 4)).toEqual({ periodStart: "2025-01", fiscalPeriod: "FY2025 M04" });
    expect(fiscalPeriodInfo(2025, null, 12)).toEqual({ periodStart: "2025-09", fiscalPeriod: "FY2025 M12" });
  });

  it("maps fiscal quarters and years", () => {
    expect(fiscalPeriodInfo(2025, 1, null)).toEqual({ periodStart: "2024-10", fiscalPeriod: "FY2025 Q1" });
    expect(fiscalPeriodInfo(2025, 2, null)).toEqual({ periodStart: "2025-01", fiscalPeriod: "FY2025 Q2" });
    expect(fiscalPeriodInfo(2025, null, null)).toEqual({ periodStart: "2024-10", fiscalPeriod: "FY2025" });
    expect(fiscalPeriodInfo(null, null, null)).toEqual({ periodStart: null, fiscalPeriod: null });
  });
});

describe("usa_spending_over_time tool", () => {
  it("returns period and amount columns with stats", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      results: [
        { time_period: { fiscal_year: "2023" }, aggregated_amount: 100 },
        { time_period: { fiscal_year: "2024" }, aggregated_amount: 120 },
        { time_period: { fiscal_year: "2025" }, aggregated_amount: 150 },
      ],
    }), { status: 200 })));
    const { tools } = await import("../src/apis/usaspending/tools.js");
    const tool = tools.find(t => t.name === "usa_spending_over_time")!;
    const out = JSON.parse(await tool.execute({ group: "fiscal_year" } as any, {} as any) as string);

    expect(out.data.columns).toEqual(["periodStart", "amount", "fiscalPeriod"]);
    expect(out.data.rows[0]).toEqual(["2022-10", 100, "FY2023"]);
    expect(out.stats.count).toBe(3);
    expect(out.stats.trend).toBe("increasing");
  });
});
