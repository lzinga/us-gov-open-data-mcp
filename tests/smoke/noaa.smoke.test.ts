/**
 * Live: NOAA station data. Without NOAA_API_KEY this goes through NCEI's
 * keyless Access Data Service; with a key, through Climate Data Online.
 * Either way the values for a known day must match.
 */

import { describe, it, expect } from "vitest";
import { callTool } from "./helpers.js";

describe("noaa_climate_data (live)", () => {
  it("returns Central Park's observations for 2024-01-01", async () => {
    const res = await callTool("noaa", "noaa_climate_data", {
      dataset_id: "GHCND",
      station_id: "GHCND:USW00094728",
      start_date: "2024-01-01",
      end_date: "2024-01-02",
      datatype_id: "TMAX",
    });
    const rows = (res.data?.rows ?? res.data?.items ?? []) as unknown[];
    const cols: string[] = res.data?.columns ?? [];
    const objs = cols.length
      ? (rows as unknown[][]).map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])))
      : (rows as Record<string, unknown>[]);
    const jan1 = objs.find(r => String(r.date).startsWith("2024-01-01") && r.datatype === "TMAX");
    expect(jan1?.value).toBe(47); // °F, NY City Central Park
    expect(String(res.meta?.source)).toMatch(/Access Data Service|Climate Data Online/);
  }, 60_000);

  it("returns monthly summaries", async () => {
    const res = await callTool("noaa", "noaa_climate_data", {
      dataset_id: "GSOM",
      station_id: "GHCND:USW00094728",
      start_date: "2024-01-01",
      end_date: "2024-03-31",
      datatype_id: "PRCP",
    });
    expect(res.summary).toMatch(/^3 observations/);
  }, 60_000);
});
