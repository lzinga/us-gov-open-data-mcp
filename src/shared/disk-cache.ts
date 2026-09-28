/**
 * Disk-backed TTL cache for API responses.
 *
 * Layout: `<cache home>/us-gov-open-data-mcp/v3/<namespace>/<sha256(key)>.json`,
 * one file per response, holding `{ key, fetchedAt, expires, data }`.
 *
 * - Writes go to a temp file and are renamed into place, so readers (in this
 *   or another process) see either the old entry or the new one, never a torn
 *   file. The last writer wins.
 * - Reads go to disk every time; there is no process-wide copy of the store to
 *   go stale or to rewrite in full.
 * - Entries larger than `maxEntryBytes` are not stored. When the total passes
 *   `maxTotalBytes`, a sweep deletes the least recently used entries (file
 *   mtime, refreshed on every hit) until the total is under 80% of the budget.
 * - The directories are 0700 and the files 0600 on POSIX. Keys never contain
 *   credentials (see client.ts). If no private directory can be created, the
 *   cache is kept in memory for the life of the process instead of falling
 *   back to a shared location such as /tmp.
 */

import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync, mkdirSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync,
} from "node:fs";
import { readdir, readFile, stat, unlink, utimes } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const IS_POSIX = process.platform !== "win32";

/** Bump when the on-disk format changes; older layouts are deleted. */
export const CACHE_LAYOUT = "v3";

export const DEFAULT_MAX_ENTRY_BYTES = 10 * 1024 * 1024;
export const DEFAULT_MAX_TOTAL_BYTES = 250 * 1024 * 1024;
/** Entries untouched this long are expired under any TTL in use and are swept. */
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
/** Temp files older than this are leftovers from a crashed write. */
const ORPHAN_TMP_AFTER_MS = 10 * 60 * 1000;
/** Per-namespace entry cap for the in-memory fallback. */
const MEMORY_MAX_ENTRIES = 200;

export interface CachedResponse {
  data: unknown;
  /** When the response was fetched from the upstream API (epoch ms). */
  fetchedAt: number;
  expires: number;
}

interface EntryFile extends CachedResponse {
  key: string;
}

export interface CacheStoreOptions {
  /** Directory holding the namespace directories, or null for memory only. */
  root: string | null;
  maxEntryBytes?: number;
  maxTotalBytes?: number;
}

const noop = () => {};

function mkdirPrivate(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (IS_POSIX) chmodSync(dir, 0o700);
}

/** One cache location, shared by every namespace (API client) in the process. */
export class CacheStore {
  readonly root: string | null;
  readonly maxEntryBytes: number;
  readonly maxTotalBytes: number;
  private readonly memory = new Map<string, Map<string, CachedResponse>>();
  private readonly readyDirs = new Set<string>();
  /** Estimated bytes on disk; null until the first scan finishes. */
  private totalBytes: number | null = null;
  private scanStarted = false;
  private sweeping: Promise<void> | null = null;

  constructor(opts: CacheStoreOptions) {
    this.root = opts.root;
    this.maxEntryBytes = opts.maxEntryBytes ?? DEFAULT_MAX_ENTRY_BYTES;
    this.maxTotalBytes = opts.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  }

  private nsDir(ns: string): string {
    return join(this.root!, ns.replace(/[^A-Za-z0-9._-]/g, "_"));
  }

  private entryPath(ns: string, key: string): string {
    return join(this.nsDir(ns), `${createHash("sha256").update(key).digest("hex")}.json`);
  }

  async get(ns: string, key: string): Promise<CachedResponse | undefined> {
    const now = Date.now();
    if (!this.root) {
      const map = this.memory.get(ns);
      const entry = map?.get(key);
      if (!entry) return undefined;
      if (now >= entry.expires) { map!.delete(key); return undefined; }
      map!.delete(key); // re-insert: Map order is the LRU order
      map!.set(key, entry);
      return entry;
    }

    const file = this.entryPath(ns, key);
    let entry: EntryFile;
    try {
      entry = JSON.parse(await readFile(file, "utf-8")) as EntryFile;
    } catch (e) {
      // Missing, or being replaced (Windows), or corrupt: treat as a miss.
      if (e instanceof SyntaxError) void unlink(file).catch(noop);
      return undefined;
    }
    if (!entry || entry.key !== key || typeof entry.expires !== "number") return undefined;
    if (now >= entry.expires) {
      void unlink(file).catch(noop);
      return undefined;
    }
    const t = new Date(now);
    void utimes(file, t, t).catch(noop); // mtime = last use, for the LRU sweep
    return { data: entry.data, fetchedAt: entry.fetchedAt, expires: entry.expires };
  }

