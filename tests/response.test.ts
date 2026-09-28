/**
 * Response envelopes: table, list, record and empty responses, and cleanHtml.
 * (Time-series stats: timeseries-stats.test.ts.)
 */

import { describe, it, expect } from "vitest";
import { tableResponse, listResponse, recordResponse, emptyResponse, cleanHtml } from "../src/shared/response.js";

const parse = (s: string) => JSON.parse(s);

describe("tableResponse", () => {
  it("collects columns from every row and flattens nested values", () => {
    const out = parse(tableResponse("t", {
      rows: [{ a: 1, b: "" }, { a: 2, b: "x", c: { k: 1 } }, { a: 3, d: [1, 2], e: true }],
    }));
    expect(out).toMatchObject({ summary: "t", dataType: "table" });
    expect(out.data).toEqual({
      columns: ["a", "b", "c", "d", "e"],
      rows: [[1, null, null, null, null], [2, "x", '{"k":1}', null, null], [3, null, null, "[1,2]", true]],
      total: 3,
      truncated: false,
    });
  });

  it("follows an explicit column order and drops columns that are empty in every row", () => {
    const out = parse(tableResponse("t", { rows: [{ a: 1, b: null, c: 3 }, { a: 2, c: 4 }], columns: ["c", "b", "a"] }));
    expect(out.data.columns).toEqual(["c", "a"]);
    expect(out.data.rows).toEqual([[3, 1], [4, 2]]);
  });

  it("truncates at maxRows while reporting the caller's total", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ i }));
    const out = parse(tableResponse("t", { rows, maxRows: 2, total: 99 }));
    expect(out.data).toMatchObject({ rows: [[0], [1]], total: 99, truncated: true });
  });

  it("strips nulls from meta, recursively, and returns an empty response for no rows", () => {
    const out = parse(tableResponse("t", { rows: [{ a: 1 }], meta: { x: null, y: { z: undefined, w: 1 }, v: { gone: null } } }));
    expect(out.meta).toEqual({ y: { w: 1 } });
    expect(parse(tableResponse("nothing", { rows: [] }))).toEqual({ summary: "nothing", dataType: "empty", data: null });
  });
});

describe("listResponse", () => {
  it("strips nulls from items, keeps arrays and caps the item count", () => {
    const items = [{ a: 1, b: null, c: [null, 2] }, { a: 2 }, { a: 3 }];
    const out = parse(listResponse("l", { items, maxItems: 2 }));
    expect(out).toMatchObject({ summary: "l", dataType: "list" });
    expect(out.data).toEqual({ items: [{ a: 1, c: [null, 2] }, { a: 2 }], total: 3, truncated: true });
  });

  it("reports an unknown total as null", () => {
    expect(parse(listResponse("l", { items: [{ a: 1 }], total: null })).data.total).toBeNull();
  });
});

describe("recordResponse and emptyResponse", () => {
  it("strips nulls and empty nested objects from a record", () => {
    const out = parse(recordResponse("r", { id: 1, name: null, nested: { gone: null }, keep: { x: 0, y: false } }, { src: "s" }));
    expect(out).toEqual({ summary: "r", dataType: "record", record: { id: 1, keep: { x: 0, y: false } }, meta: { src: "s" } });
  });

  it("includes meta only when given", () => {
    expect(parse(emptyResponse("none"))).toEqual({ summary: "none", dataType: "empty", data: null });
    expect(parse(emptyResponse("none", { hint: "try x", n: null }))).toEqual({
      summary: "none", dataType: "empty", data: null, meta: { hint: "try x" },
    });
  });
});

describe("cleanHtml", () => {
  it("strips tags, decodes entities once, and tidies whitespace", () => {
    expect(cleanHtml("<p>Tom &amp; Jerry&#39;s <b>show</b>&nbsp;&mdash; live</p>")).toBe("Tom & Jerry's show\u00a0— live");
    expect(cleanHtml("&amp;amp;")).toBe("&amp;");
    expect(cleanHtml("  a\n\n\n\nb  ")).toBe("a\n\nb");
    expect(cleanHtml(null)).toBe("");
    expect(cleanHtml(42)).toBe("42");
  });

  it("drops markup that only appears after decoding", () => {
    expect(cleanHtml("Tom &lt;b&gt;bold&lt;/b&gt; &lt;script&gt;x()&lt;/script&gt;")).toBe("Tom bold x()");
  });
});
