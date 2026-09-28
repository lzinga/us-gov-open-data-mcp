/**
 * State inputs are normalized with src/shared/geo.ts: every state parameter
 * accepts a name, a USPS code or a FIPS code, and the API gets the form it
 * expects.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { stateAs } from "../src/shared/geo.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubFetch(body: unknown = []) {
  const urls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    urls.push(new URL(u));
    return new Response(JSON.stringify(body), { status: 200 });
  }));
  return urls;
}

const loaders: Record<string, () => Promise<[{ clearCache(): void }, { tools: any[] }]>> = {
  cdc: async () => [await import("../src/apis/cdc/sdk.js"), await import("../src/apis/cdc/tools.js")],
  eia: async () => [await import("../src/apis/eia/sdk.js"), await import("../src/apis/eia/tools.js")],
  hud: async () => [await import("../src/apis/hud/sdk.js"), await import("../src/apis/hud/tools.js")],
  fema: async () => [await import("../src/apis/fema/sdk.js"), await import("../src/apis/fema/tools.js")],
  "epa-aqs": async () => [await import("../src/apis/epa-aqs/sdk.js"), await import("../src/apis/epa-aqs/tools.js")],
  census: async () => [await import("../src/apis/census/sdk.js"), await import("../src/apis/census/tools.js")],
};

async function run(moduleDir: string, tool: string, args: Record<string, unknown>) {
  const [sdk, { tools }] = await loaders[moduleDir]();
  sdk.clearCache();
  const t = tools.find((x: { name: string }) => x.name === tool)!;
  const parsed = t.parameters.safeParse(args);
  expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  await t.execute(parsed.data, {}).catch(() => {});
}

const INPUTS = ["Texas", "tx", "48"];

describe("stateAs", () => {
  it("converts between forms and passes non-states through", () => {
    expect(stateAs("texas", "usps")).toBe("TX");
    expect(stateAs("TX", "name")).toBe("Texas");
    expect(stateAs("6", "fips")).toBe("06");
    expect(stateAs(" United States ", "name")).toBe("United States");
    expect(stateAs("US", "usps")).toBe("US");
  });
});

describe("state parameters accept names, codes and FIPS", () => {
  it.each(INPUTS)("CDC full-name datasets get the name (%s)", async input => {
    const urls = stubFetch();
    await run("cdc", "cdc_causes_of_death", { state: input });
    expect(urls[0].searchParams.get("$where")).toContain("state = 'Texas'");
  });

  it.each(INPUTS)("CDC code datasets get the USPS code (%s)", async input => {
    const urls = stubFetch();
    await run("cdc", "cdc_covid", { state: input });
    expect(urls[0].searchParams.get("$where")).toContain("state = 'TX'");
  });

  it("CDC keeps national rows (\"United States\")", async () => {
    const urls = stubFetch();
    await run("cdc", "cdc_causes_of_death", { state: "United States" });
    expect(urls[0].searchParams.get("$where")).toContain("state = 'United States'");
  });

  it.each(INPUTS)("EIA gets the USPS code (%s)", async input => {
    vi.stubEnv("EIA_API_KEY", "k");
    const urls = stubFetch({ response: { data: [] } });
    await run("eia", "eia_electricity", { state: input });
    expect(urls[0].searchParams.get("facets[stateid][]")).toBe("TX");
  });

  it.each(INPUTS)("HUD gets the USPS code in the path, even for full names (%s)", async input => {
    vi.stubEnv("HUD_USER_TOKEN", "k");
    const urls = stubFetch({ data: {} });
    await run("hud", "hud_fair_market_rents", { state: input });
    expect(urls[0].pathname).toMatch(/\/fmr\/statedata\/TX$/);
  });

  it.each(INPUTS)("FEMA gets the USPS code (%s)", async input => {
    const urls = stubFetch({ DisasterDeclarationsSummaries: [] });
    await run("fema", "fema_disaster_declarations", { state: input });
    expect(urls[0].searchParams.get("$filter")).toContain("state eq 'TX'");
  });

  it.each(INPUTS)("EPA AQS gets the FIPS code (%s)", async input => {
    vi.stubEnv("AQS_API_KEY", "k");
    vi.stubEnv("AQS_EMAIL", "e@agency.test");
    const urls = stubFetch({ Data: [] });
    await run("epa-aqs", "epa_air_quality", { state: input, param: "44201", bdate: "20240101", edate: "20241231" });
    expect(urls[0].searchParams.get("state")).toBe("48");
  });

  it.each(INPUTS)("Census gets the FIPS code (%s)", async input => {
    const urls = stubFetch([["NAME", "B01001_001E", "B19013_001E", "B01002_001E", "state"]]);
    await run("census", "census_population", { state: input });
    expect(urls[0].searchParams.get("for")).toBe("state:48");
  });
});
