/**
 * Smoke-test helpers: call real tools through the validated registry and gate
 * keyed checks on configured credentials.
 */

import { it } from "vitest";
import { buildToolRegistry, type ToolRegistry } from "../../src/server/tool-registry.js";
import { configuredEnv } from "../../src/shared/env.js";
import type { ApiModule } from "../../src/shared/types.js";

/** True when an env var holds a real value (not empty, not an .env.example placeholder). */
export function isConfigured(name: string): boolean {
  return configuredEnv(name) !== undefined;
}

/**
 * `it` when every key is configured. Otherwise a skipped test whose name
 * states the missing keys (visible in the verbose reporter), or a failing test
 * when SMOKE_STRICT=1 so CI can't silently skip required checks.
 */
export function itWithKeys(keys: string[]): typeof it {
  const missing = keys.filter(k => !isConfigured(k));
  if (missing.length === 0) return it;
  if (process.env.SMOKE_STRICT === "1") {
    return ((name: string, _fn?: unknown, timeout?: number) =>
      it(name, () => {
        throw new Error(`SMOKE_STRICT: required secret(s) not configured: ${missing.join(", ")}`);
      }, timeout)) as unknown as typeof it;
  }
  return ((name: string, fn?: unknown, timeout?: number) =>
    it.skip(`${name} [SKIPPED: needs ${missing.join(", ")}]`, fn as never, timeout)) as unknown as typeof it;
}

const registries = new Map<string, ToolRegistry>();

/** Registry for a single module, loaded from source. */
export async function moduleRegistry(moduleName: string): Promise<ToolRegistry> {
  let reg = registries.get(moduleName);
  if (!reg) {
    const mod = (await import(`../../src/apis/${moduleName}/index.ts`)).default as ApiModule;
    reg = buildToolRegistry([mod]);
    registries.set(moduleName, reg);
  }
  return reg;
}

/** Parsed tool response envelope. */
export interface ToolResponse {
  summary?: string;
  dataType?: string;
  data?: any;
  record?: any;
  stats?: any;
  meta?: any;
  [key: string]: unknown;
}

/** Call a tool with schema validation and return its parsed JSON response. Throws on failure. */
export async function callTool(moduleName: string, toolName: string, args: Record<string, unknown> = {}): Promise<ToolResponse> {
  const reg = await moduleRegistry(moduleName);
  const res = await reg.invoke(toolName, args);
  if (!res.ok) throw new Error(`${toolName} failed (${res.kind}): ${res.message}`);
  const text = typeof res.result === "string" ? res.result : JSON.stringify(res.result);
  return JSON.parse(text) as ToolResponse;
}

/** Rows or items from a response envelope, whichever is present. */
export function records(res: ToolResponse): unknown[] {
  if (Array.isArray(res.data?.rows)) return res.data.rows;
  if (Array.isArray(res.data?.items)) return res.data.items;
  return [];
}
