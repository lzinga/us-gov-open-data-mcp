/**
 * congress_search_bills keyword mode: GovInfo full-text search → distinct
 * bills → Congress.gov details. (Previously the query only title-filtered the
 * ~250 most recently updated bills.)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { parseBillPackageId, searchBillsByKeyword } from "../src/apis/congress/sdk.js";

afterEach(() => vi.unstubAllGlobals());

describe("parseBillPackageId", () => {
  it("parses bill package IDs", () => {
    expect(parseBillPackageId("BILLS-119hr1234ih")).toEqual({ congress: 119, type: "hr", number: 1234, version: "ih" });
    expect(parseBillPackageId("BILLS-117s1260es")).toEqual({ congress: 117, type: "s", number: 1260, version: "es" });
    expect(parseBillPackageId("BILLS-118hjres7enr")).toEqual({ congress: 118, type: "hjres", number: 7, version: "enr" });
    expect(parseBillPackageId("PLAW-117publ167")).toBeNull();
  });
});

function govinfoHit(packageId: string, title: string) {
  return { packageId, title, collectionCode: "BILLS", dateIssued: "2025-01-01" };
}

/** Route GovInfo search and Congress.gov bill-detail calls to canned responses. */
function stubApis(hits: ReturnType<typeof govinfoHit>[], failDetailFor: string[] = []) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    if (u.hostname === "api.govinfo.gov") {
      return new Response(JSON.stringify({ count: hits.length * 3, results: hits }), { status: 200 });
    }
    const m = /\/bill\/(\d+)\/(\w+)\/(\d+)$/.exec(u.pathname);
    if (m) {
      const key = `${m[1]}-${m[2]}-${m[3]}`;
      if (failDetailFor.includes(key)) return new Response("boom", { status: 500 });
      return new Response(JSON.stringify({
        bill: {
          type: m[2].toUpperCase(),
          number: m[3],
          title: `Detail title ${key}`,
          introducedDate: "2025-02-01",
          sponsors: [{ fullName: "Rep. Doe, Jane [D-CA-1]", party: "D", state: "CA" }],
          latestAction: { text: "Referred to committee", actionDate: "2025-02-02" },
        },
      }), { status: 200 });
    }
    return new Response("unexpected " + url + " " + String(init?.method), { status: 404 });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("searchBillsByKeyword", () => {
  it("queries GovInfo BILLS with filters, de-duplicates versions, and hydrates details", async () => {
    const fetchFn = stubApis([
      govinfoHit("BILLS-119hr100ih", "Alpha Act"),
      govinfoHit("BILLS-119hr100rh", "Alpha Act"),
      govinfoHit("BILLS-119s20is", "Beta Act"),
      govinfoHit("PLAW-119publ1", "not a bill"),
      govinfoHit("BILLS-119hr100eh", "Alpha Act"),
    ]);

    const res = await searchBillsByKeyword({ query: "artificial intelligence", congress: 119, bill_type: "hr" });

    const searchCall = fetchFn.mock.calls.find(([u]) => String(u).includes("api.govinfo.gov"))!;
    const body = JSON.parse(String((searchCall as unknown as [string, RequestInit])[1].body));
    expect(body.query).toBe("collection:BILLS AND congress:119 AND billtype:hr AND (artificial intelligence)");

    expect(res.matchingBills).toBe(2);
    expect(res.textHits).toBe(15);
    expect(res.bills.map(b => `${b.type}${b.number}`)).toEqual(["HR100", "S20"]);
    expect(res.bills[0]).toMatchObject({
      congress: 119,
      title: "Detail title 119-hr-100",
      sponsor: { name: "Rep. Doe, Jane [D-CA-1]", party: "D", state: "CA" },
      latestAction: { text: "Referred to committee" },
      url: "https://www.congress.gov/bill/119th-congress/house-bill/100",
    });
    expect(res.detailFailures).toBe(0);
  });

  it("keeps GovInfo data and counts failures when Congress.gov details fail", async () => {
    stubApis([govinfoHit("BILLS-118s5is", "Gamma Act")], ["118-s-5"]);
    const res = await searchBillsByKeyword({ query: "gamma" });
    expect(res.bills[0]).toMatchObject({ type: "S", number: 5, title: "Gamma Act", congress: 118 });
    expect(res.detailFailures).toBe(1);
  });

  it("applies offset and caps results at 20 distinct bills", async () => {
    const hits = Array.from({ length: 30 }, (_, i) => govinfoHit(`BILLS-119hr${i + 1}ih`, `Bill ${i + 1}`));
    stubApis(hits);
    const first = await searchBillsByKeyword({ query: "x", limit: 250 });
    expect(first.bills).toHaveLength(20);
    const second = await searchBillsByKeyword({ query: "x", limit: 5, offset: 20 });
    expect(second.bills.map(b => b.number)).toEqual([21, 22, 23, 24, 25]);
  });
});
