/**
 * Tool registry — name resolution, aliases, and schema-validated invocation.
 */

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { ToolRegistry, buildToolRegistry, formatIssues } from "../src/server/tool-registry.js";
import { moduleDirs, getModule } from "./helpers.js";
import type { ApiModule } from "../src/shared/types.js";

function fakeTool(name: string, execute = vi.fn(async (args: unknown) => JSON.stringify(args))) {
  return {
    name,
    description: `${name} description`,
    parameters: z.object({
      query: z.string(),
      limit: z.number().int().max(50).default(20),
      sort: z.enum(["asc", "desc"]).optional(),
    }),
    execute,
  } as any;
}

describe("ToolRegistry", () => {
  it("resolves canonical names and aliases", () => {
    const reg = new ToolRegistry();
    reg.register("mod", fakeTool("mod_search"));
    reg.addAlias("search", "mod_search");

    expect(reg.resolve("mod_search")?.name).toBe("mod_search");
    expect(reg.resolve("search")?.name).toBe("mod_search");
    expect(reg.resolve("search")?.module).toBe("mod");
    expect(reg.isAlias("search")).toBe(true);
    expect(reg.isAlias("mod_search")).toBe(false);
    expect(reg.resolve("missing")).toBeUndefined();
    expect(reg.names()).toEqual(["mod_search"]);
    expect(reg.size).toBe(1);
  });

  it("rejects duplicate tools and bad aliases", () => {
    const reg = new ToolRegistry();
    reg.register("mod", fakeTool("mod_search"));
    expect(() => reg.register("other", fakeTool("mod_search"))).toThrow(/Duplicate tool name/);
    expect(() => reg.addAlias("x", "nope")).toThrow(/unknown tool/);
    reg.addAlias("x", "mod_search");
    expect(() => reg.addAlias("x", "mod_search")).toThrow(/collides/);
    expect(() => reg.addAlias("mod_search", "mod_search")).toThrow(/collides/);
  });

  it("applies schema defaults before executing", async () => {
    const execute = vi.fn(async (args: unknown) => JSON.stringify(args));
    const reg = new ToolRegistry();
    reg.register("mod", fakeTool("mod_search", execute));

    const res = await reg.invoke("mod_search", { query: "gdp" });
    expect(res.ok).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toEqual({ query: "gdp", limit: 20 });
  });

  it("rejects invalid args without executing", async () => {
    const execute = vi.fn(async () => "should not run");
    const reg = new ToolRegistry();
    reg.register("mod", fakeTool("mod_search", execute));

    const tooBig = await reg.invoke("mod_search", { query: "gdp", limit: 5000 });
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) {
      expect(tooBig.kind).toBe("invalid_args");
      expect(tooBig.message).toContain("limit");
    }

    const badEnum = await reg.invoke("mod_search", { query: "gdp", sort: "sideways" });
    expect(badEnum.ok).toBe(false);
    if (!badEnum.ok) expect(badEnum.message).toContain("sort");

    const missing = await reg.invoke("mod_search", {});
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.message).toContain("query");

    expect(execute).not.toHaveBeenCalled();
  });

  it("reports unknown tools and execution errors without throwing", async () => {
    const reg = new ToolRegistry();
    reg.register("mod", fakeTool("mod_search", vi.fn(async () => { throw new Error("upstream 503"); })));

    const unknown = await reg.invoke("nope", {});
    expect(unknown).toMatchObject({ ok: false, kind: "unknown_tool" });

    const failed = await reg.invoke("mod_search", { query: "x" });
    expect(failed).toMatchObject({ ok: false, kind: "execution_error", message: "upstream 503" });
  });

  it("invokes through an alias", async () => {
    const execute = vi.fn(async () => "ok");
    const reg = buildToolRegistry([{ name: "mod", tools: [fakeTool("mod_search", execute)] }], {
      legacy_search: "mod_search",
      orphan_alias: "not_loaded_tool",
    });
    const res = await reg.invoke("legacy_search", { query: "a" });
    expect(res).toMatchObject({ ok: true, result: "ok" });
    // Aliases for modules that aren't loaded are skipped, not fatal.
    expect(reg.resolve("orphan_alias")).toBeUndefined();
  });

  it("formats nested issue paths", () => {
    expect(formatIssues([{ message: "Required", path: ["a", { key: "b" }, 0] }])).toBe("a.b.0: Required");
    expect(formatIssues([{ message: "Bad" }])).toBe("(root): Bad");
  });

  it("suggests similar tool names", () => {
    const reg = new ToolRegistry();
    for (const n of ["fred_search", "fred_series_data", "fred_series_info", "bls_series_data", "fda_count"]) {
      reg.register(n.split("_")[0], fakeTool(n));
    }
    const hints = reg.suggest("fred_series");
    expect(hints.slice(0, 2).sort()).toEqual(["fred_series_data", "fred_series_info"]);
    expect(hints).not.toContain("fda_count");
    expect(reg.suggest("zzz")).toEqual([]);
  });
});

describe("registry built from real modules", () => {
  const modules = moduleDirs.map(d => getModule(d) as unknown as ApiModule);
  const registry = buildToolRegistry(modules);

  it("registers every module tool exactly once", () => {
    const total = modules.reduce((n, m) => n + m.tools.length, 0);
    expect(registry.size).toBe(total);
  });

  it("every tool exposes a Standard Schema validator", () => {
    for (const entry of registry.entries()) {
      const schema = entry.tool.parameters as any;
      expect(typeof schema?.["~standard"]?.validate, `${entry.name} parameters`).toBe("function");
    }
  });

  it("applies real schema defaults (fred_series_data limit)", async () => {
    const res = await registry.validate("fred_series_data", { series_id: "GDP" });
    expect(res.ok).toBe(true);
    if (res.ok) expect((res.value as { limit: number }).limit).toBe(1000);
  });

  it("enforces real schema bounds (lobbying_search page_size max 25)", async () => {
    const res = await registry.validate("lobbying_search", { page_size: 500 });
    expect(res.ok).toBe(false);
  });
});
