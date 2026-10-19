/**
 * EPA ECHO request parameters. ECHO silently ignores parameter names it doesn't
 * recognize, so a wrong name returns unfiltered results instead of an error:
 * - the case service filters by state with p_state (p_st is ignored there, and
 *   every state's cases came back), and its get_qid step needs an explicit sort;
 * - the facility services filter major facilities with p_maj=Y (p_pc=MAJOR is
 *   ignored).
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  (await import("../src/apis/epa/sdk.js")).clearCache();
});

/** Stub fetch: the first ECHO call returns a QueryID, the second returns rows. */
function stubEcho() {
  const calls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    const url = new URL(u);
    calls.push(url);
    const body = url.pathname.includes("get_qid")
      ? { Results: { Cases: [], Facilities: [] } }
      : { Results: { QueryID: "123", QueryRows: "2" } };
    return new Response(JSON.stringify(body), { status: 200 });
  }));
  return calls;
}

describe("searchEnforcementCases", () => {
  it("filters by state with p_state, uppercases the law, and sorts newest first", async () => {
    const calls = stubEcho();
    const { searchEnforcementCases } = await import("../src/apis/epa/sdk.js");
    await searchEnforcementCases({ state: "fl", law: "cwa", responseset: 5 });

    const info = calls.find(c => c.pathname.endsWith("get_case_info"))!;
    expect(info.searchParams.get("p_state")).toBe("FL");
    expect(info.searchParams.has("p_st")).toBe(false);
    expect(info.searchParams.get("p_law")).toBe("CWA");

    const qid = calls.find(c => c.pathname.endsWith("get_qid"))!;
    expect(qid.searchParams.get("qid")).toBe("123");
    expect(qid.searchParams.get("newsort")).toBe("12"); // SettlementDate
    expect(qid.searchParams.get("descending")).toBe("Y");
  });
});

describe("searchFacilities", () => {
  it("filters major facilities with p_maj=Y", async () => {
    const calls = stubEcho();
    const { searchFacilities } = await import("../src/apis/epa/sdk.js");
    await searchFacilities({ state: "FL", mediaType: "water", majorOnly: true });

    const first = calls.find(c => c.pathname.endsWith("get_facilities"))!;
    expect(first.searchParams.get("p_st")).toBe("FL"); // facility services do use p_st
    expect(first.searchParams.get("p_maj")).toBe("Y");
    expect(first.searchParams.has("p_pc")).toBe(false);
  });

  it("sends no major filter when majorOnly is false", async () => {
    const calls = stubEcho();
    const { searchFacilities } = await import("../src/apis/epa/sdk.js");
    await searchFacilities({ state: "FL", mediaType: "air", majorOnly: false });

    const first = calls.find(c => c.pathname.endsWith("get_facilities"))!;
    expect(first.searchParams.has("p_maj")).toBe(false);
  });
});
