/**
 * census_place_profile: geography resolution, indicator math, sentinels and top-coding.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { latestAcs5Year } from "../src/apis/census/sdk.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
beforeEach(async () => (await import("../src/apis/census/sdk.js")).clearCache());

const HEADERS = ["NAME", "B01003_001E", "B19013_001E", "B01002_001E", "B17001_001E", "B17001_002E", "B25077_001E", "B25064_001E",
  "B23025_003E", "B23025_005E", "B15003_001E", "B15003_022E", "B15003_023E", "B15003_024E", "B15003_025E"];

function stubCensus(profileRow: string[], lists: Record<string, string[][]> = {}) {
  const urls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    const url = new URL(u);
    urls.push(url);
    const get = url.searchParams.get("get");
    const forGeo = url.searchParams.get("for")!;
    if (get === "NAME") return new Response(JSON.stringify(lists[forGeo] ?? [["NAME", "state", forGeo.split(":")[0]]]), { status: 200 });
    return new Response(JSON.stringify([[...HEADERS, "state"], [...profileRow, "06"]]), { status: 200 });
  }));
  return urls;
}

async function profile(args: Record<string, unknown>) {
  vi.stubEnv("CENSUS_API_KEY", "k");
  const { tools } = await import("../src/apis/census/tools.js");
  const t = tools.find(x => x.name === "census_place_profile")!;
  return JSON.parse(await t.execute(t.parameters.parse(args), {} as never) as string);
}

const LA = ["Los Angeles city, California", "3857263", "81939", "37.2", "3780507", "625507", "921200", "1933", "2128918", "174992", "2753125", "684319", "244473", "85238", "44720"];

describe("latestAcs5Year", () => {
  it("is two years back until December, then one", () => {
    expect(latestAcs5Year(new Date("2026-09-28T00:00:00Z"))).toBe(2024);
    expect(latestAcs5Year(new Date("2026-12-15T00:00:00Z"))).toBe(2025);
  });
});

describe("census_place_profile", () => {
  it("resolves a place name within the state, preferring the incorporated city", async () => {
    const urls = stubCensus(LA, {
      "place:*": [["NAME", "state", "place"], ["East Los Angeles CDP, California", "06", "20802"], ["Los Angeles city, California", "06", "44000"]],
    });
    const out = await profile({ state: "California", place: "los angeles", year: 2024 });
    const data = urls.find(u => u.searchParams.get("get") !== "NAME")!;
    expect(data.pathname).toBe("/data/2024/acs/acs5");
    expect(data.searchParams.get("for")).toBe("place:44000");
    expect(data.searchParams.get("in")).toBe("state:06");
    expect(out.record).toMatchObject({
      name: "Los Angeles city, California", geography: "place", fips: "0644000", year: 2024,
      population: 3857263, medianHouseholdIncome: 81939, medianAge: 37.2,
      povertyRatePct: 16.5, unemploymentRatePct: 8.2, bachelorsOrHigherPct: 38.5,
    });
    expect(out.summary).toBe("Los Angeles city, California: population 3,857,263, median household income $81,939 (ACS 2024 5-year)");
  });

  it("takes county FIPS codes and ZIP codes directly", async () => {
    let urls = stubCensus(LA);
    await profile({ state: "CA", county: "06037", year: 2024 });
    expect(urls[0].searchParams.get("for")).toBe("county:037");
    urls = stubCensus(LA);
    await profile({ zcta: "90210", year: 2024 });
    expect(urls[0].searchParams.get("for")).toBe("zip code tabulation area:90210");
    expect(urls[0].searchParams.get("in")).toBeNull();
  });

  it("turns Census sentinels into null and notes top-coded medians", async () => {
    stubCensus(["ZCTA5 90210", "19004", "-666666666", "51.9", "18000", "1650", "2000001", "3501", "10000", "520", "15000", "5000", "3000", "1000", "500"]);
    const out = await profile({ zcta: "90210", year: 2024 });
    expect(out.record.medianHouseholdIncome).toBeUndefined(); // null, stripped from the record
    expect(out.record.notes).toEqual([
      "medianHomeValue is top-coded: $2,000,000 or more",
      "medianGrossRent is top-coded: $3,500 or more",
    ]);
  });

  it("suggests close names when a place isn't found, and needs a state", async () => {
    stubCensus(LA, { "place:*": [["NAME", "state", "place"], ["Springfield CDP, California", "06", "73514"]] });
    await expect(profile({ state: "CA", place: "Spring" })).rejects.toThrow(/No place named "Spring" in California\. Did you mean: Springfield CDP, California\?/);
    await expect(profile({ place: "Austin" })).rejects.toThrow(/Give a state/);
  });
});
