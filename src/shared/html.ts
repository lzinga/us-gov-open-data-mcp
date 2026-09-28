/**
 * Shared HTML-to-text helpers.
 *
 * These produce plain text for JSON/LLM output. They are NOT an HTML sanitizer
 * for rendering sinks: an unterminated `<script` tail or double-encoded
 * entities (e.g. `&amp;lt;`) are not removed. Use a real sanitizer if output
 * is ever rendered as HTML.
 */

import he from "he";

export type HtmlWhitespaceMode = "preserve" | "paragraphs" | "collapse";

export interface HtmlToTextOptions {
  /**
   * - `preserve` (default): keep whitespace as-is, only trim ends
   * - `paragraphs`: normalize CRLF to LF and collapse 3+ newlines to 2
   * - `collapse`: collapse all whitespace runs to a single space
   */
  whitespace?: HtmlWhitespaceMode;
}

const TAG_PATTERN = /<[^>]*>/g;

/**
 * Remove HTML tags, repeating until the string stops changing so nested or
 * overlapping payloads like `<scr<script>ipt>` cannot reassemble into a tag.
 */
export function stripTags(input: string): string {
  let previous: string;
  let current = input;
  do {
    previous = current;
    current = current.replace(TAG_PATTERN, "");
  } while (current !== previous);
  return current;
}

/**
 * Convert an HTML fragment to plain text: strip tags, decode entities, then
 * strip again so encoded markup (`&lt;b&gt;`) revealed by decoding is removed.
 */
export function htmlToText(input: unknown, options: HtmlToTextOptions = {}): string {
  const text = stripTags(he.decode(stripTags(String(input ?? ""))));

  switch (options.whitespace ?? "preserve") {
    case "paragraphs":
      return text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    case "collapse":
      return text.replace(/\s+/g, " ").trim();
    default:
      return text.trim();
  }
}
