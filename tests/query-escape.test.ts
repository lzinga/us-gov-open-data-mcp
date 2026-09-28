/**
 * Filter-expression escaping for SoQL (CDC, BTS) and OData (FEMA) built from
 * structured tool parameters.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { soqlString, soqlContains, odataString, integerValue, isoDateValue } from "../src/shared/query-escape.js";

afterEach(() => vi.unstubAllGlobals());

describe("query-escape helpers", () => {
  it("quotes and doubles embedded single quotes", () => {
    expect(soqlString("New York")).toBe("'New York'");
    expect(soqlString("O'Brien")).toBe("'O''Brien'");
    expect(odataString("Prince George's (County)")).toBe("'Prince George''s (County)'");
    expect(soqlString(2021)).toBe("'2021'");
  });

  it("neutralizes attempts to break out of the literal", () => {
    expect(soqlString("x' OR '1'='1")).toBe("'x'' OR ''1''=''1'");
    expect(soqlContains("Coeur d'Alene")).toBe("'%Coeur d''Alene%'");
  });

  it("validates integers and ISO dates", () => {
    expect(integerValue(2021, "year")).toBe(2021);
    expect(integerValue("2021", "year")).toBe(2021);
    expect(() => integerValue("2021' OR 1=1", "year")).toThrow(/year must be an integer/);
    expect(isoDateValue("2024-01-31", "start_date")).toBe("2024-01-31");
    expect(isoDateValue("2024-01", "start_date")).toBe("2024-01");
    expect(isoDateValue("2024-01-31T00:00:00.000Z", "d")).toBe("2024-01-31T00:00:00.000Z");
    expect(() => isoDateValue("2024-01-31' OR '1'='1", "start_date")).toThrow(/ISO date/);
  });
});

/** Capture the query string of the first fetch call. */
function stubJson(body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal("fetch", fn);
  return () => new URL(String((fn.mock.calls[0] as unknown as [string])[0])).searchParams;
}

describe("module filters use escaped values", () => {
  it("FEMA housing assistance: county with an apostrophe", async () => {
    const params = stubJson({ HousingAssistanceOwners: [] });
    const { getHousingAssistance } = await import("../src/apis/fema/sdk.js");
    await getHousingAssistance({ state: "md", county: "Prince George's (County)", disasterNumber: 4583 });
    expect(params().get("$filter")).toBe(
      "disasterNumber eq '4583' and state eq 'MD' and county eq 'Prince George''s (County)'",
    );
  });

  it("CDC: state names and LIKE patterns", async () => {
    const params = stubJson([]);
    const { getPlacesCityHealth } = await import("../src/apis/cdc/sdk.js");
    await getPlacesCityHealth({ state: "id", city: "Coeur d'Alene" });
    expect(params().get("$where")).toBe("stateabbr = 'ID' AND upper(placename) LIKE '%COEUR D''ALENE%'");
  });

  it("CDC: rejects a PLACES measure that isn't a plain identifier", async () => {
    stubJson([]);
    const { getPlacesCityHealth } = await import("../src/apis/cdc/sdk.js");
    await expect(getPlacesCityHealth({ measure: "obesity_crudeprev > 0 OR 1" })).rejects.toThrow(/Invalid PLACES measure/);
  });

  it("BTS: port names and validated dates", async () => {
    const params = stubJson([]);
    const { getBorderCrossings, getTransportStats } = await import("../src/apis/bts/sdk.js");
    await getBorderCrossings({ portName: "Sault Ste. Marie", state: "Michigan" });
    expect(params().get("$where")).toBe("state='Michigan' AND port_name='Sault Ste. Marie'");
    await expect(getTransportStats({ startDate: "2020' OR '1'='1" })).rejects.toThrow(/ISO date/);
  });
});
