/**
 * Unit tests for shared HTML-to-text helpers.
 */

import { describe, it, expect } from "vitest";
import { stripTags, htmlToText } from "../src/shared/html.js";
import { cleanHtml } from "../src/shared/response.js";

describe("stripTags", () => {
  it("removes simple tags", () => {
    expect(stripTags("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("removes nested/overlapping payloads that reassemble after one pass", () => {
    expect(stripTags("<scr<script>ipt>alert(1)</script>")).not.toMatch(/<[^>]*>/);
    expect(stripTags("<<b>script>x")).toBe("script>x");
    expect(stripTags("<b<b>>x")).toBe(">x");
  });

  it("removes empty tags", () => {
    expect(stripTags("a<>b")).toBe("ab");
  });

  it("keeps literal less-than without a closing bracket", () => {
    expect(stripTags("a < b")).toBe("a < b");
  });
});

describe("htmlToText", () => {
  it("decodes entities", () => {
    expect(htmlToText("Tom &amp; Jerry &#8212; &quot;hi&quot;")).toBe('Tom & Jerry \u2014 "hi"');
  });

  it("strips encoded tags revealed by decoding", () => {
    expect(htmlToText("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe("alert(1)");
    expect(htmlToText("<p>&lt;img src=x onerror=alert(1)&gt;ok</p>")).toBe("ok");
  });

  it("decodes double-encoded entities only one level", () => {
    expect(htmlToText("&amp;amp;")).toBe("&amp;");
  });

  it("keeps literal a < b after decoding", () => {
    expect(htmlToText("a &lt; b")).toBe("a < b");
  });

  it("handles null, undefined, and non-string input", () => {
    expect(htmlToText(null)).toBe("");
    expect(htmlToText(undefined)).toBe("");
    expect(htmlToText(42)).toBe("42");
  });

  it("preserve mode keeps preformatted spacing", () => {
    const pre = "<html><body><pre>SEC. 1.\n\n\n\n    (a) Text  here</pre></body></html>";
    expect(htmlToText(pre)).toBe("SEC. 1.\n\n\n\n    (a) Text  here");
  });

  it("paragraphs mode collapses 3+ newlines, including CRLF", () => {
    expect(htmlToText("a\n\n\n\nb", { whitespace: "paragraphs" })).toBe("a\n\nb");
    expect(htmlToText("a\r\n\r\n\r\nb", { whitespace: "paragraphs" })).toBe("a\n\nb");
  });

  it("collapse mode collapses all whitespace", () => {
    expect(htmlToText("<td>\n  Passed\n\t <b>vote</b> </td>", { whitespace: "collapse" })).toBe("Passed vote");
  });

  it("converting before slicing avoids partial tags/entities at the boundary", () => {
    const teaser = "x".repeat(295) + "<strong>&amp;tail</strong>";
    const out = htmlToText(teaser).slice(0, 300);
    expect(out).toBe("x".repeat(295) + "&tail");
    expect(out).not.toMatch(/[<>]/);
  });
});

describe("cleanHtml", () => {
  it("uses paragraph whitespace mode", () => {
    expect(cleanHtml("<p>One</p>\n\n\n<p>Two &amp; three</p>")).toBe("One\n\nTwo & three");
  });
});
