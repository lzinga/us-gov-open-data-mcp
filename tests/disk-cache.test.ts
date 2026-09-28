/**
 * Disk cache storage (src/shared/disk-cache.ts): one file per entry, atomic
 * replacement, size limits with an LRU sweep, persistence across processes.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it, expect, afterAll } from "vitest";
import { CacheStore, DiskCache, resolveCacheRoot } from "../src/shared/disk-cache.js";

const roots: string[] = [];
function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "govdata-diskcache-"));
  roots.push(dir);
  return dir;
}
afterAll(() => {
  // Windows can hold a just-deleted file briefly (e.g. antivirus), so clean up once at the end, best effort.
  for (const r of roots.splice(0)) {
    try { rmSync(r, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }); } catch { /* temp dir */ }
  }
});

const files = (dir: string) => (existsSync(dir) ? readdirSync(dir) : []);

describe("CacheStore", () => {
  it("stores one JSON file per entry with key, fetchedAt, expires and data", async () => {
    const root = tempRoot();
    const store = new CacheStore({ root });
    const before = Date.now();
    store.set("fred", "https://api/x|json", { rows: [1, 2] }, 60_000);

    const [name, ...rest] = files(join(root, "fred"));
    expect(rest).toEqual([]);
    expect(name).toMatch(/^[0-9a-f]{64}\.json$/);
    const onDisk = JSON.parse(readFileSync(join(root, "fred", name), "utf-8"));
    expect(onDisk).toMatchObject({ key: "https://api/x|json", data: { rows: [1, 2] } });
    expect(onDisk.fetchedAt).toBeGreaterThanOrEqual(before);
    expect(onDisk.expires).toBe(onDisk.fetchedAt + 60_000);

    const hit = await store.get("fred", "https://api/x|json");
    expect(hit).toEqual({ data: { rows: [1, 2] }, fetchedAt: onDisk.fetchedAt, expires: onDisk.expires });
    expect(await store.get("fred", "https://api/other|json")).toBeUndefined();
  });

  it("treats expired entries as misses and deletes them", async () => {
    const root = tempRoot();
    const store = new CacheStore({ root });
    store.set("ns", "k", 1, 60_000);
    const [name] = files(join(root, "ns"));
    const path = join(root, "ns", name);
    const entry = JSON.parse(readFileSync(path, "utf-8"));
    writeFileSync(path, JSON.stringify({ ...entry, expires: Date.now() - 1 }));

    expect(await store.get("ns", "k")).toBeUndefined();
    await new Promise(r => setTimeout(r, 50));
    expect(existsSync(path)).toBe(false);
  });

  it("treats a corrupt entry as a miss", async () => {
    const root = tempRoot();
    const store = new CacheStore({ root });
    store.set("ns", "k", { ok: true }, 60_000);
    const [name] = files(join(root, "ns"));
    writeFileSync(join(root, "ns", name), "{ truncated");
    expect(await store.get("ns", "k")).toBeUndefined();
  });

  it("replaces an entry atomically and leaves no temp files", async () => {
    const root = tempRoot();
    const store = new CacheStore({ root });
    for (let i = 0; i < 20; i++) store.set("ns", "same-key", { i }, 60_000);
    expect(files(join(root, "ns"))).toHaveLength(1);
    expect((await store.get("ns", "same-key"))?.data).toEqual({ i: 19 });
  });

  it("does not store entries over the per-entry limit", async () => {
    const root = tempRoot();
    const store = new CacheStore({ root, maxEntryBytes: 1024 });
    store.set("ns", "small", "x".repeat(100), 60_000);
    store.set("ns", "big", "x".repeat(5000), 60_000);
    expect(await store.get("ns", "small")).toBeDefined();
    expect(await store.get("ns", "big")).toBeUndefined();
  });

  it("does not store with a zero TTL", async () => {
    const root = tempRoot();
    const store = new CacheStore({ root });
    store.set("ns", "k", 1, 0);
    expect(files(join(root, "ns"))).toEqual([]);
  });

  it("clear() removes one namespace and keeps the others", async () => {
    const root = tempRoot();
    const store = new CacheStore({ root });
    store.set("a", "k", 1, 60_000);
    store.set("b", "k", 2, 60_000);
    new DiskCache(store, "a", 60_000).clear();
    expect(await store.get("a", "k")).toBeUndefined();
    expect((await store.get("b", "k"))?.data).toBe(2);
    store.set("a", "k", 3, 60_000); // namespace directory is recreated
    expect((await store.get("a", "k"))?.data).toBe(3);
  });

  it("clear() right after a hit still clears (background mtime refresh in flight)", async () => {
    const root = tempRoot();
    const store = new CacheStore({ root });
    for (let round = 0; round < 20; round++) {
      store.set("ns", "k", round, 60_000);
      expect((await store.get("ns", "k"))?.data).toBe(round);
      store.clear("ns");
      expect(await store.get("ns", "k")).toBeUndefined();
    }
  });

  it("evicts least recently used entries when over the byte budget", async () => {
    const root = tempRoot();
    const dir = join(root, "ns");
    // Each entry is ~1.06 KB, so eight fit in the 9,000-byte budget and a ninth does not.
    const store = new CacheStore({ root, maxTotalBytes: 9000 });
    const pad = "x".repeat(1000);
    for (let i = 0; i <= 7; i++) store.set("ns", `k${i}`, pad, 60_000);
    await store.idle(); // the first write measures the cache

    // Last use: k0 just now; k1..k7 progressively longer ago (k1 is the oldest).
    const pathOf = (k: string) => {
      const [name] = files(dir).filter(f => JSON.parse(readFileSync(join(dir, f), "utf-8")).key === k);
      return join(dir, name);
    };
    for (let i = 1; i <= 7; i++) {
      const t = new Date(Date.now() - (8 - i) * 60_000);
      utimesSync(pathOf(`k${i}`), t, t);
    }

    store.set("ns", "k8", pad, 60_000); // over budget: sweep down to 80% (7,200 bytes)
    await store.idle();

    const totalBytes = files(dir).reduce((s, f) => s + readFileSync(join(dir, f)).length, 0);
    expect(totalBytes).toBeLessThanOrEqual(7200);
    for (const k of ["k1", "k2", "k3"]) expect(await store.get("ns", k)).toBeUndefined();
    for (const k of ["k0", "k4", "k7", "k8"]) expect(await store.get("ns", k)).toBeDefined();
  });

  it("refreshes an entry's last-use time on every hit", async () => {
    const root = tempRoot();
    const store = new CacheStore({ root });
    store.set("ns", "k", 1, 60_000);
    const [name] = files(join(root, "ns"));
    const path = join(root, "ns", name);
    const old = new Date(Date.now() - 3_600_000);
    utimesSync(path, old, old);

    await store.get("ns", "k");
    await new Promise(r => setTimeout(r, 50)); // the refresh is fire-and-forget
    const { mtimeMs } = await import("node:fs").then(fs => fs.statSync(path));
    expect(Date.now() - mtimeMs).toBeLessThan(10_000);
  });

  it("removes stale entries and orphaned temp files when it first measures the cache", async () => {
    const root = tempRoot();
    mkdirSync(join(root, "ns"), { recursive: true });
    const stale = join(root, "ns", "a".repeat(64) + ".json");
    const orphan = join(root, "ns", "b".repeat(64) + ".json.123.abcd.tmp");
    const fresh = join(root, "ns", "c".repeat(64) + ".json");
    for (const f of [stale, orphan, fresh]) writeFileSync(f, "{}");
    utimesSync(stale, new Date(Date.now() - 40 * 86_400_000), new Date(Date.now() - 40 * 86_400_000));
    utimesSync(orphan, new Date(Date.now() - 3_600_000), new Date(Date.now() - 3_600_000));

    const store = new CacheStore({ root });
    store.set("other", "k", 1, 60_000);
    await store.idle();
    expect(existsSync(stale)).toBe(false);
    expect(existsSync(orphan)).toBe(false);
    expect(existsSync(fresh)).toBe(true);
  });

  it("persists across store instances (server restart)", async () => {
    const root = tempRoot();
    new CacheStore({ root }).set("ns", "k", { v: 1 }, 60_000);
    expect((await new CacheStore({ root }).get("ns", "k"))?.data).toEqual({ v: 1 });
  });

  it("keeps a bounded in-memory cache when there is no directory", async () => {
    const store = new CacheStore({ root: null });
    for (let i = 0; i < 250; i++) store.set("ns", `k${i}`, i, 60_000);
    expect(await store.get("ns", "k0")).toBeUndefined(); // evicted (cap 200)
    expect((await store.get("ns", "k249"))?.data).toBe(249);
    expect((await store.get("ns", "k50"))?.data).toBe(50);
  });
});

