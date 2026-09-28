/**
 * Size budget for the MCP instructions, which stay in the model's context
 * for the whole session. If a change needs more room, trim something else
 * or raise the budget deliberately in the same change.
 */

import { describe, it, expect } from "vitest";
import { buildInstructions } from "../src/server/instructions.js";
import type { ApiModule } from "../src/shared/types.js";
import { moduleDirs, getModule } from "./helpers.js";

/** All 42 modules measured 64,401 characters (~16K tokens) when this budget was set. */
const TOTAL_BUDGET_CHARS = 66_000;
/** The largest module block (congress) measured 1,493 characters. */
const MODULE_BLOCK_BUDGET_CHARS = 1_600;

const modules = moduleDirs.map(d => getModule(d) as unknown as ApiModule);

describe("instructions size", () => {
  it(`stays under ${TOTAL_BUDGET_CHARS} characters with every module loaded`, () => {
    expect(buildInstructions(modules).length).toBeLessThanOrEqual(TOTAL_BUDGET_CHARS);
  });

  it.each(modules.map(m => [m.name, m] as const))(`%s: module block stays under ${MODULE_BLOCK_BUDGET_CHARS} characters`, (_name, mod) => {
    const block = buildInstructions([mod]).split("== CROSS-REFERENCING GUIDE ==")[0];
    expect(block.length).toBeLessThanOrEqual(MODULE_BLOCK_BUDGET_CHARS);
  });

  it("doesn't repeat tool names that tools/list already provides", () => {
    const text = buildInstructions(modules);
    expect(text).not.toMatch(/^Tools: /m);
  });
});
