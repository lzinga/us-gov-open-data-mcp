/**
 * HTTP client time budget: capped Retry-After, per-attempt timeouts that cover
 * the response body, and an overall deadline across retries.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createClient, MAX_RETRY_AFTER_MS } from "../src/shared/client.js";

afterEach(() => vi.unstubAllGlobals());

/** fetch mock that never produces headers until its signal aborts. */
function hangingFetch() {
  return vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
    }),
  );
}

describe("Retry-After handling", () => {
  it("fails fast instead of sleeping on an excessive Retry-After", async () => {
    const fetchFn = vi.fn(async () => new Response("slow down", { status: 429, headers: { "Retry-After": "3600" } }));
    vi.stubGlobal("fetch", fetchFn);
    const api = createClient({ baseUrl: "https://x.test", name: "ratelimited", cacheTtlMs: 0 });

    const started = Date.now();
    await expect(api.get("/a")).rejects.toThrow(/retry after 3600s/);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(MAX_RETRY_AFTER_MS).toBeLessThan(3600 * 1000);
  });

  it("honors a short Retry-After and then succeeds", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503, headers: { "Retry-After": "1" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchFn);
    const api = createClient({ baseUrl: "https://x.test", name: "retry-short", cacheTtlMs: 0 });

    const started = Date.now();
    await expect(api.get("/a")).resolves.toEqual({ ok: 1 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe("timeouts", () => {
  it("times out a response whose body stalls after headers", async () => {
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"partial":'));
          init?.signal?.addEventListener("abort", () => controller.error(init.signal!.reason));
        },
      });
      return new Response(stream, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchFn);
    const api = createClient({ baseUrl: "https://x.test", name: "stall", cacheTtlMs: 0, timeoutMs: 300, maxRetries: 0 });

    const started = Date.now();
    await expect(api.get("/a")).rejects.toThrow("stall: timed out while reading the response body");
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("reports a clear error when headers never arrive", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const api = createClient({ baseUrl: "https://x.test", name: "hang", cacheTtlMs: 0, timeoutMs: 200, maxRetries: 0 });
    await expect(api.get("/a")).rejects.toThrow("hang: request timed out");
  });

  it("stops retrying at the overall deadline", async () => {
    const fetchFn = hangingFetch();
    vi.stubGlobal("fetch", fetchFn);
    const api = createClient({
      baseUrl: "https://x.test",
      name: "deadline",
      cacheTtlMs: 0,
      timeoutMs: 300,
      deadlineMs: 800,
      maxRetries: 10,
    });

    const started = Date.now();
    await expect(api.get("/a")).rejects.toThrow(/deadline: request timed out/);
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(2500);
    expect(fetchFn.mock.calls.length).toBeLessThan(4);
  });
});
