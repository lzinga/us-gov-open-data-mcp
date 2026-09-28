/**
 * Instructions builder — auto-generates the full MCP instructions string from module metadata.
 *
 * The routing table section is derived from each module's `crossRef` hints.
 * Curated content (Code Mode, Rules) is appended unchanged.
 */

import { QUESTION_TYPES, authEnvVars, type ApiModule } from "../shared/types.js";
import { CODE_MODE_GUIDE, RULES } from "./curated-guides.js";

/** One-line auth note for a module's instruction block. */
export function authNote(m: Pick<ApiModule, "auth">): string {
  if (!m.auth) return "No key required.";
  const vars = authEnvVars(m.auth).join(", ");
  return m.auth.optional
    ? `Works without a key; set ${vars} for higher rate limits.`
    : `Requires ${vars}.`;
}

/**
 * Build the full MCP instructions string from module metadata.
 *
 * Structure:
 *   1. Per-module blocks (displayName, description, workflow, tips, auth)
 *   2. Auto-generated cross-reference routing table (from crossRef metadata)
 *   3. Code Mode guide (curated)
 *   4. Rules (curated)
 */
export function buildInstructions(modules: ApiModule[]): string {
  const sections: string[] = [];

  // ── Section 1: Per-module blocks ──
  // Tool names aren't listed: clients already get them, with descriptions,
  // from tools/list, and the lists were over 10% of these instructions.
  for (const m of modules) {
    sections.push(
      [
        `== ${m.displayName.toUpperCase()} ==`,
        m.description,
        m.workflow && `Workflow: ${m.workflow}`,
        m.tips,
        authNote(m),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  // ── Section 2: Auto-generated routing table ──
  sections.push(buildRoutingTable(modules));

  // ── Sections 3-4: Curated content ──
  sections.push(CODE_MODE_GUIDE);
  sections.push(RULES);

  return sections.join("\n\n");
}

/**
 * Auto-generate the cross-reference routing table from module `crossRef` metadata.
 *
 * Groups RouteHints by question type across all modules, producing lines like:
 *   DEBT/DEFICIT → FRED(FYFSGDA188S, GDP) + Treasury(debt_to_penny, avg_interest_rates)
 *
 * Question types are output in QUESTION_TYPES order (topic-clustered),
 * not alphabetically, to preserve the reader-friendly grouping.
 */
function buildRoutingTable(modules: ApiModule[]): string {
  // Collect all hints grouped by question type
  const questionMap = new Map<string, { displayName: string; route: string }[]>();

  for (const mod of modules) {
    if (!mod.crossRef) continue;
    for (const hint of mod.crossRef) {
      const key = hint.question;
      if (!questionMap.has(key)) questionMap.set(key, []);
      questionMap.get(key)!.push({
        displayName: mod.displayName,
        route: hint.route,
      });
    }
  }

  const lines: string[] = [
    "== CROSS-REFERENCING GUIDE ==",
    'Always cross-reference 2+ sources. Before responding: "What other data would make this more complete?"',
    "",
    "=== ROUTING TABLE ===",
    "Question type \u2192 Primary sources + Enrichment sources",
    "",
  ];

  // Output in QUESTION_TYPES order (topic-clustered, not alphabetical)
  for (const question of QUESTION_TYPES) {
    const entries = questionMap.get(question);
    if (!entries?.length) continue;

    const routeStr = entries
      .map((e) => `${e.displayName}(${e.route})`)
      .join(" + ");
    lines.push(`${question.toUpperCase()} \u2192 ${routeStr}`);
  }

  return lines.join("\n");
}
