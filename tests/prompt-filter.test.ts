/**
 * Prompt filtering for selective module loading (src/server/prompt-filter.ts).
 */

import { describe, it, expect } from "vitest";
import { filterPromptText, filterPrompts, mentionedTools } from "../src/server/prompt-filter.js";
import { buildAnalysisPrompts } from "../src/server/prompts.js";
import { moduleDirs, getModule } from "./helpers.js";

const known = new Set(["fred_series_data", "treasury_query_fiscal_data", "usa_spending_by_agency", "wb_compare"]);

describe("filterPromptText", () => {
  it("drops lines that mention an unloaded tool anywhere in the line, and renumbers", () => {
    const text = [
      "Pull a fiscal snapshot:",
      "",
      "1. treasury_query_fiscal_data with debt_to_penny — latest debt",
      "2. fred_series_data GDP — for the ratio",
      "3. Then compare with usa_spending_by_agency results",
      "4. FRED FYFSGDA188S — deficit as % of GDP",
      "- wb_compare for peers",
      "Show trends.",
    ].join("\n");
    const out = filterPromptText(text, known, new Set(["fred_series_data"]));
    expect(out).toBe([
      "Pull a fiscal snapshot:",
      "",
      "1. fred_series_data GDP — for the ratio",
      "2. FRED FYFSGDA188S — deficit as % of GDP",
      "Show trends.",
    ].join("\n"));
  });

  it("leaves text unchanged when every mentioned tool is loaded", () => {
    const text = "1. fred_series_data\n3. odd numbering kept\n- treasury_query_fiscal_data";
    expect(filterPromptText(text, known, known)).toBe(text);
  });

  it("ignores snake_case words that are not tools", () => {
    expect(mentionedTools("use debt_to_penny and avg_interest_rates via fred_series_data", known))
      .toEqual(new Set(["fred_series_data"]));
    expect(filterPromptText("- debt_to_penny dataset", known, new Set())).toBe("- debt_to_penny dataset");
  });

  it("restarts numbering per list", () => {
    const text = "Steps:\n1. wb_compare\n2. a\n3. b\n\nThen:\n1. c\n2. wb_compare\n3. d";
    expect(filterPromptText(text, known, new Set())).toBe("Steps:\n1. a\n2. b\n\nThen:\n1. c\n2. d");
  });
});

describe("filterPrompts", () => {
  const prompt = (name: string, text: string) => ({ name, description: name, load: async (_args?: unknown) => text });

  it("hides prompts whose tools are all unloaded and keeps tool-free prompts", async () => {
    const prompts = [
      prompt("treasury_only", "1. treasury_query_fiscal_data\n2. usa_spending_by_agency"),
      prompt("mixed", "1. treasury_query_fiscal_data\n2. fred_series_data"),
      prompt("no_tools", "Think about the question first."),
    ];
    const out = await filterPrompts(prompts, known, new Set(["fred_series_data"]));
    expect(out.map(p => p.name)).toEqual(["mixed", "no_tools"]);
    expect(await out[0].load({} as never)).toBe("1. fred_series_data");
  });

  it("keeps a prompt that names a loaded module even if none of its tools are loaded", async () => {
    const presidents = prompt("presidents", "Pull these FRED series: GDP, UNRATE\n- treasury_query_fiscal_data at inauguration");
    const kept = await filterPrompts([presidents], known, new Set(["fred_series_data"]), ["fred"]);
    expect(kept.map(p => p.name)).toEqual(["presidents"]);
    expect(await kept[0].load({} as never)).toBe("Pull these FRED series: GDP, UNRATE");
    expect(await filterPrompts([presidents], known, new Set(["wb_compare"]), ["world-bank"])).toEqual([]);
  });

  it("keeps a prompt whose sample render throws", async () => {
    const fragile = { name: "fragile", description: "x", load: async (args: { q?: string }) => `1. ${args.q!.toUpperCase()} via fred_series_data` };
    const out = await filterPrompts([fragile], known, new Set());
    expect(out.map(p => p.name)).toEqual(["fragile"]);
  });
});

describe("real prompts with only FRED loaded", () => {
  const modules = moduleDirs.map(d => getModule(d) as unknown as { tools: { name: string }[]; deprecatedAliases?: Record<string, string> });
  const allTools = new Set(modules.flatMap(m => [...m.tools.map(t => t.name), ...Object.keys(m.deprecatedAliases ?? {})]));
  const fredTools = new Set((getModule("fred").tools as { name: string }[]).map(t => t.name));

  it("mention no unloaded tools", async () => {
    const prompts = await filterPrompts(buildAnalysisPrompts(), allTools, fredTools, ["fred"]);
    expect(prompts.length).toBeGreaterThan(0);
    for (const p of prompts) {
      const args = Object.fromEntries((p.arguments ?? []).map(a => [a.name, "test-value"]));
      const text = String(await p.load(args as never));
      const offenders = [...mentionedTools(text, allTools)].filter(t => !fredTools.has(t));
      expect(offenders, p.name).toEqual([]);
    }
  });

  it("drop fiscal_snapshot's Treasury steps and renumber the rest", async () => {
    const [snapshot] = (await filterPrompts(buildAnalysisPrompts(), allTools, new Set([...fredTools, "usa_spending_by_agency"]), ["fred", "usaspending"]))
      .filter(p => p.name === "fiscal_snapshot");
    const text = String(await snapshot.load({} as never));
    expect(text).not.toContain("treasury_query_fiscal_data");
    expect(text).toMatch(/^1\. FRED FYFSGDA188S/m);
    expect(text).toMatch(/^3\. usa_spending_by_agency/m);
  });
});
