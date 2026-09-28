/**
 * Module reference data resources (src/server/reference-resources.ts).
 */

import { describe, it, expect } from "vitest";
import { modulesWithReference, referenceUri, renderReference } from "../src/server/reference-resources.js";
import type { ApiModule } from "../src/shared/types.js";
import { getModule, moduleDirs } from "./helpers.js";

const mod = (reference?: Record<string, unknown>) =>
  ({ name: "demo", displayName: "Demo API", reference }) as unknown as ApiModule;

describe("renderReference", () => {
  it("renders code tables, documentation links, lists and nested data", () => {
    const md = renderReference(mod({
      billTypes: { hr: "House bill", s: "Senate | bill" },
      topics: ["Antitrust", "Civil Rights"],
      datasets: { a: { id: "x1", fields: ["f"] } },
      docs: { "API Docs": "https://example.gov/docs" },
    }));
    expect(md).toContain("# Demo API — reference data");
    expect(md).toContain("## Bill types\n\n| Code | Meaning |\n|---|---|\n| `hr` | House bill |\n| `s` | Senate \\| bill |");
    expect(md).toContain("## Topics\n\n- Antitrust\n- Civil Rights");
    expect(md).toContain('## Datasets\n\n```json\n{\n  "a": {');
    expect(md).toContain("## Documentation\n\n- [API Docs](https://example.gov/docs)");
  });

  it("skips modules without reference data", () => {
    expect(modulesWithReference([mod(), mod({}), mod({ docs: { a: "b" } })])).toHaveLength(1);
    expect(referenceUri("epa-aqs")).toBe("govdata://epa-aqs/reference");
  });

  it("renders every real module's reference data", () => {
    for (const d of moduleDirs) {
      const m = getModule(d) as unknown as ApiModule;
      if (!modulesWithReference([m]).length) continue;
      const md = renderReference(m);
      expect(md.startsWith(`# ${m.displayName} — reference data`), d).toBe(true);
      expect(md, d).not.toContain("[object Object]");
    }
  });
});
