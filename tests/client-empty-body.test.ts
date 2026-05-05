/**
 * Tests for the shared HTTP client's empty-body handling.
 *
 * Some upstream APIs (e.g. DOL OSHA "no results") return HTTP 200 with an
 * empty body. Before the fix, `await res.json()` threw
 * "Unexpected end of JSON input" and bubbled out of the tool execute() —
 * see https://github.com/lzinga/us-gov-open-data-mcp/issues for context.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createClient } from "../src/shared/client.js";

describe("createClient — empty/invalid body handling", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Keep cache effects out of these tests by varying the URL per case.
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns null when the upstream returns 200 with an empty body", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("", { status: 200, headers: { "content-type": "application/json" } }),
    ) as typeof fetch;

    const client = createClient({
      baseUrl: "https://example.test",
      name: "empty-body-test",
    });

    const data = await client.get<unknown>("/empty");
    expect(data).toBeNull();
  });

  it("returns null when the upstream returns 200 with a whitespace-only body", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("   \n\t", { status: 200, headers: { "content-type": "application/json" } }),
    ) as typeof fetch;

    const client = createClient({
      baseUrl: "https://example.test",
      name: "whitespace-body-test",
    });

    const data = await client.get<unknown>("/whitespace");
    expect(data).toBeNull();
  });

  it("throws a helpful error when the upstream returns 200 with non-JSON body", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("<html>oops</html>", { status: 200, headers: { "content-type": "text/html" } }),
    ) as typeof fetch;

    const client = createClient({
      baseUrl: "https://example.test",
      name: "html-body-test",
    });

    await expect(client.get<unknown>("/html")).rejects.toThrow(
      /html-body-test: invalid JSON response.*<html>oops<\/html>/,
    );
  });

  it("returns parsed JSON when the upstream returns valid JSON", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, count: 3 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;

    const client = createClient({
      baseUrl: "https://example.test",
      name: "valid-json-test",
    });

    const data = await client.get<{ ok: boolean; count: number }>("/data");
    expect(data).toEqual({ ok: true, count: 3 });
  });
});
