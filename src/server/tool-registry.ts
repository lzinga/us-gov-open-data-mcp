/**
 * Tool registry — one validated entry point for invoking module tools by name.
 *
 * MCP clients call tools through FastMCP, which validates arguments against
 * each tool's schema before `execute` runs. Server features that call tools
 * internally (code_mode, deprecated aliases, discovery mode) must apply the
 * same validation, otherwise schema defaults, bounds and enums are skipped.
 * They all go through `ToolRegistry.invoke()`.
 */

import type { Tool } from "fastmcp";
import type { ApiModule } from "../shared/types.js";

// ─── Types ───────────────────────────────────────────────────────────

type IssuePathSegment = PropertyKey | { key: PropertyKey };

interface ValidationIssue {
  message: string;
  path?: ReadonlyArray<IssuePathSegment>;
}

type ValidationResult =
  | { value: unknown; issues?: undefined }
  | { issues: ReadonlyArray<ValidationIssue> };

/** Minimal Standard Schema surface (implemented by Zod 4, which every module uses). */
interface StandardSchemaLike {
  "~standard": {
    validate: (value: unknown) => ValidationResult | Promise<ValidationResult>;
  };
}

/** A registered module tool. */
export interface RegisteredTool {
  /** Canonical tool name. */
  name: string;
  /** Name of the module that owns the tool. */
  module: string;
  /** The FastMCP tool definition. */
  tool: Tool<any, any>;
}

/** Outcome of `ToolRegistry.invoke()`. Never throws for expected failures. */
export type InvokeResult =
  | { ok: true; tool: RegisteredTool; result: unknown }
  | {
      ok: false;
      kind: "unknown_tool" | "invalid_args" | "execution_error";
      message: string;
      tool?: RegisteredTool;
    };

// ─── Helpers ─────────────────────────────────────────────────────────

function isStandardSchema(value: unknown): value is StandardSchemaLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "~standard" in value &&
    typeof (value as StandardSchemaLike)["~standard"]?.validate === "function"
  );
}

function formatPath(path: ReadonlyArray<IssuePathSegment> | undefined): string {
  if (!path?.length) return "(root)";
  return path
    .map(seg => (typeof seg === "object" && seg !== null ? String(seg.key) : String(seg)))
    .join(".");
}

/** Render validation issues as "field: message; other: message". */
export function formatIssues(issues: ReadonlyArray<ValidationIssue>): string {
  return issues.map(i => `${formatPath(i.path)}: ${i.message}`).join("; ");
}

// ─── Registry ────────────────────────────────────────────────────────

export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();
  private readonly aliases = new Map<string, string>();

  /** Register a module tool under its canonical name. */
  register(moduleName: string, tool: Tool<any, any>): RegisteredTool {
    if (this.tools.has(tool.name) || this.aliases.has(tool.name)) {
      throw new Error(`Duplicate tool name "${tool.name}" (module "${moduleName}")`);
    }
    const entry: RegisteredTool = { name: tool.name, module: moduleName, tool };
    this.tools.set(tool.name, entry);
    return entry;
  }

  /** Map a legacy name to a canonical tool. */
  addAlias(alias: string, canonical: string): void {
    if (!this.tools.has(canonical)) {
      throw new Error(`Alias "${alias}" targets unknown tool "${canonical}"`);
    }
    if (this.tools.has(alias) || this.aliases.has(alias)) {
      throw new Error(`Alias "${alias}" collides with an existing tool or alias`);
    }
    this.aliases.set(alias, canonical);
  }

  /** Look up a tool by canonical name or alias. */
  resolve(name: string): RegisteredTool | undefined {
    return this.tools.get(this.aliases.get(name) ?? name);
  }

  /** True when `name` is a registered alias (not a canonical name). */
  isAlias(name: string): boolean {
    return this.aliases.has(name);
  }

  /** Canonical tool names, sorted. */
  names(): string[] {
    return [...this.tools.keys()].sort();
  }

  /** Alias → canonical pairs. */
  aliasEntries(): [string, string][] {
    return [...this.aliases.entries()];
  }

  /**
   * Canonical names that look like `name` — shared underscore-separated
   * tokens or substring matches — best first. For "did you mean" hints.
   */
  suggest(name: string, limit = 8): string[] {
    const query = name.toLowerCase();
    const tokens = new Set(query.split(/[^a-z0-9]+/).filter(Boolean));
    const scored: [string, number][] = [];
    for (const candidate of this.tools.keys()) {
      const parts = candidate.split("_");
      let score = parts.filter(p => tokens.has(p)).length * 2;
      if (candidate.includes(query) || query.includes(candidate)) score += 3;
      if (parts[0] && tokens.has(parts[0])) score += 1;
      if (score > 0) scored.push([candidate, score]);
    }
    return scored
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([n]) => n);
  }

  /** All registered tools. */
  entries(): RegisteredTool[] {
    return [...this.tools.values()];
  }

  get size(): number {
    return this.tools.size;
  }

  /**
   * Validate `args` against the tool's schema without executing it.
   * Applies defaults, bounds and enums exactly as FastMCP does for direct calls.
   */
  async validate(
    name: string,
    args: unknown,
  ): Promise<
    | { ok: true; tool: RegisteredTool; value: unknown }
    | { ok: false; kind: "unknown_tool" | "invalid_args"; message: string; tool?: RegisteredTool }
  > {
    const entry = this.resolve(name);
    if (!entry) {
      return { ok: false, kind: "unknown_tool", message: `Unknown tool "${name}".` };
    }

    const input: unknown = args ?? {};
    const schema = entry.tool.parameters;
    if (!isStandardSchema(schema)) return { ok: true, tool: entry, value: input };

    const result = await schema["~standard"].validate(input);
    if (result.issues) {
      return {
        ok: false,
        kind: "invalid_args",
        tool: entry,
        message: `Invalid arguments for "${entry.name}": ${formatIssues(result.issues)}`,
      };
    }
    return { ok: true, tool: entry, value: result.value };
  }

  /** Validate `args` (see `validate`), then run the tool's `execute`. */
  async invoke(name: string, args: unknown, context?: unknown): Promise<InvokeResult> {
    const validated = await this.validate(name, args);
    if (!validated.ok) return validated;

    const entry = validated.tool;
    try {
      const result = await entry.tool.execute(validated.value as any, (context ?? {}) as any);
      return { ok: true, tool: entry, result };
    } catch (err) {
      return {
        ok: false,
        kind: "execution_error",
        tool: entry,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/** Build a registry from the loaded modules plus a legacy-name alias map. */
export function buildToolRegistry(
  modules: Pick<ApiModule, "name" | "tools">[],
  aliases: Record<string, string> = {},
): ToolRegistry {
  const registry = new ToolRegistry();
  for (const mod of modules) {
    for (const tool of mod.tools) registry.register(mod.name, tool);
  }
  for (const [alias, canonical] of Object.entries(aliases)) {
    // Skip aliases whose target module isn't loaded (selective loading).
    if (registry.resolve(canonical)) registry.addAlias(alias, canonical);
  }
  return registry;
}
