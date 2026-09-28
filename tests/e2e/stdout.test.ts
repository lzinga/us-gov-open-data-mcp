/**
 * End-to-end: stdout must carry only JSON-RPC frames for the whole stdio session.
 *
 * The client advertises no capabilities (no roots support), which exercises
 * FastMCP's capability-negotiation logging path, and the working directory
 * contains a .env file so dotenv runs its load path too.
 */

import { describe, it, expect } from "vitest";
import { rawStdioSession, initializeRaw, invalidJsonRpcLines, tempCwd } from "./helpers.js";

describe("stdio stdout purity", () => {
  it("writes only JSON-RPC frames to stdout during a full session", async () => {
    const { stdoutLines, stderr } = await rawStdioSession({
      cwd: tempCwd("GOVDATA_E2E_DUMMY=1\n"),
      settleMs: 2500,
      script: async (rpc, notify) => {
        await initializeRaw(rpc, notify);
        await rpc("tools/list");
        await rpc("prompts/list");
        await rpc("resources/list");
        await rpc("tools/call", { name: "clear_cache", arguments: {} });
      },
    });

    expect(stdoutLines.length).toBeGreaterThanOrEqual(5);
    expect(invalidJsonRpcLines(stdoutLines), `stderr was:\n${stderr}`).toEqual([]);
  }, 30_000);

  it("stays clean when a client advertises roots but cannot list them", async () => {
    // FastMCP logs "[FastMCP debug] listRoots method not supported by client"
    // through the server logger in this case; the logger must not use stdout.
    const { stdoutLines, stderr } = await rawStdioSession({
      settleMs: 2500,
      script: async (rpc, notify) => {
        await initializeRaw(rpc, notify, { roots: { listChanged: true } });
        await rpc("tools/list");
        notify("notifications/roots/list_changed");
      },
    });

    expect(stdoutLines.length).toBeGreaterThanOrEqual(2);
    expect(invalidJsonRpcLines(stdoutLines), `stderr was:\n${stderr}`).toEqual([]);
  }, 30_000);
});
