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
 *   MCP_HOST=0.0.0.0 MCP_AUTH_TOKEN=<token> node dist/server.js --transport httpStream # remote access (bearer token)
 *   MODULES=fred,bls,treasury node dist/server.js         # load only 3 modules
 *   node dist/server.js --modules fred,bls,treasury       # same via CLI flag
 *   node dist/server.js --domains economy,health          # every module in these domains (DOMAINS=…); unions with --modules
 *   node dist/server.js --hide-unconfigured               # skip modules whose required key isn't set (HIDE_UNCONFIGURED=1)
 *   node dist/server.js --tool-mode discovery             # list 4 tools (find_tools, call_tool, …) instead of all (TOOL_MODE=…)
 *   node dist/server.js --list-modules                    # list all modules grouped by domain and exit
 *   node dist/server.js --list                            # alias for --list-modules
 *   node dist/server.js --list-modules --json             # same, as JSON (for scripting)
 *   node dist/server.js --version                         # print the package version and exit
 */

import "dotenv/config";
import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { FastMCP, UserError } from "fastmcp";
import { z } from "zod";
import { buildInstructions } from "./server/instructions.js";
import { discoveryTools } from "./server/discovery.js";
import { bearerAuthenticator, planHttpAuth, type HttpAuthPlan } from "./server/http-auth.js";
import { createServerLogger } from "./server/logger.js";
import { selectModules } from "./server/module-selection.js";
import { filterPrompts } from "./server/prompt-filter.js";
import { buildAnalysisPrompts } from "./server/prompts.js";
import { modulesWithReference, referenceUri, renderReference } from "./server/reference-resources.js";
import { maxResponseBytes } from "./server/response-budget.js";
import { serveTool } from "./server/serve-tool.js";
import { buildToolRegistry } from "./server/tool-registry.js";
import { executeInSandbox } from "./shared/sandbox.js";
import { DOMAINS, authEnvVars, requiresKey, type ApiModule } from "./shared/types.js";
import { PACKAGE_VERSION } from "./shared/version.js";

if (process.argv.includes("--version")) {
  console.log(PACKAGE_VERSION);
  process.exit(0);
}

const logger = createServerLogger();

const MODULES: ApiModule[] = [];
/** Modules whose import threw; reported instead of silently disappearing. */
const FAILED_MODULES: { name: string; error: string }[] = [];

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
    FAILED_MODULES.push({ name: dir, error: (err as Error).message });
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
  // Loopback by default; set MCP_HOST=0.0.0.0 for external access (requires MCP_AUTH_TOKEN, see http-auth.ts).
  const host = process.env.MCP_HOST ?? "127.0.0.1";
  const selection = {
    modules: get("--modules") ?? process.env.MODULES,
    domains: get("--domains") ?? process.env.DOMAINS,
    hideUnconfigured: args.includes("--hide-unconfigured") || process.env.HIDE_UNCONFIGURED === "1",
  };
  const listModules = args.includes("--list-modules") || args.includes("--list");
  const toolMode = get("--tool-mode") ?? process.env.TOOL_MODE ?? "full";

  return { transport, port, host, selection, listModules, toolMode };
}

const { transport, port, host, selection, listModules, toolMode } = parseArgs();

if (toolMode !== "full" && toolMode !== "discovery") {
  console.error(`Unknown tool mode "${toolMode}". Use "full" (default) or "discovery".`);
  process.exit(1);
}

if (listModules) {
  const asJson = process.argv.includes("--json");

  if (asJson) {
    const output = MODULES.map(m => ({
      name: m.name,
      displayName: m.displayName,
      toolCount: m.tools.length,
      requiresApiKey: requiresKey(m),
      optionalApiKey: !!m.auth?.optional,
      envVars: m.auth ? authEnvVars(m.auth) : null,
      signupUrl: m.auth?.signup ?? null,
      domains: m.domains,
    }));
    console.log(JSON.stringify(output, null, 2));
    // Keep stdout a plain module array; failures go to stderr and the exit code.
    for (const f of FAILED_MODULES) console.error(`Failed to load module "${f.name}": ${f.error}`);
    process.exit(FAILED_MODULES.length ? 1 : 0);
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
      const authNote = m.auth
        ? `  [${authEnvVars(m.auth).join(", ")}${m.auth.optional ? " (optional)" : ""}]  ${m.auth.signup}`
        : "";
      console.log(`  ${m.name.padEnd(maxNameLen)}  ${m.displayName.padEnd(maxDisplayLen)}  ${toolsStr}${authNote}`);
    }
  }
  console.log(`\n${MODULES.length} modules total.`);
  if (FAILED_MODULES.length) {
    console.log(`\nFailed to load (${FAILED_MODULES.length}):`);
    for (const f of FAILED_MODULES) console.log(`  ${f.name}: ${f.error}`);
  }
  process.exit(FAILED_MODULES.length ? 1 : 0);
}

