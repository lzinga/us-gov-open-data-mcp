/**
 * Harness sanity checks: one keyless and one keyed API through the validated registry.
 */

import { describe, it, expect } from "vitest";
import { callTool, itWithKeys, records } from "./helpers.js";

describe("smoke harness", () => {
  it("calls a keyless API (Treasury debt to the penny)", async () => {
    const res = await callTool("treasury", "treasury_query_fiscal_data", {
      endpoint: "/v2/accounting/od/debt_to_penny",
      sort: "-record_date",
      page_size: 2,
    });
    expect(res.summary).toMatch(/debt_to_penny/);
    expect(records(res).length).toBe(2);
  });

  itWithKeys(["FRED_API_KEY"])("calls a keyed API (FRED GDP metadata)", async () => {
    const res = await callTool("fred", "fred_series_info", { series_id: "GDP" });
    expect(res.dataType).toBe("record");
    expect(res.record?.id).toBe("GDP");
  });
});
