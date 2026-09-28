/**
 * Discovery tool mode: find_tools ranking and call_tool validation (src/server/discovery.ts).
 */

import { describe, it, expect } from "vitest";
import { UserError } from "fastmcp";
import { discoveryTools, findTools } from "../src/server/discovery.js";
import { buildToolRegistry } from "../src/server/tool-registry.js";
import type { ApiModule } from "../src/shared/types.js";
import { getModule } from "./helpers.js";

const modules = ["fred", "treasury", "usgs", "bls"].map(d => getModule(d) as unknown as ApiModule);
const aliases = Object.assign({}, ...modules.map(m => m.deprecatedAliases ?? {}));
const registry = buildToolRegistry(modules, aliases);
const [findTool, callTool] = discoveryTools(registry, modules);

describe("findTools", () => {
  it("ranks tools by name, title, module and description words", () => {
    const names = findTools(registry, modules, "earthquakes").map(t => t.name);
    expect(names[0]).toMatch(/^usgs_earthquake/);
    expect(findTools(registry, modules, "national debt treasury").map(t => t.module)).toContain("treasury");
    expect(findTools(registry, modules, "fred series observations")[0].name).toBe("fred_series_data");
  });

  it("returns input schemas that mark defaulted arguments optional", () => {
    const [top] = findTools(registry, modules, "fred_series_data");
    expect(top.name).toBe("fred_series_data");
    const schema = top.inputSchema as { properties: Record<string, unknown>; required?: string[] };
    expect(Object.keys(schema.properties)).toContain("series_id");
    expect(schema.required).toContain("series_id");
  });

  it("maps a deprecated name to its replacement with a note", () => {
    const [top] = findTools(registry, modules, "query_fiscal_data");
    expect(top.name).toBe("treasury_query_fiscal_data");
    expect(top.note).toMatch(/deprecated name for treasury_query_fiscal_data/);
  });

  it("filters by module and caps the result count", () => {
    const fred = findTools(registry, modules, "", { module: "fred", limit: 25 });
    expect(fred.length).toBe((getModule("fred").tools as unknown[]).length);
    expect(fred.every(t => t.module === "fred")).toBe(true);
    expect(findTools(registry, modules, "data", { limit: 3 })).toHaveLength(3);
  });
});

describe("find_tools / call_tool", () => {
  const ctx = {} as never;

  it("find_tools rejects an unknown module and an empty request", async () => {
    await expect(findTool.execute({ query: "x", module: "nope", limit: 8 } as never, ctx)).rejects.toThrow(/Unknown module "nope"/);
    await expect(findTool.execute({ query: " ", limit: 8 } as never, ctx)).rejects.toBeInstanceOf(UserError);
  });

  it("call_tool validates arguments like a direct call", async () => {
    await expect(callTool.execute({ name: "treasury_search_datasets", arguments: {} } as never, ctx))
      .rejects.toThrow(/Invalid arguments for "treasury_search_datasets": query: .*find_tools/);
  });

  it("call_tool suggests names for unknown tools", async () => {
    await expect(callTool.execute({ name: "treasury_search", arguments: {} } as never, ctx))
      .rejects.toThrow(/Unknown tool "treasury_search"\. Did you mean: treasury_search_datasets/);
  });

  it("call_tool runs a tool, and flags deprecated names", async () => {
    const direct = await callTool.execute({ name: "treasury_search_datasets", arguments: { query: "debt" } } as never, ctx);
    expect(JSON.parse(direct as string).summary).toMatch(/endpoint\(s\) matching "debt"/);

    const viaAlias = await callTool.execute({ name: "search_datasets", arguments: { query: "debt" } } as never, ctx) as { content: { text: string }[] };
    expect(viaAlias.content[0].text).toBe('Note: "search_datasets" is deprecated; use treasury_search_datasets.');
    expect(viaAlias.content[1].text).toBe(direct);
  });
});