// ─── Selective module loading ────────────────────────────────────────

let activeModules = MODULES;

if (selection.modules || selection.domains || selection.hideUnconfigured) {
  try {
    const { active, hidden } = selectModules(MODULES, selection);
    activeModules = active;
    for (const h of hidden) console.error(`Hidden (no ${h.missing.join(", ")}): ${h.name}`);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
  console.error(
    `Loaded ${activeModules.length}/${MODULES.length} modules: ${activeModules.map(m => m.name).join(", ")}`,
  );
}

// ─── Startup validation ──────────────────────────────────────────────

for (const mod of activeModules) {
  // Optional keys only raise rate limits; don't warn when they're absent.
  if (!mod.auth || !requiresKey(mod)) continue;
  const missing = authEnvVars(mod.auth).filter(v => !process.env[v]);
  if (missing.length > 0) {
    // IMPORTANT: for MCP stdio transport, stdout must be reserved for JSON-RPC only.
    // VS Code treats stderr output as warnings; keep it minimal and only log actionable issues.
    console.warn(
      `\u26A0 ${mod.displayName}: ${missing.join(", ")} not set \u2014 tools will fail. Get key: ${mod.auth.signup}`,
    );
  }
}

// ─── HTTP access control ─────────────────────────────────────────────

let httpAuth: HttpAuthPlan | undefined;
if (transport === "httpStream") {
  try {
    httpAuth = planHttpAuth(host);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
  if (httpAuth.mode === "none" && httpAuth.reason === "insecure-override") {
    console.error(`\u26A0 MCP_ALLOW_INSECURE_HTTP=1: serving HTTP on ${host} without authentication.`);
  }
}

// ─── Server ──────────────────────────────────────────────────────────

/** Old tool names → current names, from the loaded modules' `deprecatedAliases`. */
const TOOL_ALIASES: Record<string, string> = Object.assign({}, ...activeModules.map(m => m.deprecatedAliases ?? {}));

// Validated entry point for calling module tools from server-side features.
const registry = buildToolRegistry(activeModules, TOOL_ALIASES);

const server = new FastMCP({
  name: "US Government Open Data",
  version: PACKAGE_VERSION as `${number}.${number}.${number}`,
  logger,
  instructions: buildInstructions(activeModules, { discovery: toolMode === "discovery", toolCount: registry.size }),
  ...(httpAuth?.mode === "token" ? { authenticate: bearerAuthenticator(httpAuth.token) } : {}),
});

// ─── Register all module tools + prompts ─────────────────────────────

/**
 * Default tool annotations applied to every module tool.
 *
 * All government data tools are read-only fetches against external APIs that
 * are safe to retry with identical args (data is published, not user-driven),
 * so they're idempotent and openWorld by default. Per-tool annotations
 * (e.g. `title`) are preserved via spread.
 */
const DEFAULT_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: true,
  destructiveHint: false,
} as const;

/** Names of every tool that could be loaded (all modules, plus deprecated aliases). */
const KNOWN_TOOLS = new Set(MODULES.flatMap(m => [...m.tools.map(t => t.name), ...Object.keys(m.deprecatedAliases ?? {})]));
/** Names of the loaded modules, which prompts may mention instead of a tool ("FRED series"). */
const LOADED_MODULES = activeModules.map(m => m.name);
/** Names of the tools this server actually serves. */
const AVAILABLE_TOOLS = new Set(activeModules.flatMap(m => [...m.tools.map(t => t.name), ...Object.keys(m.deprecatedAliases ?? {})]));

/** Size budget for results sent to the client (MAX_RESPONSE_BYTES; see response-budget.ts). */
const MAX_RESPONSE = maxResponseBytes();

/** The tool as served to clients: `meta.sources` added, then the size budget (serve-tool.ts). */
const withBudget = <T extends { execute: (args: any, ctx: any) => unknown }>(tool: T): T => serveTool(tool, MAX_RESPONSE);

for (const mod of activeModules) {
  if (toolMode === "full") {
    const annotated = mod.tools.map(t => withBudget({
      ...t,
      annotations: { ...DEFAULT_TOOL_ANNOTATIONS, ...(t.annotations ?? {}) },
    }));
    server.addTools(annotated as any);
  }
  // Module prompts can mention other modules' tools too.
  if (mod.prompts?.length) server.addPrompts(await filterPrompts(mod.prompts, KNOWN_TOOLS, AVAILABLE_TOOLS, LOADED_MODULES) as any);
}

if (toolMode === "full") {
  // Each alias is served as its own tool (same schema and behavior) so clients
  // and saved prompts that use an old name keep working for one release.
  for (const [alias, canonical] of registry.aliasEntries()) {
    const { tool } = registry.resolve(canonical)!;
    server.addTool(withBudget({
      ...tool,
      name: alias,
      description: `[Deprecated — use ${canonical}] ${tool.description ?? ""}`,
      annotations: {
        ...DEFAULT_TOOL_ANNOTATIONS,
        ...(tool.annotations ?? {}),
        title: `${tool.annotations?.title ?? canonical} (deprecated)`,
      },
    }) as any);
  }
} else {
  // Discovery mode: the data tools are reached through find_tools + call_tool.
  server.addTools(discoveryTools(registry, activeModules).map(t => withBudget(t)) as any);
}

// ─── clear_cache tool ────────────────────────────────────────────────

server.addTool({
  name: "clear_cache",
  description: "Clear cached API responses to force fresh data on next query. " +
    "Specify a source name or omit to clear all.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  parameters: z.object({
    source: z.string().optional().describe(
      `Module name to clear: ${activeModules.map(m => m.name).join(", ")}. Omit for all.`
    ),
  }),
  execute: async ({ source }) => {
    const target = source?.toLowerCase();
    const cleared: string[] = [];
    for (const mod of activeModules) {
      if (target && mod.name.toLowerCase() !== target) continue;
      if (mod.clearCache) { mod.clearCache(); cleared.push(mod.name); }
    }
    return cleared.length
      ? `Cache cleared: ${cleared.join(", ")}. Next queries will fetch fresh data.`
      : source ? `Unknown source "${source}". Available: ${activeModules.map(m => m.name).join(", ")}` : "No caches to clear.";
  },
});

