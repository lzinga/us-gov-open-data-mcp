/**
 * Discovery tool mode (--tool-mode discovery / TOOL_MODE=discovery).
 *
 * Listing ~350 tools with full JSON schemas costs a client tens of thousands
 * of tokens before the first question. In discovery mode the server lists
 * only find_tools, call_tool, code_mode and clear_cache. The model searches
 * with find_tools, which returns names, descriptions and input schemas, and
 * runs a tool with call_tool. Calls go through the tool registry, so
 * arguments get the same validation and defaults as a direct call.
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import type { ApiModule } from "../shared/types.js";
import type { ToolRegistry } from "./tool-registry.js";

const STOPWORDS = new Set(["a", "an", "and", "by", "for", "from", "get", "in", "of", "on", "or", "the", "to", "with"]);

/** Lowercase word tokens, lightly stemmed so "earthquakes" matches "earthquake". */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t && !STOPWORDS.has(t))
    .map(t => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

export interface ToolMatch {
  name: string;
  module: string;
  title?: string;
  description: string;
  inputSchema: unknown;
  /** Set when the query was a deprecated name for this tool. */
  note?: string;
}

function inputSchema(tool: { parameters?: unknown }): unknown {
  try {
    const schema = z.toJSONSchema(tool.parameters as z.ZodType, { io: "input" }) as Record<string, unknown>;
    delete schema.$schema;
    return schema;
  } catch {
    return { type: "object" };
  }
}

/** Rank registered tools against a free-text query (and optional module filter). */
export function findTools(
  registry: ToolRegistry,
  modules: ApiModule[],
  query: string,
  opts: { module?: string; limit?: number } = {},
): ToolMatch[] {
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 25);
  const q = query.trim().toLowerCase();
  const queryTokens = new Set(tokens(q));
  const moduleFilter = opts.module?.trim().toLowerCase();
  const displayNames = new Map(modules.map(m => [m.name, m.displayName]));
  const aliasTarget = registry.isAlias(q) ? registry.resolve(q)?.name : undefined;

  const scored: { match: ToolMatch; score: number }[] = [];
  for (const entry of registry.entries()) {
    if (moduleFilter && entry.module.toLowerCase() !== moduleFilter) continue;
    const { tool } = entry;
    const title = (tool.annotations as { title?: string } | undefined)?.title;
    const description = tool.description ?? "";
    let score = 0;
    if (entry.name === q || entry.name === aliasTarget) score += 100;
    const nameTokens = new Set(tokens(entry.name));
    const moduleTokens = new Set(tokens(`${entry.module} ${displayNames.get(entry.module) ?? ""}`));
    const titleTokens = new Set(tokens(title ?? ""));
    const descTokens = new Set(tokens(description));
    for (const t of queryTokens) {
      if (nameTokens.has(t)) score += 3;
      if (titleTokens.has(t)) score += 2;
      if (moduleTokens.has(t)) score += 2;
      if (descTokens.has(t)) score += 1;
    }
    if (!queryTokens.size && moduleFilter) score = 1; // module listing
    if (score <= 0) continue;
    scored.push({
      score,
      match: {
        name: entry.name,
        module: entry.module,
        ...(title ? { title } : {}),
        description,
        inputSchema: inputSchema(tool),
        ...(entry.name === aliasTarget ? { note: `"${q}" is a deprecated name for ${entry.name}; use ${entry.name}.` } : {}),
      },
    });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.match.name.localeCompare(b.match.name))
    .slice(0, limit)
    .map(s => s.match);
}

/** The find_tools and call_tool definitions for discovery mode. */
export function discoveryTools(registry: ToolRegistry, modules: ApiModule[]) {
  const moduleNames = modules.map(m => m.name);
  return [
    {
      name: "find_tools",
      description:
        `Search the ${registry.size} data tools of this server by keyword (topic, agency, dataset or tool name). ` +
        "Returns the best matches with their descriptions and input schemas. Then run one with call_tool.\n" +
        "Example: query='unemployment rate by state', or module='fred' to list one module's tools.",
      annotations: { title: "Find Tools", readOnlyHint: true, idempotentHint: true, openWorldHint: false, destructiveHint: false },
      parameters: z.object({
        query: z.string().default("").describe("Keywords, e.g. 'earthquakes near California' or 'treasury debt'"),
        module: z.string().optional().describe(`Only search one module: ${moduleNames.join(", ")}`),
        limit: z.number().int().min(1).max(25).default(8).describe("Max tools to return (default 8)"),
      }),
      execute: async ({ query, module, limit }: { query: string; module?: string; limit: number }) => {
        if (module && !moduleNames.includes(module.toLowerCase())) {
          throw new UserError(`Unknown module "${module}". Loaded modules: ${moduleNames.join(", ")}`);
        }
        if (!query.trim() && !module) throw new UserError("Give a query, a module, or both.");
        const items = findTools(registry, modules, query, { module, limit });
        return JSON.stringify({
          summary: items.length
            ? `${items.length} matching tool(s). Run one with call_tool({ name, arguments }).`
            : `No tools matched "${query}". Try other keywords or one of the modules: ${moduleNames.join(", ")}.`,
          dataType: "list",
          data: { items },
        });
      },
    },
    {
      name: "call_tool",
      description:
        "Run a data tool by name (find it with find_tools first). Arguments are validated against the tool's input schema, " +
        "with its defaults applied, exactly as for a direct call.",
      annotations: { title: "Call Tool", readOnlyHint: true, idempotentHint: true, openWorldHint: true, destructiveHint: false },
      parameters: z.object({
        name: z.string().describe("Tool name from find_tools, e.g. 'fred_series_data'"),
        arguments: z.record(z.string(), z.unknown()).default({}).describe("The tool's arguments as an object"),
      }),
      execute: async ({ name, arguments: args }: { name: string; arguments: Record<string, unknown> }, context?: unknown) => {
        const call = await registry.invoke(name, args, context);
        if (!call.ok) {
          if (call.kind === "unknown_tool") {
            const hints = registry.suggest(name);
            throw new UserError(`Unknown tool "${name}".${hints.length ? ` Did you mean: ${hints.join(", ")}?` : ""} Use find_tools to search.`);
          }
          if (call.kind === "invalid_args") throw new UserError(`${call.message} Use find_tools to see the input schema.`);
          throw new UserError(call.message);
        }
        const text = typeof call.result === "string" ? call.result : JSON.stringify(call.result);
        if (!registry.isAlias(name)) return text;
        return {
          content: [
            { type: "text" as const, text: `Note: "${name}" is deprecated; use ${call.tool.name}.` },
            { type: "text" as const, text },
          ],
        };
      },
    },
  ];
}
