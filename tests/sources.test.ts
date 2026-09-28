/**
 * meta.sources: which upstream requests produced a result, without credentials
 * (src/shared/request-context.ts, src/server/sources.ts, src/server/serve-tool.ts).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createClient } from "../src/shared/client.js";
import { recordSource, trackSources } from "../src/shared/request-context.js";
import { attachSources } from "../src/server/sources.js";
import { serveTool } from "../src/server/serve-tool.js";
import { listResponse } from "../src/shared/response.js";

const SECRET = "sources-test-secret-key-4d2";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubFetch() {
  const fn = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("recorded sources", () => {
  it("list request URLs without credentials, and mark cache hits", async () => {
    vi.stubEnv("SOURCES_TEST_KEY", SECRET);
    const fetchFn = stubFetch();
    const api = createClient({
      baseUrl: "https://api.example.test",
      name: `sources-${Date.now()}`,
      auth: { type: "query", envParams: { api_key: "SOURCES_TEST_KEY" } },
    });
    api.clearCache();

    const first = await trackSources(() => api.get("/series", { id: "GDP" }));
    const second = await trackSources(() => api.get("/series", { id: "GDP" }));
    expect(String(fetchFn.mock.calls[0][0])).toContain(SECRET); // the key is sent upstream…
    expect(first.sources).toEqual([{ url: "https://api.example.test/series?id=GDP", method: "GET", fetchedAt: expect.any(Number), cached: false }]);
    expect(second.sources).toEqual([{ ...first.sources[0], cached: true }]); // same fetch time: it's the cached copy
    expect(JSON.stringify([first, second])).not.toContain(SECRET); // …but never recorded
  });

  it("record POST requests by URL only, and credentials in the body stay out", async () => {
    vi.stubEnv("SOURCES_TEST_KEY", SECRET);
    stubFetch();
    const api = createClient({ baseUrl: "https://api.example.test", name: `sources-post-${Date.now()}`, auth: { type: "body", envParams: { registrationkey: "SOURCES_TEST_KEY" } } });
    const { sources } = await trackSources(() => api.post("/timeseries/data/", { seriesid: ["CUUR0000SA0"] }));
    expect(sources).toEqual([expect.objectContaining({ url: "https://api.example.test/timeseries/data/", method: "POST", cached: false })]);
    expect(JSON.stringify(sources)).not.toContain(SECRET);
  });

  it("are not recorded outside a tool call, and parallel calls stay separate", async () => {
    recordSource({ url: "https://x.test/nowhere", method: "GET", fetchedAt: 0, cached: false });
    const [a, b] = await Promise.all([
      trackSources(async () => { await new Promise(r => setTimeout(r, 5)); recordSource({ url: "https://a.test", method: "GET", fetchedAt: 1, cached: false }); }),
      trackSources(async () => { recordSource({ url: "https://b.test", method: "GET", fetchedAt: 2, cached: false }); }),
    ]);
    expect(a.sources.map(s => s.url)).toEqual(["https://a.test"]);
    expect(b.sources.map(s => s.url)).toEqual(["https://b.test"]);
  });
});

describe("attachSources", () => {
  const src = (i: number, cached = false) => ({ url: `https://api.test/r${i}`, method: "GET" as const, fetchedAt: Date.UTC(2026, 8, 28, 12, 0, i), cached });

  it("adds deduplicated sources to meta, keeping existing meta", () => {
    const out = JSON.parse(attachSources(listResponse("x", { items: [1], meta: { note: "kept" } }), [src(1), src(1), src(2, true)]) as string);
    expect(out.meta).toEqual({
      note: "kept",
      sources: [
        { url: "https://api.test/r1", fetchedAt: "2026-09-28T12:00:01.000Z" },
        { url: "https://api.test/r2", fetchedAt: "2026-09-28T12:00:02.000Z", cached: true },
      ],
    });
  });

  it("caps the list and counts the rest", () => {
    const out = JSON.parse(attachSources(JSON.stringify({ summary: "x" }), Array.from({ length: 13 }, (_, i) => src(i)), 10) as string);
    expect(out.meta.sources).toHaveLength(10);
    expect(out.meta.moreSources).toBe(3);
  });

  it("leaves non-object results and results without sources alone", () => {
    expect(attachSources("plain text", [src(1)])).toBe("plain text");
    expect(attachSources("[1,2]", [src(1)])).toBe("[1,2]");
    expect(attachSources('{"a":1}', [])).toBe('{"a":1}');
  });
});

describe("serveTool", () => {
  it("adds the tool's upstream requests to its result", async () => {
    stubFetch();
    const api = createClient({ baseUrl: "https://api.example.test", name: `serve-${Date.now()}` });
    const tool = serveTool({
      name: "demo_tool",
      execute: async () => { await api.get("/a"); await api.get("/b", { q: "1" }); return listResponse("2 items", { items: [1, 2] }); },
    }, 150_000);
    const out = JSON.parse(await tool.execute({}, {}) as string);
    expect(out.meta.sources.map((s: { url: string }) => s.url)).toEqual(["https://api.example.test/a", "https://api.example.test/b?q=1"]);
  });
});
