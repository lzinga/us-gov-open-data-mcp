/**
 * Live: fema_nfip_claims returns NFIP claims for a named flood event, and
 * fema_query reads each OpenFEMA dataset at its current version.
 */

import { describe, it, expect } from "vitest";
import { callTool } from "./helpers.js";

describe("FEMA NFIP claims (live)", () => {
  it("finds paid Hurricane Beryl claims in Texas", async () => {
    const res = await callTool("fema", "fema_nfip_claims", { state: "TX", flood_event: "Beryl", sort_by: "paid", limit: 5 }) as {
      data: { total: number; columns: string[]; rows: unknown[][] };
    };
    expect(res.data.total).toBeGreaterThan(1000);
    const cols = res.data.columns;
    const claims = res.data.rows.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
    expect(claims[0]).toMatchObject({ state: "TX", floodEvent: "Hurricane Beryl" });
    expect(claims[0].totalPaid as number).toBeGreaterThan(0);
  }, 60_000);

  it("finds a storm FEMA names in its newer style ('2025-08-Erin-HU') from 'hurricane erin'", async () => {
    const res = await callTool("fema", "fema_nfip_claims", { flood_event: "hurricane erin", year_from: 2025, limit: 5 }) as {
      data: { total: number }; meta: { floodEvents: string[] };
    };
    expect(res.data.total).toBeGreaterThan(50);
    expect(res.meta.floodEvents.some(e => /Erin/.test(e))).toBe(true);
  }, 60_000);

  it("matches a storm name as a whole word ('Hurricane Earl' is not 'Early summer storms')", async () => {
    const res = await callTool("fema", "fema_nfip_claims", { flood_event: "Hurricane Earl", sort_by: "date", limit: 50 }) as {
      meta: { floodEvents: string[] };
    };
    expect(res.meta.floodEvents.length).toBeGreaterThan(0);
    for (const event of res.meta.floodEvents) expect(event).toMatch(/\bEarl\b/);
  }, 60_000);

  it("finds a word FEMA runs into a longer name ('Kona' in '2026-03-KonaStorm')", async () => {
    const res = await callTool("fema", "fema_nfip_claims", { flood_event: "Kona", limit: 5 }) as {
      data: { total: number }; meta: { floodEventMatch: string; floodEvents: string[] };
    };
    expect(res.meta.floodEventMatch).toBe("within names");
    expect(res.data.total).toBeGreaterThan(100);
    expect(res.meta.floodEvents).toContain("2026-03-KonaStorm");
  }, 60_000);

  it("accepts a FEMA event name pasted back with its storm type ('Hurricane Georges (Keys)')", async () => {
    const res = await callTool("fema", "fema_nfip_claims", { flood_event: "Hurricane Georges (Keys)", limit: 5 }) as {
      data: { total: number }; meta: { floodEvents: string[] };
    };
    expect(res.data.total).toBeGreaterThan(1000);
    expect(res.meta.floodEvents).toEqual(["Hurricane Georges (Keys)"]);
  }, 60_000);
});

describe("fema_query dataset versions (live)", () => {
  // NfipCommunityStatusBook is only on v1, so rows prove the DataSets catalog lookup (the v2 fallback 404s).
  for (const dataset of ["nfip_policies", "hazard_mitigation", "NfipCommunityStatusBook"]) {
    it(`reads ${dataset} at its current version`, async () => {
      const res = await callTool("fema", "fema_query", { dataset, top: 2 }) as { data?: { rows: unknown[] } };
      expect(res.data?.rows.length).toBe(2);
    }, 60_000);
  }
});