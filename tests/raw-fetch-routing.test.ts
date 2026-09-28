/**
 * Congress clerk/LIS vote XML and GovInfo document text go through the shared
 * client (cache, retries, rate limit, timeouts) instead of bare fetch(), and
 * the GovInfo API key is only sent to https://api.govinfo.gov.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const SECRET = "govinfo-test-key-7c1e";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  (await import("../src/apis/congress/sdk.js")).clearCache();
  (await import("../src/apis/govinfo/sdk.js")).clearCache();
});

type Route = (url: URL) => Response | undefined;

function stubFetch(route: Route) {
  const calls: { url: URL; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string, init?: RequestInit) => {
    const url = new URL(u);
    calls.push({ url, init });
    return route(url) ?? new Response("not found", { status: 404 });
  }));
  return calls;
}

const HOUSE_ROLL = `<?xml version="1.0" encoding="UTF-8"?>
<rollcall-vote>
  <vote-metadata>
    <rollcall-num>5</rollcall-num><action-date>12-Jan-2010</action-date>
    <vote-question>On Passage</vote-question><vote-result>Passed</vote-result>
    <legis-num>H R 1</legis-num><vote-type>YEA-AND-NAY</vote-type><vote-desc>Test Act</vote-desc>
  </vote-metadata>
  <vote-data>
    <recorded-vote><legislator name-id="A000001" sort-field="Adams" party="D" state="NC">Adams</legislator><vote>Yea</vote></recorded-vote>
    <recorded-vote><legislator name-id="B000002" sort-field="Baker" party="R" state="TX">Baker</legislator><vote>Nay</vote></recorded-vote>
  </vote-data>
</rollcall-vote>`;

const SENATE_MENU = `<?xml version="1.0" encoding="UTF-8"?>
<vote_summary><votes>
  <vote><vote_number>00042</vote_number><vote_date>10-Sep</vote_date><issue>S. 1</issue>
    <question>On the Bill</question><result>Passed</result><title>Test</title>
    <vote_tally><yeas>60</yeas><nays>40</nays></vote_tally></vote>
</votes></vote_summary>`;

describe("congress vote XML via the shared client", () => {
  it("fetches a House clerk roll call with a timeout and User-Agent, and caches it", async () => {
    const calls = stubFetch(url => {
      if (url.hostname === "api.congress.gov") return new Response("{}", { status: 200 });
      if (url.href === "https://clerk.house.gov/evs/2010/roll005.xml") return new Response(HOUSE_ROLL, { status: 200 });
      return undefined;
    });
    const { getHouseVotes } = await import("../src/apis/congress/sdk.js");

    const res = await getHouseVotes({ year: 2010, vote_number: 5 });
    expect(res.source).toBe("clerk.house.gov");
    expect(res.vote).toMatchObject({ rollCallNumber: 5, result: "Passed" });
    expect(res.partyTally).toEqual({ D: { Yea: 1 }, R: { Nay: 1 } });

    const clerk = calls.filter(c => c.url.hostname === "clerk.house.gov");
    expect(clerk).toHaveLength(1);
    expect((clerk[0].init?.headers as Record<string, string>)["User-Agent"]).toMatch(/^us-gov-open-data-mcp\//);
    expect(clerk[0].init?.signal).toBeInstanceOf(AbortSignal);

    await getHouseVotes({ year: 2010, vote_number: 5 });
    expect(calls.filter(c => c.url.hostname === "clerk.house.gov")).toHaveLength(1); // cached
  });

  it("retries a transient Senate LIS failure", async () => {
    let attempts = 0;
    const calls = stubFetch(url => {
      if (url.pathname === "/legislative/LIS/roll_call_lists/vote_menu_118_2.xml") {
        attempts++;
        return attempts === 1 ? new Response("busy", { status: 503 }) : new Response(SENATE_MENU, { status: 200 });
      }
      return undefined;
    });
    const { getSenateVotes } = await import("../src/apis/congress/sdk.js");
    const res = await getSenateVotes({ congress: 118, session: 2 });
    expect(attempts).toBe(2);
    expect(calls[0].url.hostname).toBe("www.senate.gov");
    expect(res.votes).toEqual([expect.objectContaining({ voteNumber: 42, result: "Passed", count: expect.objectContaining({ yeas: 60, nays: 40 }) })]);
  }, 15_000);
});

describe("govinfo document text", () => {
  const summary = (txtLink: string) => ({
    title: "CHIPS Act", dateIssued: "2022-08-09", pages: 1,
    download: { txtLink },
  });

  function stubGovinfo(txtLink: string) {
    return stubFetch(url => {
      if (url.hostname === "api.govinfo.gov" && url.pathname.endsWith("/summary")) {
        return new Response(JSON.stringify(summary(txtLink)), { status: 200 });
      }
      if (url.hostname === "api.govinfo.gov" && url.pathname.endsWith("/htm")) {
        return new Response("<html><body><pre>SECTION 1. SHORT TITLE &amp; PURPOSE</pre></body></html>", { status: 200 });
      }
      if (url.hostname === "api.govinfo.gov" && url.pathname.endsWith("/granules")) {
        return new Response(JSON.stringify({ granules: [] }), { status: 200 });
      }
      if (url.hostname === "www.govinfo.gov") return new Response("<pre>public content</pre>", { status: 200 });
      return new Response("stolen", { status: 200 });
    });
  }

  it("fetches the text link through the API client with the key, and caches it", async () => {
    vi.stubEnv("DATA_GOV_API_KEY", SECRET);
    const calls = stubGovinfo("https://api.govinfo.gov/packages/BILLS-117hr4346enr/htm");
    const { getBillText } = await import("../src/apis/govinfo/sdk.js");

    const bill = await getBillText({ congress: 117, billType: "hr", billNumber: 4346 });
    expect(bill.text).toBe("SECTION 1. SHORT TITLE & PURPOSE");
    const textCall = calls.find(c => c.url.pathname.endsWith("/htm"))!;
    expect(textCall.url.searchParams.get("api_key")).toBe(SECRET);
    expect(textCall.init?.signal).toBeInstanceOf(AbortSignal);

    await getBillText({ congress: 117, billType: "hr", billNumber: 4346 });
    expect(calls.filter(c => c.url.pathname.endsWith("/htm"))).toHaveLength(1);
  });

  it("fetches www.govinfo.gov links without the key", async () => {
    vi.stubEnv("DATA_GOV_API_KEY", SECRET);
    const calls = stubGovinfo("https://www.govinfo.gov/content/pkg/BILLS-117hr4346enr/html/BILLS-117hr4346enr.htm");
    const { getBillText } = await import("../src/apis/govinfo/sdk.js");
    const bill = await getBillText({ congress: 117, billType: "hr", billNumber: 4346 });
    expect(bill.text).toBe("public content");
    const contentCall = calls.find(c => c.url.hostname === "www.govinfo.gov")!;
    expect(contentCall.url.href).not.toContain(SECRET);
  });

  it.each([
    ["another host", "https://evil.example/packages/x/htm"],
    ["plain http", "http://api.govinfo.gov/packages/BILLS-117hr4346enr/htm"],
    ["a look-alike host", "https://api.govinfo.gov.evil.example/htm"],
  ])("refuses a text link on %s and never sends the key there", async (_label, link) => {
    vi.stubEnv("DATA_GOV_API_KEY", SECRET);
    const calls = stubGovinfo(link);
    const { getBillText } = await import("../src/apis/govinfo/sdk.js");
    await expect(getBillText({ congress: 117, billType: "hr", billNumber: 4346 })).rejects.toThrow(/not a GovInfo HTTPS link/);
    const offHost = calls.filter(c => c.url.hostname !== "api.govinfo.gov" || c.url.protocol !== "https:");
    expect(offHost).toEqual([]);
    for (const c of calls) {
      if (c.url.searchParams.get("api_key")) expect(c.url.origin).toBe("https://api.govinfo.gov");
    }
  });
});
