/**
 * End-to-end: code_mode validates tool_args against the target tool's schema
 * before any upstream call, and reports failures as MCP tool errors.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectStdio } from "./helpers.js";

type CallResult = { isError?: boolean; content: { type: string; text?: string }[] };

function textOf(res: CallResult): string {
  return res.content.map(c => c.text ?? "").join("\n");
}

describe("code_mode argument validation", () => {
  let session: Awaited<ReturnType<typeof connectStdio>>;

  beforeAll(async () => { session = await connectStdio({ args: ["--modules", "fred,treasury"] }); }, 30_000);
  afterAll(async () => { await session?.close(); });

  it("rejects out-of-bounds args instead of passing them upstream", async () => {
    const res = await session.client.callTool({
      name: "code_mode",
      arguments: { tool: "fred_series_data", tool_args: { series_id: "GDP", limit: 5_000_000 }, code: "console.log(1)" },
    }) as CallResult;
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('Invalid arguments for "fred_series_data"');
    expect(textOf(res)).toContain("limit");
  });

  it("rejects missing required args", async () => {
    const res = await session.client.callTool({
      name: "code_mode",
      arguments: { tool: "fred_series_data", tool_args: {}, code: "console.log(1)" },
    }) as CallResult;
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("series_id");
  });

  it("rejects values outside an enum", async () => {
    const res = await session.client.callTool({
      name: "code_mode",
      arguments: { tool: "fred_series_data", tool_args: { series_id: "GDP", sort_order: "sideways" }, code: "console.log(1)" },
    }) as CallResult;
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("sort_order");
  });

  it("suggests close matches for unknown tools", async () => {
    const res = await session.client.callTool({
      name: "code_mode",
      arguments: { tool: "fred_series", code: "console.log(1)" },
    }) as CallResult;
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("not found");
    expect(textOf(res)).toContain("fred_series_data");
  });
});
