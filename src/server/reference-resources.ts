/**
 * Module reference data as MCP resources: govdata://{module}/reference.
 *
 * Modules carry lookup tables in their metadata, such as bill type codes,
 * offense codes, XBRL concepts and documentation links. Rendering each as its
 * own markdown resource lets a client read one module's codes on demand
 * instead of guessing values.
 */

import type { ApiModule } from "../shared/types.js";

/** Resource URI for a module's reference data. */
export const referenceUri = (moduleName: string) => `govdata://${moduleName}/reference`;

/** Modules with reference data worth a resource. */
export function modulesWithReference(modules: ApiModule[]): ApiModule[] {
  return modules.filter(m => m.reference && Object.keys(m.reference).length > 0);
}

/** "arrestOffenses" → "Arrest offenses". */
function heading(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const cell = (v: unknown) => String(v).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

function renderValue(key: string, value: unknown): string {
  const title = key === "docs" ? "Documentation" : heading(key);
  if (key === "docs" && value && typeof value === "object" && !Array.isArray(value)) {
    return `## ${title}\n\n${Object.entries(value).map(([name, url]) => `- [${name}](${url})`).join("\n")}`;
  }
  if (Array.isArray(value)) {
    const body = value.every(v => typeof v !== "object" || v === null)
      ? value.map(v => `- ${cell(v)}`).join("\n")
      : "```json\n" + JSON.stringify(value, null, 2) + "\n```";
    return `## ${title}\n\n${body}`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.every(([, v]) => typeof v !== "object" || v === null)) {
      return `## ${title}\n\n| Code | Meaning |\n|---|---|\n${entries.map(([k, v]) => `| \`${cell(k)}\` | ${cell(v)} |`).join("\n")}`;
    }
    return `## ${title}\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
  }
  return `## ${title}\n\n${cell(value)}`;
}

/** Markdown for one module's reference data. */
export function renderReference(mod: ApiModule): string {
  const sections = Object.entries(mod.reference ?? {}).map(([k, v]) => renderValue(k, v));
  return `# ${mod.displayName} — reference data\n\n${sections.join("\n\n")}\n`;
}
