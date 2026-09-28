/**
 * Live: state parameters accept full names (normalized by src/shared/geo.ts).
 */

import { describe, it, expect } from "vitest";
import { callTool, itWithKeys, records } from "./helpers.js";

describe("state names (live)", () => {
  it("cdc_covid finds Texas by name", async () => {
    const res = await callTool("cdc", "cdc_covid", { state: "Texas", limit: 5 });
    expect(records(res).length).toBeGreaterThan(0);
    expect(JSON.stringify(res.data)).toContain('"TX"');
  }, 60_000);

  it("fema_disaster_declarations finds Texas by name", async () => {
    const res = await callTool("fema", "fema_disaster_declarations", { state: "Texas", limit: 5 });
    const rows = records(res) as unknown[];
    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.data)).toContain('"TX"');
  }, 60_000);

  itWithKeys(["CENSUS_API_KEY"])("census_population finds Texas by name", async () => {
    const res = await callTool("census", "census_population", { state: "Texas" });
    expect(JSON.stringify(res)).toContain("Texas");
    expect(records(res)).toHaveLength(1);
  }, 60_000);

  itWithKeys(["EIA_API_KEY"])("eia_state_energy finds California by name", async () => {
    const res = await callTool("eia", "eia_state_energy", { state: "California", length: 5 });
    expect(res.summary).toContain("for CA");
    expect(records(res).length).toBeGreaterThan(0);
  }, 60_000);
});
