#!/usr/bin/env node
/**
 * FastMCP server — auto-discovers API modules from src/apis/{name}/ folders.
 *
 * Each module folder exports: name, displayName, description, auth?, workflow?, tips?, domains, crossRef?, reference?, tools[]
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
 *   node dist/server.js --list-modules                    # list all modules grouped by domain and exit
 *   node dist/server.js --list                            # alias for --list-modules
 *   node dist/server.js --list-modules --json             # same, as JSON (for scripting)
 */

import "dotenv/config";
import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { FastMCP, type Tool, type InputPrompt } from "fastmcp";
import { z } from "zod";
import { buildInstructions } from "./server/instructions.js";
import { buildAnalysisPrompts } from "./server/prompts.js";
import { executeInSandbox } from "./shared/sandbox.js";
import { DOMAINS, type ApiModule } from "./shared/types.js";

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
  const listModules = args.includes("--list-modules") || args.includes("--list");

  return { transport, port, modulesFilter, listModules };
}

const { transport, port, modulesFilter, listModules } = parseArgs();

if (listModules) {
  const asJson = process.argv.includes("--json");

  if (asJson) {
    const output = MODULES.map(m => ({
      name: m.name,
      displayName: m.displayName,
      toolCount: m.tools.length,
      requiresApiKey: !!m.auth,
      envVars: m.auth ? (Array.isArray(m.auth.envVar) ? m.auth.envVar : [m.auth.envVar]) : null,
      signupUrl: m.auth?.signup ?? null,
      domains: m.domains,
    }));
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
  }

  // Group by primary (first) domain, in canonical DOMAINS order
  const groups = new Map<string, ApiModule[]>(DOMAINS.map(d => [d, []]));
  for (const m of MODULES) {
    const key = m.domains[0] ?? "other";
    groups.get(key)?.push(m);
  }

  const maxNameLen = Math.max(...MODULES.map(m => m.name.length));
  const maxDisplayLen = Math.max(...MODULES.map(m => m.displayName.length));
  const maxToolsLen = Math.max(...MODULES.map(m => `${m.tools.length} tools`.length));

  for (const [domain, mods] of groups) {
    if (mods.length === 0) continue;
    console.log(`\n${domain.charAt(0).toUpperCase() + domain.slice(1)}`);
    for (const m of mods) {
      const toolsStr = `${m.tools.length} tools`.padEnd(maxToolsLen);
      const envVars = m.auth ? (Array.isArray(m.auth.envVar) ? m.auth.envVar : [m.auth.envVar]) : null;
      const authNote = envVars ? `  [${envVars.join(", ")}]  ${m.auth!.signup}` : "";
      console.log(`  ${m.name.padEnd(maxNameLen)}  ${m.displayName.padEnd(maxDisplayLen)}  ${toolsStr}${authNote}`);
    }
  }
  console.log(`\n${MODULES.length} modules total.`);
  process.exit(0);
}

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
  if (mod.auth) {
    const vars = Array.isArray(mod.auth.envVar) ? mod.auth.envVar : [mod.auth.envVar];
    const missing = vars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      // IMPORTANT: for MCP stdio transport, stdout must be reserved for JSON-RPC only.
      // VS Code treats stderr output as warnings; keep it minimal and only log actionable issues.
      console.warn(
        `\u26A0 ${mod.displayName}: ${missing.join(", ")} not set \u2014 tools will fail. Get key: ${mod.auth.signup}`,
      );
    }
  }
}

// ─── Server ──────────────────────────────────────────────────────────

