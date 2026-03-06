/**
 * Shared test utilities for module validation.
 *
 * Provides module discovery, lazy loading, and type helpers
 * so test files don't duplicate boilerplate.
 */

/// <reference types="vite/client" />

import { readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Paths ───────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
export const apisDir = join(__dirname, "..", "src", "apis");

// ─── Module discovery ────────────────────────────────────────────────

/** All API module directory names under src/apis/, sorted alphabetically. */
export const moduleDirs = readdirSync(apisDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

/** Required files every module folder must contain. */
export const requiredFiles = ["index.ts", "meta.ts", "sdk.ts", "tools.ts"] as const;

/** Check if a module has a specific file. */
export function moduleHasFile(moduleName: string, fileName: string): boolean {
  return existsSync(join(apisDir, moduleName, fileName));
}

// ─── Module loading (via import.meta.glob) ───────────────────────────

/** Eagerly imported modules — Vite resolves these at build time. */
const moduleImports = import.meta.glob("../src/apis/*/index.ts", { eager: true }) as Record<
  string,
  Record<string, unknown>
>;

/** Get a module's exports by directory name. Throws if not found. */
export function getModule(moduleName: string): Record<string, unknown> {
  const key = `../src/apis/${moduleName}/index.ts`;
  const mod = moduleImports[key];
  if (!mod) throw new Error(`Module "${moduleName}" not found in glob imports`);
  // Modules use export default — unwrap the default export
  return (mod.default ?? mod) as Record<string, unknown>;
}

// ─── Type helpers ────────────────────────────────────────────────────

export interface ModuleTool {
  name: string;
  description: string;
  parameters: unknown;
  annotations?: { title?: string; readOnlyHint?: boolean };
  execute?: Function;
}

export interface ModuleAuth {
  envVar: string;
  signup: string;
}

/** Extract typed tools array from a module. */
export function getTools(mod: Record<string, unknown>): ModuleTool[] {
  return mod.tools as ModuleTool[];
}

/** Extract auth config from a module (may be undefined). */
export function getAuth(mod: Record<string, unknown>): ModuleAuth | undefined {
  return mod.auth as ModuleAuth | undefined;
}

/** Collect all tools across all modules as [moduleName, tool] pairs. */
export function getAllTools(): [string, ModuleTool][] {
  const result: [string, ModuleTool][] = [];
  for (const dir of moduleDirs) {
    const mod = getModule(dir);
    for (const tool of getTools(mod)) {
      result.push([dir, tool]);
    }
  }
  return result;
}
