/**
 * Modules whose API key is optional must work without it.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { callTool, records } from "./helpers.js";

afterEach(() => vi.unstubAllEnvs());

describe("optional-key modules work without a key", () => {
  it("openFDA answers without DATA_GOV_API_KEY", async () => {
    vi.stubEnv("DATA_GOV_API_KEY", "");
    const res = await callTool("fda", "fda_drug_recalls", { search: 'classification:"Class I"', limit: 2 });
    expect(records(res).length).toBeGreaterThan(0);
  });

  it("BLS answers without BLS_API_KEY", async () => {
    vi.stubEnv("BLS_API_KEY", "");
    const year = new Date().getFullYear();
    const res = await callTool("bls", "bls_series_data", { series_ids: "CUUR0000SA0", start_year: year - 1, end_year: year });
    expect(JSON.stringify(res)).toContain("CUUR0000SA0");
    expect(res.dataType).not.toBe("empty");
  });
});
