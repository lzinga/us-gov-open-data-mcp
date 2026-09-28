/**
 * End-to-end: the built server over stdio, local operations only (no upstream API calls).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, afterAll } from "vitest";
import { connectStdio, repoRoot, runCli } from "./helpers.js";
import { moduleDirs, getModule } from "../helpers.js";

const moduleToolCount = moduleDirs.reduce((n, d) => n + (getModule(d).tools as unknown[]).length, 0);
const aliasCount = (d: string) => Object.keys((getModule(d).deprecatedAliases as Record<string, string> | undefined) ?? {}).length;
const totalAliases = moduleDirs.reduce((n, d) => n + aliasCount(d), 0);
const SERVER_TOOLS = ["clear_cache", "code_mode"];
const PACKAGE_JSON_VERSION = (JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf-8")) as { version: string }).version;

describe("version", () => {
  it("--version prints the package.json version and exits", async () => {
    const res = await runCli(["--version"]);
    expect(res.code).toBe(0);
    expect(res.stdout.trim()).toBe(PACKAGE_JSON_VERSION);
  }, 30_000);
});

describe("stdio server (all modules)", () => {
  let session: Awaited<ReturnType<typeof connectStdio>>;

  afterAll(async () => { await session?.close(); });

  it("initializes and reports server info", async () => {
    session = await connectStdio();
    const info = session.client.getServerVersion();
    expect(info?.name).toBe("US Government Open Data");
    expect(info?.version).toBe(PACKAGE_JSON_VERSION);
    expect(session.client.getInstructions()).toContain("CROSS-REFERENCING GUIDE");
  }, 30_000);

  it("lists every module tool plus the server tools", async () => {
    const { tools } = await session.client.listTools();
    const names = tools.map(t => t.name);
    expect(names.length).toBe(moduleToolCount + totalAliases + SERVER_TOOLS.length);
    for (const t of SERVER_TOOLS) expect(names).toContain(t);
    for (const tool of tools) expect(tool.annotations?.readOnlyHint, tool.name).toBeDefined();
  });

  it("serves deprecated Treasury aliases that behave like the new names", async () => {
    const { tools } = await session.client.listTools();
    const alias = tools.find(t => t.name === "search_datasets");
    expect(alias?.description).toMatch(/^\[Deprecated — use treasury_search_datasets\] /);
    expect(alias?.annotations?.title).toMatch(/\(deprecated\)$/);
    expect(tools.find(t => t.name === "treasury_search_datasets")?.inputSchema).toEqual(alias?.inputSchema);

    // Local catalog search: no upstream request.
    const viaAlias = await session.client.callTool({ name: "search_datasets", arguments: { query: "debt" } });
    const viaNew = await session.client.callTool({ name: "treasury_search_datasets", arguments: { query: "debt" } });
    expect(viaAlias.isError).toBeFalsy();
    expect(viaAlias.content).toEqual(viaNew.content);
  });

  it("serves the govdata://reference resource", async () => {
    const res = await session.client.readResource({ uri: "govdata://reference" });
    const text = (res.contents[0] as { text?: string }).text ?? "";
    expect(text).toContain("# US Government Open Data — API Reference");
    expect(text).toContain("## Reference Data");
    expect(text).toContain("`govdata://congress/reference`");
  });

  it("serves per-module reference resources", async () => {
    const { resources } = await session.client.listResources();
    const uris = resources.map(r => r.uri);
    expect(uris).toContain("govdata://fbi/reference");
    expect(uris).not.toContain("govdata://census/reference"); // no reference data
    const res = await session.client.readResource({ uri: "govdata://congress/reference" });
    const text = (res.contents[0] as { text?: string }).text ?? "";
    expect(text).toContain("# Congress.gov — reference data");
    expect(text).toContain("| `hr` |");
  });

  it("lists and renders prompts", async () => {
    const { prompts } = await session.client.listPrompts();
    expect(prompts.length).toBeGreaterThan(30);
    const fiscal = await session.client.getPrompt({ name: "fiscal_snapshot" });
    expect(JSON.stringify(fiscal.messages)).toContain("debt");
  });

  it("runs clear_cache locally", async () => {
    const res = await session.client.callTool({ name: "clear_cache", arguments: { source: "fred" } });
    expect(JSON.stringify(res.content)).toContain("Cache cleared: fred");
  });

  it("produced no protocol errors", () => {
    expect(session.protocolErrors).toEqual([]);
  });
});

describe("stdio server (selective loading)", () => {
  it("prompts mention only loaded tools", async () => {
    const session = await connectStdio({ args: ["--modules", "fred"] });
    try {
      const allTools = moduleDirs.flatMap(d => [
        ...(getModule(d).tools as { name: string }[]).map(t => t.name),
        ...Object.keys((getModule(d).deprecatedAliases as Record<string, string> | undefined) ?? {}),
      ]);
      const loaded = new Set((getModule("fred").tools as { name: string }[]).map(t => t.name));
      const { prompts } = await session.client.listPrompts();
      expect(prompts.length).toBeGreaterThan(0);
      for (const p of prompts) {
        const args = Object.fromEntries((p.arguments ?? []).map(a => [a.name, "test-value"]));
        const text = JSON.stringify((await session.client.getPrompt({ name: p.name, arguments: args })).messages);
        const offenders = allTools.filter(t => !loaded.has(t) && new RegExp(`\\b${t}\\b`).test(text));
        expect(offenders, p.name).toEqual([]);
      }
    } finally {
      await session.close();
    }
  }, 60_000);

  it("--modules loads only the requested modules", async () => {
    const session = await connectStdio({ args: ["--modules", "fred,treasury"] });
    try {
      const { tools } = await session.client.listTools();
      const expected =
        (getModule("fred").tools as unknown[]).length +
        (getModule("treasury").tools as unknown[]).length +
        aliasCount("treasury") +
        SERVER_TOOLS.length;
      expect(tools.length).toBe(expected);
    } finally {
      await session.close();
    }
  }, 30_000);
});

describe("CLI", () => {
  it("--domains loads every module in those domains, unioned with --modules", async () => {
    const inDomain = moduleDirs.filter(d => (getModule(d).domains as string[]).includes("energy"));
    const expected = new Set([...inDomain, "cdc"]);
    const session = await connectStdio({ args: ["--domains", "energy", "--modules", "cdc"] });
    try {
      const { tools } = await session.client.listTools();
      const count = [...expected].reduce((n, d) => n + (getModule(d).tools as unknown[]).length + aliasCount(d), 0);
      expect(tools.length).toBe(count + SERVER_TOOLS.length);
    } finally {
      await session.close();
    }
  }, 30_000);

  it("DOMAINS and HIDE_UNCONFIGURED work from the environment", async () => {
    // No keys in the child env: keyed economy modules (fred, bea, …) are hidden, keyless/optional ones stay.
    const session = await connectStdio({ env: { DOMAINS: "economy", HIDE_UNCONFIGURED: "1" } });
    try {
      const names = new Set((await session.client.listTools()).tools.map(t => t.name));
      expect(names.has("treasury_query_fiscal_data")).toBe(true);
      expect(names.has("bls_series_data")).toBe(true); // BLS key is optional
      expect([...names].some(n => n.startsWith("fred_"))).toBe(false);
      expect(session.stderr()).toMatch(/Hidden \(no FRED_API_KEY\): fred/);
    } finally {
      await session.close();
    }
  }, 30_000);

  it("rejects unknown module and domain names", async () => {
    const mod = await runCli(["--modules", "fred,frde"]);
    expect(mod.code).toBe(1);
    expect(mod.stderr).toMatch(/Unknown module: frde/);
    const dom = await runCli(["--domains", "econ"]);
    expect(dom.code).toBe(1);
    expect(dom.stderr).toMatch(/Unknown domain: econ/);
  }, 30_000);

  it("--list-modules --json prints parseable JSON on stdout", async () => {
    const res = await runCli(["--list-modules", "--json"]);
    expect(res.code).toBe(0);
    // Every module in dist/apis must import cleanly.
    expect(res.stderr).not.toContain("Failed to load module");
    const parsed = JSON.parse(res.stdout) as { name: string; toolCount: number }[];
    expect(parsed.length).toBe(moduleDirs.length);
    expect(parsed.reduce((n, m) => n + m.toolCount, 0)).toBe(moduleToolCount);
  }, 30_000);

  it("--list-modules --json distinguishes optional from required keys", async () => {
    const res = await runCli(["--list-modules", "--json"]);
    const parsed = JSON.parse(res.stdout) as { name: string; requiresApiKey: boolean; optionalApiKey: boolean }[];
    const byName = new Map(parsed.map(m => [m.name, m]));
    expect(byName.get("fda")).toMatchObject({ requiresApiKey: false, optionalApiKey: true });
    expect(byName.get("bls")).toMatchObject({ requiresApiKey: false, optionalApiKey: true });
    expect(byName.get("fred")).toMatchObject({ requiresApiKey: true, optionalApiKey: false });
    expect(byName.get("treasury")).toMatchObject({ requiresApiKey: false, optionalApiKey: false });
  }, 30_000);
});

describe("startup warnings", () => {
  it("warns about missing required keys but not optional ones", async () => {
    const session = await connectStdio({ args: ["--modules", "fda,bls,fred"] });
    try {
      // Give the startup warnings a moment to flush.
      await new Promise(r => setTimeout(r, 200));
      const stderr = session.stderr();
      expect(stderr).toContain("FRED_API_KEY not set");
      expect(stderr).not.toContain("BLS_API_KEY not set");
      expect(stderr).not.toContain("DATA_GOV_API_KEY not set");

      const res = await session.client.readResource({ uri: "govdata://reference" });
      const text = (res.contents[0] as { text?: string }).text ?? "";
      expect(text).toContain("## Optional API Keys Not Set");
      expect(text).toMatch(/FDA \(OpenFDA\) — Optional key not set/);
      expect(text).toMatch(/## Missing API Keys[\s\S]*FRED_API_KEY/);
    } finally {
      await session.close();
    }
  }, 30_000);
});
