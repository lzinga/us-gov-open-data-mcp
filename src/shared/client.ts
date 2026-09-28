/**
 * Lightweight API client factory with caching, retry, and rate limiting.
 *
 * Instead of an abstract class with 7 virtual methods, this uses a config
 * object to create a client. Each module calls createClient() once.
 *
 * Features:
 *   - Disk-backed TTL cache (survives MCP server restarts)
 *   - Timeout (30s default)
 *   - Retry with exponential backoff (429, 502, 503, 504)
 *   - Token-bucket rate limiting
 *   - Auth via query param, header, or request body
 */

import { CacheStore, DiskCache, resolveCacheRoot } from "./disk-cache.js";

// ─── Types ───────────────────────────────────────────────────────────

export interface ClientConfig {
  baseUrl: string;
  name: string;

  /** Auth configuration — how to attach credentials to requests */
  auth?: {
    /** Where to inject credentials: query string, request header, or POST body */
    type: "query" | "header" | "body";
    /**
     * Maps param/header names to env var names. Values are read from process.env at request time.
     * If the env var is unset, that param is silently omitted (graceful degradation).
     *
     * Examples:
     *   Single key:    envParams: { api_key: "FRED_API_KEY" }
     *   Key + email:   envParams: { key: "AQS_API_KEY", email: "AQS_EMAIL" }
     *   Bearer token:  envParams: { Authorization: "HUD_USER_TOKEN" }  (with prefix: "Bearer ")
     */
    envParams: Record<string, string>;
    /** Static params included on every authenticated request (e.g. { file_type: "json" } for FRED) */
    extraParams?: Record<string, string>;
    /** For header auth: prefix prepended to the first envParams value (e.g. "Bearer ") */
    prefix?: string;
  };

  /** Rate limiting */
  rateLimit?: { perSecond: number; burst: number };

  /** Default headers on every request (e.g. User-Agent for SEC) */
  defaultHeaders?: Record<string, string>;

  /** Cache TTL in ms (default: 5 min). Government data often updates daily/weekly — set
   *  higher for infrequent data: 1 hour = 3_600_000, 1 day = 86_400_000. Set 0 to disable. */
  cacheTtlMs?: number;

  /** Timeout in ms for one attempt, including reading the body (default: 30000) */
  timeoutMs?: number;

  /**
   * Overall deadline in ms for one request across all retries and backoff
   * (default: max(45000, timeoutMs)). Keeps tool calls inside typical MCP
   * client request timeouts.
   */
  deadlineMs?: number;

  /** Max retries for transient errors (429, 502, 503, 504). Default: 2.
   *  Increase for notoriously flaky upstream APIs (e.g. FBI CDE). */
  maxRetries?: number;

  /** Custom error detector — some APIs return 200 OK with errors in the body */
  checkError?: (data: unknown) => string | null;

  /** Treat successful empty/204 bodies as null instead of a JSON parse error. */
  emptyBodyAsNull?: boolean;
}

/** Param values: string, number, string[] (for repeated keys like facets[series][]), or undefined to skip */
export type ParamValue = string | number | string[] | undefined;
export type Params = Record<string, ParamValue>;

/**
 * Shorthand for building query param objects. Drops `undefined`, `null`, and `""`.
 * Booleans become `"true"`/`"false"`. Arrays pass through (for repeated keys like `facets[series][]`).
 *
 * @example
 *   const { fromDateTime, toDateTime } = opts;
 *   const params = qp({ limit: opts.limit ?? 20, fromDateTime, toDateTime });
 *
 *   // rename a key + set a default
 *   const params = qp({ limit: 50, p_zip: opts.zip, sort: opts.sort ?? "desc" });
 */
export function qp(
  obj: Record<string, string | number | boolean | string[] | undefined | null>,
): Params {
  const out: Params = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "boolean") { out[k] = String(v); continue; }
    out[k] = v;
  }
  return out;
}

export interface ApiClient {
  get<T = unknown>(path: string, params?: Params): Promise<T>;
  /** GET returning the raw response body as text (for non-JSON endpoints like XML or CSV). */
  getText(path: string, params?: Params): Promise<string>;
  post<T = unknown>(path: string, body?: Record<string, unknown>, params?: Params): Promise<T>;
  clearCache(): void;
}

