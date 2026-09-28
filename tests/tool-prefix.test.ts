/**
 * Every module declares the prefix its tool names share, and deprecated
 * aliases point at real tools without colliding with anything.
 * Server tools (clear_cache, code_mode) are not module tools and are exempt.
 */

import { describe, it, expect } from "vitest";
import { moduleDirs, getModule } from "./helpers.js";

interface ModuleShape {
  name: string;
  toolPrefix?: string;
  deprecatedAliases?: Record<string, string>;
  tools: { name: string }[];
}

const modules = moduleDirs.map(d => getModule(d) as unknown as ModuleShape);
const allToolNames = new Set(modules.flatMap(m => m.tools.map(t => t.name)));

describe("tool prefixes", () => {
  it.each(modules.map(m => [m.name, m] as const))("%s: every tool name starts with its toolPrefix", (_name, mod) => {
    expect(mod.toolPrefix, "toolPrefix is required").toMatch(/^[a-z][a-z0-9_]*_$/);
    const off = mod.tools.map(t => t.name).filter(n => !n.startsWith(mod.toolPrefix!));
    expect(off).toEqual([]);
  });
});

describe("deprecated aliases", () => {
  const aliases = modules.flatMap(m => Object.entries(m.deprecatedAliases ?? {}).map(([alias, target]) => ({ mod: m, alias, target })));

  it("point at a tool in the same module", () => {
    for (const { mod, alias, target } of aliases) {
      expect(mod.tools.map(t => t.name), `${alias} → ${target}`).toContain(target);
    }
  });

  it("don't collide with tool names or each other", () => {
    const seen = new Set<string>();
    for (const { alias } of aliases) {
      expect(allToolNames.has(alias), alias).toBe(false);
      expect(seen.has(alias), alias).toBe(false);
      seen.add(alias);
    }
  });

  it("are the old Treasury names", () => {
    const treasury = modules.find(m => m.name === "treasury")!;
    expect(treasury.deprecatedAliases).toEqual({
      list_datasets: "treasury_list_datasets",
      search_datasets: "treasury_search_datasets",
      get_endpoint_fields: "treasury_get_endpoint_fields",
      query_fiscal_data: "treasury_query_fiscal_data",
    });
  });
});
