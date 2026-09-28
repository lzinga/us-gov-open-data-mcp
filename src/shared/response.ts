/**
 * Standardized response helpers for MCP tool results.
 *
 * Goals:
 *   - Token-efficient columnar format for tabular/time-series data
 *   - Consistent envelope across all 37 modules
 *   - Server-side stats for numeric data (min/max/mean/trend)
 *   - Uniform truncation with clear signaling
 *
 * Usage in a module:
 *   import { tableResponse, timeseriesResponse, recordResponse, listResponse, emptyResponse } from "../response.js";
 *
 *   // Time-series (FRED, BLS, EIA, NOAA, etc.)
 *   return timeseriesResponse("GDP: 100 observations", {
 *     rows: data.observations,             // array of objects from the API
 *     dateKey: "date",                      // which field is the date/period
 *     valueKey: "value",                    // which field is the primary numeric value
 *   });
 *
 *   // Table (Census, FDIC, FDA, DOL, etc.)
 *   return tableResponse("FDIC institutions: 500 total, showing 50", {
 *     rows: records,                        // array of objects
 *     columns: ["INSTNAME", "STALP", "ASSET", "DEP"],  // optional — auto-detected if omitted
 *   });
 *
 *   // Single record (bill details, series info, etc.)
 *   return recordResponse("HR 1234: Infrastructure Investment Act", record);
 *
 *   // List of non-tabular items (search results, suggestions, etc.)
 *   return listResponse("FRED search: 50 results", { items: series, total: 200 });
 *
 *   // Empty result
 *   return emptyResponse("No bills found matching 'infrastructure'.");
 */

import { htmlToText } from "./html.js";

// ─── Constants ───────────────────────────────────────────────────────

/**
 * Safety-net max rows — NOT the primary truncation mechanism.
 * Data volume should be controlled at the API level via each tool's
 * limit/page_size/date_range/frequency parameters.
 * This cap only prevents accidental multi-megabyte responses from
 * blowing up the context window.
 */
const DEFAULT_MAX_ROWS = 10_000;

/** Safety-net max items for list responses. */
const DEFAULT_MAX_ITEMS = 1_000;

// ─── Types ───────────────────────────────────────────────────────────

export interface TimeseriesStats {
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  first: { date: string; value: number } | null;
  last: { date: string; value: number } | null;
  trend: "increasing" | "decreasing" | "stable" | "volatile" | null;
}

interface ColumnarData {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  total?: number;
  truncated: boolean;
}

/** Accept any object — typed interfaces and plain Records alike. */
type AnyRow = Record<string, any>;

// ─── Internal Helpers ────────────────────────────────────────────────

/**
 * Convert an array of objects to columnar format.
 *
 * Input:  [{ date: "2024-01", value: 4.2 }, { date: "2024-02", value: 4.1 }]
 * Output: { columns: ["date", "value"], rows: [["2024-01", 4.2], ["2024-02", 4.1]] }
 */
function toColumnar(
  objects: AnyRow[],
  columnOrder?: string[],
  maxRows = DEFAULT_MAX_ROWS,
): ColumnarData {
  if (!objects.length) {
    return { columns: columnOrder ?? [], rows: [], total: 0, truncated: false };
  }

  // Determine columns: use explicit order, or collect all keys from first few rows
  const cols = columnOrder ?? collectKeys(objects);

  const total = objects.length;
  const truncated = total > maxRows;
  const sliced = truncated ? objects.slice(0, maxRows) : objects;

  const rows = sliced.map(obj =>
    cols.map(col => {
      const v = obj[col];
      if (v === undefined || v === null || v === "") return null;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
      // Flatten arrays/objects to compact JSON instead of useless "[object Object]"
      try { return JSON.stringify(v); } catch { return String(v); }
    }),
  );

  // Drop columns that are entirely null — they carry zero information
  if (rows.length > 0) {
    const keep: number[] = [];
    for (let c = 0; c < cols.length; c++) {
      if (rows.some(row => row[c] !== null)) keep.push(c);
    }
    if (keep.length < cols.length) {
      const filteredCols = keep.map(i => cols[i]);
      const filteredRows = rows.map(row => keep.map(i => row[i]));
      return { columns: filteredCols, rows: filteredRows, total, truncated };
    }
  }

  return { columns: cols, rows, total, truncated };
}

