/**
 * Response size budget (src/server/response-budget.ts).
 */

import { describe, it, expect } from "vitest";
import { budgetResult, DEFAULT_MAX_RESPONSE_BYTES, fitResponse, maxResponseBytes } from "../src/server/response-budget.js";
import { listResponse, tableResponse } from "../src/shared/response.js";

const bytes = (s: string) => Buffer.byteLength(s, "utf8");

describe("maxResponseBytes", () => {
  it("defaults, accepts integers, allows 0 to disable, ignores junk", () => {
    expect(maxResponseBytes({})).toBe(DEFAULT_MAX_RESPONSE_BYTES);
    expect(maxResponseBytes({ MAX_RESPONSE_BYTES: "20000" })).toBe(20_000);
    expect(maxResponseBytes({ MAX_RESPONSE_BYTES: "0" })).toBe(0);
    expect(maxResponseBytes({ MAX_RESPONSE_BYTES: "lots" })).toBe(DEFAULT_MAX_RESPONSE_BYTES);
    expect(maxResponseBytes({ MAX_RESPONSE_BYTES: "-5" })).toBe(DEFAULT_MAX_RESPONSE_BYTES);
  });
});

describe("fitResponse", () => {
  const table = tableResponse("1000 rows of data", {
    rows: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `row ${i}`, note: "x".repeat(40) })),
  });

  it("leaves responses under the budget untouched", () => {
    expect(fitResponse(table, bytes(table))).toBe(table);
    expect(fitResponse(table, 0)).toBe(table);
  });

  it("cuts table rows to the longest prefix that fits and stays valid JSON", () => {
    const out = fitResponse(table, 10_000);
    expect(bytes(out)).toBeLessThanOrEqual(10_000);
    const parsed = JSON.parse(out);
    expect(parsed.data.rows.length).toBeGreaterThan(50);
    expect(parsed.data.rows.length).toBeLessThan(1000);
    expect(parsed.data.rows[0]).toEqual([0, "row 0", "x".repeat(40)]); // rows kept in order, untouched
    expect(parsed.data.truncated).toBe(true);
    expect(parsed.data.total).toBe(1000);
    expect(parsed.truncatedToFit).toMatchObject({ maxBytes: 10_000, shortened: [{ path: "data.rows", of: 1000, kept: parsed.data.rows.length }] });
    expect(parsed.summary).toBe("1000 rows of data [shortened to fit 10 KB]");
  });

  it("cuts list items too", () => {
    const list = listResponse("500 items", { items: Array.from({ length: 500 }, (_, i) => ({ i, text: "y".repeat(100) })) });
    const parsed = JSON.parse(fitResponse(list, 5_000));
    expect(parsed.data.items.length).toBeGreaterThan(10);
    expect(parsed.data.items.length).toBeLessThan(500);
    expect(parsed.truncatedToFit.shortened[0].path).toBe("data.items");
  });

  it("clips long strings when there are no arrays to cut", () => {
    const record = JSON.stringify({ summary: "Bill text", record: { title: "Act", text: "z".repeat(50_000) } });
    const out = fitResponse(record, 8_000);
    expect(bytes(out)).toBeLessThanOrEqual(8_000);
    const parsed = JSON.parse(out);
    expect(parsed.record.title).toBe("Act");
    expect(parsed.record.text).toMatch(/^z+… \[clipped from 50000 chars\]$/);
    expect(parsed.truncatedToFit.clippedStrings).toBe(1);
  });

  it("clips plain text with a note", () => {
    const out = fitResponse("é".repeat(10_000), 1_000); // 2 bytes per character
    expect(bytes(out)).toBeLessThanOrEqual(1_000);
    expect(out).toMatch(/response shortened from 20000 to fit 1000 bytes/);
  });

  it("handles multi-byte text by bytes, not characters", () => {
    const wide = tableResponse("wide", { rows: Array.from({ length: 300 }, (_, i) => ({ i, s: "日本語".repeat(20) })) });
    expect(bytes(fitResponse(wide, 6_000))).toBeLessThanOrEqual(6_000);
  });
});

describe("budgetResult", () => {
  it("applies to strings and to text content parts, and passes other values through", () => {
    const big = "a".repeat(5_000);
    expect(bytes(budgetResult(big, 1_000) as string)).toBeLessThanOrEqual(1_000);
    const content = budgetResult({ content: [{ type: "text", text: big }, { type: "image", data: "x", mimeType: "image/png" }] }, 1_000) as { content: { type: string; text?: string }[] };
    expect(bytes(content.content[0].text!)).toBeLessThanOrEqual(1_000);
    expect(content.content[1]).toEqual({ type: "image", data: "x", mimeType: "image/png" });
    expect(budgetResult(42, 10)).toBe(42);
  });
});
