/**
 * Live: congress_search_bills keyword mode (GovInfo full text + Congress.gov details).
 */

import { describe, expect } from "vitest";
import { callTool, itWithKeys } from "./helpers.js";

type Bill = { type: string; number: number; title: string; congress: number; sponsor?: unknown; latestAction?: unknown };

async function search(args: Record<string, unknown>) {
  const res = await callTool("congress", "congress_search_bills", args);
  return { res, bills: (res.data?.items ?? []) as Bill[] };
}

const it = itWithKeys(["DATA_GOV_API_KEY"]);

describe("congress_search_bills keyword search (live)", () => {
  it("finds current-congress bills on a topic (previously 'No bills found')", async () => {
    const { res, bills } = await search({ query: '"artificial intelligence"', congress: 119 });
    expect(bills.length).toBeGreaterThanOrEqual(5);
    expect(res.meta?.searchMode).toBe("fulltext");
    for (const b of bills) {
      expect(b.congress).toBe(119);
      expect(typeof b.number).toBe("number");
      expect(b.title).toBeTruthy();
    }
    // Hydrated from Congress.gov
    expect(bills.filter(b => b.latestAction).length).toBeGreaterThan(bills.length / 2);
  });

  it("finds an older bill far outside the most-recently-updated window (CHIPS and Science Act, H.R. 4346)", async () => {
    const { bills } = await search({ query: "CHIPS AND semiconductors", congress: 117 });
    expect(bills.some(b => b.type === "HR" && b.number === 4346)).toBe(true);
  });

  it("matches bill text, not just titles", async () => {
    const { bills } = await search({ query: '"semiconductor manufacturing"', congress: 117 });
    expect(bills.length).toBeGreaterThan(0);
    expect(bills.some(b => !/semiconductor/i.test(b.title))).toBe(true);
  });

  it("returns distinct bills, honors bill_type, and pages with offset", async () => {
    const page1 = await search({ query: "broadband", congress: 118, bill_type: "s", limit: 10 });
    const keys = page1.bills.map(b => `${b.type}${b.number}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const b of page1.bills) expect(b.type).toBe("S");

    const page2 = await search({ query: "broadband", congress: 118, bill_type: "s", limit: 5, offset: 5 });
    expect(page2.bills.map(b => `${b.type}${b.number}`)).toEqual(keys.slice(5, 10));
  });

  it("narrows with boolean syntax", async () => {
    const broad = await search({ query: "broadband", congress: 118 });
    const narrow = await search({ query: "broadband AND rural", congress: 118 });
    expect(narrow.res.meta?.textHits).toBeLessThan(broad.res.meta?.textHits);
  });

  it("still lists recent bills when no query is given", async () => {
    const { res, bills } = await search({ congress: 119, limit: 5 });
    expect(bills.length).toBe(5);
    expect(res.meta?.searchMode).toBeUndefined();
  });
});
