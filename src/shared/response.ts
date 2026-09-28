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
  /** Chronologically first observation. */
  first: { date: string; value: number } | null;
  /** Chronologically last observation. */
  last: { date: string; value: number } | null;
  /** last − first. */
  change: number | null;
  /** (last − first) / |first| × 100; null when first is 0. */
  changePct: number | null;
  /**
   * Compound annual growth rate (%) between first and last. Only when both
   * values are positive, dates are parseable, and they span at least a year.
   */
  cagrPct: number | null;
  /**
   * Direction of the least-squares fit over the whole window (dates are used
   * as the x-axis when they parse; otherwise observation order).
   * increasing/decreasing: fitted change ≥ 5% of the series' scale and R² ≥ 0.3;
   * volatile: no consistent direction and dispersion ≥ 10% of scale; stable: otherwise.
   */
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
 * Parse a period label into a UTC timestamp (ms), or null when unrecognized.
 * Handles: YYYY, YYYY-MM, YYYY-MM-DD[Thh:mm...], "YYYY Qn" / "YYYY-Qn" / "YYYYQn",
 * "YYYYMnn" / "YYYY-Mnn", and fiscal years "FY2024" (FY starts Oct 1 of the prior year).
 */
export function parsePeriod(label: string): number | null {
  const s = label.trim();
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})$/.exec(s))) return Date.UTC(+m[1], 0, 1);
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) return Date.UTC(+m[1], +m[2] - 1, 1);
  if ((m = /^(\d{4})[-\s]?Q([1-4])$/i.exec(s))) return Date.UTC(+m[1], (+m[2] - 1) * 3, 1);
  if ((m = /^(\d{4})-?M(\d{2})$/i.exec(s))) return Date.UTC(+m[1], +m[2] - 1, 1);
  if ((m = /^FY\s?(\d{4})$/i.exec(s))) return Date.UTC(+m[1] - 1, 9, 1);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const t = Date.parse(s.length === 10 ? `${s}T00:00:00Z` : s);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** Round to 6 significant digits for compact output. */
const sig = (n: number) => Number(n.toPrecision(6));

/**
 * Compute stats for a numeric time-series.
 * Handles string values (coerced to number), skips "." and empty strings (FRED convention).
 */
function computeStats(
  objects: AnyRow[],
  dateKey: string,
  valueKey: string,
): TimeseriesStats {
  const valid: { date: string; value: number; t: number | null }[] = [];
  for (const obj of objects) {
    const raw = obj[valueKey];
    const num = typeof raw === "number" ? raw : Number(raw);
    const date = String(obj[dateKey] ?? "");
    if (!isNaN(num) && raw !== "" && raw !== "." && raw !== null && raw !== undefined) {
      valid.push({ date, value: num, t: parsePeriod(date) });
    }
  }

  if (!valid.length) {
    return {
      count: 0, min: null, max: null, mean: null, first: null, last: null,
      change: null, changePct: null, cagrPct: null, trend: null,
    };
  }

  let min = Infinity, max = -Infinity, sum = 0;
  for (const { value } of valid) {
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }
  const meanRaw = sum / valid.length;

  // Chronological order: by parsed time when every date parses, else by label.
  const timeAware = valid.every(v => v.t !== null);
  const sorted = [...valid].sort((a, b) =>
    timeAware ? (a.t as number) - (b.t as number) : a.date.localeCompare(b.date),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const change = last.value - first.value;
  const changePct = first.value !== 0 ? (change / Math.abs(first.value)) * 100 : null;

  let cagrPct: number | null = null;
  if (timeAware && first.value > 0 && last.value > 0) {
    const years = ((last.t as number) - (first.t as number)) / MS_PER_YEAR;
    if (years >= 1) cagrPct = ((last.value / first.value) ** (1 / years) - 1) * 100;
  }

  // x-axis: years since the first observation when dates parse, else index.
  const xs = sorted.map((p, i) => (timeAware ? ((p.t as number) - (first.t as number)) / MS_PER_YEAR : i));
  const trend = detectTrend(xs, sorted.map(p => p.value), meanRaw, max - min);

  return {
    count: valid.length,
    min: sig(min),
    max: sig(max),
    mean: sig(meanRaw),
    first: { date: first.date, value: first.value },
    last: { date: last.date, value: last.value },
    change: sig(change),
    changePct: changePct === null ? null : Number(changePct.toFixed(2)),
    cagrPct: cagrPct === null ? null : Number(cagrPct.toFixed(2)),
    trend,
  };
}

/**
 * Classify the direction of a series from its least-squares fit.
 *
 * The fitted change across the whole window (slope × span) is compared with
 * the series' scale (|mean|, or half the range for series centred near zero),
 * so the result doesn't depend on how many observations there are — the old
 * per-step threshold labelled 10 years of steadily rising monthly CPI "stable".
 */
function detectTrend(
  xs: number[],
  ys: number[],
  mean: number,
  range: number,
): "increasing" | "decreasing" | "stable" | "volatile" | null {
  const n = ys.length;
  if (n < 3) return null;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - meanX) ** 2;
    sxy += (xs[i] - meanX) * (ys[i] - mean);
    ssTot += (ys[i] - mean) ** 2;
  }
  if (sxx === 0 || ssTot === 0) return "stable";

  const slope = sxy / sxx;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const fitted = mean + slope * (xs[i] - meanX);
    ssRes += (ys[i] - fitted) ** 2;
  }
  const r2 = 1 - ssRes / ssTot;

  const scale = Math.max(Math.abs(mean), range / 2, Number.EPSILON);
  const fittedChange = slope * (xs[n - 1] - xs[0]);
  const relChange = fittedChange / scale;
  const dispersion = Math.sqrt(ssTot / n) / scale;

  if (r2 >= 0.3 && Math.abs(relChange) >= 0.05) return fittedChange > 0 ? "increasing" : "decreasing";
  if (dispersion >= 0.1) return "volatile";
  return "stable";
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
 *
 * When rows can hold several series (e.g. EIA prices for many states), pass
 * `seriesKeys`: stats are then computed per series (`seriesStats`) instead of
 * across a meaningless mix of series.
 */
