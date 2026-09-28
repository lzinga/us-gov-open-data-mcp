/**
 * Composite calls report failed parts instead of returning empty data that
 * looks like "none" (Congress full profiles, GovInfo bill text).
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => vi.unstubAllGlobals());

// Each test stubs different upstream failures; don't let cached successes leak between tests.
beforeEach(async () => {
  (await import("../src/apis/congress/sdk.js")).clearCache();
  (await import("../src/apis/govinfo/sdk.js")).clearCache();
});

/** Congress.gov stub: every sub-resource answers except the listed path suffixes, which return HTTP 500. */
function stubCongress(failSuffixes: string[]) {
  const fn = vi.fn(async (url: string) => {
    const path = new URL(url).pathname;
    if (failSuffixes.some(s => path.endsWith(s))) return new Response("upstream error", { status: 500 });
    if (/\/bill\/\d+\/\w+\/\d+$/.test(path)) {
      return new Response(JSON.stringify({ bill: { type: "HR", number: "1", title: "Test Act", sponsors: [] } }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("congress full profiles", () => {
  it("lists failed sub-requests in partialFailures", async () => {
    stubCongress(["/actions", "/summaries"]);
    const { getBillFullProfile } = await import("../src/apis/congress/sdk.js");
    const profile = await getBillFullProfile(119, "hr", 1);
    expect(profile.partialFailures.map(f => f.part).sort()).toEqual(["actions", "summaries"]);
    expect(profile.partialFailures[0].error).toContain("HTTP 500");
    expect(profile.actions).toEqual([]);
  });

  it("marks the tool response INCOMPLETE with partialFailures meta", async () => {
    stubCongress(["/committees"]);
    const { tools } = await import("../src/apis/congress/tools.js");
    const tool = tools.find(t => t.name === "congress_bill_full_profile")!;
    const out = JSON.parse(await tool.execute({ congress: 119, bill_type: "hr", bill_number: 1 } as any, {} as any) as string);
    expect(out.summary).toContain("INCOMPLETE: committees failed to load");
    expect(out.meta.partialFailures).toEqual([expect.objectContaining({ part: "committees" })]);
  });

  it("has no failure note when everything loads", async () => {
    stubCongress([]);
    const { tools } = await import("../src/apis/congress/tools.js");
    const tool = tools.find(t => t.name === "congress_bill_full_profile")!;
    const out = JSON.parse(await tool.execute({ congress: 119, bill_type: "hr", bill_number: 1 } as any, {} as any) as string);
    expect(out.summary).not.toContain("INCOMPLETE");
    expect(out.meta).toBeUndefined();
  });
});

describe("govinfo bill text", () => {
  it("throws when the text exists but can't be fetched, instead of returning empty text", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      if (path.endsWith("/summary")) {
        return new Response(JSON.stringify({ title: "A bill", download: { txtLink: "https://api.govinfo.gov/packages/BILLS-119hr1ih/htm" } }), { status: 200 });
      }
      if (path.endsWith("/granules")) return new Response(JSON.stringify({ granules: [] }), { status: 200 });
      return new Response("nope", { status: 500 });
    }));
    const { getBillText } = await import("../src/apis/govinfo/sdk.js");
    await expect(getBillText({ congress: 119, billType: "hr", billNumber: 1, version: "ih" }))
      .rejects.toThrow(/could not load text for BILLS-119hr1ih \(HTTP 500/);
  });
});
