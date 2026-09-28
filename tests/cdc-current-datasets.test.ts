/**
 * CDC tools that were stuck on old datasets now reach current NCHS data:
 * provisional drug overdose deaths (2015–present) and state life expectancy
 * (2018–2021).
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => vi.unstubAllGlobals());
beforeEach(async () => (await import("../src/apis/cdc/sdk.js")).clearCache());

function stubFetch(rows: unknown[]) {
  const urls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    urls.push(new URL(u));
    return new Response(JSON.stringify(rows), { status: 200 });
  }));
  return urls;
}

async function tool(name: string) {
  const { tools } = await import("../src/apis/cdc/tools.js");
  const t = tools.find(x => x.name === name)!;
  return async (args: Record<string, unknown>) => JSON.parse(await t.execute(t.parameters.parse(args), {} as never) as string);
}

describe("cdc_drug_overdose", () => {
  const row = (year: string, month: string, value: string) => ({ state: "TX", state_name: "Texas", year, month, indicator: "Number of Drug Overdose Deaths", data_value: value, predicted_value: value, percent_complete: "100" });

  it("defaults to the provisional counts, newest month first", async () => {
    const urls = stubFetch([row("2025", "January", "4000"), row("2026", "March", "3100"), row("2025", "December", "3300"), row("2026", "January", "3200")]);
    const out = await (await tool("cdc_drug_overdose"))({ state: "Texas" });
    expect(urls[0].pathname).toBe("/resource/xkb8-kh2a.json");
    const where = urls[0].searchParams.get("$where")!;
    expect(where).toContain("period = '12 month-ending'");
    expect(where).toContain("state = 'TX'");
    expect(where).toContain("indicator = 'Number of Drug Overdose Deaths'");
    const rows = out.data.rows.map((r: unknown[]) => Object.fromEntries(out.data.columns.map((c: string, i: number) => [c, r[i]])));
    expect(rows.map((r: { year: string; month: string }) => `${r.month} ${r.year}`)).toEqual(["March 2026", "January 2026", "December 2025", "January 2025"]);
    expect(out.summary).toContain("latest March 2026");
  });

  it("filters by drug and keeps the historical dataset available", async () => {
    const urls = stubFetch([]);
    await (await tool("cdc_drug_overdose"))({ state: "US", drug: "Heroin (T40.1)" });
    expect(urls[0].searchParams.get("$where")).toContain("state = 'US'");
    expect(urls[0].searchParams.get("$where")).toContain("indicator = 'Heroin (T40.1)'");

    const hist = stubFetch([]);
    await (await tool("cdc_drug_overdose"))({ source: "historical", state: "TX", year: 2010 });
    expect(hist[0].pathname).toBe("/resource/xbxb-epbu.json");
    expect(hist[0].searchParams.get("$where")).toContain("state = 'Texas'");
  });
});

describe("cdc_life_expectancy by state", () => {
  it("reads the right dataset and field names for the year", async () => {
    const urls = stubFetch([{ state: "Hawaii", sex: "Total", le: "80.7", se: "0.1" }]);
    const out = await (await tool("cdc_life_expectancy"))({ state: "HI", year: 2020, sex: "Both Sexes" });
    expect(urls[0].pathname).toBe("/resource/ss2j-8ajj.json");
    expect(urls[0].searchParams.get("$where")).toBe("state = 'Hawaii' AND sex = 'Total'");
    const cols = out.data.columns;
    expect(Object.fromEntries(cols.map((c: string, i: number) => [c, out.data.rows[0][i]]))).toMatchObject({ year: 2020, state: "Hawaii", lifeExpectancy: 80.7 });
  });

  it("defaults to the latest year, ranks all states for 'all', and rejects other years", async () => {
    const urls = stubFetch([{ area: "Mississippi", sex: "Total", leb: "70.9" }, { area: "Hawaii", sex: "Total", leb: "80.7" }]);
    const out = await (await tool("cdc_life_expectancy"))({ state: "all" });
    expect(urls[0].pathname).toBe("/resource/it4f-frdc.json");
    expect(urls[0].searchParams.get("$where")).toBeNull();
    expect(out.data.rows[0]).toContain("Hawaii");

    stubFetch([]);
    await expect((await tool("cdc_life_expectancy"))({ state: "TX", year: 2015 })).rejects.toThrow(/2018, 2019, 2020, 2021, not 2015/);
  });

  it("still serves national data without a state", async () => {
    const urls = stubFetch([{ year: "2018", race: "All Races", sex: "Both Sexes", average_life_expectancy_years: "78.7" }]);
    await (await tool("cdc_life_expectancy"))({ year: 2018 });
    expect(urls[0].pathname).toBe("/resource/w9j2-ggv5.json");
  });
});
