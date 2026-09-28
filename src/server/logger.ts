/**
 * Server logger passed to FastMCP.
 *
 * With the stdio transport, stdout carries JSON-RPC frames only, so nothing
 * here may write to stdout. FastMCP reports through `debug`/`info` in some
 * sessions (e.g. "[FastMCP debug] listRoots method not supported by client");
 * `console.debug`/`console.info` write to stdout in Node, so every level is
 * routed to stderr. Debug output is dropped unless DEBUG or DEBUG_MCP is set.
 */

type LogFn = (...args: unknown[]) => void;

export interface ServerLogger {
  debug: LogFn;
  error: LogFn;
  info: LogFn;
  log: LogFn;
  warn: LogFn;
}

/** FastMCP warnings that are expected and harmless for stdio clients. */
const SUPPRESSED_WARNINGS = [
  // Some MCP clients (including some VS Code builds) don't report capabilities
  // during init; FastMCP warns after a short retry loop.
  "[FastMCP warning] could not infer client capabilities",
];

export function createServerLogger(
  env: Record<string, string | undefined> = process.env,
  write: LogFn = (...args) => console.error(...args),
): ServerLogger {
  const debugEnabled = Boolean(env.DEBUG || env.DEBUG_MCP);
  return {
    debug: (...args) => { if (debugEnabled) write(...args); },
    error: write,
    info: write,
    log: write,
    warn: (...args) => {
      const suppressed = args.some(
        a => typeof a === "string" && SUPPRESSED_WARNINGS.some(w => a.includes(w)),
      );
      if (!suppressed) write(...args);
    },
  };
}
