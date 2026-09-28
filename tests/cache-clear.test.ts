/**
 * Regression: clearing one module's cache must not wipe other modules' entries.
 *
 * With the old single-file store, DiskCache.clear() could flush an unloaded,
 * empty store over the cache file and lose every module's cached responses.
 * Each namespace now has its own directory, and clearing removes only that one.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DiskCache.clear()", () => {
  it("keeps other namespaces when clearing one", async () => {
    const fetchFn = vi.fn(async (url: string) => new Response(JSON.stringify({ url }), { status: 200 }));
    vi.stubGlobal("fetch", fetchFn);
    const { createClient } = await import("../src/shared/client.js");
    const alpha = createClient({ baseUrl: "https://a.test", name: "clear-alpha" });
    const beta = createClient({ baseUrl: "https://b.test", name: "clear-beta" });
    alpha.clearCache();
    beta.clearCache();

    await alpha.get("/x");
    await beta.get("/y");
    expect(fetchFn).toHaveBeenCalledTimes(2);

    alpha.clearCache();
    await alpha.get("/x"); // refetched
    await beta.get("/y"); // still cached
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(String(fetchFn.mock.calls[2][0])).toBe("https://a.test/x");
  });

  it("clears before any read without touching other namespaces on disk", async () => {
    const { mkdirSync, writeFileSync, readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { diskCachePath, createClient } = await import("../src/shared/client.js");
    const root = diskCachePath()!;
    mkdirSync(join(root, "clear-gamma"), { recursive: true });
    writeFileSync(join(root, "clear-gamma", "0".repeat(64) + ".json"), "{}");

    createClient({ baseUrl: "https://d.test", name: "clear-delta" }).clearCache();
    expect(readdirSync(join(root, "clear-gamma"))).toHaveLength(1);
  });
});
