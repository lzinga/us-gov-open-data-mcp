/**
 * HTTP client core: URL building, auth placement, errors, retries and caching.
 * (Retry-After and deadlines: client-deadlines.test.ts. Credential-free cache
 * keys: cache-secrets.test.ts. Empty bodies: dol-response-envelope.test.ts.)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createClient, qp, type ClientConfig } from "../src/shared/client.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> } | Error;

/** Stub fetch with a queue of replies (the last one repeats); records every call. */
function stubFetch(...replies: Reply[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)] ?? {};
    if (reply instanceof Error) throw reply;
    const body = typeof reply.body === "string" ? reply.body : JSON.stringify(reply.body ?? {});
    return new Response(body, { status: reply.status ?? 200, headers: reply.headers });
  }));
  return calls;
}

let n = 0;
/** A client with a unique cache namespace, so tests never share cache entries. */
const client = (config: Partial<ClientConfig> = {}) =>
  createClient({ baseUrl: "https://api.test/v1", name: `core-${++n}`, rateLimit: { perSecond: 1000, burst: 1000 }, ...config });

describe("qp", () => {
  it("drops empty values, stringifies booleans and keeps zero and arrays", () => {
    expect(qp({ a: undefined, b: null, c: "", d: 0, e: false, f: true, g: ["x", "y"], h: "v" }))
      .toEqual({ d: 0, e: "false", f: "true", g: ["x", "y"], h: "v" });
  });
});

describe("URL building", () => {
  it("joins the path, encodes values, repeats array keys and keeps bracketed keys", async () => {
    const calls = stubFetch({ body: {} });
    await client().get("series", {
      q: "a b&c=d/é", n: 5, skip: undefined, blank: "", "facets[series][]": ["A 1", "B"], "page[size]": 10,
    });
    expect(calls[0].url).toBe(
      "https://api.test/v1/series?q=a%20b%26c%3Dd%2F%C3%A9&n=5&facets[series][]=A%201&facets[series][]=B&page[size]=10",
    );
  });

  it("adds no query string when there are no params", async () => {
    const calls = stubFetch({ body: {} });
    await client().get("/plain", { gone: undefined });
    expect(calls[0].url).toBe("https://api.test/v1/plain");
  });
});

describe("auth", () => {
  it("query auth: puts the key first, keeps extra params, and omits a missing key", async () => {
    vi.stubEnv("CORE_TEST_KEY", "s3cret/+");
    const calls = stubFetch({ body: {} });
    const auth = { type: "query" as const, envParams: { api_key: "CORE_TEST_KEY" }, extraParams: { file_type: "json" } };
    await client({ auth }).get("/obs", { id: "GDP" });
    expect(calls[0].url).toBe("https://api.test/v1/obs?api_key=s3cret%2F%2B&file_type=json&id=GDP");

    vi.stubEnv("CORE_TEST_KEY", "");
    await client({ auth }).get("/obs", { id: "GDP" });
    expect(calls[1].url).toBe("https://api.test/v1/obs?file_type=json&id=GDP");
  });

  it("header auth: applies the prefix and merges default headers", async () => {
    vi.stubEnv("CORE_TEST_TOKEN", "tok");
    const calls = stubFetch({ body: {} });
    await client({
      auth: { type: "header", envParams: { Authorization: "CORE_TEST_TOKEN" }, prefix: "Bearer " },
      defaultHeaders: { "User-Agent": "test-agent" },
    }).get("/x");
    expect(calls[0].init?.headers).toEqual({ "User-Agent": "test-agent", Authorization: "Bearer tok" });
    expect(calls[0].url).toBe("https://api.test/v1/x");
  });

  it("body auth: sends the key and extra params in the POST body only when a key is set", async () => {
    const auth = { type: "body" as const, envParams: { registrationkey: "CORE_TEST_BODY_KEY" }, extraParams: { catalog: "true" } };
    const calls = stubFetch({ body: {} });
    vi.stubEnv("CORE_TEST_BODY_KEY", "k1");
    await client({ auth }).post("/data", { seriesid: ["A"] });
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ seriesid: ["A"], catalog: "true", registrationkey: "k1" });
    expect(calls[0].init?.method).toBe("POST");
    expect((calls[0].init!.headers as Record<string, string>)["Content-Type"]).toBe("application/json");

    vi.stubEnv("CORE_TEST_BODY_KEY", "");
    await client({ auth }).post("/data", { seriesid: ["A"] });
    expect(JSON.parse(calls[1].init?.body as string)).toEqual({ seriesid: ["A"] });
  });

  it("names the missing environment variables on 401/403 without credentials", async () => {
    vi.stubEnv("CORE_TEST_MISSING", "");
    stubFetch({ status: 403, body: "forbidden" });
    const auth = { type: "query" as const, envParams: { key: "CORE_TEST_MISSING" } };
    await expect(client({ auth }).get("/x")).rejects.toThrow(
      /API key required \(HTTP 403\)\. Set the CORE_TEST_MISSING environment variable/,
    );
  });

  it("reports the upstream error on 401 when credentials are set", async () => {
    vi.stubEnv("CORE_TEST_BAD", "wrong");
    stubFetch({ status: 401, body: "invalid api key" });
    const auth = { type: "query" as const, envParams: { key: "CORE_TEST_BAD" } };
    await expect(client({ auth, name: "badkey" }).get("/x")).rejects.toThrow("badkey: HTTP 401 — invalid api key");
  });
});

