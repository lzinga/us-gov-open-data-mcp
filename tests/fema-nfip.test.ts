/**
 * NFIP flood insurance claims (fema_nfip_claims).
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => vi.unstubAllGlobals());
beforeEach(async () => (await import("../src/apis/fema/sdk.js")).clearCache());

const RAW = {
  dateOfLoss: "2024-07-08T00:00:00.000Z", yearOfLoss: 2024, floodEvent: "Hurricane Beryl", state: "TX", countyCode: "48201",
  reportedZipCode: "77009", ratedFloodZone: "AE", primaryResidenceIndicator: true, buildingDamageAmount: 120000,
  contentsDamageAmount: 15000, netBuildingPaymentAmount: 100000.25, netContentsPaymentAmount: 10000.5, netIccPaymentAmount: null,
  totalBuildingInsuranceCoverage: 250000, totalContentsInsuranceCoverage: 100000, waterDepth: 18,
};

function stubFema(body: unknown) {
  const urls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    urls.push(new URL(u));
    return new Response(JSON.stringify(body), { status: 200 });
  }));
  return urls;
}

async function call(args: Record<string, unknown>) {
  const { tools } = await import("../src/apis/fema/tools.js");
  const t = tools.find(x => x.name === "fema_nfip_claims")!;
  return JSON.parse(await t.execute(t.parameters.parse(args), {} as never) as string);
}

describe("fema_nfip_claims", () => {
  it("builds the OData filter from place, years and event", async () => {
    const urls = stubFema({ metadata: { count: 2513 }, NfipClaims: [RAW] });
    await call({ state: "Texas", county: "48201", zip: "77009", year_from: 2020, year_to: 2024, flood_event: "O'Beryl", sort_by: "paid", limit: 5 });
    const q = urls[0].searchParams;
    expect(urls[0].pathname).toBe("/api/open/v3/NfipClaims");
    expect(q.get("$filter")).toBe(
      "state eq 'TX' and countyCode eq '48201' and reportedZipCode eq '77009' and yearOfLoss ge 2020 and yearOfLoss le 2024 and contains(floodEvent,'O''Beryl')",
    );
    expect(q.get("$orderby")).toBe("netBuildingPaymentAmount desc");
    expect(q.get("$top")).toBe("5");
    expect(q.get("$count")).toBe("true");
    expect(q.get("$select")).toContain("netIccPaymentAmount");
  });

  it("sorts by date and sends no filter when none is given", async () => {
    const urls = stubFema({ metadata: { count: 1 }, NfipClaims: [RAW] });
    await call({});
    expect(urls[0].searchParams.has("$filter")).toBe(false);
    expect(urls[0].searchParams.get("$orderby")).toBe("dateOfLoss desc");
    expect(urls[0].searchParams.get("$top")).toBe("50");
  });

  it("maps claims, sums the payments and reports the full match count", async () => {
    stubFema({ metadata: { count: 2513 }, NfipClaims: [RAW, { ...RAW, netBuildingPaymentAmount: 0, netContentsPaymentAmount: 0, primaryResidenceIndicator: null }] });
    const out = await call({ state: "TX", flood_event: "Beryl" });
    expect(out.summary).toBe("2,513 NFIP claim(s) match; showing 2 (sorted by date), $110,001 paid on those shown");
    expect(out.data.total).toBe(2513);
    const cols: string[] = out.data.columns;
    const first = Object.fromEntries(cols.map((c, i) => [c, out.data.rows[0][i]]));
    expect(first).toMatchObject({
      dateOfLoss: "2024-07-08", countyFips: "48201", zip: "77009", floodZone: "AE", primaryResidence: true,
      paidBuilding: 100000.25, paidContents: 10000.5, totalPaid: 110000.75, waterDepthInches: 18,
    });
    expect(first).not.toHaveProperty("paidIcc"); // every row null, so tableResponse drops it
  });

  it("rejects a county that is not a 5-digit FIPS code", async () => {
    const { getNfipClaims } = await import("../src/apis/fema/sdk.js");
    await expect(getNfipClaims({ county: "Harris" })).rejects.toThrow(/5-digit FIPS/);
    const { tools } = await import("../src/apis/fema/tools.js");
    expect(tools.find(x => x.name === "fema_nfip_claims")!.parameters.safeParse({ county: "4820" }).success).toBe(false);
  });

  it("says so when nothing matches", async () => {
    stubFema({ metadata: { count: 0 }, NfipClaims: [] });
    const out = await call({ zip: "00000" });
    expect(out.summary).toBe("No NFIP claims match these filters.");
  });
});

describe("OpenFEMA dataset versions", () => {
  function stubRoutes(route: (url: URL) => { status?: number; body: unknown }) {
    const urls: URL[] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string) => {
      const url = new URL(u);
      urls.push(url);
      const { status = 200, body } = route(url);
      return new Response(JSON.stringify(body), { status });
    }));
    return urls;
  }
  const query = async (dataset: string) => (await import("../src/apis/fema/sdk.js")).queryDataset({ dataset, top: 1 });

  it("queries each dataset at its own version, including renamed NFIP entities", async () => {
    const urls = stubRoutes(() => ({ body: { NfipClaims: [{ id: 1 }] } }));
    expect(await query("nfip_claims")).toEqual([{ id: 1 }]);
    await query("disaster_declarations");
    await query("hazard_mitigation");
    expect(urls.map(u => u.pathname)).toEqual([
      "/api/open/v3/NfipClaims",
      "/api/open/v2/DisasterDeclarationsSummaries",
      "/api/open/v3/HazardMitigationGrantProgramDisasterSummaries",
    ]);
    const { resolveDataset } = await import("../src/apis/fema/sdk.js");
    expect(await resolveDataset("FimaNfipClaims")).toEqual({ path: "/v3/NfipClaims", entity: "NfipClaims" });
    expect(await resolveDataset("nfippolicies")).toEqual({ path: "/v3/NfipPolicies", entity: "NfipPolicies" });
  });

  it("uses an explicit version as given", async () => {
    const urls = stubRoutes(() => ({ body: { IpawsArchivedAlerts: [] } }));
    await query("v1/IpawsArchivedAlerts");
    expect(urls.map(u => u.pathname)).toEqual(["/api/open/v1/IpawsArchivedAlerts"]);
  });

  it("looks up the current version of other entities in the DataSets catalog", async () => {
    const urls = stubRoutes(url => url.pathname.endsWith("/DataSets")
      ? { body: { DataSets: [{ version: 5, depDate: "2026-01-01T00:00:00.000Z" }, { version: 4, depDate: null }] } }
      : { body: { HazardMitigationAssistanceProjects: [{ id: 7 }] } });
    expect(await query("HazardMitigationAssistanceProjects")).toEqual([{ id: 7 }]);
    expect(urls[0].searchParams.get("$filter")).toBe("name eq 'HazardMitigationAssistanceProjects'");
    expect(urls[1].pathname).toBe("/api/open/v4/HazardMitigationAssistanceProjects");
  });

  it("rejects names the catalog does not know, and malformed names", async () => {
    stubRoutes(() => ({ body: { DataSets: [] } }));
    await expect(query("NoSuchThing")).rejects.toThrow(/no dataset named "NoSuchThing"/);
    await expect(query("../v1/DataSets")).rejects.toThrow(/not a FEMA dataset/);
  });

  it("falls back to v2 when the catalog cannot be read", async () => {
    const urls = stubRoutes(url => url.pathname.endsWith("/DataSets") ? { status: 404, body: {} } : { body: { MissionAssignmentsX: [] } });
    await query("MissionAssignmentsX");
    expect(urls.at(-1)!.pathname).toBe("/api/open/v2/MissionAssignmentsX");
  });
});
