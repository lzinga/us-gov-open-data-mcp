/**
 * Unit tests for shared URL helpers.
 */

import { describe, it, expect } from "vitest";
import { isHostOrSubdomain } from "../src/shared/url.js";

describe("isHostOrSubdomain", () => {
  it("matches the exact host and subdomains", () => {
    expect(isHostOrSubdomain("https://senate.gov/x", "senate.gov")).toBe(true);
    expect(isHostOrSubdomain("https://www.senate.gov/legislative/LIS/roll_call_votes/vote1181/vote_118_1_00001.xml", "senate.gov")).toBe(true);
    expect(isHostOrSubdomain(new URL("https://WWW.Senate.GOV"), "senate.gov")).toBe(true);
  });

  it("rejects look-alike and embedded hosts", () => {
    expect(isHostOrSubdomain("https://evilsenate.gov", "senate.gov")).toBe(false);
    expect(isHostOrSubdomain("https://senate.gov.evil.com", "senate.gov")).toBe(false);
    expect(isHostOrSubdomain("https://evil.com/?u=senate.gov", "senate.gov")).toBe(false);
    expect(isHostOrSubdomain("https://clerk.house.gov/evd/rollcallvote/2023/roll001.xml", "senate.gov")).toBe(false);
  });

  it("returns false for missing or invalid URLs", () => {
    expect(isHostOrSubdomain(undefined, "senate.gov")).toBe(false);
    expect(isHostOrSubdomain("", "senate.gov")).toBe(false);
    expect(isHostOrSubdomain("not a url", "senate.gov")).toBe(false);
  });
});
