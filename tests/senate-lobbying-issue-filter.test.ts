/**
 * senate-lobbying: issue-code filtering happens client-side (lda.gov silently
 * ignores unknown query parameters, so the old server-side param returned all
 * filings), with bounded scanning and explicit scan metadata.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

type Filing = { filing_uuid: string; lobbying_activities: { general_issue_code: string; general_issue_code_display: string }[] };

function filing(id: string, codes: string[]): Filing {
  return {
    filing_uuid: id,
    lobbying_activities: codes.map(c => ({ general_issue_code: c, general_issue_code_display: c })),
  };
}

/** Serve pages of filings; `pages[i]` is page i+1. */
function stubLda(pages: Filing[][], total = pages.flat().length) {
  const fn = vi.fn(async (url: string) => {
    const page = Number(new URL(url).searchParams.get("page") ?? "1");
    const results = pages[page - 1] ?? [];
    return new Response(JSON.stringify({
      count: total,
      next: page < pages.length ? `https://lda.gov/api/v1/filings/?page=${page + 1}` : null,
      previous: null,
      results,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

async function loadSdk(env: Record<string, string> = {}) {
  vi.stubEnv("LDA_API_KEY", env.LDA_API_KEY ?? "");
  vi.resetModules();
  return import("../src/apis/senate-lobbying/sdk.js");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("searchFilingsByIssue", () => {
  it("requires a registrant or client name", async () => {
    const sdk = await loadSdk();
    stubLda([[]]);
    await expect(sdk.searchFilingsByIssue({ issue_code: "TAX", filing_year: 2025 })).rejects.toThrow(/registrant_name or client_name/);
  });

  it("filters client-side and never sends an issue-code query parameter", async () => {
    const sdk = await loadSdk();
    const page1 = [filing("a", ["TAX"]), filing("b", ["HCR"]), filing("c", ["HCR", "TAX"]), ...Array.from({ length: 22 }, (_, i) => filing(`x${i}`, ["DEF"]))];
    const page2 = [filing("d", ["tax"]), filing("e", ["ENV"])];
    const fetchFn = stubLda([page1, page2]);

    const res = await sdk.searchFilingsByIssue({ issue_code: "TAX", client_name: "Pfizer", filing_year: 2025, limit: 20 });

    expect(res.filings.map(f => f.filing_uuid)).toEqual(["a", "c", "d"]);
    expect(res).toMatchObject({ scanned: 27, matched: 3, baseTotal: 27, truncated: false });
    for (const [url] of fetchFn.mock.calls) {
      const params = new URL(String(url)).searchParams;
      expect([...params.keys()].some(k => k.includes("issue"))).toBe(false);
      expect(params.get("page_size")).toBe("25");
      expect(params.get("client_name")).toBe("Pfizer");
    }
  });

  it("stops once enough matches are found and reports truncation", async () => {
    const sdk = await loadSdk();
    const page = Array.from({ length: 25 }, (_, i) => filing(`p${i}`, ["TAX"]));
    stubLda([page, page, page], 75);

    const res = await sdk.searchFilingsByIssue({ issue_code: "TAX", registrant_name: "Big Co", limit: 5 });
    expect(res.filings).toHaveLength(5);
    expect(res).toMatchObject({ scanned: 25, matched: 25, baseTotal: 75, truncated: true });
  });

  it("caps the scan at ISSUE_SCAN_MAX_FILINGS", async () => {
    const sdk = await loadSdk({ LDA_API_KEY: "test-key" }); // keyed rate limit keeps this test fast
    const page = Array.from({ length: 25 }, (_, i) => filing(`n${i}`, ["DEF"]));
    const fetchFn = stubLda(Array.from({ length: 20 }, () => page), 500);

    const res = await sdk.searchFilingsByIssue({ issue_code: "TAX", client_name: "Huge Client" });
    expect(res.scanned).toBe(sdk.ISSUE_SCAN_MAX_FILINGS);
    expect(res).toMatchObject({ matched: 0, truncated: true, baseTotal: 500 });
    expect(fetchFn).toHaveBeenCalledTimes(sdk.ISSUE_SCAN_MAX_FILINGS / sdk.LDA_MAX_PAGE_SIZE);
  }, 15_000);
});

describe("LDA API key", () => {
  it("sends Authorization: Token <key> when LDA_API_KEY is set", async () => {
    const sdk = await loadSdk({ LDA_API_KEY: "abc123" });
    const fetchFn = stubLda([[filing("a", ["TAX"])]]);
    await sdk.searchFilings({ client_name: "X" });
    const headers = new Headers((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].headers);
    expect(headers.get("Authorization")).toBe("Token abc123");
  });

  it("works anonymously without an Authorization header", async () => {
    const sdk = await loadSdk();
    const fetchFn = stubLda([[filing("a", ["TAX"])]]);
    await sdk.searchFilings({ client_name: "Y" });
    const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit | undefined])[1];
    expect(new Headers(init?.headers).get("Authorization")).toBeNull();
  });
});

describe("lobbying_search tool", () => {
  it("returns scan metadata and an unknown total when truncated", async () => {
    await loadSdk();
    const page = Array.from({ length: 25 }, (_, i) => filing(`p${i}`, i % 2 ? ["TAX"] : ["HCR"]));
    stubLda([page, page], 50);
    const { tools } = await import("../src/apis/senate-lobbying/tools.js");
    const tool = tools.find(t => t.name === "lobbying_search")!;

    const out = JSON.parse(await tool.execute({ client_name: "Pfizer", issue_code: "TAX", page_size: 5 } as any, {} as any) as string);
    expect(out.summary).toContain("issue TAX");
    expect(out.summary).toContain("scan stopped");
    expect(out.data.total).toBeNull();
    expect(out.meta.issueCodeFilter).toMatchObject({ code: "TAX", appliedClientSide: true, truncated: true, totalUnknown: true });
  });

  it("surfaces the narrowing-filter requirement as an error", async () => {
    await loadSdk();
    stubLda([[]]);
    const { tools } = await import("../src/apis/senate-lobbying/tools.js");
    const tool = tools.find(t => t.name === "lobbying_search")!;
    await expect(tool.execute({ issue_code: "TAX", filing_year: 2025, page_size: 20 } as any, {} as any)).rejects.toThrow(/registrant_name or client_name/);
  });
});
