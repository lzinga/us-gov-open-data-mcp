/**
 * Server logger: nothing may reach stdout (the stdio JSON-RPC channel).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createServerLogger } from "../src/server/logger.js";

afterEach(() => vi.restoreAllMocks());

describe("createServerLogger", () => {
  it("routes every level through console.error, never the stdout console methods", () => {
    const toStdout = [
      vi.spyOn(console, "log").mockImplementation(() => {}),
      vi.spyOn(console, "info").mockImplementation(() => {}),
      vi.spyOn(console, "debug").mockImplementation(() => {}),
    ];
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = createServerLogger({ DEBUG_MCP: "1" });

    logger.debug("[FastMCP debug] listRoots method not supported by client");
    logger.info("[FastMCP info] server ping failed");
    logger.log("log");
    logger.warn("warn");
    logger.error("error");

    for (const spy of toStdout) expect(spy).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledTimes(5);
  });

  it("drops debug output unless DEBUG or DEBUG_MCP is set", () => {
    const write = vi.fn();
    createServerLogger({}, write).debug("quiet");
    expect(write).not.toHaveBeenCalled();

    createServerLogger({ DEBUG: "1" }, write).debug("loud");
    expect(write).toHaveBeenCalledWith("loud");
  });

  it("suppresses the harmless client-capabilities warning only", () => {
    const write = vi.fn();
    const logger = createServerLogger({}, write);
    logger.warn("[FastMCP warning] could not infer client capabilities after 10 attempts.");
    expect(write).not.toHaveBeenCalled();
    logger.warn("something else");
    expect(write).toHaveBeenCalledWith("something else");
  });
});
