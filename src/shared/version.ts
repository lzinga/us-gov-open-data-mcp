/**
 * Package version and default User-Agent, read from package.json so the
 * MCP server info and upstream requests always report the released version.
 */

import { readFileSync } from "node:fs";

export const REPOSITORY_URL = "https://github.com/lzinga/us-gov-open-data-mcp";

function readPackageVersion(): string {
  try {
    // src/shared/ and dist/shared/ both sit two levels below the package root.
    const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf-8")) as { version?: unknown };
    if (typeof pkg.version === "string" && /^\d+\.\d+\.\d+/.test(pkg.version)) return pkg.version;
  } catch {
    // Unusual layout (e.g. a bundler that dropped package.json).
  }
  return "0.0.0";
}

/** The installed package version, e.g. "2026.9.14". */
export const PACKAGE_VERSION = readPackageVersion();

/** User-Agent for upstream APIs that ask callers to identify themselves. */
export const USER_AGENT = `us-gov-open-data-mcp/${PACKAGE_VERSION} (+${REPOSITORY_URL})`;
