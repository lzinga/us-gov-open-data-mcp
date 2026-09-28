/**
 * Live: census_place_profile for a city, a county and a ZIP code.
 */

import { describe, expect } from "vitest";
import { callTool, itWithKeys } from "./helpers.js";

describe("census_place_profile (live)", () => {
  itWithKeys(["CENSUS_API_KEY"])("profiles Los Angeles city", async () => {
    const res = await callTool("census", "census_place_profile", { state: "CA", place: "Los Angeles" });
    expect(res.record).toMatchObject({ name: "Los Angeles city, California", geography: "place", fips: "0644000" });
    expect(res.record.population).toBeGreaterThan(3_500_000);
    expect(res.record.medianHouseholdIncome).toBeGreaterThan(40_000);
    expect(res.record.povertyRatePct).toBeGreaterThan(5);
    expect(res.record.povertyRatePct).toBeLessThan(40);
  }, 60_000);

  itWithKeys(["CENSUS_API_KEY"])("profiles Travis County by name and 90210 by ZIP", async () => {
    const county = await callTool("census", "census_place_profile", { state: "Texas", county: "Travis" });
    expect(county.record).toMatchObject({ name: "Travis County, Texas", fips: "48453" });
    const zip = await callTool("census", "census_place_profile", { zcta: "90210" });
    expect(zip.record.name).toBe("ZCTA5 90210");
    expect(zip.record.bachelorsOrHigherPct).toBeGreaterThan(40);
  }, 60_000);
});
