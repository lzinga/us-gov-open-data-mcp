// Auto-generates docs pages from compiled API modules.
// Produces: guide/tools.md, guide/data-sources.md
// Run: node docs/scripts/generate-tools-page.mjs

import { readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APIS_DIR = join(ROOT, "dist/apis");
const GUIDE_DIR = join(__dirname, "../guide");

// ── Load all modules ──

const apiDirs = readdirSync(APIS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

const modules = [];

for (const dir of apiDirs) {
  try {
    const raw = await import(`file://${join(APIS_DIR, dir, "index.js").replace(/\\/g, "/")}`);
    const mod = raw.default ?? raw;
    modules.push({
      dir,
      name: mod.name ?? dir,
      displayName: mod.displayName ?? dir,
      category: mod.category ?? "Other",
      description: mod.description ?? "",
      auth: mod.auth ?? null,
      workflow: mod.workflow ?? null,
      tips: mod.tips ?? null,
      tools: mod.tools ?? [],
      prompts: mod.prompts ?? [],
      reference: mod.reference ?? null,
    });
  } catch (err) {
    console.error(`  WARN  ${dir}: ${err.message}`);
  }
}

const totalTools = modules.reduce((n, m) => n + m.tools.length, 0);
const totalPrompts = modules.reduce((n, m) => n + m.prompts.length, 0);

// ── 1. Generate tools.md ──

const CATEGORY_ORDER = [
  "Economic", "Legislative", "Financial", "Spending",
  "Health", "Safety", "Environment", "Justice",
  "Education", "Research", "Demographics",
  "Transportation", "Agriculture", "International", "Other",
];

function groupByCategory(mods) {
  const groups = {};
  for (const m of mods) {
    const cat = m.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }
  return groups;
}

const toolGroups = groupByCategory(modules);
const toolSections = [];

for (const cat of CATEGORY_ORDER) {
  const mods = toolGroups[cat];
  if (!mods?.length) continue;

  const catTools = mods.reduce((n, m) => n + m.tools.length, 0);
  let section = `## ${cat}\n\n`;

  for (const m of mods) {
    const auth = m.auth ? `\`${[].concat(m.auth.envVar).join(", ")}\`` : "None";
    const toolRows = m.tools.map(t => {
      const desc = (t.description ?? "").split("\n")[0];
      return `| \`${t.name}\` | ${desc} |`;
    });

    section += `### ${m.displayName}\n\n`;
    section += `**${m.tools.length} tools** · Auth: ${auth}\n\n`;
    section += `| Tool | Description |\n|------|-------------|\n`;
    section += toolRows.join("\n");

    if (m.prompts.length) {
      section += `\n\n**Prompts:** ${m.prompts.map(p => `\`${p.name}\``).join(", ")}`;
    }
    section += "\n\n";
  }

  toolSections.push(section);
}

const toolsPage = `---
# Auto-generated — do not edit. Run: npm run docs:generate
---

# All Tools

**${totalTools} tools** across **${modules.length} APIs** · ${totalPrompts} prompts

${toolSections.join("\n---\n\n")}`;

writeFileSync(join(GUIDE_DIR, "tools.md"), toolsPage, "utf-8");
console.log(`tools.md: ${totalTools} tools, ${totalPrompts} prompts`);

// ── 2. Generate data-sources.md ──

const dsGroups = groupByCategory(modules);
const dsSections = [];

for (const cat of CATEGORY_ORDER) {
  const mods = dsGroups[cat];
  if (!mods?.length) continue;

  let section = `## ${cat}\n\n`;
  section += `| API | Tools | Description | Auth |\n`;
  section += `|-----|-------|-------------|------|\n`;

  for (const m of mods) {
    const auth = m.auth ? `\`${[].concat(m.auth.envVar).join(", ")}\`` : "None";
    const desc = m.description.length > 120 ? m.description.slice(0, 117) + "..." : m.description;
    section += `| **${m.displayName}** | ${m.tools.length} | ${desc} | ${auth} |\n`;
  }

  dsSections.push(section);
}

const noKeyApis = modules.filter(m => !m.auth).map(m => m.displayName);
const keyApis = modules.filter(m => m.auth);

const dataSourcesPage = `---
# Auto-generated — do not edit. Run: npm run docs:generate
---

# Data Sources

**${modules.length} APIs** · **${totalTools} tools** · ${noKeyApis.length} require no key

${dsSections.join("\n")}
## API Key Summary

**No key required (${noKeyApis.length}):** ${noKeyApis.join(", ")}

**Key required (${keyApis.length}):**

| Key | APIs | Get it |
|-----|------|--------|
${[...new Set(keyApis.flatMap(m => [].concat(m.auth.envVar)))].map(envVar => {
  const apis = keyApis.filter(m => [].concat(m.auth.envVar).includes(envVar));
  const signup = apis[0].auth.signup;
  return `| \`${envVar}\` | ${apis.map(m => m.displayName).join(", ")} | [Sign up](${signup}) |`;
}).join("\n")}

