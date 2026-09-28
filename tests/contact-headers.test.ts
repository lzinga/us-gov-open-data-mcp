/**
 * SEC and NWS contact handling: placeholder values from .env.example count
 * as unset, SEC never sends a made-up contact, and a missing SEC contact is
 * reported once.
 */

import { readFileSync } from "node:fs";
import { describe, it, expect, vi, afterEach } from "vitest";
import { configuredEnv, isPlaceholder } from "../src/shared/env.js";

const version = (JSON.parse(readFileSync("package.json", "utf-8")) as { version: string }).version;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

function captureUserAgents() {
  const agents: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
    agents.push((init?.headers as Record<string, string> | undefined)?.["User-Agent"] ?? "");
    return new Response("{}", { status: 200 });
  }));
  return agents;
}

/** The .env.example placeholder for a variable. */
function examplePlaceholder(name: string): string {
  const line = readFileSync(".env.example", "utf-8").split(/\r?\n/).find(l => l.startsWith(`${name}=`));
  return line!.slice(name.length + 1);
}

describe("isPlaceholder / configuredEnv", () => {
  it("treats the .env.example values as placeholders", () => {
    expect(isPlaceholder(examplePlaceholder("SEC_CONTACT_EMAIL"))).toBe(true);
    expect(isPlaceholder(examplePlaceholder("NWS_USER_AGENT"))).toBe(true);
  });

  it.each([
    "", "   ", "your_email@example.com", "contact@example.com", "ops@sub.example.org", "(https://example.net)",
    "your-app-name (me@realdomain.io)", "YOUR_EMAIL",
  ])("placeholder: %j", v => expect(isPlaceholder(v)).toBe(true));

  it.each([
    "jane.doe@agency.gov", "me@myexample.com", "research-team@university.edu", "(weather-app.io, ops@weather-app.io)",
  ])("real value: %j", v => expect(isPlaceholder(v)).toBe(false));

  it("returns trimmed real values and undefined otherwise", () => {
    expect(configuredEnv("X", { X: "  jane@agency.gov " })).toBe("jane@agency.gov");
    expect(configuredEnv("X", { X: "your_email@example.com" })).toBeUndefined();
    expect(configuredEnv("X", {})).toBeUndefined();
  });
});

describe("SEC User-Agent", () => {
  it("sends only the tool name and version when no contact is configured, and warns once", async () => {
    vi.stubEnv("SEC_CONTACT_EMAIL", examplePlaceholder("SEC_CONTACT_EMAIL"));
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    const agents = captureUserAgents();
    const sec = await import("../src/apis/sec/sdk.js");
    sec.clearCache();

    await sec.getCompanyFacts("320193").catch(() => {});
    await sec.getCompanyByCik("789019").catch(() => {});

    expect(agents).toEqual([`us-gov-open-data-mcp/${version}`, `us-gov-open-data-mcp/${version}`]);
    for (const ua of agents) {
      expect(ua).not.toMatch(/example\.com|github/i); // SEC answers 403 to User-Agents that mention GitHub
    }
    const warnings = warn.mock.calls.filter(c => String(c[0]).includes("SEC_CONTACT_EMAIL"));
    expect(warnings).toHaveLength(1);
  });

  it("includes the configured contact and does not warn", async () => {
    vi.stubEnv("SEC_CONTACT_EMAIL", "jane.doe@agency.gov");
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    const agents = captureUserAgents();
    const sec = await import("../src/apis/sec/sdk.js");
    sec.clearCache();

    await sec.getCompanyFacts("320193").catch(() => {});
    expect(agents).toEqual([`us-gov-open-data-mcp/${version} (jane.doe@agency.gov)`]);
    expect(warn.mock.calls.filter(c => String(c[0]).includes("SEC_CONTACT_EMAIL"))).toEqual([]);
  });
});

describe("NWS User-Agent", () => {
  it("falls back to the default when NWS_USER_AGENT is the .env.example placeholder", async () => {
    vi.stubEnv("NWS_USER_AGENT", examplePlaceholder("NWS_USER_AGENT"));
    const agents = captureUserAgents();
    const nws = await import("../src/apis/nws/sdk.js");
    nws.clearCache();
    await nws.getActiveAlerts({ area: "VA" }).catch(() => {});
    expect(agents[0]).toBe(`us-gov-open-data-mcp/${version} (+https://github.com/lzinga/us-gov-open-data-mcp)`);
  });
});
