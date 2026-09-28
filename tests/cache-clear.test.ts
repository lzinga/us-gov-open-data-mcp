/**
 * Regression: clearing one module's cache must not wipe other modules' entries on disk.
 *
 * DiskCache.clear() used to delete the namespace from the in-memory store and
 * schedule a flush without ever loading the store from disk. When clear_cache
 * ran before any other cache access (or in tests), the flush wrote an empty
 * store over the cache file and every module's cached responses were lost.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const cacheDir = join(process.env.XDG_CACHE_HOME!, "us-gov-open-data-mcp");
const cacheFile = join(cacheDir, "cache.v2.json");

describe("DiskCache.clear()", () => {
  it("keeps other namespaces when clearing one before any cache read", async () => {
    const future = Date.now() + 60 * 60 * 1000;
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cacheFile, JSON.stringify({
      alpha: { "https://a.test/x|": { data: { a: 1 }, expires: future, lastAccess: Date.now() } },
      beta: { "https://b.test/y|": { data: { b: 2 }, expires: future, lastAccess: Date.now() } },
    }));

    // Import after seeding so the module's lazy load sees the file.
    const { createClient, flushDiskCache } = await import("../src/shared/client.js");
    const alpha = createClient({ baseUrl: "https://a.test", name: "alpha" });
    alpha.clearCache();
    await flushDiskCache();

    expect(existsSync(cacheFile)).toBe(true);
    const onDisk = JSON.parse(readFileSync(cacheFile, "utf-8")) as Record<string, unknown>;
    expect(onDisk.alpha).toBeUndefined();
    expect(onDisk.beta).toBeDefined();
  });
});
