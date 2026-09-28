/**
 * HTTP transport access control (src/server/http-auth.ts).
 */

import { describe, it, expect } from "vitest";
import { bearerAuthenticator, isLoopbackHost, planHttpAuth } from "../src/server/http-auth.js";

const TOKEN = "0123456789abcdef0123456789abcdef";

describe("isLoopbackHost", () => {
  it.each(["127.0.0.1", "127.8.9.10", "localhost", "LOCALHOST", "::1", "[::1]"])("%s is loopback", h => {
    expect(isLoopbackHost(h)).toBe(true);
  });
  it.each(["0.0.0.0", "::", "192.168.1.20", "10.0.0.5", "example.com", "128.0.0.1", "127.0.0.1.nip.io"])("%s is not", h => {
    expect(isLoopbackHost(h)).toBe(false);
  });
});

describe("planHttpAuth", () => {
  it("allows loopback without a token (the default)", () => {
    expect(planHttpAuth("127.0.0.1", {})).toEqual({ mode: "none", reason: "loopback" });
  });

  it("refuses a non-loopback bind without a token", () => {
    expect(() => planHttpAuth("0.0.0.0", {})).toThrow(/Refusing to serve HTTP on 0\.0\.0\.0.*MCP_AUTH_TOKEN/);
  });

  it("allows it with MCP_ALLOW_INSECURE_HTTP=1 (auth handled by a proxy)", () => {
    expect(planHttpAuth("0.0.0.0", { MCP_ALLOW_INSECURE_HTTP: "1" })).toEqual({ mode: "none", reason: "insecure-override" });
    expect(() => planHttpAuth("0.0.0.0", { MCP_ALLOW_INSECURE_HTTP: "true" })).toThrow(/Refusing/);
  });

  it("requires the token on any host once it is set", () => {
    expect(planHttpAuth("0.0.0.0", { MCP_AUTH_TOKEN: ` ${TOKEN} ` })).toEqual({ mode: "token", token: TOKEN });
    expect(planHttpAuth("127.0.0.1", { MCP_AUTH_TOKEN: TOKEN })).toEqual({ mode: "token", token: TOKEN });
  });

  it("rejects short tokens", () => {
    expect(() => planHttpAuth("0.0.0.0", { MCP_AUTH_TOKEN: "hunter2" })).toThrow(/at least 16 characters/);
  });
});

describe("bearerAuthenticator", () => {
  const auth = bearerAuthenticator(TOKEN);
  const req = (authorization?: string | string[]) => ({ headers: authorization === undefined ? {} : { authorization } }) as never;

  it("accepts the right bearer token", async () => {
    await expect(auth(req(`Bearer ${TOKEN}`))).resolves.toEqual({ authenticated: true });
    await expect(auth(req(`bearer ${TOKEN}`))).resolves.toEqual({ authenticated: true });
  });

  it.each([
    ["no header", undefined],
    ["a wrong token", "Bearer 0123456789abcdef0123456789abcdeX"],
    ["a token prefix", `Bearer ${TOKEN.slice(0, 20)}`],
    ["basic auth", `Basic ${Buffer.from(`user:${TOKEN}`).toString("base64")}`],
    ["the bare token", TOKEN],
  ])("rejects %s with a 401 response", async (_label, header) => {
    const err = await auth(req(header)).then(() => null, e => e);
    expect(err).toBeInstanceOf(Response);
    expect(err.status).toBe(401);
    expect(err.headers.get("WWW-Authenticate")).toMatch(/^Bearer /);
  });

  it("rejects a missing request (not used over stdio)", async () => {
    await expect(auth(undefined)).rejects.toBeInstanceOf(Response);
  });
});
