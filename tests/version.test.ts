/**
 * The version reported to MCP clients and in User-Agents comes from package.json.
 */

import { readFileSync } from "node:fs";
import { describe, it, expect, vi, afterEach } from "vitest";
import { PACKAGE_VERSION, USER_AGENT } from "../src/shared/version.js";

const pkgVersion = (JSON.parse(readFileSync("package.json", "utf-8")) as { version: string }).version;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
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

describe("package version", () => {
  it("matches package.json", () => {
    expect(PACKAGE_VERSION).toBe(pkgVersion);
    expect(USER_AGENT).toBe(`us-gov-open-data-mcp/${pkgVersion} (+https://github.com/lzinga/us-gov-open-data-mcp)`);
  });

  it("is used in the NWS default User-Agent, which NWS_USER_AGENT overrides", async () => {
    let agents = captureUserAgents();
    await (await import("../src/apis/nws/sdk.js")).getActiveAlerts({ area: "VA" }).catch(() => {});
    expect(agents[0]).toBe(USER_AGENT);

    vi.resetModules();
    vi.stubEnv("NWS_USER_AGENT", "(weather-dashboard.test, ops@weather-dashboard.test)");
    agents = captureUserAgents();
    await (await import("../src/apis/nws/sdk.js")).getActiveAlerts({ area: "MD" }).catch(() => {});
    expect(agents[0]).toBe("(weather-dashboard.test, ops@weather-dashboard.test)");
  });

  it("is used in the SEC User-Agent", async () => {
    vi.stubEnv("SEC_CONTACT_EMAIL", "analyst@agency.test");
    const agents = captureUserAgents();
    await (await import("../src/apis/sec/sdk.js")).getCompanyFacts("320193").catch(() => {});
    expect(agents[0]).toBe(`us-gov-open-data-mcp/${pkgVersion} (analyst@agency.test)`);
  });
});
