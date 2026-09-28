/**
 * Live: CDC tools return current NCHS data.
 */

import { describe, it, expect } from "vitest";
import { callTool } from "./helpers.js";

function rows(res: { data?: { columns: string[]; rows: unknown[][] } }) {
  const cols = res.data?.columns ?? [];
  return (res.data?.rows ?? []).map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

describe("CDC current datasets (live)", () => {
  it("cdc_drug_overdose returns provisional national counts from the last two years", async () => {
    const res = await callTool("cdc", "cdc_drug_overdose", { state: "US", limit: 3 });
    const [latest] = rows(res as never);
    expect(Number(latest.year)).toBeGreaterThanOrEqual(new Date().getFullYear() - 1);
    expect(Number(latest.data_value)).toBeGreaterThan(10_000); // national 12-month total
  }, 60_000);

  it("cdc_life_expectancy returns 2021 state life expectancy", async () => {
    const res = await callTool("cdc", "cdc_life_expectancy", { state: "Hawaii", sex: "Both Sexes" });
    const [hi] = rows(res as never);
    expect(hi).toMatchObject({ year: 2021, state: "Hawaii", sex: "Total" });
    expect(hi.lifeExpectancy as number).toBeGreaterThan(75);
    expect(hi.lifeExpectancy as number).toBeLessThan(85);
  }, 60_000);
});
