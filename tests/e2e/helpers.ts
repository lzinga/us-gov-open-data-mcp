/**
 * End-to-end helpers: spawn the built server (dist/server.js) and talk MCP to it.
 *
 * These tests never call upstream government APIs. The spawned server gets a
 * minimal environment (no API keys from the developer's shell), a temporary
 * working directory (so the repo's .env is not loaded), and the temporary
 * cache directory set up by tests/setup/isolate-cache.ts.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const serverPath = join(repoRoot, "dist", "server.js");

/** Fail fast with a clear message when the server hasn't been built. */
export function assertBuilt(): void {
  if (!existsSync(serverPath)) {
    throw new Error("dist/server.js not found. Run `npm run build` before the e2e tests.");
  }
}

const PASSTHROUGH_ENV = [
  "PATH", "Path", "PATHEXT", "SystemRoot", "SYSTEMROOT", "windir", "ComSpec",
  "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA",
];

/** Minimal child environment: OS essentials + isolated cache + explicit extras. */
export function childEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of PASSTHROUGH_ENV) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  if (process.env.XDG_CACHE_HOME) env.XDG_CACHE_HOME = process.env.XDG_CACHE_HOME;
  return { ...env, ...extra };
}

/** A fresh working directory, optionally containing a .env file. */
export function tempCwd(dotenv?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "govdata-e2e-cwd-"));
  if (dotenv !== undefined) writeFileSync(join(dir, ".env"), dotenv);
  return dir;
}

export interface ConnectOptions {
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

/** Connect an MCP SDK client to a freshly spawned stdio server. */
export async function connectStdio(opts: ConnectOptions = {}) {
  assertBuilt();
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath, ...(opts.args ?? [])],
    env: childEnv(opts.env),
    cwd: opts.cwd ?? tempCwd(),
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", chunk => { stderr += String(chunk); });

  const client = new Client({ name: "govdata-e2e", version: "1.0.0" }, { capabilities: {} });
  const protocolErrors: Error[] = [];
  client.onerror = err => protocolErrors.push(err);
  await client.connect(transport);

  return {
    client,
    protocolErrors,
    stderr: () => stderr,
    close: () => client.close(),
  };
}

/** Result of running the server CLI to completion. */
export interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Run `node dist/server.js <args>` to completion (for non-server CLI modes). */
export function runCli(args: string[], opts: { env?: Record<string, string>; cwd?: string; timeoutMs?: number } = {}): Promise<CliResult> {
  assertBuilt();
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [serverPath, ...args], {
      cwd: opts.cwd ?? tempCwd(),
      env: childEnv(opts.env),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", d => { stdout += String(d); });
    child.stderr.on("data", d => { stderr += String(d); });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`CLI timed out: ${args.join(" ")}\nstderr: ${stderr}`));
    }, opts.timeoutMs ?? 30_000);
    child.on("error", reject);
    child.on("close", code => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
  });
}

type Rpc = (method: string, params?: unknown) => Promise<unknown>;
type Notify = (method: string, params?: unknown) => void;

/**
 * Raw JSON-RPC stdio session that records every line the server writes to
 * stdout, so tests can assert stdout carries nothing but JSON-RPC frames.
 * The client advertises no capabilities (no roots), answers server pings,
 * and rejects any other server-initiated request with "method not found".
 */
export async function rawStdioSession(opts: ConnectOptions & {
  script: (rpc: Rpc, notify: Notify) => Promise<void>;
  settleMs?: number;
}): Promise<{ stdoutLines: string[]; stderr: string; exitCode: number | null }> {
  assertBuilt();
  const child = spawn(process.execPath, [serverPath, ...(opts.args ?? [])], {
    cwd: opts.cwd ?? tempCwd(),
    env: childEnv(opts.env),
    stdio: ["pipe", "pipe", "pipe"],
  });

  const stdoutLines: string[] = [];
  let buffer = "";
  let stderr = "";
  let nextId = 1;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  const send = (msg: unknown) => child.stdin.write(JSON.stringify(msg) + "\n");

  child.stderr.on("data", d => { stderr += String(d); });
  child.stdout.on("data", chunk => {
    buffer += String(chunk);
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      stdoutLines.push(line);
      let msg: any;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg && typeof msg === "object" && "id" in msg && ("result" in msg || "error" in msg)) {
        const waiter = pending.get(msg.id);
        if (waiter) {
          pending.delete(msg.id);
          if (msg.error) waiter.reject(new Error(msg.error.message ?? "JSON-RPC error"));
          else waiter.resolve(msg.result);
        }
      } else if (msg && typeof msg === "object" && "method" in msg && "id" in msg) {
        if (msg.method === "ping") send({ jsonrpc: "2.0", id: msg.id, result: {} });
        else send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
      }
    }
  });

  const rpc: Rpc = (method, params) =>
    new Promise<unknown>((res, rej) => {
      const id = nextId++;
      pending.set(id, { resolve: res, reject: rej });
      send({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) });
    });
  const notify: Notify = (method, params) =>
    send({ jsonrpc: "2.0", method, ...(params === undefined ? {} : { params }) });

  const exited = new Promise<number | null>(res => child.on("close", code => res(code)));
  try {
    await opts.script(rpc, notify);
    await new Promise(r => setTimeout(r, opts.settleMs ?? 1500));
  } finally {
    child.stdin.end();
    const timer = setTimeout(() => child.kill(), 3000);
    await exited;
    clearTimeout(timer);
  }
  if (buffer.trim()) stdoutLines.push(buffer.trim());
  return { stdoutLines, stderr, exitCode: await exited };
}

/** Standard MCP initialize handshake for raw sessions. */
export async function initializeRaw(rpc: Rpc, notify: Notify, capabilities: Record<string, unknown> = {}): Promise<any> {
  const result = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities,
    clientInfo: { name: "govdata-e2e-raw", version: "1.0.0" },
  });
  notify("notifications/initialized");
  return result;
}

/** Lines that are not valid JSON-RPC 2.0 messages. */
export function invalidJsonRpcLines(lines: string[]): string[] {
  return lines.filter(line => {
    try {
      const msg = JSON.parse(line);
      return !(msg && typeof msg === "object" && msg.jsonrpc === "2.0");
    } catch {
      return true;
    }
  });
}
