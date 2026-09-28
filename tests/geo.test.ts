/**
 * Shared U.S. state lookups (USPS code, full name, or FIPS code).
 */

import { describe, it, expect } from "vitest";
import { findState, resolveState, US_STATES } from "../src/shared/geo.js";

describe("US_STATES", () => {
  it("covers 50 states, DC, and 5 territories with unique codes", () => {
    expect(US_STATES).toHaveLength(56);
    expect(new Set(US_STATES.map(s => s.usps)).size).toBe(56);
    expect(new Set(US_STATES.map(s => s.fips)).size).toBe(56);
    for (const s of US_STATES) {
      expect(s.usps).toMatch(/^[A-Z]{2}$/);
      expect(s.fips).toMatch(/^\d{2}$/);
    }
  });
});

describe("findState", () => {
  it("accepts USPS codes, names, and FIPS codes in any case", () => {
    for (const input of ["MD", "md", "Maryland", "  maryland ", "24", 24]) {
      expect(findState(input)?.fips, String(input)).toBe("24");
    }
    expect(findState("6")?.usps).toBe("CA");
    expect(findState("District of Columbia")?.usps).toBe("DC");
    expect(findState("Washington, DC")?.usps).toBe("DC");
    expect(findState("Puerto Rico")?.fips).toBe("72");
  });

  it("returns undefined for unknown or empty input", () => {
    expect(findState("ZZ")).toBeUndefined();
    expect(findState("03")).toBeUndefined(); // unused FIPS code
    expect(findState("Atlantis")).toBeUndefined();
    expect(findState("")).toBeUndefined();
    expect(findState(undefined)).toBeUndefined();
  });
});

describe("resolveState", () => {
  it("throws an actionable error for unknown states", () => {
    expect(resolveState("tx").fips).toBe("48");
    expect(() => resolveState("Texass", "state_cd")).toThrow(/Unknown state_cd "Texass".*two-letter code/);
  });
});
