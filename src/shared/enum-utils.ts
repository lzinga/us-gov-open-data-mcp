/**
 * Shared utilities for deriving Zod enums from SDK reference constants.
 *
 * Many SDK modules export Record<string, string> mapping codes → labels
 * (e.g., SUMMARIZED_OFFENSES, TRIAL_PHASES, FUEL_TYPES). These utilities
 * convert those constants into Zod enum schemas with auto-generated
 * descriptions, ensuring tool parameters are validated at runtime and
 * MCP clients can offer autocompletion.
 *
 * Usage in a module:
 *   import { keysEnum, describeEnum } from "../enum-utils.js";
 *   import { FUEL_TYPES } from "../sdk/nrel.js";
 *
 *   const fuelEnum = keysEnum(FUEL_TYPES);
 *   // In tool parameters:
 *   fuel_type: z.enum(fuelEnum).describe(describeEnum(FUEL_TYPES))
 */

/**
 * Extract keys from a Record as a Zod-compatible enum tuple [string, ...string[]].
 * Zod's z.enum() requires at least one element — this ensures the tuple shape.
 */
export function keysEnum<T extends Record<string, unknown>>(obj: T): [string, ...string[]] {
  return Object.keys(obj) as [string, ...string[]];
}

/**
 * Format a Record<string, string> as "'CODE (Label), ..." for use in .describe().
 * 
 * Auto-decides: shows all entries for small enums (≤12), truncates larger ones
 * to `limit` entries with a total count. Override with explicit limit.
 *
 * @param obj - The code→label mapping
 * @param limit - Max entries to show (default: auto — all if ≤12, else 8)
 * @returns Description string like "'V' (Violent Crime), 'P' (Property Crime), ... (10 total)"
 */
export function describeEnum(obj: Record<string, string>, limit?: number): string {
  const entries = Object.entries(obj);
  const effectiveLimit = limit ?? (entries.length <= 12 ? entries.length : 8);
  const shown = entries.slice(0, effectiveLimit).map(([k, v]) => `'${k}' (${v})`).join(", ");
  return entries.length > effectiveLimit ? `${shown}, ... (${entries.length} total)` : shown;
}

/**
 * List keys from a Record as a comma-separated string for use in .describe().
 * Simpler than describeEnum - just shows the keys without labels.
 *
 * @param obj - Any object with string keys
 * @returns String like "'current_price', 'labor_category', 'vendor_name'"
 */
export function describeKeys(obj: Record<string, unknown>): string {
  return Object.keys(obj).map((k) => `'${k}'`).join(", ");
}
