/**
 * Module structure tests — dynamically validates every API module folder.
 *
 * Ensures each module under src/apis/ has the required files and exports
 * the expected fields so the server can auto-discover them.
 */

import { join } from "path";
import { existsSync } from "fs";
import { describe, it, expect, beforeAll } from "vitest";
import {
  moduleDirs,
  apisDir,
  requiredFiles,
  getModule,
  getTools,
  getAuth,
  getAllTools,
  type ModuleTool,
} from "./helpers.js";

// ─── File structure ──────────────────────────────────────────────────

describe("API module structure", () => {
  it("has at least one module", () => {
    expect(moduleDirs.length).toBeGreaterThan(0);
  });

  describe.each(moduleDirs)("%s", (moduleName) => {
    const moduleDir = join(apisDir, moduleName);

    it.each(requiredFiles)("has %s", (fileName) => {
      expect(existsSync(join(moduleDir, fileName))).toBe(true);
    });
  });
});

// ─── Module exports ──────────────────────────────────────────────────

describe("API module exports", () => {
  describe.each(moduleDirs)("%s", (moduleName) => {
    let mod: Record<string, unknown>;
    let tools: ModuleTool[];

    beforeAll(() => {
      mod = getModule(moduleName);
      tools = getTools(mod);
    });

    it("can be imported", () => {
      expect(mod).toBeDefined();
    });

    // Required string exports
    it.each(["name", "displayName", "description", "category", "workflow", "tips"])(
      "exports %s (non-empty string)",
      (field) => {
        expect(typeof mod[field]).toBe("string");
        expect((mod[field] as string).length).toBeGreaterThan(0);
      },
    );

    it("exports tools (non-empty array)", () => {
      expect(Array.isArray(mod.tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it("exports clearCache (function)", () => {
      expect(typeof mod.clearCache).toBe("function");
    });

    // Tool validation
    it("every tool has name, description, and parameters", () => {
      for (const tool of tools) {
        expect(typeof tool.name, `tool missing name`).toBe("string");
        expect(tool.name.length).toBeGreaterThan(0);
        expect(typeof tool.description, `${tool.name} missing description`).toBe("string");
        expect(tool.description.length).toBeGreaterThan(0);
        expect(tool.parameters, `${tool.name} missing parameters`).toBeDefined();
      }
    });

    it("every tool has annotations with readOnlyHint and title", () => {
      for (const tool of tools) {
        expect(tool.annotations, `${tool.name} missing annotations`).toBeDefined();
        expect(tool.annotations!.readOnlyHint, `${tool.name} missing readOnlyHint`).toBe(true);
        expect(typeof tool.annotations!.title, `${tool.name} missing title`).toBe("string");
      }
    });

    it("all tool names are snake_case", () => {
      for (const tool of tools) {
        expect(tool.name, `"${tool.name}" should be snake_case`).toMatch(/^[a-z][a-z0-9_]+$/);
      }
    });

    it("has no duplicate tool names", () => {
      const names = tools.map(t => t.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it("auth has envVar and signup URL if present", () => {
      const auth = getAuth(mod);
      if (auth) {
        const vars = [].concat(auth.envVar as any) as string[];
        expect(vars.length).toBeGreaterThan(0);
        for (const v of vars) {
          expect(typeof v).toBe("string");
          expect(v.length).toBeGreaterThan(0);
        }
        expect(typeof auth.signup).toBe("string");
        expect(auth.signup).toMatch(/^https?:\/\//);
      }
    });
  });
});

// ─── Cross-module validation ─────────────────────────────────────────

describe("Cross-module validation", () => {
  it("no duplicate tool names across all modules", () => {
    const seen = new Map<string, string>();
    for (const [moduleName, tool] of getAllTools()) {
      if (seen.has(tool.name)) {
        expect.fail(
          `Duplicate tool name "${tool.name}" in modules "${seen.get(tool.name)}" and "${moduleName}"`,
        );
      }
      seen.set(tool.name, moduleName);
    }
  });

  it("no duplicate module names", () => {
    const names = moduleDirs.map(dir => getModule(dir).name as string);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes, `Duplicate module names: ${dupes.join(", ")}`).toHaveLength(0);
  });
});