describe("errors and retries", () => {
  it("does not retry client errors, and truncates long error bodies", async () => {
    const calls = stubFetch({ status: 404, body: "x".repeat(500) });
    await expect(client({ name: "nf" }).get("/missing")).rejects.toThrow(
      `nf: HTTP 404 — ${"x".repeat(300)}… (truncated, 500 chars total)`,
    );
    expect(calls).toHaveLength(1);
  });

  it("does not retry a 500", async () => {
    const calls = stubFetch({ status: 500, body: "boom" });
    await expect(client().get("/x")).rejects.toThrow(/HTTP 500 — boom/);
    expect(calls).toHaveLength(1);
  });

  it("retries a 502 and a network error, then succeeds", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Math, "random").mockReturnValue(0); // shortest backoff: 500ms, then 1s
    const calls = stubFetch({ status: 502, body: "bad gateway" }, new TypeError("fetch failed"), { body: { ok: true } });
    await expect(client().get("/flaky")).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(3);
  });

  it("surfaces the last retryable response once retries run out", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Math, "random").mockReturnValue(0);
    const calls = stubFetch({ status: 503, body: "down" });
    await expect(client({ maxRetries: 1 }).get("/down")).rejects.toThrow(/HTTP 503 — down/);
    expect(calls).toHaveLength(2);
  });

  it("explains invalid JSON", async () => {
    stubFetch({ body: "<html>maintenance</html>" });
    await expect(client({ name: "html" }).get("/x")).rejects.toThrow(/html: invalid JSON in response \(HTTP 200\)/);
  });

  it("throws checkError's message and does not cache the error body", async () => {
    const calls = stubFetch({ body: { error: "bad series" } }, { body: { data: [1] } });
    const api = client({ name: "chk", checkError: d => (d as { error?: string }).error ?? null });
    await expect(api.get("/s")).rejects.toThrow("chk: bad series");
    await expect(api.get("/s")).resolves.toEqual({ data: [1] });
    expect(calls).toHaveLength(2);
  });
});

describe("caching", () => {
  it("serves repeat GETs from the cache, keyed by the full URL", async () => {
    const calls = stubFetch({ body: { v: 1 } });
    const api = client();
    await api.get("/a", { x: 1 });
    await api.get("/a", { x: 1 });
    await api.get("/a", { x: 2 });
    expect(calls.map(c => c.url)).toEqual(["https://api.test/v1/a?x=1", "https://api.test/v1/a?x=2"]);
  });

  it("does not cache failures", async () => {
    const calls = stubFetch({ status: 404, body: "no" }, { body: { v: 1 } });
    const api = client();
    await expect(api.get("/a")).rejects.toThrow(/404/);
    await expect(api.get("/a")).resolves.toEqual({ v: 1 });
    expect(calls).toHaveLength(2);
  });

  it("keys POSTs by body, keeps text and JSON apart, and clears on request", async () => {
    const calls = stubFetch({ body: { v: 1 } });
    const api = client();
    await api.post("/q", { a: 1 });
    await api.post("/q", { a: 1 });
    await api.post("/q", { a: 2 });
    expect(calls).toHaveLength(2);

    await api.get("/t");
    expect(await api.getText("/t")).toBe('{"v":1}');
    expect(calls).toHaveLength(4);

    api.clearCache();
    await api.get("/t");
    expect(calls).toHaveLength(5);
  });

  it("never caches with cacheTtlMs: 0", async () => {
    const calls = stubFetch({ body: { v: 1 } });
    const api = client({ cacheTtlMs: 0 });
    await api.get("/a");
    await api.get("/a");
    expect(calls).toHaveLength(2);
  });
});
