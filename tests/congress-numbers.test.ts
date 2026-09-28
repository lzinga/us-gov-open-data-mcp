/**
 * Congress numbers and labels are derived from the date, so descriptions don't
 * go stale when a new Congress convenes (the 120th on Jan 3, 2027).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { currentCongress, ordinal, congressYears, recentCongressesLabel } from "../src/apis/congress/sdk.js";

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

describe("congress numbering helpers", () => {
  it("maps dates to Congress numbers", () => {
    expect(currentCongress(new Date("2025-06-01"))).toBe(119);
    expect(currentCongress(new Date("2026-12-31"))).toBe(119);
    expect(currentCongress(new Date("2027-03-01"))).toBe(120);
    expect(currentCongress(new Date("2029-01-15"))).toBe(121);
  });

  it("formats ordinals and year spans", () => {
    expect([119, 120, 121, 122, 123, 111, 112, 113].map(ordinal))
      .toEqual(["119th", "120th", "121st", "122nd", "123rd", "111th", "112th", "113th"]);
    expect(congressYears(119)).toBe("2025-2026");
    expect(congressYears(120)).toBe("2027-2028");
  });

  it("labels the most recent congresses", () => {
    expect(recentCongressesLabel(3, new Date("2027-03-01"))).toBe("120th (2027-2028), 119th (2025-2026), 118th (2023-2024)");
  });
});

describe("module text in 2027", () => {
  it("mentions the 120th Congress in tips, tool descriptions and reference data", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-03-01T12:00:00Z"));
    vi.resetModules();

    const mod = (await import("../src/apis/congress/index.js")).default;
    expect(mod.tips).toContain("120th (2027-2028), 119th (2025-2026)");
    const search = mod.tools.find(t => t.name === "congress_search_bills")!;
    expect(search.description).toContain("120th (2027-2028)");
    expect((mod.reference as { congressNumbers: Record<number, string> }).congressNumbers[120]).toBe("2027-2028");
  });
});
