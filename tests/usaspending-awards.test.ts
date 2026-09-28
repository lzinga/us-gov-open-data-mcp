/**
 * USAspending award search defaults and award detail.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => vi.unstubAllGlobals());
beforeEach(async () => (await import("../src/apis/usaspending/sdk.js")).clearCache());

type Call = { url: URL; body: any };

function stubUsa(handler: (call: Call) => unknown) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string, init?: RequestInit) => {
    const call = { url: new URL(u), body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    return new Response(JSON.stringify(handler(call)), { status: 200 });
  }));
  return calls;
}

const DETAIL = {
  generated_unique_award_id: "CONT_AWD_SPE7MX21C0002_9700_-NONE-_-NONE-",
  piid: "SPE7MX21C0002", category: "contract", type_description: "DEFINITIVE CONTRACT", description: "MICROCIRCUIT, DIGITAL",
  total_obligation: 328573678.35, total_outlay: 1000, base_and_all_options: 400000000, subaward_count: 3, total_subaward_amount: 12345,
  date_signed: "2021-05-06",
  period_of_performance: { start_date: "2021-05-06", end_date: "2028-12-31", potential_end_date: "2030-05-05 00:00:00" },
  recipient: { recipient_name: "BAE SYSTEMS INFORMATION AND ELECTRONIC SYSTEMS INTEGRATION INC.", recipient_uei: "XQK3GTZJ6464", parent_recipient_name: "BAE SYSTEMS PLC" },
  awarding_agency: { toptier_agency: { name: "Department of Defense" }, subtier_agency: { name: "Defense Logistics Agency" } },
  funding_agency: { toptier_agency: { name: "Department of Defense" } },
  place_of_performance: { city_name: "COLUMBUS", state_code: "OH", zip5: "43218", location_country_code: "USA" },
  naics_hierarchy: { base_code: { code: "334413", description: "Semiconductor and Related Device Manufacturing" } },
  psc_hierarchy: { base_code: { code: "5962", description: "MICROCIRCUITS, ELECTRONIC" } },
  parent_award: null,
};

describe("usa_spending_by_award", () => {
  it("searches one award type group (contracts by default) and reports whether more pages exist", async () => {
    const calls = stubUsa(() => ({
      results: [{ "Award ID": "SPE7MX21C0002", "Recipient Name": "BAE", "Award Amount": 1, generated_internal_id: DETAIL.generated_unique_award_id }],
      page_metadata: { page: 1, hasNext: true },
    }));
    const { tools } = await import("../src/apis/usaspending/tools.js");
    const tool = tools.find(t => t.name === "usa_spending_by_award")!;
    const out = JSON.parse(await tool.execute(tool.parameters.parse({ keyword: "semiconductor" }), {} as never) as string);
    expect(calls[0].body.filters.award_type_codes).toEqual(["A", "B", "C", "D"]); // mixing groups is an HTTP 422
    expect(out.summary).toMatch(/^USAspending contracts awards: showing 1; more on page 2\./);
    expect(out.data.items[0]).toMatchObject({ awardId: "SPE7MX21C0002", awardKey: DETAIL.generated_unique_award_id });
  });
});

describe("usa_award_detail", () => {
  async function detail(id: string) {
    const { tools } = await import("../src/apis/usaspending/tools.js");
    const tool = tools.find(t => t.name === "usa_award_detail")!;
    return JSON.parse(await tool.execute(tool.parameters.parse({ award_id: id }), {} as never) as string);
  }

  it("fetches an award by its key and flattens the record", async () => {
    const calls = stubUsa(() => DETAIL);
    const out = await detail(DETAIL.generated_unique_award_id);
    expect(calls).toHaveLength(1);
    expect(calls[0].url.pathname).toBe(`/api/v2/awards/${encodeURIComponent(DETAIL.generated_unique_award_id)}/`);
    expect(out.record).toMatchObject({
      awardId: "SPE7MX21C0002", recipient: DETAIL.recipient.recipient_name, parentRecipient: "BAE SYSTEMS PLC",
      totalObligation: 328573678.35, subawardCount: 3, potentialEndDate: "2030-05-05",
      awardingAgency: "Department of Defense", awardingSubAgency: "Defense Logistics Agency",
      placeOfPerformance: "COLUMBUS, OH, 43218", naics: "334413 Semiconductor and Related Device Manufacturing", psc: "5962 MICROCIRCUITS, ELECTRONIC",
    });
    expect(out.record.url).toMatch(/^https:\/\/www\.usaspending\.gov\/award\/CONT_AWD_/);
    expect(out.summary).toBe("SPE7MX21C0002: BAE SYSTEMS INFORMATION AND ELECTRONIC SYSTEMS INTEGRATION INC., $328,573,678 obligated (Department of Defense)");
  });

  it("looks up a PIID/FAIN one award type group at a time", async () => {
    const calls = stubUsa(call => {
      if (call.url.pathname.endsWith("/spending_by_award/")) {
        const isGrants = call.body.filters.award_type_codes.includes("02");
        return { results: isGrants ? [{ "Award ID": "2920B275N", generated_internal_id: "ASST_NON_2920B275N_013" }] : [] };
      }
      return { ...DETAIL, generated_unique_award_id: "ASST_NON_2920B275N_013", piid: null, fain: "2920B275N" };
    });
    const out = await detail("2920B275N");
    const groups = calls.filter(c => c.body).map(c => c.body.filters.award_type_codes[0]);
    expect(groups).toEqual(["A", "IDV_A", "02"]); // contracts, then IDVs, then grants: found
    expect(calls.at(-1)!.url.pathname).toBe("/api/v2/awards/ASST_NON_2920B275N_013/");
    expect(out.record.awardId).toBe("2920B275N");
  });

  it("says when no award matches", async () => {
    stubUsa(() => ({ results: [] }));
    await expect(detail("NOT-REAL-123")).rejects.toThrow(/No award found with ID "NOT-REAL-123"/);
  });
});