  set(ns: string, key: string, data: unknown, ttlMs: number): void {
    if (ttlMs <= 0) return;
    const fetchedAt = Date.now();
    const expires = fetchedAt + ttlMs;

    if (!this.root) {
      let map = this.memory.get(ns);
      if (!map) { map = new Map(); this.memory.set(ns, map); }
      map.delete(key);
      if (map.size >= MEMORY_MAX_ENTRIES) map.delete(map.keys().next().value!);
      map.set(key, { data, fetchedAt, expires });
      return;
    }

    let body: string;
    try {
      body = JSON.stringify({ key, fetchedAt, expires, data } satisfies EntryFile);
    } catch {
      return; // not serializable (e.g. circular); just don't cache it
    }
    const bytes = Buffer.byteLength(body);
    if (bytes > this.maxEntryBytes) return;

    const file = this.entryPath(ns, key);
    const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    try {
      const dir = this.nsDir(ns);
      if (!this.readyDirs.has(dir)) {
        mkdirPrivate(dir);
        this.readyDirs.add(dir);
      }
      writeFileSync(tmp, body, { encoding: "utf-8", mode: 0o600 });
      renameSync(tmp, file);
    } catch {
      // Best effort: another process may hold the file (Windows) or the disk is full.
      try { unlinkSync(tmp); } catch { /* already gone */ }
      return;
    }

    if (!this.scanStarted) {
      this.scanStarted = true;
      this.sweeping = this.sweep(false);
    } else if (this.totalBytes !== null) {
      this.totalBytes += bytes;
      if (this.totalBytes > this.maxTotalBytes && !this.sweeping) this.sweeping = this.sweep(true);
    }
  }

  /** Delete every entry in a namespace. Synchronous so a following read can't see old data. */
  clear(ns: string): void {
    this.memory.delete(ns);
    if (!this.root) return;
    // Retries cover Windows EPERM/EBUSY while a background unlink or mtime refresh holds a file.
    try { rmSync(this.nsDir(ns), { recursive: true, force: true, maxRetries: 5, retryDelay: 20 }); } catch { /* best effort */ }
    this.readyDirs.delete(this.nsDir(ns));
  }

  /**
   * Measure the cache and delete stale entries and orphaned temp files; when
   * `evict` is set (or the cache is over budget), also delete least recently
   * used entries until the total is under 80% of the budget.
   */
  private async sweep(evict: boolean): Promise<void> {
    const root = this.root!;
    const now = Date.now();
    const files: { path: string; size: number; mtimeMs: number }[] = [];
    try {
      for (const ns of await readdir(root)) {
        const dir = join(root, ns);
        let names: string[];
        try { names = await readdir(dir); } catch { continue; }
        for (const name of names) {
          const path = join(dir, name);
          try {
            const st = await stat(path);
            if (name.endsWith(".tmp")) {
              if (now - st.mtimeMs > ORPHAN_TMP_AFTER_MS) await unlink(path).catch(noop);
            } else if (name.endsWith(".json")) {
              if (now - st.mtimeMs > STALE_AFTER_MS) await unlink(path).catch(noop);
              else files.push({ path, size: st.size, mtimeMs: st.mtimeMs });
            }
          } catch { /* removed concurrently */ }
        }
      }
    } catch {
      this.sweeping = null;
      return;
    }

    let total = files.reduce((sum, f) => sum + f.size, 0);
    if (evict || total > this.maxTotalBytes) {
      const target = this.maxTotalBytes * 0.8;
      files.sort((a, b) => a.mtimeMs - b.mtimeMs);
      for (const f of files) {
        if (total <= target) break;
        await unlink(f.path).catch(noop);
        total -= f.size;
      }
      if (process.env.DEBUG_CACHE) console.error(`Cache: swept to ${Math.round(total / 1024)} KiB`);
    }
    this.totalBytes = total;
    this.sweeping = null;
  }

  /** Resolves when any background scan or sweep has finished. */
  async idle(): Promise<void> {
    while (this.sweeping) await this.sweeping;
  }
}

/**
 * Resolve the private cache directory (created if needed) and delete files
 * from older layouts: cache.json and per-module *.json files could contain
 * API keys in plaintext, and cache.v2.json is superseded.
 */
export function resolveCacheRoot(env: NodeJS.ProcessEnv = process.env): string | null {
  const home = join(env.XDG_CACHE_HOME || join(homedir(), ".cache"), "us-gov-open-data-mcp");
  const root = join(home, CACHE_LAYOUT);
  try {
    mkdirPrivate(home);
    mkdirPrivate(root);
  } catch {
    return null;
  }
  try {
    for (const name of readdirSync(home)) {
      if (name.endsWith(".json")) {
        try { unlinkSync(join(home, name)); } catch { /* best effort */ }
      }
    }
  } catch { /* unreadable: nothing to clean */ }
  return root;
}

/** Cache for one API client. The store may be passed lazily, as a function. */
export class DiskCache {
  constructor(
    private readonly store: CacheStore | (() => CacheStore),
    private readonly ns: string,
    private readonly ttlMs: number,
  ) {}

  private resolve(): CacheStore {
    return typeof this.store === "function" ? this.store() : this.store;
  }

  get(key: string): Promise<CachedResponse | undefined> {
    return this.resolve().get(this.ns, key);
  }

  set(key: string, data: unknown): void {
    this.resolve().set(this.ns, key, data, this.ttlMs);
  }

  clear(): void {
    this.resolve().clear(this.ns);
  }
}
