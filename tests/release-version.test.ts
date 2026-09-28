/**
 * Release version policy (scripts/release-version.mjs), used by the Prepare
 * Release workflow.
 */

import { describe, it, expect } from "vitest";
import { calver, compareVersions, nextVersion, parseNpmVersions, parseVersion } from "../scripts/release-version.mjs";

const existing = ["1.0.0", "1.0.1", "1.1.0", "2026.3.9", "2026.4.11", "v2026.6.10", "v2026.9.14"];

describe("calver", () => {
  it("formats the UTC date without zero padding", () => {
    expect(calver(new Date("2026-09-04T12:00:00Z"))).toBe("2026.9.4");
    expect(calver(new Date("2026-12-31T23:59:59Z"))).toBe("2026.12.31");
  });

  it("uses the UTC day, not the local one", () => {
    expect(calver(new Date("2026-10-01T00:30:00Z"))).toBe("2026.10.1");
    expect(calver(new Date("2026-09-30T23:30:00-05:00"))).toBe("2026.10.1");
  });
});

describe("compareVersions", () => {
  it("orders by numeric components, not strings", () => {
    expect(compareVersions("2026.10.1", "2026.9.30")).toBe(1);
    expect(compareVersions("2026.9.4", "2026.9.14")).toBe(-1);
    expect(compareVersions("v2026.9.14", "2026.9.14")).toBe(0);
  });

  it("sorts a same-day prerelease suffix before the release (why suffixes are not used)", () => {
    expect(compareVersions("2026.9.14-2", "2026.9.14")).toBe(-1);
    expect(compareVersions("1.0.0-alpha", "1.0.0-alpha.1")).toBe(-1);
    expect(compareVersions("1.0.0-alpha.2", "1.0.0-alpha.10")).toBe(-1);
    expect(compareVersions("1.0.0-1", "1.0.0-alpha")).toBe(-1);
  });

  it("ignores build metadata", () => {
    expect(compareVersions("1.2.3+build.5", "1.2.3")).toBe(0);
  });

  it("rejects non-SemVer input", () => {
    expect(parseVersion("2026.09.14")).toBeNull();
    expect(parseVersion("2026.9")).toBeNull();
    expect(() => compareVersions("latest", "1.0.0")).toThrow(/Cannot compare/);
  });
});

describe("nextVersion", () => {
  it("defaults to today's CalVer", () => {
    expect(nextVersion({ existing, now: new Date("2026-09-28T10:00:00Z") })).toBe("2026.9.28");
  });

  it("fails a second release on the same day instead of generating a prerelease suffix", () => {
    expect(() => nextVersion({ existing, now: new Date("2026-09-14T22:00:00Z") }))
      .toThrow(/2026\.9\.14 \(today's CalVer\) already exists.*explicit version greater than 2026\.9\.14/);
  });

  it("accepts an explicit version greater than everything published or tagged", () => {
    expect(nextVersion({ override: "2026.9.15", existing, now: new Date("2026-09-14T22:00:00Z") })).toBe("2026.9.15");
    expect(nextVersion({ override: " v2027.1.0 ", existing })).toBe("2027.1.0");
  });

  it("rejects prerelease, malformed, existing, and older overrides", () => {
    expect(() => nextVersion({ override: "2026.9.14-2", existing })).toThrow(/without a prerelease/);
    expect(() => nextVersion({ override: "2026.9", existing })).toThrow(/Invalid version/);
    expect(() => nextVersion({ override: "$(id)", existing })).toThrow(/Invalid version/);
    expect(() => nextVersion({ override: "2026.6.10", existing })).toThrow(/already exists/);
    expect(() => nextVersion({ override: "2026.5.1", existing })).toThrow(/greater than the latest existing version 2026\.9\.14/);
  });

  it("treats an empty override as unset", () => {
    expect(nextVersion({ override: "  ", existing, now: new Date("2026-10-02T00:00:00Z") })).toBe("2026.10.2");
  });

  it("works for a package that was never published", () => {
    expect(nextVersion({ existing: [], now: new Date("2026-09-28T00:00:00Z") })).toBe("2026.9.28");
  });
});

describe("parseNpmVersions", () => {
  it("handles the array and single-string forms of npm view --json", () => {
    expect(parseNpmVersions('[\n  "1.0.0",\n  "2026.4.11"\n]\n')).toEqual(["1.0.0", "2026.4.11"]);
    expect(parseNpmVersions('"1.0.0"')).toEqual(["1.0.0"]);
    expect(parseNpmVersions("")).toEqual([]);
  });
});
