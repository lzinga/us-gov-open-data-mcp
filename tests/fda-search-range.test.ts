/**
 * openFDA search syntax uses "+" as a URL-encoded space, e.g.
 * `report_date:[20200101+TO+20231231]`. The shared client encodes "+" as %2B,
 * so a range left with "+TO+" reaches openFDA as a literal plus and fails with
 * `parse_exception: Encountered "]"`. normSearch must turn "+TO+" into " TO ",
 * as it already does for "+AND+", "+OR+" and "+NOT+".
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  (await import("../src/apis/fda/sdk.js")).clearCache();
});

function stubFda() {
  const calls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    calls.push(new URL(u));
    return new Response(JSON.stringify({ meta: { results: { total: 0 } }, results: [] }), { status: 200 });
  }));
  return calls;
}

describe("openFDA date-range search", () => {
  it("sends +TO+ ranges as spaces, not %2B", async () => {
    const calls = stubFda();
    const { searchDrugRecalls } = await import("../src/apis/fda/sdk.js");
    await searchDrugRecalls({ search: "report_date:[20200101+TO+20231231]", limit: 1 });

    expect(calls[0].searchParams.get("search")).toBe("report_date:[20200101 TO 20231231]");
    expect(calls[0].search).not.toContain("%2B");
  });

  it("handles a range combined with +AND+", async () => {
    const calls = stubFda();
    const { searchDrugRecalls } = await import("../src/apis/fda/sdk.js");
    await searchDrugRecalls({ search: 'classification:"Class I"+AND+report_date:[20200101+TO+20231231]' });

    expect(calls[0].searchParams.get("search")).toBe('classification:"Class I" AND report_date:[20200101 TO 20231231]');
  });
});