/**
 * Collect all unique keys across ALL objects, preserving insertion order.
 * Scans every row to ensure no columns are missed when objects have
 * heterogeneous keys (e.g., row 50 introduces a new field).
 */
function collectKeys(objects: AnyRow[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const obj of objects) {
    for (const key of Object.keys(obj)) {
      if (!seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
    }
  }
  return result;
}

/**
 * Compute stats for a numeric time-series.
 * Handles string values (coerced to number), skips "." and empty strings (FRED convention).
 */
function computeStats(
  objects: AnyRow[],
  dateKey: string,
  valueKey: string,
): TimeseriesStats {
  const valid: { date: string; value: number }[] = [];
  for (const obj of objects) {
    const raw = obj[valueKey];
    const num = typeof raw === "number" ? raw : Number(raw);
    const date = String(obj[dateKey] ?? "");
    if (!isNaN(num) && raw !== "" && raw !== "." && raw !== null && raw !== undefined) {
      valid.push({ date, value: num });
    }
  }

  if (!valid.length) {
    return { count: 0, min: null, max: null, mean: null, first: null, last: null, trend: null };
  }

  let min = Infinity, max = -Infinity, sum = 0;
  for (const { value } of valid) {
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }

  const mean = Number((sum / valid.length).toPrecision(6));

  // Find first/last by date (single pass — avoids O(n log n) sort)
  let first = valid[0], last = valid[0];
  for (let i = 1; i < valid.length; i++) {
    if (valid[i].date < first.date) first = valid[i];
    if (valid[i].date > last.date) last = valid[i];
  }

  // For trend detection, we need chronological order — sort a copy
  const sorted = [...valid].sort((a, b) => a.date.localeCompare(b.date));
  const trend = detectTrend(sorted.map(s => s.value));

  return {
    count: valid.length,
    min: Number(min.toPrecision(6)),
    max: Number(max.toPrecision(6)),
    mean,
    first,
    last,
    trend,
  };
}

/**
 * Simple trend detection using linear regression sign + R².
 * Returns null if fewer than 3 points.
 */
function detectTrend(values: number[]): "increasing" | "decreasing" | "stable" | "volatile" | null {
  if (values.length < 3) return null;

  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return "stable";

  const slope = (n * sumXY - sumX * sumY) / denom;

  // R² for consistency check
  const ssRes = values.reduce((acc, y, i) => {
    const yHat = (sumY / n) + slope * (i - sumX / n);
    return acc + (y - yHat) ** 2;
  }, 0);
  const ssTot = values.reduce((acc, y) => acc + (y - sumY / n) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  // Low R² means noisy/volatile
  if (r2 < 0.3) return "volatile";

  // Relative slope: how steep relative to the mean
  const meanVal = sumY / n;
  const relSlope = meanVal !== 0 ? slope / Math.abs(meanVal) : slope;

  // Threshold: <1% per-step relative change = stable
  if (Math.abs(relSlope) < 0.01) return "stable";

  return slope > 0 ? "increasing" : "decreasing";
}

/** Strip null/undefined values from an object (recursive for nested objects). */
function stripNulls(obj: AnyRow): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      result[k] = v; // Keep arrays as-is (they may contain nulls intentionally)
    } else if (typeof v === "object" && v !== null) {
      const stripped = stripNulls(v as AnyRow);
      if (Object.keys(stripped).length > 0) result[k] = stripped;
    } else {
      result[k] = v;
    }
  }
  return result;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Time-series response — optimized for date+value data (FRED, BLS, EIA, NOAA, etc.)
 *
 * Converts array-of-objects to columnar format + computes stats.
 * Columns default to [dateKey, valueKey, ...extraFields].
 */
