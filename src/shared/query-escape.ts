/**
 * Helpers for building filter expressions from structured tool parameters.
 *
 * Several APIs take a query language in a URL parameter — Socrata SoQL
 * `$where` (CDC, BTS) and OData `$filter` (OpenFEMA). Values interpolated
 * into those expressions must be quoted and escaped, otherwise an apostrophe
 * ("Prince George's") produces a syntax error or changes the filter.
 *
 * Only use these for values from structured parameters. Tools that accept a
 * raw expression from the caller (e.g. cdc_query `where`, fema_query `filter`)
 * pass it through unchanged by design.
 */

/** A single-quoted string literal with embedded quotes doubled (SoQL and OData share this rule). */
function quote(value: string | number): string {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** SoQL string literal: `O'Brien` → `'O''Brien'`. */
export function soqlString(value: string | number): string {
  return quote(value);
}

/** SoQL substring pattern for LIKE: `Coeur d'Alene` → `'%Coeur d''Alene%'`. */
export function soqlContains(value: string): string {
  return quote(`%${value}%`);
}

/** OData string literal: `Prince George's` → `'Prince George''s'`. */
export function odataString(value: string | number): string {
  return quote(value);
}

/** An integer for use in a filter expression; throws on anything else. */
export function integerValue(value: unknown, name: string): number {
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n)) throw new Error(`${name} must be an integer (got ${JSON.stringify(value)})`);
  return n;
}

/** An ISO date or datetime (YYYY-MM[-DD][Thh:mm[:ss[.fff]]][Z]) for a filter expression; throws otherwise. */
export function isoDateValue(value: string, name: string): string {
  const v = String(value).trim();
  if (!/^\d{4}-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z?)?)?$/i.test(v)) {
    throw new Error(`${name} must be an ISO date like 2024-01-31 (got ${JSON.stringify(value)})`);
  }
  return v;
}