// ─── Cross-cutting analysis prompts ──────────────────────────────────

server.addPrompts(await filterPrompts(buildAnalysisPrompts(), KNOWN_TOOLS, AVAILABLE_TOOLS, LOADED_MODULES) as any);

// ─── Code mode tool ──────────────────────────────────────────────────

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
  annotations: {
    title: "Code Mode: Process Tool Output",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
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
  execute: async ({ tool: toolName, tool_args: toolArgs, code }, { reportProgress }) => {
    await reportProgress({ progress: 0, total: 2 });

    // Call the underlying tool with the same schema validation (defaults,
    // bounds, enums) FastMCP applies to direct calls.
    const call = await registry.invoke(toolName, toolArgs ?? {});
    if (!call.ok) {
      if (call.kind === "unknown_tool") {
        const hints = registry.suggest(toolName);
        throw new UserError(
          `Tool '${toolName}' not found.` +
          (hints.length ? ` Did you mean: ${hints.join(", ")}?` : " Use tools/list for available names."),
        );
      }
      if (call.kind === "invalid_args") {
        throw new UserError(`${call.message}. Fix tool_args and try again.`);
      }
      throw new UserError(`Error calling '${toolName}': ${call.message}`);
    }
    const result = call.result;
    const rawResult = typeof result === "string" ? result : JSON.stringify(result);

    await reportProgress({ progress: 1, total: 2 });

    // Execute script in sandbox
    const { stdout, beforeBytes, afterBytes, reductionPct, error, outputLimitExceeded } =
      await executeInSandbox(rawResult, code);

    await reportProgress({ progress: 2, total: 2 });

    if (outputLimitExceeded) {
      const preview = stdout.length > 1000 ? stdout.slice(0, 1000) + "…" : stdout;
      throw new UserError(`${error}\n\nFirst ${Math.min(1000, stdout.length)} chars of output:\n${preview}`);
    }

    if (error) {
      const previewLen = Math.min(200, rawResult.length);
      const preview = rawResult.length > 200 ? rawResult.slice(0, 200) + "…" : rawResult;
      const argsJson = JSON.stringify(toolArgs ?? {});
      throw new UserError(
        `Script error: ${error}\n\n` +
        `Called '${toolName}' with args ${argsJson} — returned ${(beforeBytes / 1024).toFixed(1)}KB. ` +
        `Fix the script and try again. The DATA variable contains the tool's raw response as a string.\n\n` +
        `DATA preview (first ${previewLen} chars):\n${preview}`,
      );
    }

    const tag = `[code-mode: ${(beforeBytes / 1024).toFixed(1)}KB → ${(afterBytes / 1024).toFixed(1)}KB (${reductionPct.toFixed(1)}% reduction)]`;
    return stdout ? `${stdout}\n\n${tag}` : `(script produced no console.log output)\n${tag}`;
  },
});

// ─── Auto-generate resources ─────────────────────────────────────────

