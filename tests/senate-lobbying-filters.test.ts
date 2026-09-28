/**
 * lobbying_search's additional server-side filters reach lda.gov with the
 * right parameter names and formats.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubLda() {
  const urls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    urls.push(new URL(u));
    return new Response(JSON.stringify({ count: 0, next: null, previous: null, results: [] }), { status: 200 });
  }));
  return urls;
}

async function search(args: Record<string, unknown>) {
  vi.resetModules();
  const { tools } = await import("../src/apis/senate-lobbying/tools.js");
  const tool = tools.find(t => t.name === "lobbying_search")!;
  return tool.execute(tool.parameters.parse(args), {} as never);
}

describe("lobbying_search filters", () => {
  it("maps every filter to its lda.gov parameter", async () => {
    const urls = stubLda();
    await search({
      client_name: "Pfizer",
      filing_year: 2025,
      filing_period: "second_quarter",
      lobbyist_name: "Smith",
      lobbyist_covered_position: "Chief of Staff",
      specific_issues: "drug pricing",
      foreign_entity_name: "Airbus",
      foreign_entity_country: "nl",
      client_state: "New York",
      amount_min: 100000,
      amount_max: 5000000,
      posted_after: "2025-07-01",
      posted_before: "2025-09-30",
    });
    expect(Object.fromEntries(urls[0].searchParams)).toMatchObject({
      client_name: "Pfizer",
      filing_year: "2025",
      filing_period: "second_quarter",
      lobbyist_name: "Smith",
      lobbyist_covered_position: "Chief of Staff",
      filing_specific_lobbying_issues: "drug pricing",
      foreign_entity_name: "Airbus",
      foreign_entity_country: "NL",
      client_state: "NY",
      filing_amount_reported_min: "100000",
      filing_amount_reported_max: "5000000",
      filing_dt_posted_after: "2025-07-01",
      filing_dt_posted_before: "2025-09-30",
    });
  });

  it("keeps the filters while scanning for an issue code", async () => {
    const urls = stubLda();
    await search({ client_name: "Pfizer", issue_code: "TAX", foreign_entity_country: "DE" });
    expect(urls[0].searchParams.get("foreign_entity_country")).toBe("DE");
    expect(urls[0].searchParams.get("client_name")).toBe("Pfizer");
  });

  it("rejects a covered-position search without a registrant, client or lobbyist", async () => {
    const urls = stubLda();
    await expect(search({ lobbyist_covered_position: "Senator", filing_year: 2025 })).rejects.toThrow(/needs registrant_name, client_name or lobbyist_name/);
    expect(urls).toEqual([]);
  });

  it("validates dates, amounts and country codes", async () => {
    const { tools } = await import("../src/apis/senate-lobbying/tools.js");
    const schema = tools.find(t => t.name === "lobbying_search")!.parameters;
    expect(schema.safeParse({ posted_after: "07/01/2025" }).success).toBe(false);
    expect(schema.safeParse({ amount_min: -1 }).success).toBe(false);
    expect(schema.safeParse({ foreign_entity_country: "China" }).success).toBe(false);
  });
});
