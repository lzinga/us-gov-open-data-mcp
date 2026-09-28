/**
 * Module selection: --modules, --domains, --hide-unconfigured (src/server/module-selection.ts).
 */

import { describe, it, expect } from "vitest";
import { selectModules } from "../src/server/module-selection.js";
import type { ApiModule } from "../src/shared/types.js";

const mod = (name: string, domains: string[], auth?: ApiModule["auth"]) =>
  ({ name, domains, auth, tools: [], displayName: name, category: "", description: "", toolPrefix: `${name}_`, workflow: "", tips: "" }) as unknown as ApiModule;

const ALL = [
  mod("fred", ["economy"], { envVar: "FRED_API_KEY", signup: "x" }),
  mod("bls", ["economy"], { envVar: "BLS_API_KEY", signup: "x", optional: true }),
  mod("treasury", ["economy", "spending"]),
  mod("cdc", ["health"]),
  mod("epa-aqs", ["environment"], { envVar: ["AQS_API_KEY", "AQS_EMAIL"], signup: "x" }),
];
const names = (r: { active: ApiModule[] }) => r.active.map(m => m.name);

describe("selectModules", () => {
  it("loads everything by default", () => {
    expect(names(selectModules(ALL, {}))).toEqual(["fred", "bls", "treasury", "cdc", "epa-aqs"]);
  });

  it("selects by name, case-insensitively and ignoring blanks", () => {
    expect(names(selectModules(ALL, { modules: " FRED, cdc ,," }))).toEqual(["fred", "cdc"]);
  });

  it("selects by domain and unions with names", () => {
    expect(names(selectModules(ALL, { domains: "economy" }))).toEqual(["fred", "bls", "treasury"]);
    expect(names(selectModules(ALL, { domains: "spending", modules: "cdc" }))).toEqual(["treasury", "cdc"]);
  });

  it("rejects unknown module and domain names", () => {
    expect(() => selectModules(ALL, { modules: "fred,frde" })).toThrow(/Unknown module: frde\. Available: fred, bls/);
    expect(() => selectModules(ALL, { domains: "econ,health" })).toThrow(/Unknown domain: econ\. Available: economy, health/);
  });

  it("hides modules whose required keys are missing, after selecting", () => {
    const res = selectModules(ALL, { hideUnconfigured: true }, { AQS_API_KEY: "k" });
    expect(names(res)).toEqual(["bls", "treasury", "cdc"]); // bls's key is optional
    expect(res.hidden).toEqual([
      { name: "fred", missing: ["FRED_API_KEY"] },
      { name: "epa-aqs", missing: ["AQS_EMAIL"] },
    ]);
    expect(names(selectModules(ALL, { hideUnconfigured: true, domains: "economy" }, { FRED_API_KEY: "k" })))
      .toEqual(["fred", "bls", "treasury"]);
  });

  it("fails when nothing is left", () => {
    expect(() => selectModules(ALL, { modules: "fred", hideUnconfigured: true }, {}))
      .toThrow(/No modules left to load: .*fred: FRED_API_KEY/);
  });
});
