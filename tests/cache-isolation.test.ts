/**
 * Guard: the suite must never touch the developer's real disk cache.
 * If tests/setup/isolate-cache.ts is removed from vitest.config.ts this fails.
 */

import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it, expect } from "vitest";

describe("test cache isolation", () => {
  it("points XDG_CACHE_HOME at a temporary directory", () => {
    const cacheHome = process.env.XDG_CACHE_HOME;
    expect(cacheHome, "XDG_CACHE_HOME must be set by the vitest setup file").toBeTruthy();
    expect(resolve(cacheHome!).startsWith(resolve(tmpdir()))).toBe(true);
    expect(cacheHome).toContain("govdata-test-cache-");
    expect(resolve(cacheHome!)).not.toBe(resolve(join(homedir(), ".cache")));
  });
});
