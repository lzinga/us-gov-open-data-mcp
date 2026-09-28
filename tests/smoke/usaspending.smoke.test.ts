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

describe("award search and detail (live)", () => {
  it("usa_spending_by_award works without an award type (contracts)", async () => {
    const res = await callTool("usaspending", "usa_spending_by_award", { keyword: "semiconductor", limit: 3 });
    const items = res.data.items as { awardKey: string; awardId: string }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].awardKey).toMatch(/^CONT_(AWD|IDV)_/);
  }, 60_000);

  it("usa_award_detail opens an award found by the search, by key and by PIID", async () => {
    const found = await callTool("usaspending", "usa_spending_by_award", { keyword: "semiconductor", limit: 1 });
    const [first] = found.data.items as { awardKey: string; awardId: string }[];
    const byKey = await callTool("usaspending", "usa_award_detail", { award_id: first.awardKey });
    expect(byKey.record.awardKey).toBe(first.awardKey);
    expect(byKey.record.recipient).toBeTruthy();
    expect(byKey.record.awardingAgency).toBeTruthy();
    const byPiid = await callTool("usaspending", "usa_award_detail", { award_id: first.awardId });
    expect(byPiid.record.awardKey).toBe(first.awardKey);
  }, 60_000);
});