describe("resolveCacheRoot", () => {
  it("creates <home>/us-gov-open-data-mcp/v3 and deletes older cache files", () => {
    const home = tempRoot();
    const dir = join(home, "us-gov-open-data-mcp");
    mkdirSync(dir, { recursive: true });
    for (const f of ["cache.json", "cache.v2.json", "fred.json"]) writeFileSync(join(dir, f), "{}");

    const root = resolveCacheRoot({ XDG_CACHE_HOME: home });
    expect(root).toBe(join(dir, "v3"));
    expect(existsSync(root!)).toBe(true);
    expect(readdirSync(dir)).toEqual(["v3"]);
  });

  it("returns null when the directory can't be created", () => {
    const home = tempRoot();
    const blocker = join(home, "file");
    writeFileSync(blocker, "x");
    expect(resolveCacheRoot({ XDG_CACHE_HOME: blocker })).toBeNull();
  });
});

describe("multiple processes", () => {
  const dist = resolve("dist/shared/disk-cache.js");

  function run(script: string, env: Record<string, string>): Promise<string> {
    return new Promise((ok, fail) => {
      const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "", err = "";
      child.stdout.on("data", d => (out += d));
      child.stderr.on("data", d => (err += d));
      child.on("exit", code => (code === 0 ? ok(out) : fail(new Error(`exit ${code}: ${err}`))));
    });
  }

  const header = `const { CacheStore } = await import(${JSON.stringify(pathToFileURL(dist).href)});
    const store = new CacheStore({ root: process.env.ROOT });`;

  it.skipIf(!existsSync(dist))("two writers and a reader share one cache without torn or mixed entries", async () => {
    const root = tempRoot();
    const writer = `${header}
      for (let i = 0; i < 400; i++) {
        store.set("shared", "key-" + (i % 40), { writer: process.env.WRITER, slot: i % 40, pad: "x".repeat(4000) }, 60000);
        if (i % 25 === 0) await new Promise(r => setTimeout(r, 1));
      }
      await store.idle();`;
    const reader = `${header}
      let hits = 0, bad = 0;
      const until = Date.now() + 1500;
      while (Date.now() < until) {
        for (let k = 0; k < 40; k++) {
          const hit = await store.get("shared", "key-" + k);
          if (!hit) continue;
          hits++;
          if (hit.data.slot !== k || !["A", "B"].includes(hit.data.writer)) bad++;
        }
      }
      console.log(JSON.stringify({ hits, bad }));`;

    const [, , readerOut] = await Promise.all([
      run(writer, { ROOT: root, WRITER: "A" }),
      run(writer, { ROOT: root, WRITER: "B" }),
      run(reader, { ROOT: root }),
    ]);

    const { hits, bad } = JSON.parse(readerOut.trim());
    expect(bad).toBe(0);
    expect(hits).toBeGreaterThan(0);
    const names = files(join(root, "shared"));
    expect(names.filter(n => n.endsWith(".tmp"))).toEqual([]);
    expect(names).toHaveLength(40);
    const store = new CacheStore({ root });
    for (let k = 0; k < 40; k++) {
      const hit = await store.get("shared", `key-${k}`);
      expect(hit?.data).toMatchObject({ slot: k });
    }
  }, 30_000);

  it.skipIf(!existsSync(dist))("a new process reads what an earlier one wrote", async () => {
    const root = tempRoot();
    await run(`${header} store.set("ns", "k", { from: "first" }, 60000); await store.idle();`, { ROOT: root });
    const out = await run(`${header} console.log(JSON.stringify((await store.get("ns", "k"))?.data));`, { ROOT: root });
    expect(JSON.parse(out.trim())).toEqual({ from: "first" });
  }, 30_000);
});
