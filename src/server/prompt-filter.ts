/**
 * Keep prompts in step with the tools that are actually loaded.
 *
 * With selective loading (--modules, MODULES), a prompt that says "call
 * treasury_query_fiscal_data" when Treasury isn't loaded sends the model after
 * a tool that doesn't exist. The filter:
 *
 * - drops every line that mentions a known tool which isn't loaded, wherever
 *   the name appears in the line (list item, numbered step, prose)
 * - renumbers numbered steps after a removal so they stay 1, 2, 3, …
 * - hides a prompt when it mentions tools but none of them are loaded and it
 *   doesn't name a loaded module either
 *
 * "Known" tools are those of every module that could be loaded, plus
 * deprecated aliases. Other snake_case words, such as dataset names like
 * debt_to_penny, are left alone.
 */

import type { InputPrompt } from "fastmcp";

const TOOL_TOKEN = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
const NUMBERED = /^(\s*)(\d+)\.(\s)/;

/** Known tool names mentioned in `text`. */
export function mentionedTools(text: string, known: ReadonlySet<string>): Set<string> {
  return new Set((text.match(TOOL_TOKEN) ?? []).filter(t => known.has(t)));
}

/**
 * Remove lines that mention known-but-unloaded tools. Numbered steps are
 * renumbered so each list still counts up from its original first number.
 */
export function filterPromptText(text: string, known: ReadonlySet<string>, available: ReadonlySet<string>): string {
  const lines = text.split("\n");
  const keep = lines.map(line => [...mentionedTools(line, known)].every(t => available.has(t)));
  if (keep.every(Boolean)) return text;

  const out: string[] = [];
  let next: number | null = null; // number for the next kept step in the current list
  lines.forEach((line, i) => {
    const m = NUMBERED.exec(line);
    if (!m) {
      // A blank or unindented non-numbered line ends the list.
      if (line.trim() === "" || !/^\s/.test(line)) next = null;
      if (keep[i]) out.push(line);
      return;
    }
    next ??= Number(m[2]);
    if (!keep[i]) return;
    out.push(`${m[1]}${next}.${m[3]}${line.slice(m[0].length)}`);
    next++;
  });
  return out.join("\n");
}

/**
 * Wrap prompts so their output mentions only loaded tools, and drop prompts
 * that can't be used: they mention tools, none of those are loaded, and they
 * don't name a loaded module either ("pull these FRED series" still counts
 * for FRED). Prompt text is sampled once with empty arguments to see what it
 * mentions; a prompt that can't be sampled is kept.
 */
export async function filterPrompts<P extends InputPrompt<any, any>>(
  prompts: P[],
  known: ReadonlySet<string>,
  available: ReadonlySet<string>,
  loadedModules: readonly string[] = [],
): Promise<P[]> {
  const moduleWords = loadedModules.map(name => new RegExp(`\\b${name.replace(/-/g, "[ -]")}\\b`, "i"));
  const result: P[] = [];
  for (const prompt of prompts) {
    let sample: string | undefined;
    try {
      const raw = await prompt.load({} as never);
      sample = typeof raw === "string" ? raw : undefined;
    } catch {
      sample = undefined;
    }
    if (sample !== undefined) {
      const mentioned = mentionedTools(sample, known);
      const usable = mentioned.size === 0
        || [...mentioned].some(t => available.has(t))
        || moduleWords.some(re => re.test(sample!));
      if (!usable) continue;
    }
    result.push({
      ...prompt,
      load: async (args: never) => {
        const raw = await prompt.load(args);
        return typeof raw === "string" ? filterPromptText(raw, known, available) : raw;
      },
    });
  }
  return result;
}
