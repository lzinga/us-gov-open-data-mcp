/**
 * End-to-end: the HTTP Stream transport with and without MCP_AUTH_TOKEN.
 * Servers bind to 127.0.0.1 only, so no firewall prompts; the non-loopback
 * refusal exits before binding anything.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { describe, it, expect, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { assertBuilt, childEnv, runCli, serverPath, tempCwd } from "./helpers.js";

const TOKEN = "e2e-token-0123456789abcdef";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

const children: ChildProcess[] = [];
afterAll(() => {
  for (const c of children) c.kill();
});

/** Start the HTTP server on a free loopback port and wait until /health answers. */
async function startHttp(env: Record<string, string> = {}): Promise<{ base: string; stderr: () => string }> {
  assertBuilt();
  const port = await freePort();
  const child = spawn(process.execPath, [serverPath, "--transport", "httpStream", "--port", String(port), "--modules", "fred"], {
    cwd: tempCwd(),
    env: childEnv({ MCP_HOST: "127.0.0.1", ...env }),
    stdio: ["ignore", "ignore", "pipe"],
  });
  children.push(child);
  let stderr = "";
  child.stderr!.on("data", d => { stderr += String(d); });
  const base = `http://127.0.0.1:${port}`;
  const until = Date.now() + 20_000;
  while (Date.now() < until) {
    if (child.exitCode !== null) throw new Error(`server exited ${child.exitCode}: ${stderr}`);
    try {
      if ((await fetch(`${base}/health`)).ok) return { base, stderr: () => stderr };
    } catch { /* not listening yet */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`server did not become healthy: ${stderr}`);
}

const initialize = (headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
  body: JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1.0.0" } },
  }),
});

async function connectClient(base: string, token?: string) {
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
    requestInit: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
  const client = new Client({ name: "govdata-e2e-http", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

describe("HTTP transport with MCP_AUTH_TOKEN", () => {
  let base: string;

  it("starts and reports that a token is required", async () => {
    const srv = await startHttp({ MCP_AUTH_TOKEN: TOKEN });
    base = srv.base;
    expect(srv.stderr()).toContain("bearer token required");
  }, 30_000);

  it("keeps /health open for probes", async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect((await res.text()).toLowerCase()).toContain("ok");
  });

  it("rejects MCP requests without a token or with a wrong one", async () => {
    const none = await fetch(`${base}/mcp`, initialize());
    expect(none.status).toBe(401);
    expect(none.headers.get("www-authenticate")).toMatch(/^Bearer /);

    const wrong = await fetch(`${base}/mcp`, initialize({ Authorization: "Bearer not-the-right-token-at-all" }));
    expect(wrong.status).toBe(401);
  });

  it("rejects the legacy SSE endpoint without a token", async () => {
    const res = await fetch(`${base}/sse`, { headers: { Accept: "text/event-stream" } });
    expect(res.status).toBe(401);
    await res.body?.cancel();
  });

  it("serves an MCP client that sends the token", async () => {
    const client = await connectClient(base, TOKEN);
    try {
      expect(client.getServerVersion()?.name).toBe("US Government Open Data");
      const { tools } = await client.listTools();
      expect(tools.map(t => t.name)).toContain("fred_series_data");
    } finally {
      await client.close();
    }
  }, 30_000);
});

describe("HTTP transport without a token", () => {
  it("still serves loopback clients", async () => {
    const { base, stderr } = await startHttp();
    expect(stderr()).toContain("no authentication");
    const client = await connectClient(base);
    try {
      const { tools } = await client.listTools();
      expect(tools.length).toBeGreaterThan(0);
    } finally {
      await client.close();
    }
  }, 30_000);

  it("refuses to bind a non-loopback address", async () => {
    const res = await runCli(["--transport", "httpStream", "--port", "1", "--modules", "fred"], { env: { MCP_HOST: "0.0.0.0" } });
    expect(res.code).toBe(1);
    expect(res.stderr).toMatch(/Refusing to serve HTTP on 0\.0\.0\.0/);
  }, 30_000);

  it("refuses a short token", async () => {
    const res = await runCli(["--transport", "httpStream", "--port", "1", "--modules", "fred"], { env: { MCP_AUTH_TOKEN: "short" } });
    expect(res.code).toBe(1);
    expect(res.stderr).toMatch(/at least 16 characters/);
  }, 30_000);
});
