/**
 * Live: fema_nfip_claims returns NFIP claims for a named flood event.
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
});

describe("fema_query dataset versions (live)", () => {
  for (const dataset of ["nfip_policies", "hazard_mitigation", "HazardMitigationAssistanceProjects"]) {
    it(`reads ${dataset} at its current version`, async () => {
      const res = await callTool("fema", "fema_query", { dataset, top: 2 }) as { data?: { rows: unknown[] } };
      expect(res.data?.rows.length).toBe(2);
    }, 60_000);
  }
});
