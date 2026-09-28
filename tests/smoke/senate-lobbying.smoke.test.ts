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