const server = new FastMCP({
  name: "US Government Open Data",
  version: "2.0.0",
  logger,
  instructions: buildInstructions(activeModules),
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

server.addPrompts(buildAnalysisPrompts(activeModules) as any);

// ─── Code mode tool ──────────────────────────────────────────────────

// Build a lookup map of all registered tools for code_mode to call
const allToolMap = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();
for (const mod of activeModules) {
  for (const tool of mod.tools) {
    allToolMap.set(tool.name, (tool as any).execute);
  }
}

server.addTool({
  name: "code_mode",
  description:
    "Run a JavaScript processing script against any tool's output in a WASM sandbox.\n" +
    "Calls the specified tool first, then runs your script with the raw response as `DATA` (string).\n" +
    "Only your script's console.log() output enters context — typically 65-99% smaller.\n\n" +
    "USE THIS when you need specific fields, counts, or filters from a large response.\n" +
    "DO NOT use this when you need to read and interpret the full data for cross-referencing or analysis.\n\n" +
    "The script can: JSON.parse(DATA), use loops/map/filter/reduce, Math, string ops, console.log().\n" +
    "The script CANNOT: access files, network, Node.js APIs, or import modules.\n\n" +
    "Example — count serious reactions for a drug:\n" +
    "  tool='fda_drug_events', tool_args={\"search\":\"patient.drug.openfda.brand_name:aspirin\",\"limit\":100},\n" +
    "  code='const d=JSON.parse(DATA);const data=d.data||d;const items=data.items||data.results||[];' +\n" +
    "       'const counts={};items.forEach(r=>{const rxs=r.reactions||[];rxs.forEach(rx=>{counts[rx]=(counts[rx]||0)+1})});' +\n" +
    "       'Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>console.log(k+\": \"+v))'",
  annotations: { title: "Code Mode: Process Tool Output", readOnlyHint: true },
  parameters: z.object({
    tool: z.string().describe(
      "Name of the MCP tool to call (e.g. 'fda_drug_events', 'fred_series_data', 'congress_search_bills')"
    ),
    tool_args: z.record(z.string(), z.unknown()).optional().describe(
      "Arguments to pass to the tool, as a JSON object (e.g. {\"search\": \"serious:1\", \"limit\": 50})"
    ),
    code: z.string().describe(
      "JavaScript code to process the result. The tool's full response is available as DATA (string). " +
      "Use JSON.parse(DATA) to parse it. Use console.log() to produce output. " +
      "Only console.log output is returned — keep it concise."
    ),
  }),
  execute: async ({ tool: toolName, tool_args: toolArgs, code }) => {
    // Find the tool
    const toolFn = allToolMap.get(toolName);
    if (!toolFn) {
      const available = [...allToolMap.keys()].sort().join(", ");
      return `Error: tool '${toolName}' not found. Available tools: ${available}`;
    }

    // Call the underlying tool
    let rawResult: string;
    try {
      const result = await toolFn(toolArgs ?? {});
      rawResult = typeof result === "string" ? result : JSON.stringify(result);
    } catch (err) {
      return `Error calling '${toolName}': ${(err as Error).message}`;
    }

    // Execute script in sandbox
    const { stdout, beforeBytes, afterBytes, reductionPct, error } =
      await executeInSandbox(rawResult, code);

    if (error) {
      return (
        `Script error: ${error}\n\n` +
        `The tool '${toolName}' returned ${(beforeBytes / 1024).toFixed(1)}KB of data. ` +
        `Fix the script and try again. The DATA variable contains the tool's raw response as a string.`
      );
    }

    const tag = `[code-mode: ${(beforeBytes / 1024).toFixed(1)}KB → ${(afterBytes / 1024).toFixed(1)}KB (${reductionPct.toFixed(1)}% reduction)]`;
    return `${stdout}\n\n${tag}`;
  },
});

// ─── Auto-generate resources ─────────────────────────────────────────

server.addResource({
  uri: "govdata://reference",
  name: "API Reference",
  mimeType: "text/markdown",
  load: async () => {
    const noKey = activeModules.filter(m => !m.auth);
    const withKey = activeModules.filter(m => m.auth);

    // Group keyed APIs by env var
    const keyGroups: Record<string, { envVar: string; signup: string; apis: string[] }> = {};
    for (const m of withKey) {
      const vars = Array.isArray(m.auth!.envVar) ? m.auth!.envVar : [m.auth!.envVar];
      for (const v of vars) {
        if (!keyGroups[v]) keyGroups[v] = { envVar: v, signup: m.auth!.signup, apis: [] };
        keyGroups[v].apis.push(m.displayName);
      }
    }

    // Check which keys are actually configured
    const configuredKeys = Object.keys(keyGroups).filter(k => !!process.env[k]);
    const missingKeys = Object.keys(keyGroups).filter(k => !process.env[k]);

    let md = `# US Government Open Data — API Reference\n\n`;
    md += `**${activeModules.length} APIs loaded** · ${noKey.length} require no key · ${configuredKeys.length}/${Object.keys(keyGroups).length} API keys configured\n\n`;

    // Status section
    if (missingKeys.length) {
      md += `## Missing API Keys\n\n`;
      md += `These APIs are loaded but will fail without keys:\n\n`;
      md += `| Key | APIs Affected | Get Key |\n|---|---|---|\n`;
      for (const k of missingKeys) {
        const g = keyGroups[k];
        md += `| \`${k}\` | ${g.apis.join(", ")} | [Sign up](${g.signup}) |\n`;
      }
      md += `\n`;
    }

    if (configuredKeys.length) {
      md += `## Configured API Keys\n\n`;
      for (const k of configuredKeys) {
        md += `- \`${k}\` → ${keyGroups[k].apis.join(", ")}\n`;
      }
      md += `\n`;
    }

    // Free APIs
    md += `## No Key Required (${noKey.length} APIs)\n\n`;
    md += noKey.map(m => `- **${m.displayName}** (${m.tools.length} tools) — ${m.description.split(".")[0]}.`).join("\n");
    md += `\n\n`;

    // All APIs with tools
    md += `## All APIs & Tools\n\n`;
    for (const m of activeModules) {
      const status = !m.auth ? "No key needed"
        : (Array.isArray(m.auth.envVar) ? m.auth.envVar : [m.auth.envVar]).every(v => !!process.env[v])
          ? "Key configured"
          : "Key missing";
      md += `### ${m.displayName} — ${status}\n\n`;
      md += `${m.tools.length} tools: ${m.tools.map(t => `\`${t.name}\``).join(", ")}\n\n`;
      if (m.workflow) md += `**Workflow:** ${m.workflow}\n\n`;
    }

    return { text: md };
  },
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
