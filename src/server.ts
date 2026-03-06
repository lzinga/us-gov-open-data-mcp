#!/usr/bin/env node
/**
 * FastMCP server — auto-discovers API modules from src/apis/{name}/ folders.
 *
 * Each module folder exports: name, displayName, description, auth?, workflow?, tips?, reference?, tools[]
 * This file auto-registers tools, generates resources + instructions, and adds clear_cache.
 *
 * Adding a new API = create an apis/{name}/ folder with sdk.ts, meta.ts, tools.ts, index.ts.
 * No wiring needed — the server discovers it automatically.
 *
 * Supports:
 *   - stdio transport (default, for VS Code / Claude Desktop / Cursor)
 *   - HTTP Stream transport (for web apps, remote access)
 *   - Selective module loading (load only what you need)
 *
 * Usage:
 *   node dist/server.js                                   # stdio (default)
 *   node dist/server.js --transport httpStream --port 8080 # HTTP on port 8080
 *   MODULES=fred,bls,treasury node dist/server.js         # load only 3 modules
 *   node dist/server.js --modules fred,bls,treasury       # same via CLI flag
 */

import "dotenv/config";
import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { FastMCP, type Tool, type InputPrompt } from "fastmcp";
import { z } from "zod";
import { CROSS_REFERENCE_GUIDE } from "./server/instructions.js";
import { analysisPrompts } from "./server/prompts.js";
import type { ApiModule } from "./shared/types.js";

const logger = {
  ...console,
  warn: (...args: unknown[]) => {
    // Some MCP clients (including some VS Code builds) don't report capabilities during init.
    // FastMCP emits a warning after a short retry loop; it's typically harmless for stdio.
    if (
      args.some(
        a =>
          typeof a === "string" &&
          a.includes("[FastMCP warning] could not infer client capabilities"),
      )
    ) {
      return;
    }
    console.warn(...(args as [unknown, ...unknown[]]));
  },
};

const MODULES: ApiModule[] = [];

// Auto-discover API modules from apis/ subdirectories
const __dirname = dirname(fileURLToPath(import.meta.url));
const apisDir = join(__dirname, "apis");
const apiDirs = readdirSync(apisDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

for (const dir of apiDirs) {
  try {
    const mod = await import(`./apis/${dir}/index.js`);
    MODULES.push(mod.default as ApiModule);
  } catch (err) {
    console.error(`Failed to load module "${dir}":`, (err as Error).message);
  }
}

// ─── CLI arg + env parsing ───────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const transport = (get("--transport") ?? process.env.MCP_TRANSPORT ?? "stdio") as "stdio" | "httpStream";
  const port = Number(get("--port") ?? process.env.MCP_PORT ?? 8080);
  const modulesFilter = get("--modules") ?? process.env.MODULES;

  return { transport, port, modulesFilter };
}

const { transport, port, modulesFilter } = parseArgs();

// ─── Selective module loading ────────────────────────────────────────

let activeModules = MODULES;

if (modulesFilter) {
  const wanted = new Set(modulesFilter.split(",").map(s => s.trim().toLowerCase()));
  activeModules = MODULES.filter(m => wanted.has(m.name.toLowerCase()));

  if (activeModules.length === 0) {
    console.error(
      `No modules matched "${modulesFilter}". Available: ${MODULES.map(m => m.name).join(", ")}`,
    );
    process.exit(1);
  }

  console.error(
    `Loaded ${activeModules.length}/${MODULES.length} modules: ${activeModules.map(m => m.name).join(", ")}`,
  );
}

// ─── Startup validation ──────────────────────────────────────────────

for (const mod of activeModules) {
  if (mod.auth && !process.env[mod.auth.envVar]) {
    // IMPORTANT: for MCP stdio transport, stdout must be reserved for JSON-RPC only.
    // VS Code treats stderr output as warnings; keep it minimal and only log actionable issues.
    console.warn(
      `⚠ ${mod.displayName}: ${mod.auth.envVar} not set — tools will fail. Get key: ${mod.auth.signup}`,
    );
  }
}

// ─── Server ──────────────────────────────────────────────────────────

const server = new FastMCP({
  name: "US Government Open Data",
  version: "2.0.0",
  logger,
  instructions:
    activeModules.map(m => [
      `== ${m.displayName.toUpperCase()} ==`,
      m.description,
      `Tools: ${m.tools.map(t => t.name).join(", ")}`,
      m.workflow && `Workflow: ${m.workflow}`,
      m.tips,
      m.auth ? `Requires ${m.auth.envVar}.` : "No key required.",
    ].filter(Boolean).join("\n")).join("\n\n")
    + "\n\n" + CROSS_REFERENCE_GUIDE,
});

// ─── Register all module tools + prompts ─────────────────────────────

for (const mod of activeModules) {
  server.addTools(mod.tools as any);
  if (mod.prompts?.length) server.addPrompts(mod.prompts as any);
}

// ─── clear_cache tool ────────────────────────────────────────────────

server.addTool({
  name: "clear_cache",
  description: "Clear cached API responses to force fresh data on next query. " +
    "Specify a source name or omit to clear all.",
  annotations: { readOnlyHint: false },
  parameters: z.object({
    source: z.string().optional().describe(
      `Module name to clear: ${activeModules.map(m => m.name).join(", ")}. Omit for all.`
    ),
  }),
  execute: async ({ source }) => {
    const cleared: string[] = [];
    for (const mod of activeModules) {
      if (source && mod.name !== source) continue;
      if (mod.clearCache) { mod.clearCache(); cleared.push(mod.name); }
    }
    return cleared.length
      ? `Cache cleared: ${cleared.join(", ")}. Next queries will fetch fresh data.`
      : source ? `Unknown source "${source}". Available: ${activeModules.map(m => m.name).join(", ")}` : "No caches to clear.";
  },
});

// ─── Cross-cutting analysis prompts ──────────────────────────────────

server.addPrompts(analysisPrompts as any);

// ─── Auto-generate resources ─────────────────────────────────────────

server.addResource({
  uri: "govdata://reference",
  name: "API Reference",
  mimeType: "text/markdown",
  load: async () => ({
    text: activeModules.map(m => {
      const authLine = m.auth ? `Key: \`${m.auth.envVar}\` ([signup](${m.auth.signup}))` : "No key needed.";
      const refs = m.reference
        ? Object.entries(m.reference).map(([section, value]) => {
            if (typeof value === "object" && value !== null) {
              const entries = Object.entries(value as Record<string, unknown>);
              return `**${section}:**\n` + entries
                .map(([k, v]) => `- ${k}: ${String(v)}`).join("\n");
            }
            return `**${section}:** ${String(value)}`;
          }).join("\n\n")
        : "";
      return `## ${m.displayName}\n\n${m.description}\n\n${authLine}\n\n${refs}`;
    }).join("\n\n---\n\n"),
  }),
});

// ─── Start ───────────────────────────────────────────────────────────

if (transport === "httpStream") {
  server.start({
    transportType: "httpStream",
    httpStream: {
      port,
      // Bind to localhost only — prevents network exposure.
      // Set MCP_HOST=0.0.0.0 to allow external access (e.g. behind a reverse proxy).
      host: process.env.MCP_HOST ?? "127.0.0.1",
    },
  });
  const host = process.env.MCP_HOST ?? "127.0.0.1";
  console.error(`MCP server listening on http://${host}:${port}/mcp (HTTP Stream)`);
  console.error(`${activeModules.length} modules, ${activeModules.reduce((n, m) => n + m.tools.length, 0)} tools`);
} else {
  server.start({ transportType: "stdio" });
}
