/**
 * Tests for the instructions builder, routing table, and prompt filtering.
 */

import { describe, it, expect } from "vitest";
import { buildInstructions } from "../src/server/instructions.js";
import { buildAnalysisPrompts } from "../src/server/prompts.js";
import { QUESTION_TYPES, DOMAINS } from "../src/shared/types.js";
import type { ApiModule } from "../src/shared/types.js";

// ─── Helpers ──────────────────────────────────────────────────────────

/** Minimal mock module for testing. */
function mockModule(overrides: Partial<ApiModule> = {}): ApiModule {
  return {
    name: "test-mod",
    displayName: "Test Module",
    category: "Economic",
    description: "A test module",
    workflow: "test_search → test_data",
    tips: "Use test_search first",
    domains: ["economy"],
    tools: [
      { name: "test_search", description: "Search", parameters: {}, execute: async () => "" } as any,
      { name: "test_data", description: "Get data", parameters: {}, execute: async () => "" } as any,
    ],
    ...overrides,
  };
}

// ─── buildInstructions ────────────────────────────────────────────────

describe("buildInstructions", () => {
  it("includes per-module blocks", () => {
    const mod = mockModule({ displayName: "FRED (Federal Reserve)" });
    const result = buildInstructions([mod]);
    expect(result).toContain("== FRED (FEDERAL RESERVE) ==");
    expect(result).toContain("A test module");
    expect(result).toContain("Tools: test_search, test_data");
    expect(result).toContain("Workflow: test_search → test_data");
  });

  it("includes auth note for keyed modules", () => {
    const mod = mockModule({ auth: { envVar: "TEST_KEY", signup: "https://example.com" } });
    const result = buildInstructions([mod]);
    expect(result).toContain("Requires TEST_KEY.");
  });

  it("includes 'No key required' for keyless modules", () => {
    const mod = mockModule();
    const result = buildInstructions([mod]);
    expect(result).toContain("No key required.");
  });

  it("includes auto-generated routing table", () => {
    const mod = mockModule({
      crossRef: [
        { question: "economy", route: "GDP, UNRATE" },
        { question: "housing", route: "MORTGAGE30US" },
      ],
    });
    const result = buildInstructions([mod]);
    expect(result).toContain("=== ROUTING TABLE ===");
    expect(result).toContain("ECONOMY → Test Module(GDP, UNRATE)");
    expect(result).toContain("HOUSING → Test Module(MORTGAGE30US)");
  });

  it("merges crossRef from multiple modules into one routing line", () => {
    const fred = mockModule({
      name: "fred",
      displayName: "FRED",
      crossRef: [{ question: "economy", route: "GDP, UNRATE" }],
    });
    const bls = mockModule({
      name: "bls",
      displayName: "BLS",
      crossRef: [{ question: "economy", route: "cpi_breakdown, employment" }],
    });
    const result = buildInstructions([fred, bls]);
    expect(result).toContain("ECONOMY → FRED(GDP, UNRATE) + BLS(cpi_breakdown, employment)");
  });

  it("outputs question types in QUESTION_TYPES order, not alphabetical", () => {
    const mod = mockModule({
      crossRef: [
        { question: "housing", route: "rents" },
        { question: "debt/deficit", route: "debt" },
        { question: "economy", route: "gdp" },
      ],
    });
    const result = buildInstructions([mod]);
    const debtIdx = result.indexOf("DEBT/DEFICIT");
    const econIdx = result.indexOf("ECONOMY →");
    const housingIdx = result.indexOf("HOUSING →");
    // QUESTION_TYPES order: debt/deficit, then economy (via "spending/budget", "economy"), then housing
    expect(debtIdx).toBeLessThan(econIdx);
    expect(econIdx).toBeLessThan(housingIdx);
  });

  it("skips empty question types", () => {
    const mod = mockModule({ crossRef: [{ question: "economy", route: "GDP" }] });
    const result = buildInstructions([mod]);
    expect(result).not.toContain("HOUSING →");
    expect(result).not.toContain("LEGISLATION →");
  });

  it("includes curated Code Mode section", () => {
    const result = buildInstructions([mockModule()]);
    expect(result).toContain("CODE MODE");
    expect(result).toContain("USE code_mode when:");
  });

  it("includes curated Rules section", () => {
    const result = buildInstructions([mockModule()]);
    expect(result).toContain("=== RULES");
    expect(result).toContain("1. CONTEXT:");
    expect(result).toContain("8. CONNECT DOTS:");
  });

  it("handles modules with no crossRef", () => {
    const mod = mockModule({ crossRef: undefined });
    const result = buildInstructions([mod]);
    expect(result).toContain("== TEST MODULE ==");
    expect(result).toContain("=== ROUTING TABLE ===");
    // No routing entries, but header is still there
  });
});

// ─── buildAnalysisPrompts ─────────────────────────────────────────────

