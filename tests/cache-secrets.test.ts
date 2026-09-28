/**
 * Disk cache must never persist credentials, must be private to the user,
 * and must clean up legacy files that may contain credentials.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const SECRET = "sk-test-SUPERSECRET-9f8e7d";
const IS_POSIX = process.platform !== "win32";

/** Fresh client module bound to a fresh cache home (CACHE_DIR is resolved at import). */
async function freshClientModule(cacheHome: string) {
  vi.stubEnv("XDG_CACHE_HOME", cacheHome);
  vi.resetModules();
  return import("../src/shared/client.js");
}

function stubFetch(body: unknown = { ok: true }) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

let cacheHome: string;

beforeEach(() => {
  cacheHome = mkdtempSync(join(tmpdir(), "govdata-secrets-"));
  vi.stubEnv("TEST_SECRET_KEY", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("cache keys exclude credentials", () => {
  it("query auth: key sent upstream but never written to the cache file", async () => {
    const { createClient, flushDiskCache, diskCachePath } = await freshClientModule(cacheHome);
    const fetchFn = stubFetch();
    const api = createClient({
      baseUrl: "https://api.example.test",
      name: "secret-query",
      auth: { type: "query", envParams: { api_key: "TEST_SECRET_KEY" }, extraParams: { file_type: "json" } },
    });

    await api.get("/series", { id: "GDP" });
    await api.get("/series", { id: "GDP" });

    expect(fetchFn).toHaveBeenCalledTimes(1); // second call served from cache
    expect(String(fetchFn.mock.calls[0][0])).toContain(`api_key=${SECRET}`);

    await flushDiskCache();
    const file = diskCachePath()!;
    const contents = readFileSync(file, "utf-8");
    expect(contents).toContain("id=GDP");
    expect(contents).toContain("file_type=json");
    expect(contents).not.toContain(SECRET);
  });

  it("body auth: credentials stripped from the cached identity, extra params kept", async () => {
    const { createClient, flushDiskCache, diskCachePath } = await freshClientModule(cacheHome);
    const fetchFn = stubFetch({ status: "REQUEST_SUCCEEDED" });
    const api = createClient({
      baseUrl: "https://api.example.test",
      name: "secret-body",
      auth: { type: "body", envParams: { registrationkey: "TEST_SECRET_KEY" }, extraParams: { calculations: "true" } },
    });

    await api.post("/timeseries/data/", { seriesid: ["CUUR0000SA0"] });
    await api.post("/timeseries/data/", { seriesid: ["CUUR0000SA0"] });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const sentBody = JSON.parse(String((fetchFn.mock.calls[0][1] as RequestInit).body));
    expect(sentBody).toMatchObject({ registrationkey: SECRET, calculations: "true" });

    await flushDiskCache();
    const contents = readFileSync(diskCachePath()!, "utf-8");
    expect(contents).toContain("CUUR0000SA0");
    expect(contents).toContain("calculations");
    expect(contents).not.toContain(SECRET);
  });
});

describe("legacy cache files", () => {
  it("deletes cache.json from earlier versions (keys may contain credentials)", async () => {
    const dir = join(cacheHome, "us-gov-open-data-mcp");
    mkdirSync(dir, { recursive: true });
    const legacy = join(dir, "cache.json");
    const legacyPerModule = join(dir, "fred.json");
    writeFileSync(legacy, JSON.stringify({ fred: { [`https://x.test/?api_key=${SECRET}|`]: { data: 1, expires: Date.now() + 1e6, lastAccess: 0 } } }));
    writeFileSync(legacyPerModule, "{}");

    const { createClient } = await freshClientModule(cacheHome);
    stubFetch();
    const api = createClient({ baseUrl: "https://x.test", name: "fred" });
    await api.get("/anything");

    expect(existsSync(legacy)).toBe(false);
    expect(existsSync(legacyPerModule)).toBe(false);
  });
});

describe.skipIf(!IS_POSIX)("private permissions (POSIX)", () => {
  it("creates the cache directory 0700 and the cache file 0600", async () => {
    const { createClient, flushDiskCache, diskCachePath } = await freshClientModule(cacheHome);
    stubFetch();
    const api = createClient({ baseUrl: "https://x.test", name: "perm" });
    await api.get("/a");
    await flushDiskCache();

    const file = diskCachePath()!;
    expect(statSync(join(cacheHome, "us-gov-open-data-mcp")).mode & 0o777).toBe(0o700);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });
});

describe("no private cache directory", () => {
  it("disables the disk cache instead of falling back to a shared location", async () => {
    // A regular file where the cache home should be makes mkdir fail.
    const blocker = join(cacheHome, "not-a-dir");
    writeFileSync(blocker, "x");
    const { createClient, diskCachePath } = await freshClientModule(blocker);
    const fetchFn = stubFetch();
    const api = createClient({ baseUrl: "https://x.test", name: "nodisk" });

    expect(diskCachePath()).toBeNull();
    await api.get("/a");
    await api.get("/a");
    // In-memory caching still works for the process lifetime.
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