// ─── Token Bucket Rate Limiter ───────────────────────────────────────
//
// Queue-based token bucket that guarantees:
//   - Correct rate limiting even under concurrent acquire() calls
//   - FIFO fairness: callers are served in the order they arrive
//   - No thundering-herd: a single drain loop releases waiters one at a time
//   - Batch release: if multiple tokens accumulated while sleeping, all
//     eligible waiters are released in one pass
//
// NOTE: "Token" here refers to the classic rate-limiting concept (permission
// slips for API calls), NOT LLM/AI tokens. The name follows the standard
// CS algorithm: https://en.wikipedia.org/wiki/Token_bucket

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly queue: Array<() => void> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly max: number, private readonly rate: number) {
    this.tokens = max;
    this.lastRefill = Date.now();
  }

  /** Refill tokens based on elapsed time since the last refill. */
  private refill(): void {
    const now = Date.now();
    this.tokens = Math.min(
      this.max,
      this.tokens + ((now - this.lastRefill) / 1000) * this.rate,
    );
    this.lastRefill = now;
  }

  /** Wait until a token is available, respecting FIFO order. */
  async acquire(): Promise<void> {
    this.refill();

    // Fast path: token available and nobody queued ahead of us
    if (this.tokens >= 1 && this.queue.length === 0) {
      this.tokens -= 1;
      return;
    }

    // Slow path: join the queue and wait for the drain loop to release us
    return new Promise<void>(resolve => {
      this.queue.push(resolve);
      this.scheduleDrain();
    });
  }

  /** Number of callers currently waiting for a token. */
  get pending(): number {
    return this.queue.length;
  }

  /** Ensure a drain timer is running to release queued callers. */
  private scheduleDrain(): void {
    if (this.timer !== null) return;

    const drain = (): void => {
      this.timer = null;
      this.refill();

      // Release as many queued callers as tokens allow
      while (this.queue.length > 0 && this.tokens >= 1) {
        this.tokens -= 1;
        this.queue.shift()!();
      }

      // Reschedule if more waiters remain
      if (this.queue.length > 0) {
        const waitMs = Math.ceil(((1 - this.tokens) / this.rate) * 1000);
        this.timer = setTimeout(drain, Math.max(waitMs, 1));
      }
    };

    const waitMs = Math.ceil(((1 - this.tokens) / this.rate) * 1000);
    this.timer = setTimeout(drain, Math.max(waitMs, 1));
  }
}

// ─── Disk-backed TTL Cache ────────────────────────────────────────────
//
// One file per response under the user's private cache directory; see
// disk-cache.ts. Shared by every client in the process, and created on
// first use so that importing the SDK touches no files.

let sharedStore: CacheStore | undefined;

function cacheStore(): CacheStore {
  return (sharedStore ??= new CacheStore({ root: resolveCacheRoot() }));
}

/** Wait for background cache maintenance (the size scan and LRU sweeps) to finish. */
export async function flushDiskCache(): Promise<void> {
  await sharedStore?.idle();
}

/** Directory holding the cache entries, or null when the disk cache is disabled. */
export function diskCachePath(): string | null {
  return cacheStore().root;
}

// ─── Timeouts and retry logic ────────────────────────────────────────
//
// Each attempt gets an AbortSignal.timeout() that stays armed while the
// response body is read, so a stalled body can't hang a tool call. All
// attempts (plus backoff sleeps) share an overall deadline so retries can't
// outlast a typical MCP client's request timeout (~60s).

const RETRYABLE = [429, 502, 503, 504];

/** Longest Retry-After we'll wait inside a tool call; beyond this we fail fast. */
export const MAX_RETRY_AFTER_MS = 20_000;

/** Default overall deadline for one client request, across all retries. */
export const DEFAULT_DEADLINE_MS = 45_000;

/** An error that must not be retried (e.g. an excessive Retry-After). */
class FatalRequestError extends Error {}