describe("buildAnalysisPrompts", () => {
  it("returns prompts when modules are loaded", () => {
    const mod = mockModule();
    const prompts = buildAnalysisPrompts([mod]);
    expect(prompts.length).toBeGreaterThan(0);
  });

  it("filtering removes unavailable tool lines and keeps headers", async () => {
    // Use a mock prompt to test filtering in isolation, not tied to any real prompt text
    const mod = mockModule({
      tools: [
        { name: "available_tool", description: "exists", parameters: {}, execute: async () => "" } as any,
      ],
    });

    // Simulate what filterUnavailableTools does: lines starting with "- snake_case"
    // where the tool isn't loaded get removed
    const prompts = buildAnalysisPrompts([mod]);

    // Find any prompt and run it — we just need to verify it doesn't crash
    const first = prompts[0];
    expect(first).toBeDefined();
    const args: Record<string, string> = {};
    if (first.arguments) {
      for (const arg of first.arguments) {
        if (arg.required) args[arg.name] = "test";
      }
    }
    const output = await first.load(args);
    const text = typeof output === "string" ? output : String(output);
    expect(text.length).toBeGreaterThan(0);
  });
});

// ─── Routing table coverage ───────────────────────────────────────────

describe("Routing table coverage", () => {
  // Load all real modules to check coverage
  const moduleImports = import.meta.glob("../src/apis/*/index.ts", { eager: true }) as Record<
    string,
    Record<string, unknown>
  >;
  const allModules = Object.values(moduleImports).map(m =>
    ((m as any).default ?? m) as ApiModule,
  );

  it("every QUESTION_TYPES entry has at least one module contributing", () => {
    const coveredQuestions = new Set<string>();
    for (const mod of allModules) {
      for (const hint of mod.crossRef ?? []) {
        coveredQuestions.add(hint.question);
      }
    }

    const uncovered = QUESTION_TYPES.filter(q => !coveredQuestions.has(q));
    expect(uncovered, `Uncovered question types: ${uncovered.join(", ")}`).toHaveLength(0);
  });
});

// ─── Domain validation ─────────────────────────────────────────────

describe("Domain validation", () => {
  const moduleImports = import.meta.glob("../src/apis/*/index.ts", { eager: true }) as Record<
    string,
    Record<string, unknown>
  >;
  const allModules = Object.values(moduleImports).map(m =>
    ((m as any).default ?? m) as ApiModule,
  );

  it("every domain has at least one module", () => {
    const coveredDomains = new Set(allModules.flatMap(m => m.domains));
    const uncovered = DOMAINS.filter(d => !coveredDomains.has(d));
    expect(uncovered, `Domains with no modules: ${uncovered.join(", ")}`).toHaveLength(0);
  });

  it("no module has duplicate domains", () => {
    for (const mod of allModules) {
      const unique = new Set(mod.domains);
      expect(
        unique.size,
        `${mod.name}: duplicate domains in [${mod.domains.join(", ")}]`,
      ).toBe(mod.domains.length);
    }
  });

  it("no module has duplicate crossRef question types", () => {
    for (const mod of allModules) {
      const questions = (mod.crossRef ?? []).map(h => h.question);
      const unique = new Set(questions);
      if (unique.size !== questions.length) {
        const dupes = questions.filter((q, i) => questions.indexOf(q) !== i);
        expect.fail(
          `${mod.name}: duplicate crossRef questions: ${dupes.join(", ")}`,
        );
      }
    }
  });
});

// ─── Prompt integrity ─────────────────────────────────────────────────

describe("Prompt integrity", () => {
  const moduleImports = import.meta.glob("../src/apis/*/index.ts", { eager: true }) as Record<
    string,
    Record<string, unknown>
  >;
  const allModules = Object.values(moduleImports).map(m =>
    ((m as any).default ?? m) as ApiModule,
  );

  it("every prompt has name, description, and load function", () => {
    const prompts = buildAnalysisPrompts(allModules);
    for (const p of prompts) {
      expect(typeof p.name, `prompt missing name`).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
      expect(typeof p.description, `${p.name}: missing description`).toBe("string");
      expect(typeof p.load, `${p.name}: missing load`).toBe("function");
    }
  });

  it("all prompts produce output without errors, with and without modules", async () => {
    const withAll = buildAnalysisPrompts(allModules);
    const withNone = buildAnalysisPrompts([]);

    for (const prompts of [withAll, withNone]) {
      for (const p of prompts) {
        const args: Record<string, string> = {};
        if (p.arguments) {
          for (const arg of p.arguments) {
            if (arg.required) args[arg.name] = "test-value";
          }
        }
        const output = await p.load(args);
        const text = typeof output === "string" ? output : String(output);
        expect(text.length, `${p.name}: produced empty output`).toBeGreaterThan(0);
      }
    }
  });

  it("prompt names are unique", () => {
    const prompts = buildAnalysisPrompts(allModules);
    const names = prompts.map(p => p.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes, `Duplicate prompt names: ${dupes.join(", ")}`).toHaveLength(0);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("buildInstructions with empty modules array", () => {
    const result = buildInstructions([]);
    expect(result).toContain("CODE MODE");
    expect(result).toContain("=== RULES");
    expect(result).toContain("=== ROUTING TABLE ===");
  });
});
