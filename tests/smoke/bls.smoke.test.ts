/**
 * Live: BLS LAUS and OEWS series built from plain inputs.
 */

import { describe, it, expect } from "vitest";
import { callTool } from "./helpers.js";

const rowsOf = (res: { data?: { columns: string[]; rows: unknown[][] } }) =>
  (res.data?.rows ?? []).map(r => Object.fromEntries((res.data?.columns ?? []).map((c, i) => [c, r[i]])));

describe("BLS builders (live)", () => {
  it("laus_areas returns state and county unemployment rates", async () => {
    const res = await callTool("bls", "bls_series_data", { laus_areas: "Texas, 06037" });
    const rows = rowsOf(res as never);
    for (const id of ["LASST480000000000003", "LAUCN060370000000003"]) {
      const latest = rows.find(r => r.seriesId === id);
      expect(latest, id).toBeDefined();
      expect(Number(latest!.value)).toBeGreaterThan(0);
      expect(Number(latest!.value)).toBeLessThan(25); // a rate in percent
    }
  }, 60_000);

  it("oews_occupations returns a software developer wage", async () => {
    const res = await callTool("bls", "bls_series_data", { oews_occupations: "15-1252", oews_measure: "annual_mean_wage" });
    const [row] = rowsOf(res as never);
    expect(row.seriesId).toBe("OEUN000000000000015125204");
    expect(Number(row.value)).toBeGreaterThan(80_000);
  }, 60_000);
});
