/**
 * Live: structured filter values containing apostrophes no longer break queries.
 */

import { describe, it, expect } from "vitest";
import { callTool, records } from "./helpers.js";

describe("apostrophes in structured filters (live)", () => {
  it("FEMA housing assistance for Prince George's County, MD (previously HTTP 400)", async () => {
    const res = await callTool("fema", "fema_housing_assistance", { state: "MD", county: "Prince George's (County)", top: 5 });
    // A valid query: either rows for the county or an empty result — never a syntax error.
    expect(["table", "list", "empty"]).toContain(res.dataType);
    for (const row of records(res) as unknown[][]) {
      expect(JSON.stringify(row)).toContain("Prince George");
    }
  });

  it("CDC PLACES city data for O'Fallon, MO", async () => {
    const res = await callTool("cdc", "cdc_places_city", { state: "MO", city: "O'Fallon", limit: 5 });
    expect(records(res).length).toBeGreaterThan(0);
    expect(JSON.stringify(res.data)).toMatch(/O'Fallon/i);
  });
});
