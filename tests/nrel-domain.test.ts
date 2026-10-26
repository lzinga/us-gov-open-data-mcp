/**
 * NREL is now the National Laboratory of the Rockies. developer.nrel.gov stopped
 * resolving on 2026-05-29 (https://developer.nlr.gov/docs/nlr-domain-transition);
 * the same api.data.gov keys work on developer.nlr.gov.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  (await import("../src/apis/nrel/sdk.js")).clearCache();
});

function stubFetch(body: unknown) {
  const calls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    calls.push(new URL(u));
    return new Response(JSON.stringify(body), { status: 200 });
  }));
  return calls;
}

describe("NREL API host", () => {
  it("sends requests to developer.nlr.gov, not the retired developer.nrel.gov", async () => {
    vi.stubEnv("DATA_GOV_API_KEY", "test-key");
    const calls = stubFetch({ total_results: 0, fuel_stations: [] });
    const { searchAltFuelStations } = await import("../src/apis/nrel/sdk.js");
    await searchAltFuelStations({ state: "FL", limit: 1 } as any);

    expect(calls).toHaveLength(1);
    expect(calls[0].hostname).toBe("developer.nlr.gov");
    expect(calls[0].pathname).toMatch(/^\/api\/alt-fuel-stations\//);
  });
});