export function timeseriesResponse(summary: string, opts: {
  rows: AnyRow[];
  dateKey: string;
  valueKey: string;
  extraFields?: string[];
  total?: number;
  maxRows?: number;
  meta?: Record<string, unknown>;
}): string {
  const { rows, dateKey, valueKey, extraFields, maxRows = DEFAULT_MAX_ROWS, meta } = opts;
  const total = opts.total ?? rows.length;

  if (!rows.length) return emptyResponse(summary);

  // Compute stats from ALL rows (before truncation)
  const stats = computeStats(rows, dateKey, valueKey);

  // Build column order
  const columnOrder = [dateKey, valueKey, ...(extraFields ?? [])];

  // Convert to columnar
  const columnar = toColumnar(rows, columnOrder, maxRows);

  const response: Record<string, unknown> = {
    summary,
    dataType: "timeseries",
    stats,  // Keep nulls — they're meaningful (e.g. trend:null = not enough data)
    data: {
      columns: columnar.columns,
      rows: columnar.rows,
      total,
      truncated: columnar.truncated,
    },
  };

  if (meta) response.meta = stripNulls(meta);

  return JSON.stringify(response);
}

/**
 * Table response — for tabular data with multiple columns (Census, FDIC, FDA, DOL, etc.)
 *
 * Converts array-of-objects to columnar format. No stats computed.
 */
export function tableResponse(summary: string, opts: {
  rows: AnyRow[];
  columns?: string[];
  total?: number;
  maxRows?: number;
  meta?: Record<string, unknown>;
}): string {
  const { rows, columns, maxRows = DEFAULT_MAX_ROWS, meta } = opts;
  const total = opts.total ?? rows.length;

  if (!rows.length) return emptyResponse(summary);

  const columnar = toColumnar(rows, columns, maxRows);

  const response: Record<string, unknown> = {
    summary,
    dataType: "table",
    data: {
      columns: columnar.columns,
      rows: columnar.rows,
      total,
      truncated: columnar.truncated,
    },
  };

  if (meta) response.meta = stripNulls(meta);

  return JSON.stringify(response);
}

/**
 * Record response — for single-record lookups (bill details, series info, etc.)
 *
 * Strips null values from the record to save tokens.
 */
export function recordResponse(summary: string, record: AnyRow, meta?: Record<string, unknown>): string {
  const response: Record<string, unknown> = {
    summary,
    dataType: "record",
    record: stripNulls(record),
  };
  if (meta) response.meta = stripNulls(meta);
  return JSON.stringify(response);
}

/**
 * List response — for search results, suggestions, and other item lists.
 *
 * Keeps the array-of-objects format (items may be heterogeneous or nested),
 * but strips nulls from each item and enforces a max-items cap.
 */
export function listResponse(summary: string, opts: {
  items: AnyRow[];
  total?: number;
  maxItems?: number;
  meta?: Record<string, unknown>;
}): string {
  const { items, maxItems = DEFAULT_MAX_ITEMS, meta } = opts;
  const total = opts.total ?? items.length;

  if (!items.length) return emptyResponse(summary);

  const truncated = items.length > maxItems;
  const sliced = truncated ? items.slice(0, maxItems) : items;

  const response: Record<string, unknown> = {
    summary,
    dataType: "list",
    data: {
      items: sliced.map(item => stripNulls(item)),
      total,
      truncated,
    },
  };

  if (meta) response.meta = stripNulls(meta);

  return JSON.stringify(response);
}

/**
 * Empty/no-result response — consistent across all modules.
 */
export function emptyResponse(message: string): string {
  return JSON.stringify({ summary: message, dataType: "empty", data: null });
}

// ─── HTML Sanitization ───────────────────────────────────────────────

/**
 * Convert an HTML fragment to plain text with paragraph-style whitespace.
 * See `htmlToText` in `./html.ts` for details and limitations.
 *
 * @param input — raw HTML string (or unknown value)
 * @returns plain text with entities decoded and blank lines collapsed
 */
export function cleanHtml(input: unknown): string {
  return htmlToText(input, { whitespace: "paragraphs" });
}
