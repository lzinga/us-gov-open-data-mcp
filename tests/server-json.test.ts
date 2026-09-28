/**
 * server.json (the MCP Registry listing) agrees with package.json and lists
 * every environment variable the server reads.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { checkServerJson, syncServerJson } from "../scripts/server-json.mjs";
import { authEnvVars, type ApiModule } from "../src/shared/types.js";
import { getModule, moduleDirs } from "./helpers.js";

const server = JSON.parse(readFileSync("server.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const listed = server.packages[0].environmentVariables.map((v: { name: string }) => v.name) as string[];

describe("server.json", () => {
  it("matches package.json: mcpName, npm identifier and versions", () => {
    expect(checkServerJson(server, pkg)).toEqual([]);
  });

  it("keeps the description and title within the registry's 100 characters", () => {
    expect(server.description.length).toBeLessThanOrEqual(100);
    expect(server.title.length).toBeLessThanOrEqual(100);
  });

  it("lists every module's API key variables", () => {
    const needed = new Set(moduleDirs.flatMap(d => authEnvVars((getModule(d) as unknown as ApiModule).auth)));
    expect([...needed].filter(v => !listed.includes(v))).toEqual([]);
  });

  it("lists only variables the server reads, once each", () => {
    const source = ["src/server.ts", "src/server/response-budget.ts", "src/apis/sec/sdk.ts", "src/apis/nws/sdk.ts"]
      .map(f => readFileSync(f, "utf8")).join("\n");
    const keys = new Set(moduleDirs.flatMap(d => authEnvVars((getModule(d) as unknown as ApiModule).auth)));
    expect(listed.filter(v => !keys.has(v) && !source.includes(v))).toEqual([]);
    expect(new Set(listed).size).toBe(listed.length);
  });
});

describe("checkServerJson / syncServerJson", () => {
  const pkgAt = (version: string) => ({ name: "us-gov-open-data-mcp", version, mcpName: "io.github.x/y" });
  const listing = { name: "io.github.x/y", version: "1.0.0", packages: [{ registryType: "npm", identifier: "us-gov-open-data-mcp", version: "1.0.0" }, { registryType: "oci", identifier: "img", version: "7" }] };

  it("reports each mismatch", () => {
    expect(checkServerJson(listing, { ...pkgAt("2.0.0"), mcpName: "io.github.x/z" })).toEqual([
      'server.json name "io.github.x/y" differs from package.json mcpName "io.github.x/z"',
      "server.json version 1.0.0 differs from package.json version 2.0.0",
      "server.json npm package version 1.0.0 differs from package.json version 2.0.0",
    ]);
  });

  it("sets the server and npm package versions, leaving other packages alone", () => {
    const synced = syncServerJson(listing, pkgAt("2026.10.1"));
    expect(synced.version).toBe("2026.10.1");
    expect(synced.packages.map((p: { version: string }) => p.version)).toEqual(["2026.10.1", "7"]);
    expect(checkServerJson(synced, pkgAt("2026.10.1"))).toEqual([]);
    expect(listing.version).toBe("1.0.0"); // input untouched
  });
});
