/**
 * Live: lobbying issue-code filtering against lda.gov.
 */

import { describe, it, expect } from "vitest";
import { callTool } from "./helpers.js";

const TAX_DISPLAY = "Taxation/Internal Revenue Code";

describe("lobbying_search issue_code (live)", () => {
  it("returns only filings that lobbied on the requested issue", async () => {
    const unfiltered = await callTool("senate-lobbying", "lobbying_search", { client_name: "Pfizer", filing_year: 2025, page_size: 25 });
    const filtered = await callTool("senate-lobbying", "lobbying_search", { client_name: "Pfizer", filing_year: 2025, issue_code: "TAX", page_size: 25 });

    const items = (filtered.data?.items ?? []) as { issuesLobbied?: string[] }[];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.issuesLobbied).toContain(TAX_DISPLAY);

    const meta = filtered.meta?.issueCodeFilter;
    expect(meta).toMatchObject({ code: "TAX", appliedClientSide: true });
    expect(meta.baseTotal).toBe(unfiltered.data?.total);
    expect(meta.matched).toBeLessThan(meta.baseTotal);
  });

  it("refuses an issue-only search instead of returning every filing", async () => {
    await expect(callTool("senate-lobbying", "lobbying_search", { filing_year: 2025, issue_code: "TAX" }))
      .rejects.toThrow(/registrant_name or client_name/);
  });
});

describe("lobbying_search filters (live)", () => {
  it("foreign_entity_country returns only filings with an entity from that country", async () => {
    const res = await callTool("senate-lobbying", "lobbying_search", { foreign_entity_country: "CN", filing_year: 2025, page_size: 10 });
    expect(res.data?.total).toBeGreaterThan(0);
    const all = await callTool("senate-lobbying", "lobbying_search", { filing_year: 2025, page_size: 1 });
    expect(res.data?.total).toBeLessThan(all.data?.total); // actually filtered
  }, 120_000);

  it("amount_min narrows results to large filings", async () => {
    const big = await callTool("senate-lobbying", "lobbying_search", { filing_year: 2025, amount_min: 1_000_000, page_size: 5 });
    const items = (big.data?.items ?? []) as { amount?: number | string | null; income?: number | string | null; expenses?: number | string | null }[];
    expect(items.length).toBeGreaterThan(0);
    const all = await callTool("senate-lobbying", "lobbying_search", { filing_year: 2025, page_size: 1 });
    expect(big.data?.total).toBeLessThan(all.data?.total);
  }, 120_000);
});
