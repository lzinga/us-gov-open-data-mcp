/**
 * BLS series builders: LAUS (state/county unemployment) and OEWS (wages by occupation).
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { lausSeries, oewsSeries } from "../src/apis/bls/sdk.js";

afterEach(() => vi.unstubAllGlobals());
beforeEach(async () => (await import("../src/apis/bls/sdk.js")).clearCache());

describe("series ID builders", () => {
  it("builds LAUS IDs for states (seasonally adjusted) and counties (unadjusted)", () => {
    expect(lausSeries("Texas")).toEqual({ id: "LASST480000000000003", label: "Texas unemployment rate (seasonally adjusted)" });
    expect(lausSeries("ca", "labor_force").id).toBe("LASST060000000000006");
    expect(lausSeries("06037")).toEqual({ id: "LAUCN060370000000003", label: "County 06037 unemployment rate (not seasonally adjusted)" });
    expect(() => lausSeries("Atlantis")).toThrow(/Unknown LAUS area "Atlantis"/);
  });

  it("builds OEWS IDs nationally and by state", () => {
    expect(oewsSeries("15-1252", "annual_mean_wage")).toEqual({
      id: "OEUN000000000000015125204", label: "SOC 15-1252 annual mean wage, United States",
    });
    expect(oewsSeries("151252", "annual_mean_wage", "California").id).toBe("OEUS060000000000015125204");
    expect(oewsSeries("29-1141").id).toBe("OEUN000000000000029114113"); // default: annual median wage
    expect(() => oewsSeries("15-12")).toThrow(/Invalid SOC occupation code/);
  });
});

describe("bls_series_data with builders", () => {
  it("requests the built series alongside explicit IDs and labels them", async () => {
    const bodies: { seriesid: string[] }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      bodies.push(body);
      return new Response(JSON.stringify({
        status: "REQUEST_SUCCEEDED", message: [],
        Results: { series: body.seriesid.map((id: string) => ({ seriesID: id, data: [{ year: "2026", period: "M08", periodName: "August", value: "4.4" }] })) },
      }), { status: 200 });
    }));
    const { tools } = await import("../src/apis/bls/tools.js");
    const tool = tools.find(t => t.name === "bls_series_data")!;
    const out = JSON.parse(await tool.execute(tool.parameters.parse({
      series_ids: "LNS14000000", laus_areas: "TX, 06037", oews_occupations: "15-1252", oews_state: "CA",
    }), {} as never) as string);

    expect(bodies[0].seriesid).toEqual(["LNS14000000", "LASST480000000000003", "LAUCN060370000000003", "OEUS060000000000015125213"]);
    expect(out.data.columns.slice(0, 2)).toEqual(["seriesId", "label"]);
    const labels = out.data.rows.map((r: unknown[]) => r[1]);
    expect(labels).toEqual([null, "Texas unemployment rate (seasonally adjusted)", "County 06037 unemployment rate (not seasonally adjusted)", "SOC 15-1252 annual median wage, California"]);
  });

  it("asks for at least one series", async () => {
    const { tools } = await import("../src/apis/bls/tools.js");
    const tool = tools.find(t => t.name === "bls_series_data")!;
    const out = JSON.parse(await tool.execute(tool.parameters.parse({}), {} as never) as string);
    expect(out.summary).toMatch(/give series_ids, laus_areas or oews_occupations/);
  });
});
