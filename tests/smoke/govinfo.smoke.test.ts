/**
 * Live: GovInfo search filters (collection, congress) are honored.
 */

import { describe, expect } from "vitest";
import { callTool, itWithKeys } from "./helpers.js";

describe("govinfo_search filters (live)", () => {
  itWithKeys(["DATA_GOV_API_KEY"])("restricts results to the requested collection and congress", async () => {
    const res = await callTool("govinfo", "govinfo_search", {
      query: '"artificial intelligence"',
      collection: "BILLS",
      congress: 119,
      page_size: 20,
    });
    const items = (res.data?.items ?? []) as { packageId: string; collectionCode: string }[];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.collectionCode).toBe("BILLS");
      expect(item.packageId.startsWith("BILLS-119")).toBe(true);
    }
  });

  itWithKeys(["DATA_GOV_API_KEY"])("govinfo_cbo_reports searches committee reports only", async () => {
    const res = await callTool("govinfo", "govinfo_cbo_reports", { query: "infrastructure" });
    const items = (res.data?.items ?? []) as { collectionCode: string }[];
    expect(items.length).toBeGreaterThan(0);
    // Reports also bound into the Serial Set are coded "SERIALSET;CRPT".
    for (const item of items) expect(item.collectionCode.split(";")).toContain("CRPT");
  });
});
