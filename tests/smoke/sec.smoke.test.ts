/**
 * Live: SEC ticker lookup and insider filings (EDGAR full-text search; no contact email needed).
 */

import { describe, it, expect } from "vitest";
import { callTool } from "./helpers.js";

describe("SEC lookup and insider filings (live)", () => {
  it("sec_company_search resolves tickers and names to the right CIK", async () => {
    const nvda = await callTool("sec", "sec_company_search", { company: "NVDA" });
    expect(nvda.summary).toContain("CIK 0001045810");
    const lmt = await callTool("sec", "sec_company_search", { company: "Lockheed Martin" });
    expect(lmt.summary).toContain("CIK 0000936468");
  }, 60_000);

  it("sec_insider_filings lists recent Form 4 filings for Apple", async () => {
    const res = await callTool("sec", "sec_insider_filings", { company: "AAPL", limit: 5 });
    const cols: string[] = res.data.columns;
    const rows = (res.data.rows as unknown[][]).map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.form).toBe("4");
      expect(String(r.url)).toMatch(/^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/320193\//);
      expect(r.insiderCik).not.toBe("0000320193");
    }
  }, 60_000);
});
