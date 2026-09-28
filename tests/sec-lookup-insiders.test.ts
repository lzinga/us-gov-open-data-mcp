/**
 * SEC: ticker/name → CIK lookup and insider (Form 3/4/5) filings, both from
 * EDGAR full-text search (no SEC_CONTACT_EMAIL needed).
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
beforeEach(async () => (await import("../src/apis/sec/sdk.js")).clearCache());

function stubEdgar(route: (url: URL) => unknown) {
  const urls: URL[] = [];
  vi.spyOn(console, "error").mockImplementation(() => {}); // missing-contact warning
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    const url = new URL(u);
    urls.push(url);
    return new Response(JSON.stringify(route(url)), { status: 200 });
  }));
  return urls;
}

const ENTITIES = { hits: { hits: [
  { _id: "1067983", _source: { entity: "BERKSHIRE HATHAWAY INC (BRK-B, BRK-A)", tickers: "BRK-B, BRK-A" } },
  { _id: "1188729", _source: { entity: "BERKSHIRE ALAN G", tickers: "" } },
] } };

describe("company lookup", () => {
  it("prefers an exact ticker match, then the first entity", async () => {
    const urls = stubEdgar(() => ENTITIES);
    const { resolveCik, lookupCompanies } = await import("../src/apis/sec/sdk.js");
    expect(await resolveCik("brk-a")).toBe("0001067983");
    expect(urls[0].searchParams.get("keysTyped")).toBe("brk-a");
    expect(await lookupCompanies("berkshire")).toEqual([
      { cik: "0001067983", name: "BERKSHIRE HATHAWAY INC", tickers: ["BRK-B", "BRK-A"] },
      { cik: "0001188729", name: "BERKSHIRE ALAN G", tickers: [] },
    ]);
  });

  it("passes CIKs through and reports unknown names", async () => {
    const urls = stubEdgar(() => ({ hits: { hits: [] } }));
    const { resolveCik } = await import("../src/apis/sec/sdk.js");
    expect(await resolveCik("320193")).toBe("0000320193");
    expect(urls).toEqual([]);
    await expect(resolveCik("Nonexistent Holdings")).rejects.toThrow(/No SEC registrant found for "Nonexistent Holdings"/);
  });

  it("sec_company_search accepts a ticker and needs a company or CIK", async () => {
    const urls = stubEdgar(url => (url.hostname === "efts.sec.gov" ? ENTITIES : { cik: "1067983", name: "BERKSHIRE HATHAWAY INC", tickers: ["BRK-B"], filings: { recent: {} } }));
    const { tools } = await import("../src/apis/sec/tools.js");
    const tool = tools.find(t => t.name === "sec_company_search")!;
    const out = JSON.parse(await tool.execute(tool.parameters.parse({ company: "BRK-B" }), {} as never) as string);
    expect(urls[1].pathname).toBe("/submissions/CIK0001067983.json");
    expect(out.summary).toContain("BERKSHIRE HATHAWAY INC");
    await expect(tool.execute(tool.parameters.parse({}), {} as never)).rejects.toThrow(/Give a company/);
  });
});

describe("sec_insider_filings", () => {
  it("lists Form 4 filings with the insider, dates and filing link", async () => {
    const urls = stubEdgar(url => {
      if (url.searchParams.has("keysTyped")) return { hits: { hits: [{ _id: "320193", _source: { entity: "Apple Inc. (AAPL)", tickers: "AAPL" } }] } };
      return { hits: { total: { value: 1349 }, hits: [
        { _id: "0001140361-26-037020:form4.xml", _source: { form: "4", file_date: "2026-09-17", period_ending: "2026-09-15", adsh: "0001140361-26-037020", ciks: ["0001780525", "0000320193"], display_names: ["Newstead Jennifer  (CIK 0001780525)", "Apple Inc.  (CIK 0000320193)"] } },
        { _id: "0001140361-26-037584:form4.xml", _source: { form: "4", file_date: "2026-09-24", period_ending: "2026-09-22", adsh: "0001140361-26-037584", ciks: ["0000320193", "0001214156"], display_names: ["Apple Inc.  (CIK 0000320193)", "COOK TIMOTHY D  (CIK 0001214156)"] } },
      ] } };
    });
    const { tools } = await import("../src/apis/sec/tools.js");
    const tool = tools.find(t => t.name === "sec_insider_filings")!;
    const out = JSON.parse(await tool.execute(tool.parameters.parse({ company: "AAPL", start_date: "2026-09-01" }), {} as never) as string);

    const search = urls.find(u => u.searchParams.has("ciks"))!;
    expect(Object.fromEntries(search.searchParams)).toMatchObject({ forms: "4", ciks: "0000320193", startdt: "2026-09-01" });
    const rows = out.data.rows.map((r: unknown[]) => Object.fromEntries(out.data.columns.map((c: string, i: number) => [c, r[i]])));
    expect(rows[0]).toEqual({
      form: "4", filedDate: "2026-09-24", transactionDate: "2026-09-22",
      insider: "COOK TIMOTHY D", insiderCik: "0001214156", accessionNumber: "0001140361-26-037584",
      url: "https://www.sec.gov/Archives/edgar/data/320193/000114036126037584/0001140361-26-037584-index.htm",
    });
    expect(rows[1].insider).toBe("Newstead Jennifer");
    expect(out.summary).toBe("1349 Form 4 filing(s) for AAPL (CIK 0000320193), showing 2 from 2 insider(s); latest 2026-09-24");
  });
});
