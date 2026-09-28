/**
 * End-to-end: the built server over stdio, local operations only (no upstream API calls).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, afterAll } from "vitest";
import { connectStdio, repoRoot, runCli } from "./helpers.js";
import { moduleDirs, getModule } from "../helpers.js";

const moduleToolCount = moduleDirs.reduce((n, d) => n + (getModule(d).tools as unknown[]).length, 0);
const SERVER_TOOLS = ["clear_cache", "code_mode"];
const PACKAGE_JSON_VERSION = (JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf-8")) as { version: string }).version;

describe("version", () => {
  it("--version prints the package.json version and exits", async () => {
    const res = await runCli(["--version"]);
    expect(res.code).toBe(0);
    expect(res.stdout.trim()).toBe(PACKAGE_JSON_VERSION);
  });
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
    expect(names.length).toBe(moduleToolCount + SERVER_TOOLS.length);
    for (const t of SERVER_TOOLS) expect(names).toContain(t);
    for (const tool of tools) expect(tool.annotations?.readOnlyHint, tool.name).toBeDefined();
  });

  it("serves the govdata://reference resource", async () => {
    const res = await session.client.readResource({ uri: "govdata://reference" });
    const text = (res.contents[0] as { text?: string }).text ?? "";
    expect(text).toContain("# US Government Open Data — API Reference");
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
  it("--modules loads only the requested modules", async () => {
    const session = await connectStdio({ args: ["--modules", "fred,treasury"] });
    try {
      const { tools } = await session.client.listTools();
      const expected =
        (getModule("fred").tools as unknown[]).length +
        (getModule("treasury").tools as unknown[]).length +
        SERVER_TOOLS.length;
      expect(tools.length).toBe(expected);
    } finally {
      await session.close();
    }
  }, 30_000);
});

describe("CLI", () => {
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
