/**
 * FRED: server-side unit transformations and aggregation on fred_series_data,
 * and the release calendar.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
beforeEach(async () => (await import("../src/apis/fred/sdk.js")).clearCache());

function stubFetch(body: unknown) {
  const urls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    urls.push(new URL(u));
    return new Response(JSON.stringify(body), { status: 200 });
  }));
  return urls;
}

async function call(name: string, args: Record<string, unknown>) {
  vi.stubEnv("FRED_API_KEY", "test-key");
  const { tools } = await import("../src/apis/fred/tools.js");
  const t = tools.find(x => x.name === name)!;
  return JSON.parse(await t.execute(t.parameters.parse(args), {} as never) as string);
}

describe("fred_series_data units and aggregation", () => {
  it("passes units, frequency and aggregation_method to FRED and reports them", async () => {
    const urls = stubFetch({ count: 2, observations: [{ date: "2026-08-01", value: "3.35" }, { date: "2026-07-01", value: "3.30" }] });
    const out = await call("fred_series_data", { series_id: "cpiaucsl", units: "pc1", frequency: "q", aggregation_method: "eop" });
    const params = urls[0].searchParams;
    expect(params.get("units")).toBe("pc1");
    expect(params.get("frequency")).toBe("q");
    expect(params.get("aggregation_method")).toBe("eop");
    expect(out.summary).toMatch(/^CPIAUCSL \(units: pc1\): 2 of 2 observations/);
    expect(out.meta).toMatchObject({ units: "pc1", frequency: "q", aggregationMethod: "eop" });
  });

  it("sends neither when not asked (levels)", async () => {
    const urls = stubFetch({ count: 1, observations: [{ date: "2026-08-01", value: "320.1" }] });
    const out = await call("fred_series_data", { series_id: "CPIAUCSL" });
    expect(urls[0].searchParams.has("units")).toBe(false);
    expect(urls[0].searchParams.has("aggregation_method")).toBe(false);
    expect(out.meta.units).toBe("lin");
  });

  it("rejects unknown units", async () => {
    const { tools } = await import("../src/apis/fred/tools.js");
    expect(tools.find(t => t.name === "fred_series_data")!.parameters.safeParse({ series_id: "GDP", units: "percent" }).success).toBe(false);
  });
});

describe("fred_release_calendar", () => {
  it("lists every release in the next 14 days by default", async () => {
    const urls = stubFetch({ count: 2, release_dates: [
      { release_id: 86, release_name: "Commercial Paper", date: "2026-09-28" },
      { release_id: 50, release_name: "Employment Situation", date: "2026-10-02" },
    ] });
    const out = await call("fred_release_calendar", {});
    expect(urls[0].pathname).toBe("/fred/releases/dates");
    const params = urls[0].searchParams;
    const start = params.get("realtime_start")!;
    const end = params.get("realtime_end")!;
    expect((Date.parse(end) - Date.parse(start)) / 86_400_000).toBe(14);
    expect(params.get("include_release_dates_with_no_data")).toBe("true"); // needed for future dates
    expect(params.get("sort_order")).toBe("asc");
    expect(out.data.columns).toEqual(["date", "releaseId", "release"]);
    expect(out.summary).toBe("2 of 2 release date(s), 2026-09-28 to 2026-10-02");
  });

  it("lists one release's upcoming dates without an end limit", async () => {
    const urls = stubFetch({ count: 3, release_dates: [{ release_id: 50, date: "2026-10-02" }] });
    await call("fred_release_calendar", { release_id: 50 });
    expect(urls[0].pathname).toBe("/fred/release/dates");
    expect(urls[0].searchParams.get("release_id")).toBe("50");
    expect(urls[0].searchParams.get("realtime_end")).toBe("9999-12-31");
  });
});
