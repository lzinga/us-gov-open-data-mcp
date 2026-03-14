/**
 * Instructions builder — auto-generates the full MCP instructions string from module metadata.
 *
 * The routing table section is derived from each module's `crossRef` hints.
 * Curated content (Code Mode, Rules) is appended unchanged.
 */

import { QUESTION_TYPES, type ApiModule } from "../shared/types.js";
import { CODE_MODE_GUIDE, RULES } from "./curated-guides.js";

/**
 * Build the full MCP instructions string from module metadata.
 *
 * Structure:
 *   1. Per-module blocks (displayName, description, tools, workflow, tips, auth)
 *   2. Auto-generated cross-reference routing table (from crossRef metadata)
 *   3. Code Mode guide (curated)
 *   4. Rules (curated)
 */
export function buildInstructions(modules: ApiModule[]): string {
  const sections: string[] = [];

  // ── Section 1: Per-module blocks ──
  for (const m of modules) {
    const authNote = m.auth
      ? `Requires ${(Array.isArray(m.auth.envVar) ? m.auth.envVar : [m.auth.envVar]).join(", ")}.`
      : "No key required.";
    sections.push(
      [
        `== ${m.displayName.toUpperCase()} ==`,
        m.description,
        `Tools: ${m.tools.map((t) => t.name).join(", ")}`,
        m.workflow && `Workflow: ${m.workflow}`,
        m.tips,
        authNote,
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
