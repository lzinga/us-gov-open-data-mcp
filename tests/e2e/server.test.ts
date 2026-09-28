/**
 * End-to-end: the built server over stdio, local operations only (no upstream API calls).
 */

import { describe, it, expect, afterAll } from "vitest";
import { connectStdio, runCli } from "./helpers.js";
import { moduleDirs, getModule } from "../helpers.js";

const moduleToolCount = moduleDirs.reduce((n, d) => n + (getModule(d).tools as unknown[]).length, 0);
const SERVER_TOOLS = ["clear_cache", "code_mode"];

describe("stdio server (all modules)", () => {
  let session: Awaited<ReturnType<typeof connectStdio>>;

  afterAll(async () => { await session?.close(); });

  it("initializes and reports server info", async () => {
    session = await connectStdio();
    const info = session.client.getServerVersion();
    expect(info?.name).toBe("US Government Open Data");
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
    const parsed = JSON.parse(res.stdout) as { name: string; toolCount: number }[];
    expect(parsed.length).toBe(moduleDirs.length);
    expect(parsed.reduce((n, m) => n + m.toolCount, 0)).toBe(moduleToolCount);
  }, 30_000);
});
