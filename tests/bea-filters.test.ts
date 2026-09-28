/**
 * bea_dataset_info get_filtered_values: invalid `filters` get a clear error
 * instead of a raw JSON.parse SyntaxError, and valid ones reach the API.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { UserError } from "fastmcp";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  (await import("../src/apis/bea/sdk.js")).clearCache();
});

async function run(filters: string | undefined) {
  const { tools } = await import("../src/apis/bea/tools.js");
  const tool = tools.find(t => t.name === "bea_dataset_info")!;
  return tool.execute({ action: "get_filtered_values", dataset_name: "Regional", target_parameter: "LineCode", filters } as any, {} as any);
}

function stubBea() {
  const calls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    calls.push(new URL(u));
    return new Response(JSON.stringify({ BEAAPI: { Results: { ParamValue: [{ Key: "1", Desc: "Personal income" }] } } }), { status: 200 });
  }));
  return calls;
}

describe("bea_dataset_info filters", () => {
  it.each([
    ["not JSON", "{TableName: SAINC1}", /not valid JSON/],
    ["an array", '["SAINC1"]', /not an array/],
    ["a bare value", '"SAINC1"', /not SAINC1/],
    ["a nested object", '{"TableName":{"id":"SAINC1"}}', /filters\.TableName must be a string/],
  ])("rejects %s with a UserError that shows the expected shape", async (_label, filters, message) => {
    const calls = stubBea();
    const err = await run(filters).then(() => null, e => e);
    expect(err).toBeInstanceOf(UserError);
    expect(err.message).toMatch(message);
    expect(err.message).toContain('{"TableName":"SAINC1"}');
    expect(calls).toEqual([]); // nothing sent upstream
  });

  it("passes a valid object through, stringifying numbers and joining lists", async () => {
    vi.stubEnv("BEA_API_KEY", "test-key");
    const calls = stubBea();
    const out = JSON.parse(await run('{"TableName":"SAINC1","Year":[2022,2023],"GeoFips":6000}') as string);
    const params = calls[0].searchParams;
    expect(params.get("method")).toBe("GetParameterValuesFiltered");
    expect(params.get("TableName")).toBe("SAINC1");
    expect(params.get("Year")).toBe("2022,2023");
    expect(params.get("GeoFips")).toBe("6000");
    expect(out.summary).toContain("1 values");
  });

  it("treats missing or blank filters as none", async () => {
    vi.stubEnv("BEA_API_KEY", "test-key");
    const calls = stubBea();
    await run("  ");
    expect(calls[0].searchParams.get("TargetParameter")).toBe("LineCode");
    expect(calls[0].searchParams.get("TableName")).toBeNull();
  });
});
