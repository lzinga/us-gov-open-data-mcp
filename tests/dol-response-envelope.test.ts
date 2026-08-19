/**
 * Regression tests for two response-handling bugs that made every DOL tool
 * report "no results" even when the API returned rows.
 *
 * 1. DOL wraps rows in a {"data": [...]} envelope. The SDK typed the response
 *    as T[], so tools.ts saw a non-array and returned emptyResponse().
 * 2. DOL answers a filter that matches nothing with a bare 204 and a zero-byte
 *    body. res.json() on that threw "Unexpected end of JSON input", which
 *    reached the caller as a crash rather than an empty result.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createClient } from "../src/shared/client.js";

/** Stub global fetch with a single canned response. */
function stubFetch(body: string, status = 200) {
  const fn = vi.fn(async () =>
    new Response(body === "" ? null : body, {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("client: empty and 204 responses", () => {
  it("returns null for a 204 with no body instead of throwing", async () => {
    stubFetch("", 204);
    const client = createClient({ baseUrl: "https://example.test", name: "t204" });
    await expect(client.get("/a")).resolves.toBeNull();
  });

  it("returns null for a 200 with an empty body", async () => {
    stubFetch("", 200);
    const client = createClient({ baseUrl: "https://example.test", name: "tempty" });
    await expect(client.get("/b")).resolves.toBeNull();
  });

  it("still parses a normal JSON body", async () => {
    stubFetch('{"data":[{"id":1}]}');
    const client = createClient({ baseUrl: "https://example.test", name: "tjson" });
    await expect(client.get("/c")).resolves.toEqual({ data: [{ id: 1 }] });
  });

  it("surfaces a whitespace-only body as null rather than a parse error", async () => {
    stubFetch("   \n");
    const client = createClient({ baseUrl: "https://example.test", name: "tws" });
    await expect(client.get("/d")).resolves.toBeNull();
  });
});

describe("dol sdk: {data: [...]} envelope unwrapping", () => {
  it("unwraps the envelope so callers receive rows", async () => {
    stubFetch('{"data":[{"activity_nr":1,"estab_name":"ACME"},{"activity_nr":2}]}');
    const { getOshaInspections } = await import("../src/apis/dol/sdk.js");
    const rows = await getOshaInspections({ state: "LA", limit: 2 });
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(2);
    expect(rows[0].estab_name).toBe("ACME");
  });

  it("returns [] for a 204 rather than throwing", async () => {
    stubFetch("", 204);
    const { getWhdEnforcement } = await import("../src/apis/dol/sdk.js");
    await expect(getWhdEnforcement({ trade_nm: "nothing-matches-this" }))
      .resolves.toEqual([]);
  });

  it("tolerates a bare array, in case an endpoint returns one", async () => {
    stubFetch('[{"activity_nr":7}]');
    const { getOshaViolations } = await import("../src/apis/dol/sdk.js");
    const rows = await getOshaViolations({ viol_type: "W" });
    expect(rows).toHaveLength(1);
    expect(rows[0].activity_nr).toBe(7);
  });

  it("returns [] when the envelope carries no data key", async () => {
    stubFetch('{"meta":{"count":0}}');
    const { getOshaAccidents } = await import("../src/apis/dol/sdk.js");
    await expect(getOshaAccidents({ state: "LA" })).resolves.toEqual([]);
  });
});
