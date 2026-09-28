/**
 * Live: usa_spending_over_time returns data (it previously returned empty rows).
 */

import { describe, it, expect } from "vitest";
import { callTool } from "./helpers.js";

describe("usa_spending_over_time (live)", () => {
  it("returns fiscal periods with amounts", async () => {
    const res = await callTool("usaspending", "usa_spending_over_time", { group: "fiscal_year" });
    expect(res.data.columns).toEqual(expect.arrayContaining(["periodStart", "amount", "fiscalPeriod"]));
    expect(res.data.rows.length).toBeGreaterThan(0);
    for (const row of res.data.rows as unknown[][]) {
      expect(row[0]).toMatch(/^\d{4}-10$/);
      expect(typeof row[1]).toBe("number");
    }
    expect(res.stats.count).toBe(res.data.rows.length);
  });
});
