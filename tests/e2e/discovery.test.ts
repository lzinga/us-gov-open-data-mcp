/**
 * End-to-end: discovery tool mode over stdio, local tools only (no upstream calls).
 */

import { describe, it, expect, afterAll } from "vitest";
import { connectStdio, runCli } from "./helpers.js";
import { getModule } from "../helpers.js";

const loaded = ["fred", "treasury"];
const dataToolCount = loaded.reduce((n, d) => n + (getModule(d).tools as unknown[]).length, 0);

describe("--tool-mode discovery", () => {
  let session: Awaited<ReturnType<typeof connectStdio>>;
  afterAll(async () => { await session?.close(); });

  it("lists only the discovery and server tools", async () => {
    session = await connectStdio({ args: ["--tool-mode", "discovery", "--modules", loaded.join(",")] });
    const { tools } = await session.client.listTools();
    expect(tools.map(t => t.name).sort()).toEqual(["call_tool", "clear_cache", "code_mode", "find_tools"]);
    expect(session.client.getInstructions()).toContain("== TOOL DISCOVERY ==");
    expect(session.client.getInstructions()).toContain(`Its ${dataToolCount} data tools`);
  }, 30_000);

  it("finds a tool and runs it with call_tool (same result as full mode)", async () => {
    const found = await session.client.callTool({ name: "find_tools", arguments: { query: "treasury datasets search" } });
    const items = JSON.parse((found.content as { text: string }[])[0].text).data.items as { name: string; inputSchema: unknown }[];
    expect(items.map(i => i.name)).toContain("treasury_search_datasets");
    expect(items.find(i => i.name === "treasury_search_datasets")!.inputSchema).toMatchObject({ properties: { query: { type: "string" } } });

    const viaDiscovery = await session.client.callTool({ name: "call_tool", arguments: { name: "treasury_search_datasets", arguments: { query: "debt" } } });
    expect(viaDiscovery.isError).toBeFalsy();

    const full = await connectStdio({ args: ["--modules", loaded.join(",")] });
    try {
      const direct = await full.client.callTool({ name: "treasury_search_datasets", arguments: { query: "debt" } });
      expect(viaDiscovery.content).toEqual(direct.content);
    } finally {
      await full.close();
    }
  }, 30_000);

  it("reports invalid arguments and unknown tools as tool errors", async () => {
    const bad = await session.client.callTool({ name: "call_tool", arguments: { name: "treasury_search_datasets", arguments: {} } });
    expect(bad.isError).toBe(true);
    expect(JSON.stringify(bad.content)).toContain("query");

    const unknown = await session.client.callTool({ name: "call_tool", arguments: { name: "fred_series", arguments: {} } });
    expect(unknown.isError).toBe(true);
    expect(JSON.stringify(unknown.content)).toContain("Did you mean");
  });

  it("flags deprecated names", async () => {
    const res = await session.client.callTool({ name: "call_tool", arguments: { name: "search_datasets", arguments: { query: "gold" } } });
    expect((res.content as { text: string }[])[0].text).toMatch(/deprecated; use treasury_search_datasets/);
  });

  it("produced no protocol errors", () => {
    expect(session.protocolErrors).toEqual([]);
  });
});

describe("--tool-mode validation", () => {
  it("rejects an unknown mode", async () => {
    const res = await runCli(["--tool-mode", "lazy"]);
    expect(res.code).toBe(1);
    expect(res.stderr).toMatch(/Unknown tool mode "lazy"/);
  }, 30_000);
});