/**
 * Parse a `Retry-After` header value.
 * RFC 7231 allows either delta-seconds (an integer) or an HTTP-date.
 * Returns the wait time in ms, or null if the header is absent/unparseable.
 */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  // Delta-seconds form
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10) * 1000;
  }
  // HTTP-date form (e.g. "Wed, 21 Oct 2026 07:28:00 GMT")
  const dateMs = Date.parse(trimmed);
  if (!isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

/** Exponential backoff with full jitter; prevents synchronized retry stampedes. */
function backoffDelay(attempt: number): number {
  const base = 1000 * 2 ** attempt;
  return Math.floor(base * (0.5 + Math.random() * 0.5));
}

function isTimeoutError(e: unknown): boolean {
  return e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchRetry(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
  limiter: TokenBucket,
  name: string,
  maxRetries = 2,
  deadlineMs = DEFAULT_DEADLINE_MS,
): Promise<Response> {
  const started = Date.now();
  const remaining = () => deadlineMs - (Date.now() - started);
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await limiter.acquire();
    const budget = Math.min(timeoutMs, remaining());
    if (budget <= 0) break;
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(budget) });
      if (RETRYABLE.includes(res.status) && attempt < maxRetries) {
        const retryAfterMs = parseRetryAfter(res.headers.get("Retry-After"));
        if (retryAfterMs !== null && retryAfterMs > MAX_RETRY_AFTER_MS) {
          await res.body?.cancel().catch(() => {});
          throw new FatalRequestError(
            `${name}: HTTP ${res.status} — the API asked to retry after ${Math.ceil(retryAfterMs / 1000)}s ` +
            `(rate limited). Try again later.`,
          );
        }
        const delay = retryAfterMs ?? backoffDelay(attempt);
        // Not enough time left for another attempt: surface this response.
        if (delay >= remaining() - 1000) return res;
        await res.body?.cancel().catch(() => {});
        console.error(`${name}: HTTP ${res.status}, retry in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (e) {
      if (e instanceof FatalRequestError) throw e;
      lastErr = isTimeoutError(e)
        ? new Error(`${name}: request timed out after ${Math.round(budget / 1000)}s`)
        : e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries) {
        const delay = backoffDelay(attempt);
        if (delay >= remaining() - 1000) break;
        console.error(`${name}: ${lastErr.message}, retry in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await sleep(delay);
      }
    }
  }
  throw lastErr ?? new Error(`${name}: request exceeded the ${Math.round(deadlineMs / 1000)}s deadline`);
}

/** Read a response body, turning a mid-body timeout into a clear error. */
async function readBody(res: Response, kind: "text" | "json", name: string): Promise<unknown> {
  try {
    return kind === "json" ? await res.json() : await res.text();
  } catch (e) {
    if (isTimeoutError(e)) throw new Error(`${name}: timed out while reading the response body`);
    if (kind === "json" && e instanceof SyntaxError) {
      throw new SyntaxError(`${name}: invalid JSON in response (HTTP ${res.status}): ${e.message}`);
    }
    throw e;
  }
}

/** Truncate body text to a manageable size for inclusion in error messages. */
function truncateBody(body: string, max = 300): string {
  if (body.length <= max) return body;
  return body.slice(0, max) + `… (truncated, ${body.length} chars total)`;
}

// ─── Client Factory ──────────────────────────────────────────────────

