/**
 * GovInfo search: collection / congress / bill-type filters must be expressed
 * as field terms inside the query string. Sent as body fields they were
 * silently ignored (collection=BILLS returned presidential documents).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { buildSearchQuery, searchPublications } from "../src/apis/govinfo/sdk.js";

afterEach(() => vi.unstubAllGlobals());

describe("buildSearchQuery", () => {
  it("returns the plain query when there are no filters", () => {
    expect(buildSearchQuery({ query: "infrastructure" })).toBe("infrastructure");
  });

  it("adds field terms and parenthesizes the user query", () => {
    expect(buildSearchQuery({ query: "tax OR tariff", collection: "bills", congress: 119, billType: "HR" }))
      .toBe("collection:BILLS AND congress:119 AND billtype:hr AND (tax OR tariff)");
  });
});

describe("searchPublications", () => {
  it("sends filters inside the query, not as ignored body fields", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ count: 1, results: [{ packageId: "BILLS-119hr1ih", title: "t", collectionCode: "BILLS", dateIssued: "2025-01-01" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchFn);

    const res = await searchPublications({ query: '"artificial intelligence"', collection: "BILLS", congress: 119, pageSize: 5 });

    const body = JSON.parse(String((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.query).toBe('collection:BILLS AND congress:119 AND ("artificial intelligence")');
    expect(body).not.toHaveProperty("collection");
    expect(body).not.toHaveProperty("congress");
    expect(body.pageSize).toBe(5);
    expect(res.results[0].packageId).toBe("BILLS-119hr1ih");
  });
});
