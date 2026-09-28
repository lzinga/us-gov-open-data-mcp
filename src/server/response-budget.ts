/**
 * Response size budget for tool results sent to the client.
 *
 * A single tool call can return megabytes (10,000 table rows, a full bill
 * text), which floods the model's context or gets cut off mid-JSON by the
 * client. Results over the budget are shortened while staying valid JSON:
 *
 * 1. The largest arrays (table rows, list items) are cut to the longest
 *    prefix that fits.
 * 2. If that isn't enough, the longest strings are clipped.
 * 3. A `truncatedToFit` marker says what was shortened, the summary notes
 *    it, and a columnar `data` object gets `truncated: true`.
 *
 * Non-JSON text is clipped with a note. code_mode reads raw tool output
 * through the registry, so it still sees everything.
 *
 * MAX_RESPONSE_BYTES sets the budget (UTF-8 bytes); 0 turns it off.
 */

export const DEFAULT_MAX_RESPONSE_BYTES = 150_000;

const bytes = (s: string) => Buffer.byteLength(s, "utf8");

/** Budget from MAX_RESPONSE_BYTES: a positive integer, 0 for none, else the default. */
export function maxResponseBytes(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.MAX_RESPONSE_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_RESPONSE_BYTES;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_MAX_RESPONSE_BYTES;
}

const ADVICE = "Narrow the query (filters, fewer fields, smaller page) or use code_mode to process the full result.";

function clipText(text: string, maxBytes: number): string {
  const note = `\n… [response shortened from ${bytes(text)} to fit ${maxBytes} bytes. ${ADVICE}]`;
  let keep = Math.max(0, maxBytes - bytes(note));
  let head = text.slice(0, keep);
  while (keep > 0 && bytes(head) > maxBytes - bytes(note)) head = text.slice(0, (keep = Math.floor(keep * 0.9)));
  return head + note;
}

type Json = unknown;

/** Every array (length > 1) in the value, with the object that holds it. Rows of a table aren't candidates. */
function arrays(value: Json, path: string, out: { arr: Json[]; path: string; parent: Record<string, Json> | null }[], parent: Record<string, Json> | null = null): void {
  if (Array.isArray(value)) {
    if (value.length > 1) out.push({ arr: value, path, parent });
    value.forEach((v, i) => { if (v && typeof v === "object" && !Array.isArray(v)) arrays(v, `${path}[${i}]`, out, null); });
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) arrays(v, path ? `${path}.${k}` : k, out, value as Record<string, Json>);
  }
}

/** Replace strings longer than `cap` characters, in place. Returns how many were clipped. */
function clipStrings(value: Json, cap: number): number {
  let n = 0;
  const visit = (v: Json, set: (x: Json) => void) => {
    if (typeof v === "string" && v.length > cap) { set(`${v.slice(0, cap)}… [clipped from ${v.length} chars]`); n++; }
    else if (Array.isArray(v)) v.forEach((x, i) => { visit(x, y => { v[i] = y; }); });
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) visit(x, y => { (v as Record<string, Json>)[k] = y; });
  };
  visit(value, () => {});
  return n;
}

/** Shorten `text` to at most `maxBytes` (see the module comment). Unchanged when it already fits. */
export function fitResponse(text: string, maxBytes: number): string {
  const originalBytes = bytes(text);
  if (maxBytes <= 0 || originalBytes <= maxBytes) return text;

  let obj: Json;
  try {
    obj = JSON.parse(text);
  } catch {
    return clipText(text, maxBytes);
  }
  if (!obj || typeof obj !== "object") return clipText(text, maxBytes);

  const marker: { maxBytes: number; originalBytes: number; shortened: { path: string; kept: number; of: number }[]; clippedStrings?: number; note: string } =
    { maxBytes, originalBytes, shortened: [], note: ADVICE };
  const suffix = ` [shortened to fit ${Math.round(maxBytes / 1000)} KB]`;
  /** The response as it will be sent: current data, a noted summary, and the marker. */
  const render = (): string => {
    const base: Record<string, Json> = Array.isArray(obj) ? { items: obj } : { ...(obj as Record<string, Json>) };
    if (typeof base.summary === "string") base.summary += suffix;
    base.truncatedToFit = marker;
    return JSON.stringify(base);
  };
  const size = () => bytes(render());

  // 1. Cut the largest arrays to the longest prefix that fits.
  for (let guard = 0; guard < 20 && size() > maxBytes; guard++) {
    const found: { arr: Json[]; path: string; parent: Record<string, Json> | null }[] = [];
    arrays(obj, "", found);
    if (!found.length) break;
    const target = found.reduce((a, b) => (bytes(JSON.stringify(b.arr)) > bytes(JSON.stringify(a.arr)) ? b : a));
    const full = target.arr.slice();
    let lo = 1, hi = full.length - 1, best = 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      target.arr.length = 0;
      target.arr.push(...full.slice(0, mid));
      if (size() <= maxBytes) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    target.arr.length = 0;
    target.arr.push(...full.slice(0, best));
    const prior = marker.shortened.find(s => s.path === target.path);
    if (prior) prior.kept = best;
    else marker.shortened.push({ path: target.path || "(root)", kept: best, of: full.length });
    if (target.parent && "truncated" in target.parent) target.parent.truncated = true;
  }

  // 2. Clip the longest strings.
  if (size() > maxBytes) {
    const snapshot = JSON.stringify(obj);
    marker.clippedStrings = 999_999; // reserve room for the real count
    let lo = 0, hi = 100_000, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      obj = JSON.parse(snapshot);
      clipStrings(obj, mid);
      if (size() <= maxBytes) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    obj = JSON.parse(snapshot);
    marker.clippedStrings = clipStrings(obj, best);
  }

  const out = render();
  return bytes(out) <= maxBytes ? out : clipText(out, maxBytes);
}

/** A tool result with the budget applied to its text. Non-text results pass through. */
export function budgetResult(result: unknown, maxBytes: number): unknown {
  if (typeof result === "string") return fitResponse(result, maxBytes);
  if (result && typeof result === "object" && Array.isArray((result as { content?: unknown }).content)) {
    const content = (result as { content: { type: string; text?: string }[] }).content;
    return {
      ...result,
      content: content.map(c => (c.type === "text" && typeof c.text === "string" ? { ...c, text: fitResponse(c.text, maxBytes) } : c)),
    };
  }
  return result;
}
