/**
 * Add the upstream requests behind a tool result to its `meta.sources`
 * (see src/shared/request-context.ts).
 */

import type { SourceRecord } from "../shared/request-context.js";

/** Most sources listed per result; composite tools can make dozens of requests. */
export const MAX_SOURCES = 10;

/**
 * The result with `meta.sources` added: unique URLs, in request order, with
 * ISO fetch times and `cached: true` for cache hits. Results that aren't a
 * JSON object are returned unchanged.
 */
export function attachSources(result: unknown, sources: SourceRecord[], max = MAX_SOURCES): unknown {
  if (!sources.length || typeof result !== "string") return result;
  let obj: unknown;
  try {
    obj = JSON.parse(result);
  } catch {
    return result;
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return result;

  const seen = new Set<string>();
  const unique = sources.filter(s => {
    const key = `${s.method} ${s.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const listed = unique.slice(0, max).map(s => ({
    url: s.url,
    ...(s.method === "POST" ? { method: "POST" } : {}),
    fetchedAt: new Date(s.fetchedAt).toISOString(),
    ...(s.cached ? { cached: true } : {}),
  }));
  const record = obj as Record<string, unknown>;
  const meta = record.meta && typeof record.meta === "object" && !Array.isArray(record.meta) ? record.meta as Record<string, unknown> : {};
  record.meta = {
    ...meta,
    sources: listed,
    ...(unique.length > max ? { moreSources: unique.length - max } : {}),
  };
  return JSON.stringify(record);
}
