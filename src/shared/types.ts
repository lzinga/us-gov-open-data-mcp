/**
 * Shared type definitions for API modules.
 *
 * These interfaces define the contract between individual API modules
 * and the server/docs infrastructure. Every module's `index.ts` must
 * export a default that satisfies `ApiModule`.
 */

import type { Tool, InputPrompt } from "fastmcp";

/** Metadata for an API module — identity, auth, and reference data. */
export interface ModuleMeta {
  /** Unique module identifier (matches folder name, e.g. "fred", "congress"). */
  name: string;
  /** Human-readable display name (e.g. "FRED (Federal Reserve Economic Data)"). */
  displayName: string;
  /** Category for grouping in docs and sidebar (e.g. "Economic", "Legislative"). */
  category: string;
  /** Brief description of what the API provides. */
  description: string;
  /** API key configuration. Omit for keyless APIs. */
  auth?: { envVar: string; signup: string };
  /** Tool workflow guidance for the MCP client (e.g. "fred_search → fred_series_data"). */
  workflow: string;
  /** Usage tips for the MCP client. */
  tips: string;
  /** Reference data exposed as an MCP resource (lookup tables, docs links). */
  reference?: Record<string, unknown>;
}

/** Complete API module — metadata + tools + prompts + cache control. */
export interface ApiModule extends ModuleMeta {
  /** MCP tool definitions. */
  tools: Tool<any, any>[];
  /** MCP prompts (optional). */
  prompts?: InputPrompt<any, any>[];
  /** Clear cached API responses. */
  clearCache?: () => void;
}
