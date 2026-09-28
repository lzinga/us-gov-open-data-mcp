/**
 * Every tool name mentioned in prompts, module metadata, and tool
 * descriptions must exist. Mentions of missing tools send the model to call
 * tools that don't exist.
 *
 * String literals are extracted with the TypeScript compiler (so code
 * identifiers aren't mistaken for tool references); any snake_case token that
 * starts with a known tool prefix must be a registered tool, an alias, or an
 * explicitly allowed non-tool identifier (API field names, etc.).
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, it, expect } from "vitest";
import { apisDir, moduleDirs, getModule, getTools } from "./helpers.js";

/** Server-level tools (not defined in modules). */
const SERVER_TOOLS = ["code_mode", "clear_cache"];

/**
 * snake_case tokens in strings that share a tool prefix but are not tools:
 * upstream API method/field names and parameter names.
 */
const NOT_TOOLS = new Set([
  // BEA API method names and docs anchor (bea_ is also a tool prefix)
  "get_values", "get_filtered_values", "list_parameters", "bea_web_service_api_user_guide",
  // ClinicalTrials.gov / DOL parameter and field names
  "search_as_drug", "open_date",
]);

const allTools = new Set<string>([...SERVER_TOOLS, ...moduleDirs.flatMap(d => getTools(getModule(d)).map(t => t.name))]);
const prefixes = new Set([...allTools].map(n => n.split("_")[0]));

interface Mention { file: string; line: number; token: string }

/** All string/template literal text in a TypeScript file, with line numbers. */
function literals(file: string): { text: string; line: number }[] {
  const source = ts.createSourceFile(file, readFileSync(file, "utf-8"), ts.ScriptTarget.Latest, true);
  const out: { text: string; line: number }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      out.push({ text: node.text, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

/** Tool-like tokens in a file that don't resolve to a tool. */
function unknownMentions(file: string, rel: string): Mention[] {
  const found: Mention[] = [];
  for (const { text, line } of literals(file)) {
    for (const match of text.matchAll(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g)) {
      const token = match[0];
      if (!prefixes.has(token.split("_")[0])) continue;
      if (allTools.has(token) || NOT_TOOLS.has(token)) continue;
      found.push({ file: rel, line, token });
    }
  }
  return found;
}

const scanned: { path: string; rel: string }[] = [
  { path: join(apisDir, "..", "server", "prompts.ts"), rel: "src/server/prompts.ts" },
  { path: join(apisDir, "..", "server", "curated-guides.ts"), rel: "src/server/curated-guides.ts" },
  ...moduleDirs.flatMap(d => ["meta.ts", "tools.ts", "prompts.ts"]
    .map(f => ({ path: join(apisDir, d, f), rel: `src/apis/${d}/${f}` }))),
].filter(f => existsSync(f.path));

describe("tool references", () => {
  it("scans every prompt, meta, and tools file", () => {
    expect(scanned.length).toBeGreaterThan(moduleDirs.length * 2);
  });

  it("every referenced tool exists", () => {
    const unknown = scanned.flatMap(f => unknownMentions(f.path, f.rel));
    const report = unknown.map(u => `${u.file}:${u.line} → ${u.token}`).join("\n");
    expect(unknown, `Unknown tool references:\n${report}`).toEqual([]);
  });

  it("detects a planted reference to a missing tool", () => {
    const planted = join(apisDir, "fred", "meta.ts");
    const mentions = literals(planted).length;
    expect(mentions).toBeGreaterThan(0);
    // Simulate: the same scan over a string that mentions a non-existent tool.
    const fake = "Use fred_imaginary_tool before fred_series_data.";
    const tokens = [...fake.matchAll(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g)].map(m => m[0])
      .filter(t => prefixes.has(t.split("_")[0]) && !allTools.has(t) && !NOT_TOOLS.has(t));
    expect(tokens).toEqual(["fred_imaginary_tool"]);
  });
});
