/**
 * Live: composite Congress profiles and GovInfo bill text load completely.
 */

import { describe, expect } from "vitest";
import { callTool, itWithKeys } from "./helpers.js";

const it = itWithKeys(["DATA_GOV_API_KEY"]);

describe("composite calls (live)", () => {
  it("congress_bill_full_profile loads every section for H.R. 4346 (117th)", async () => {
    const res = await callTool("congress", "congress_bill_full_profile", { congress: 117, bill_type: "hr", bill_number: 4346 });
    expect(res.summary).not.toContain("INCOMPLETE");
    expect(res.meta?.partialFailures).toBeUndefined();
    expect(res.record.actions.total).toBeGreaterThan(0);
  });

  it("govinfo_bill_text returns text for the enrolled CHIPS and Science Act", async () => {
    const res = await callTool("govinfo", "govinfo_bill_text", { congress: 117, bill_type: "hr", bill_number: 4346, version: "enr", max_length: 2000 });
    expect(JSON.stringify(res)).toMatch(/CHIPS/i);
  });
});