export function createClient(config: ClientConfig): ApiClient {
  const {
    baseUrl, name, auth, defaultHeaders = {},
    cacheTtlMs = 5 * 60 * 1000,
    timeoutMs = 30_000,
    maxRetries: configMaxRetries = 2,
    checkError,
    emptyBodyAsNull = false,
  } = config;
  const deadlineMs = config.deadlineMs ?? Math.max(DEFAULT_DEADLINE_MS, timeoutMs);

  const rl = config.rateLimit ?? { perSecond: 5, burst: 10 };
  const limiter = new TokenBucket(rl.burst, rl.perSecond);
  const cache = new DiskCache(cacheStore, name, cacheTtlMs);

  /** Resolve all env-backed auth params. Returns empty record if none are set. */
  function resolveAuthParams(): Record<string, string> {
    if (!auth) return {};
    const resolved: Record<string, string> = {};
    const entries = Object.entries(auth.envParams);
    for (let i = 0; i < entries.length; i++) {
      const [paramName, envVar] = entries[i];
      const val = process.env[envVar];
      if (!val) continue;
      // Apply prefix to the first entry only (e.g. "Bearer " for Authorization header)
      resolved[paramName] = (i === 0 && auth.prefix ? auth.prefix : "") + val;
    }
    return resolved;
  }

  /** True if all required auth credentials are available in env. */
  function hasAuth(): boolean {
    if (!auth) return false;
    return Object.values(auth.envParams).every((ev) => !!process.env[ev]);
  }

  /**
   * Build the request URL. With `withSecrets: false` the env-backed auth
   * params are left out — that form is used for cache keys so credentials
   * are never written to disk.
   */
  function buildUrl(path: string, params?: Params, opts: { withSecrets?: boolean } = {}): string {
    const withSecrets = opts.withSecrets ?? true;
    const parts: string[] = [];

    // Auth via query param
    if (auth?.type === "query") {
      if (withSecrets) {
        for (const [k, v] of Object.entries(resolveAuthParams())) {
          parts.push(`${k}=${encodeURIComponent(v)}`);
        }
      }
      if (auth.extraParams) {
        for (const [k, v] of Object.entries(auth.extraParams)) parts.push(`${k}=${encodeURIComponent(v)}`);
      }
    }

    // User params — supports string, number, and string[] (repeated keys)
    // Keys are NOT encoded — preserves bracket syntax like page[number], facets[series][]
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === "") continue;
        if (Array.isArray(v)) {
          for (const item of v) parts.push(`${k}=${encodeURIComponent(String(item))}`);
        } else {
          parts.push(`${k}=${encodeURIComponent(String(v))}`);
        }
      }
    }

    const p = path.startsWith("/") ? path : `/${path}`;
    return parts.length ? `${baseUrl}${p}?${parts.join("&")}` : `${baseUrl}${p}`;
  }

  function buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { ...defaultHeaders, ...extra };
    if (auth?.type === "header") {
      Object.assign(h, resolveAuthParams());
    }
    return h;
  }

  /**
   * @param cacheIdentity - URL and body WITHOUT credentials; identifies the
   *   response in the cache. Public data doesn't vary by API key.
   */
  async function request<T>(
    url: string,
    cacheIdentity: string,
    init?: RequestInit,
    responseType: "json" | "text" = "json",
  ): Promise<T> {
    // Keep response formats and JSON empty-body policies in separate cache entries.
    const cacheResponseType = responseType === "json"
      ? `json:${emptyBodyAsNull ? "empty-as-null" : "strict"}`
      : responseType;
    const cacheKey = `${cacheIdentity}|${cacheResponseType}`;
    const cached = await cache.get(cacheKey);
    if (cached !== undefined) return cached.data as T;

    const res = await fetchRetry(url, init, timeoutMs, limiter, name, configMaxRetries, deadlineMs);

    if (!res.ok) {
      const body = String(await readBody(res, "text", name).catch(() => ""));

      // Friendly error for auth failures when no credentials are configured
      if ((res.status === 401 || res.status === 403) && auth && !hasAuth()) {
        const envVars = Object.values(auth.envParams).join(", ");
        throw new Error(
          `${name}: API key required (HTTP ${res.status}). ` +
          `Set the ${envVars} environment variable(s) in your .env file or MCP config.`,
        );
      }

      throw new Error(`${name}: HTTP ${res.status} — ${truncateBody(body || res.statusText)}`);
    }

    if (responseType === "text") {
      const text = (await readBody(res, "text", name)) as string;
      cache.set(cacheKey, text);
      return text as T;
    }

    let data: unknown;
    if (emptyBodyAsNull) {
      // DOL returns a bare 204 when a filter matches nothing. Treat that, or
      // any successful empty body, as no rows rather than a JSON parse error.
      const raw = (await readBody(res, "text", name)) as string;
      if (res.status === 204 || raw.trim() === "") {
        data = null;
      } else {
        try {
          data = JSON.parse(raw);
        } catch (e) {
          throw new SyntaxError(`${name}: invalid JSON in response (HTTP ${res.status}): ${(e as Error).message}`);
        }
      }
    } else {
      data = await readBody(res, "json", name);
    }

    // Check for API-level errors in body
    if (checkError) {
      const err = checkError(data);
      if (err) throw new Error(`${name}: ${err}`);
    }

    cache.set(cacheKey, data);
    return data as T;
  }

  return {
    async get<T = unknown>(path: string, params?: Params): Promise<T> {
      const url = buildUrl(path, params);
      const identity = `${buildUrl(path, params, { withSecrets: false })}|`;
      const headers = buildHeaders();
      return request<T>(url, identity, Object.keys(headers).length ? { headers } : undefined);
    },

    async getText(path: string, params?: Params): Promise<string> {
      const url = buildUrl(path, params);
      const identity = `${buildUrl(path, params, { withSecrets: false })}|`;
      const headers = buildHeaders();
      return request<string>(url, identity, Object.keys(headers).length ? { headers } : undefined, "text");
    },

    async post<T = unknown>(
      path: string,
      body?: Record<string, unknown>,
      params?: Params,
    ): Promise<T> {
      const url = buildUrl(path, params);
      const headers = buildHeaders({ "Content-Type": "application/json" });

      // Auth via body (e.g. BLS). extraParams change the response shape, so
      // they stay in the cache identity; the credentials themselves don't.
      const publicBody: Record<string, unknown> = { ...body };
      let finalBody = publicBody;
      if (auth?.type === "body") {
        const resolved = resolveAuthParams();
        if (Object.keys(resolved).length) {
          if (auth.extraParams) Object.assign(publicBody, auth.extraParams);
          finalBody = { ...publicBody, ...resolved };
        }
      }

      const identity = `${buildUrl(path, params, { withSecrets: false })}|${JSON.stringify(publicBody)}`;
      return request<T>(url, identity, {
        method: "POST",
        headers,
        body: JSON.stringify(finalBody),
      });
    },

    clearCache() { cache.clear(); },
  };
}