server.addResource({
  uri: "govdata://reference",
  name: "API Reference",
  mimeType: "text/markdown",
  load: async () => {
    // Modules usable without any key: keyless ones plus optional-key ones.
    const noKey = activeModules.filter(m => !requiresKey(m));
    const withKey = activeModules.filter(m => m.auth);

    // Group keyed APIs by env var. A key is "required" if any module needs it.
    const keyGroups: Record<string, { envVar: string; signup: string; apis: string[]; required: boolean }> = {};
    for (const m of withKey) {
      for (const v of authEnvVars(m.auth)) {
        if (!keyGroups[v]) keyGroups[v] = { envVar: v, signup: m.auth!.signup, apis: [], required: false };
        keyGroups[v].apis.push(m.auth!.optional ? `${m.displayName} (optional)` : m.displayName);
        if (requiresKey(m)) keyGroups[v].required = true;
      }
    }

    // Check which keys are actually configured
    const configuredKeys = Object.keys(keyGroups).filter(k => !!process.env[k]);
    const missingRequired = Object.keys(keyGroups).filter(k => !process.env[k] && keyGroups[k].required);
    const missingOptional = Object.keys(keyGroups).filter(k => !process.env[k] && !keyGroups[k].required);

    let md = `# US Government Open Data — API Reference\n\n`;
    md += `**${activeModules.length} APIs loaded** · ${noKey.length} work without a key · ${configuredKeys.length}/${Object.keys(keyGroups).length} API keys configured\n\n`;

    if (FAILED_MODULES.length) {
      md += `## Modules That Failed to Load\n\n`;
      md += `These modules are unavailable in this session because of an internal error:\n\n`;
      for (const f of FAILED_MODULES) md += `- **${f.name}** — ${f.error}\n`;
      md += `\n`;
    }

    // Status section
    if (missingRequired.length) {
      md += `## Missing API Keys\n\n`;
      md += `These APIs are loaded but will fail without keys (APIs marked optional still work, at lower rate limits):\n\n`;
      md += `| Key | APIs Affected | Get Key |\n|---|---|---|\n`;
      for (const k of missingRequired) {
        const g = keyGroups[k];
        md += `| \`${k}\` | ${g.apis.join(", ")} | [Sign up](${g.signup}) |\n`;
      }
      md += `\n`;
    }

    if (missingOptional.length) {
      md += `## Optional API Keys Not Set\n\n`;
      md += `These APIs work without a key; setting it raises rate limits:\n\n`;
      for (const k of missingOptional) {
        md += `- \`${k}\` → ${keyGroups[k].apis.join(", ")} ([sign up](${keyGroups[k].signup}))\n`;
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
    md += noKey.map(m => `- **${m.displayName}** (${m.tools.length} tools)${m.auth?.optional ? " — optional key for higher limits" : ""} — ${m.description.split(".")[0]}.`).join("\n");
    md += `\n\n`;

    // All APIs with tools
    md += `## All APIs & Tools\n\n`;
    for (const m of activeModules) {
      const configured = authEnvVars(m.auth).every(v => !!process.env[v]);
      const status = !m.auth ? "No key needed"
        : configured ? "Key configured"
        : m.auth.optional ? "Optional key not set (works at lower rate limits)"
        : "Key missing";
      md += `### ${m.displayName} — ${status}\n\n`;
      md += `${m.tools.length} tools: ${m.tools.map(t => `\`${t.name}\``).join(", ")}\n\n`;
      if (m.workflow) md += `**Workflow:** ${m.workflow}\n\n`;
    }

    const withReference = modulesWithReference(activeModules);
    if (withReference.length) {
      md += `## Reference Data\n\n`;
      md += `Code tables and documentation links, one resource per module:\n\n`;
      md += withReference.map(m => `- \`${referenceUri(m.name)}\` — ${m.displayName}`).join("\n");
      md += `\n`;
    }

    return { text: md };
  },
});

for (const m of modulesWithReference(activeModules)) {
  server.addResource({
    uri: referenceUri(m.name),
    name: `${m.displayName} reference`,
    mimeType: "text/markdown",
    load: async () => ({ text: renderReference(m) }),
  });
}

// ─── Start ───────────────────────────────────────────────────────────

if (transport === "httpStream") {
  server.start({
    transportType: "httpStream",
    httpStream: { port, host },
  });
  const access = httpAuth?.mode === "token" ? "bearer token required" : "no authentication";
  console.error(`MCP server listening on http://${host}:${port}/mcp (HTTP Stream, ${access})`);
  console.error(`${activeModules.length} modules, ${activeModules.reduce((n, m) => n + m.tools.length, 0)} tools`);
} else {
  server.start({ transportType: "stdio" });
}
