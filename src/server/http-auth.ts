/**
 * Access control for the HTTP Stream transport.
 *
 * The server holds API keys and spends their rate limits, so anything that
 * can reach the port can use them. The rule is:
 *
 * - With MCP_AUTH_TOKEN set, every MCP request must carry
 *   `Authorization: Bearer <token>`. That covers /mcp (POST, GET, DELETE)
 *   and the legacy /sse stream; /health and /ping stay open for probes.
 * - Without a token, the server listens only on loopback addresses.
 *   Binding anything else (MCP_HOST=0.0.0.0, a LAN address, …) is refused
 *   unless MCP_ALLOW_INSECURE_HTTP=1 says a proxy in front of it handles
 *   authentication.
 *
 * TLS isn't handled here; terminate it in a reverse proxy.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

export const MIN_TOKEN_LENGTH = 16;

export type HttpAuthPlan =
  | { mode: "token"; token: string }
  | { mode: "none"; reason: "loopback" | "insecure-override" };

/** True for localhost, ::1 and 127.0.0.0/8. */
export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[(.*)\]$/, "$1");
  return h === "localhost" || h === "::1" || /^127(\.\d{1,3}){3}$/.test(h);
}

/**
 * Decide how the HTTP transport is protected for this host and environment.
 * Throws with an explanation when the combination is unsafe.
 */
export function planHttpAuth(host: string, env: NodeJS.ProcessEnv = process.env): HttpAuthPlan {
  const token = env.MCP_AUTH_TOKEN?.trim();
  if (token) {
    if (token.length < MIN_TOKEN_LENGTH) {
      throw new Error(
        `MCP_AUTH_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters. ` +
        "Generate one with: openssl rand -hex 32",
      );
    }
    return { mode: "token", token };
  }
  if (isLoopbackHost(host)) return { mode: "none", reason: "loopback" };
  if (env.MCP_ALLOW_INSECURE_HTTP === "1") return { mode: "none", reason: "insecure-override" };
  throw new Error(
    `Refusing to serve HTTP on ${host} without authentication: anyone who can reach the port could use ` +
    "this server and its API keys. Set MCP_AUTH_TOKEN (clients send \"Authorization: Bearer <token>\"), " +
    "bind to 127.0.0.1, or set MCP_ALLOW_INSECURE_HTTP=1 if a reverse proxy in front of the server " +
    "authenticates requests.",
  );
}

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * FastMCP `authenticate` hook that accepts `Authorization: Bearer <token>`.
 * Anything else is rejected with a thrown 401 Response, which FastMCP's HTTP
 * layer sends as is (including for the /sse stream).
 */
export function bearerAuthenticator(token: string) {
  const expected = digest(token);
  return async (req: IncomingMessage | undefined): Promise<{ authenticated: true }> => {
    const header = req?.headers.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    const match = value ? /^Bearer\s+(\S+)\s*$/i.exec(value) : null;
    // Comparing fixed-length digests keeps the check constant-time.
    if (match && timingSafeEqual(digest(match[1]), expected)) return { authenticated: true };
    throw new Response(JSON.stringify({ error: "unauthorized", message: "Missing or invalid bearer token" }), {
      status: 401,
      statusText: "Unauthorized",
      headers: { "Content-Type": "application/json", "WWW-Authenticate": 'Bearer realm="us-gov-open-data-mcp"' },
    });
  };
}
