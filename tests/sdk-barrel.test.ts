/**
 * SDK barrel completeness — every folder under src/apis/ must be re-exported
 * from src/apis/index.ts so consumers can do:
 *
 *   import * as sdk from "us-gov-open-data-mcp/sdk";
 *   sdk.epaAqs.getAirQuality(...)
 *
 * The kebab-case folder name maps to a camelCase namespace export
 * (e.g. "epa-aqs" → "epaAqs", "world-bank" → "worldBank").
 */

import { describe, it, expect } from "vitest";
import { moduleDirs } from "./helpers.js";
import * as sdkBarrel from "../src/apis/index.js";

/** Convert kebab-case folder name to the camelCase namespace export key. */
const toCamel = (s: string): string =>
  s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

describe("SDK barrel (src/apis/index.ts)", () => {
  it.each(moduleDirs)("re-exports %s", (dir) => {
    const key = toCamel(dir);
    const exports = sdkBarrel as Record<string, unknown>;
    expect(exports, `barrel is missing namespace export "${key}" for src/apis/${dir}/`)
      .toHaveProperty(key);
    expect(typeof exports[key], `barrel export "${key}" should be a namespace object`)
      .toBe("object");
  });
});