For setup instructions, see [API Keys](/guide/api-keys).
`;

writeFileSync(join(GUIDE_DIR, "data-sources.md"), dataSourcesPage, "utf-8");
console.log(`data-sources.md: ${modules.length} APIs in ${dsSections.length} categories`);

// ── 3. Generate sidebar fragments ──

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Tools sidebar: category → anchor links with tool count badge
const toolsSidebar = [];
for (const cat of CATEGORY_ORDER) {
  const mods = toolGroups[cat];
  if (!mods?.length) continue;
  const catTools = mods.reduce((n, m) => n + m.tools.length, 0);
  toolsSidebar.push({
    text: `<span style="display:flex;justify-content:space-between;width:100%">${cat}<span class="VPBadge tip">${catTools}</span></span>`,
    link: `/guide/tools#${slugify(cat)}`,
  });
}

// Data sources sidebar: category → anchor links with API count badge
const dsSidebar = [];
for (const cat of CATEGORY_ORDER) {
  const mods = dsGroups[cat];
  if (!mods?.length) continue;
  dsSidebar.push({
    text: `<span style="display:flex;justify-content:space-between;width:100%">${cat}<span class="VPBadge tip">${mods.length}</span></span>`,
    link: `/guide/data-sources#${slugify(cat)}`,
  });
}

const sidebarData = { toolsSidebar, dsSidebar };
writeFileSync(
  join(__dirname, "../generated-sidebar.json"),
  JSON.stringify(sidebarData, null, 2),
  "utf-8"
);
console.log(`generated-sidebar.json: ${toolsSidebar.length} tool categories, ${dsSidebar.length} DS categories`);

// ── 4. Generate api-keys.md ──

const keyGroups = {};
for (const m of modules) {
  if (!m.auth) continue;
  for (const key of [].concat(m.auth.envVar)) {
    if (!keyGroups[key]) keyGroups[key] = { envVar: key, signup: m.auth.signup, apis: [] };
    keyGroups[key].apis.push(m.displayName);
  }
}

const keyRows = Object.values(keyGroups).map(k =>
  `| \`${k.envVar}\` | ${k.apis.join(", ")} | [Sign up](${k.signup}) |`
);

const apiKeysPage = `---
# Auto-generated — do not edit. Run: npm run docs:generate
---

# API Keys

**${noKeyApis.length} APIs work with no key at all.** The rest use free keys — most take under a minute to get.

## Setting Keys

::: tip Two options
**Option 1 — \`.env\` file** (recommended for local development):

Create a \`.env\` file in your project root:

\`\`\`bash
DATA_GOV_API_KEY=your_key_here
FRED_API_KEY=your_key_here
\`\`\`

**Option 2 — \`env\` block in MCP config** (recommended for VS Code / Claude Desktop):

Add keys directly in your MCP client config as shown in [Getting Started](/guide/getting-started).
:::

## Key Reference

| Key | APIs | Get it |
|-----|------|--------|
${keyRows.join("\n")}

## No-Key APIs (${noKeyApis.length})

These APIs work immediately — no signup required:

${noKeyApis.join(", ")}
`;

