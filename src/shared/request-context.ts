/**
 * Which upstream requests produced a tool result.
 *
 * Each tool call runs inside an AsyncLocalStorage context. The HTTP client
 * records every successful request in it: the URL without credentials (the
 * same identity used for cache keys), when the data was fetched, and whether
 * it came from the cache. The server then adds them to the result's
 * `meta.sources`, so a model can cite where numbers came from and see how
 * fresh they are.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface SourceRecord {
  /** Request URL without API keys or other credentials. */
  url: string;
  method: "GET" | "POST";
  /** When the data was fetched from the upstream API (epoch ms). */
  fetchedAt: number;
  /** True when served from the response cache. */
  cached: boolean;
}

const storage = new AsyncLocalStorage<SourceRecord[]>();

/** Record a request in the current tool call's context (no-op outside one). */
export function recordSource(source: SourceRecord): void {
  storage.getStore()?.push(source);
}

/** Run `fn`, collecting the sources recorded while it runs. */
export async function trackSources<T>(fn: () => Promise<T>): Promise<{ result: T; sources: SourceRecord[] }> {
  const sources: SourceRecord[] = [];
  const result = await storage.run(sources, fn);
  return { result, sources };
}
