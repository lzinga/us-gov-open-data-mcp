/**
 * Shared type definitions for API modules.
 *
 * These interfaces define the contract between individual API modules
 * and the server/docs infrastructure. Every module's `index.ts` must
 * export a default that satisfies `ApiModule`.
 */

import type { Tool, InputPrompt } from "fastmcp";

/** Domain taxonomy for cross-reference routing. Each module can belong to multiple domains. */
export const DOMAINS = [
  "economy",
  "health",
  "legislation",
  "finance",
  "energy",
  "environment",
  "education",
  "housing",
  "spending",
  "safety",
  "agriculture",
  "justice",
  "transportation",
  "international",
] as const;

/** Valid domain value. */
export type Domain = typeof DOMAINS[number];

/**
 * Canonical question types for the cross-reference routing table.
 *
 * Each entry maps to a line in the auto-generated routing table.
 * Grouped by topic cluster for readability in the output.
 *
 * To add a new question type: add it here, then add `crossRef` hints
 * to the relevant module `meta.ts` files.
 */
export const QUESTION_TYPES = [
  // ── Fiscal ──
  "debt/deficit",
  "spending/budget",
  "economy",
  "state-level",

  // ── Legislative ──
  "legislation",
  "elections/campaign finance",
  "executive actions",
  "presidential comparison",

  // ── Health ──
  "health",
  "drug investigation",
  "drug shortages",
  "pharma-doctor payments",
  "food safety",
  "medical devices",
  "animal/vet drugs",
  "tobacco/vaping",
  "substance/ingredient lookup",

  // ── Energy & Environment ──
  "energy/climate",
  "agriculture",
  "housing",

  // ── Education ──
  "education",
  "college",

  // ── Financial & Safety ──
  "banking",
  "consumer complaints",
  "workplace safety",
  "unemployment",

  // ── Infrastructure & Science ──
  "disasters",
  "earthquakes/water",
  "vehicle safety",
  "transportation",
  "patents",
  "procurement/contracting",
  "international",
] as const;

/** Valid question type for routing hints. */
export type QuestionType = typeof QUESTION_TYPES[number];

/**
 * Question-type routing hint.
 *
 * Maps a research question pattern to the specific tools/series this module
 * contributes. Used to auto-generate the cross-reference routing table
 * in the MCP instructions string.
 *
 * Keep routes specific — "FYFSGDA188S (deficit % GDP)" not "FRED series".
 *
 * @example
 * { question: "debt/deficit", route: "FYFSGDA188S (deficit % GDP), GDP (for ratio)" }
 * { question: "drug investigation", route: "drug_events, drug_counts, drug_labels" }
 */
export interface RouteHint {
  /** Question pattern this hint applies to. Must be a value from QUESTION_TYPES. */
  question: QuestionType;
  /** Specific tools, series IDs, or parameters to use for this question type. */
  route: string;
}

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
  auth?: {
    /** Env var name(s) to check at startup. String for one key, array for multi-credential (e.g. ["AQS_API_KEY", "AQS_EMAIL"]). */
    envVar: string | string[];
    signup: string;
  };
  /** Tool workflow guidance for the MCP client (e.g. "fred_search → fred_series_data"). */
  workflow: string;
  /** Usage tips for the MCP client. */
  tips: string;
  /** Domains this module participates in. Drives the DOMAINS type check and docs grouping. */
  domains: Domain[];
  /**
   * Question-type routing hints. Maps research questions to specific tools/series
   * this module provides. Used to auto-generate the cross-reference routing table.
   *
   * Each hint answers: "When someone asks about X, use THESE specific tools/series from this module."
   */
  crossRef?: RouteHint[];
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
