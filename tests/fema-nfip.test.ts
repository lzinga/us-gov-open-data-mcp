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
    await call({ state: "Texas", county: "48201", zip: "77009", year_from: 2020, year_to: 2024, flood_event: "Hurricane O'Beryl", sort_by: "paid", limit: 5 });
    const q = urls[0].searchParams;
    expect(urls[0].pathname).toBe("/api/open/v3/NfipClaims");
    const filter = q.get("$filter")!;
    expect(filter.startsWith(
      "state eq 'TX' and countyCode eq '48201' and reportedZipCode eq '77009' and yearOfLoss ge 2020 and yearOfLoss le 2024 and (",
    )).toBe(true);
    expect(filter).toContain("endswith(floodEvent,' O''Beryl')");
    expect(filter).toContain("contains(floodEvent,'-O''beryl-')");
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
    expect(out.meta.floodEvents).toEqual(["Hurricane Beryl"]);
  });

  it("rejects a county that is not a 5-digit FIPS code", async () => {
    const { getNfipClaims } = await import("../src/apis/fema/sdk.js");
    await expect(getNfipClaims({ county: "Harris" })).rejects.toThrow(/5-digit FIPS/);
    const { tools } = await import("../src/apis/fema/tools.js");
    expect(tools.find(x => x.name === "fema_nfip_claims")!.parameters.safeParse({ county: "4820" }).success).toBe(false);
  });

  it("says so when nothing matches, with advice when an event name was given", async () => {
    stubFema({ metadata: { count: 0 }, NfipClaims: [] });
    expect((await call({ zip: "00000" })).summary).toBe("No NFIP claims match these filters.");
    expect((await call({ flood_event: "Hurricane Nobody" })).summary).toMatch(/^No NFIP claims match these filters\. FEMA names events inconsistently .*try one distinctive word/);
  });
});

describe("floodEventFilter", () => {
  const filter = async (input: string) => (await import("../src/apis/fema/sdk.js")).floodEventFilter(input);

  /** Evaluate the generated filter (ORed eq/startswith/endswith/contains clauses) against event names. */
  const EVENTS = [
    "Hurricane Harvey", "Hurricane Earl", "Early summer severe storms", "2025-08-Erin-HU", "Hurricane Erin",
    "2025 July TS Chantal", "Hurricane Ida", "Hurricane Idalia", "April Florida Flooding", "Hurricane Georges (Keys)",
    "Vermont/New York Flooding", "2026-03-KonaStorm", "2025-12-AtmosphericRiver", "California Atmospheric River",
    "December Nor'easter", "2025-10-Nor'easter", "Late spring severe storms", "2026-07-West Virginia-Flooding",
  ];
  async function matches(input: string): Promise<string[]> {
    const expr = (await filter(input)).replace(/^\((.*)\)$/, "$1");
    const tests = expr.split(" or ").map(clause => {
      const m = /^(?:(contains|startswith|endswith)\(floodEvent,'((?:[^']|'')*)'\)|floodEvent eq '((?:[^']|'')*)')$/.exec(clause);
      if (!m) throw new Error(`unexpected clause: ${clause}`);
      const value = (m[2] ?? m[3]).replace(/''/g, "'");
      const fn = m[1] ?? "eq";
      return (name: string) => fn === "eq" ? name === value : fn === "contains" ? name.includes(value)
        : fn === "startswith" ? name.startsWith(value) : name.endsWith(value);
    });
    return EVENTS.filter(name => tests.some(t => t(name)));
  }

  it("drops the storm type and matches a storm name as a whole word, in any capitalization", async () => {
    expect(await matches("Harvey")).toEqual(["Hurricane Harvey"]);
    expect(await matches("hurricane harvey")).toEqual(["Hurricane Harvey"]);
    expect(await matches("Hurricane Earl")).toEqual(["Hurricane Earl"]); // not "Early summer severe storms"
    expect(await matches("Hurricane Erin")).toEqual(["2025-08-Erin-HU", "Hurricane Erin"]);
    expect(await matches("Tropical Storm Chantal")).toEqual(["2025 July TS Chantal"]);
    expect(await matches("TS  chantal ")).toEqual(["2025 July TS Chantal"]);
    expect(await matches("ida")).toEqual(["Hurricane Ida"]); // not Idalia, not Florida
    expect(await matches("Georges")).toEqual(["Hurricane Georges (Keys)"]);
    expect(await matches("Vermont")).toEqual(["Vermont/New York Flooding"]);
  });

  it("matches FEMA's hyphenated and space-less names", async () => {
    expect(await matches("KonaStorm")).toEqual(["2026-03-KonaStorm"]);
    expect(await matches("nor'easter")).toEqual(["December Nor'easter", "2025-10-Nor'easter"]);
    expect(await matches("atmospheric river")).toEqual(["2025-12-AtmosphericRiver", "California Atmospheric River"]);
    expect(await matches("west virginia")).toEqual(["2026-07-West Virginia-Flooding"]);
  });

  it("matches other phrases anywhere, in the capitalizations FEMA uses", async () => {
    expect(await matches("late spring severe storms")).toEqual(["Late spring severe storms"]);
    expect(await matches("Summer Severe")).toEqual(["Early summer severe storms"]);
    expect(await matches("storms")).toEqual(["Early summer severe storms", "Late spring severe storms"]);
    expect(await matches("Hurricane")).toEqual(EVENTS.filter(e => e.startsWith("Hurricane ")));
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