writeFileSync(join(GUIDE_DIR, "api-keys.md"), apiKeysPage, "utf-8");
console.log(`api-keys.md: ${Object.keys(keyGroups).length} keys, ${noKeyApis.length} no-key APIs`);

// ── 5. Generate index.md (homepage) with live stats ──

const homePage = `---
layout: home
hero:
  name: US Government Open Data
  text: MCP Server + TypeScript SDK
  tagline: ${modules.length} federal APIs • ${totalTools} tools • Live government data, cross-referenced automatically
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View Examples
      link: /guide/sdk-usage
    - theme: alt
      text: API Reference
      link: /api/

features:
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><path d="M9 20v-4h6v4"/><path d="M9 12h.01"/><path d="M15 12h.01"/></svg>'
    title: ${modules.length} Government APIs
    details: Treasury, FRED, Congress, FEC, CDC, FDA, SEC, FBI, EPA, NOAA, and ${modules.length - 10} more — all through a single interface.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="m16 12-4 4-4-4"/></svg>'
    title: Cross-Referenced Automatically
    details: Ask about a drug and get FDA adverse events, clinical trials, NIH grants, lobbying spend, and congressional activity in one query.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 12 2 2 4-4"/></svg>'
    title: ${noKeyApis.length} APIs Need No Key
    details: Treasury, Federal Register, USAspending, World Bank, CDC, FDA, EPA, and more work instantly. The rest use free keys.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
    title: Standalone SDK
    details: Every API is importable as a typed TypeScript client — no MCP server required. Caching, retry, and rate limiting built in.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>'
    title: Multiple Transports
    details: Works via stdio or HTTP Stream with any MCP client — VS Code Copilot, Claude Desktop, Cursor, or your own.
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v2.343"/><path d="M14 2v6.343"/><path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/><path d="m6.5 7 .564 2.258A2 2 0 0 0 9.002 11h5.996a2 2 0 0 0 1.938-1.742L17.5 7"/><path d="M4.44 15h15.12a2 2 0 0 1 1.94 2.49l-.9 3.6a2 2 0 0 1-1.94 1.51H5.34a2 2 0 0 1-1.94-1.51l-.9-3.6A2 2 0 0 1 4.44 15Z"/></svg>'
    title: Selective Loading
    details: Load only the modules you need for faster startup and smaller tool lists.
---

## Showcases

These long-form analyses were generated entirely from live government API data — no manual data entry. They demonstrate what's possible when cross-referencing multiple data sources.

| Analysis | What it shows | APIs used |
|----------|--------------|-----------|
| **[Worst-Case Impact](/guide/worst-case-analysis)** | PAC money to committee votes to measurable public cost — one case per party | Congress, FEC, FDIC, FRED, World Bank, Senate Lobbying |
| **[Best-Case Impact](/guide/best-case-analysis)** | Senators defying industry pressure to pass legislation with positive outcomes | Congress, FEC, Senate Lobbying, USAspending |
| **[Presidential Scorecard](/guide/presidential-economic-scorecard)** | Clinton through Trump II — identical metrics, side-by-side, with context | FRED, Treasury, Federal Register, Congress |
| **[Deficit Reduction](/guide/deficit-reduction-comparison)** | Best Democratic plan vs. best Republican plan, graded on realism | Treasury, FRED, USAspending, World Bank, Congress, BLS |

## Disclaimer

This project was built with the assistance of AI tools. All data is sourced from official U.S. government and international APIs — the server does not generate, modify, or editorialize any data. It returns raw results from federal databases exactly as provided.

Data accuracy depends on the upstream government APIs. Correlation does not imply causation. This tool is for research and informational purposes — not legal, financial, medical, or policy advice. The example analyses demonstrate the server's capabilities and should not be treated as investigative conclusions.
`;

writeFileSync(join(__dirname, "../index.md"), homePage, "utf-8");
console.log(`index.md: ${modules.length} APIs, ${totalTools} tools, ${noKeyApis.length} no-key`);

console.log("Done.");