export function timeseriesResponse(summary: string, opts: {
  rows: AnyRow[];
  dateKey: string;
  valueKey: string;
  extraFields?: string[];
  /** Fields that identify a series within the rows. */
  seriesKeys?: string[];
  total?: number;
  maxRows?: number;
  meta?: Record<string, unknown>;
}): string {
  const { rows, dateKey, valueKey, extraFields, seriesKeys, maxRows = DEFAULT_MAX_ROWS, meta } = opts;
  const total = opts.total ?? rows.length;

  if (!rows.length) return emptyResponse(summary);

  // Group rows into series when the caller says rows may mix series.
  const groups = new Map<string, AnyRow[]>();
  if (seriesKeys?.length) {
    for (const row of rows) {
      const label = seriesKeys.map(k => row[k]).filter(v => v !== undefined && v !== null && v !== "").join(" | ") || "(all)";
      const group = groups.get(label);
      if (group) group.push(row);
      else groups.set(label, [row]);
    }
  }

  // Build column order
  const columnOrder = [dateKey, valueKey, ...(extraFields ?? [])];

  // Convert to columnar
  const columnar = toColumnar(rows, columnOrder, maxRows);

  const response: Record<string, unknown> = { summary, dataType: "timeseries" };

  // Compute stats from ALL rows (before truncation). Keep nulls — they're
  // meaningful (e.g. trend:null = not enough data).
  if (groups.size > 1) {
    response.stats = null;
    const multiPoint = [...groups.entries()].filter(([, g]) => g.length > 1);
    if (!multiPoint.length) {
      response.statsNote = `${groups.size} series with one observation each; no per-series trends.`;
    } else {
      const entries = multiPoint.slice(0, MAX_SERIES_STATS);
      response.seriesStats = Object.fromEntries(entries.map(([label, g]) => [label, computeStats(g, dateKey, valueKey)]));
      response.statsNote = multiPoint.length > MAX_SERIES_STATS
        ? `${groups.size} series in response; stats shown for the first ${MAX_SERIES_STATS} with 2+ observations.`
        : `${groups.size} series in response; stats are per series${multiPoint.length < groups.size ? " (series with 2+ observations)" : ""}.`;
    }
  } else {
    response.stats = computeStats(rows, dateKey, valueKey);
  }

  response.data = {
    columns: columnar.columns,
    rows: columnar.rows,
    total,
    truncated: columnar.truncated,
  };

  if (meta) response.meta = stripNulls(meta);

  return JSON.stringify(response);
}

/** Most series given individual stats in one timeseries response. */
const MAX_SERIES_STATS = 25;

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
  /** Total matching items; `null` when the total is unknown. Defaults to items.length. */
  total?: number | null;
  maxItems?: number;
  meta?: Record<string, unknown>;
}): string {
  const { items, maxItems = DEFAULT_MAX_ITEMS, meta } = opts;
  const total = opts.total === null ? null : (opts.total ?? items.length);

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
