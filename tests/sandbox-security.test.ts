/**
 * Sandbox security tests — validates the WASM sandbox blocks escape attempts.
 *
 * Ensures that LLM-generated scripts running in the QuickJS WASM sandbox
 * cannot access the filesystem, network, Node.js globals, or leak state
 * between executions. Also validates resource limits (timeout, memory, data size).
 */

import { describe, it, expect } from "vitest";
import { executeInSandbox } from "../src/shared/sandbox.js";

const SAMPLE_DATA = JSON.stringify({ value: 42 });

// ─── Filesystem / Module escape ──────────────────────────────────────

describe("Filesystem and module isolation", () => {
  it("require() is not available", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `console.log(typeof require);`);
    expect(result.stdout.trim()).toBe("undefined");
  });

  it("dynamic import() is not available", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `
      let worked = false;
      try { import("fs").then(() => { worked = true; }); } catch(e) {}
      console.log(worked);
    `);
    // Either errors or resolves but does nothing — fs must not be loaded
    expect(result.stdout).not.toContain("true");
  });

  it("cannot access process.env via globalThis", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `console.log(typeof globalThis.process);`);
    expect(result.stdout.trim()).toBe("undefined");
  });
});

// ─── Network escape ─────────────────────────────────────────────────

describe("Network isolation", () => {
  it("blocks fetch()", async () => {
    const result = await executeInSandbox(
      SAMPLE_DATA,
      `fetch("https://example.com").then(r => console.log(r));`,
    );
    expect(result.error).toBeDefined();
  });

  it("blocks XMLHttpRequest", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `const x = new XMLHttpRequest(); console.log(x);`);
    expect(result.error).toBeDefined();
  });

  it("blocks WebSocket", async () => {
    const result = await executeInSandbox(
      SAMPLE_DATA,
      `const ws = new WebSocket("ws://localhost"); console.log(ws);`,
    );
    expect(result.error).toBeDefined();
  });
});

// ─── Node.js globals ────────────────────────────────────────────────

describe("Node.js global isolation", () => {
  it("has no process global", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `console.log(typeof process);`);
    expect(result.stdout.trim()).toBe("undefined");
  });

  it("has no Buffer global", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `console.log(typeof Buffer);`);
    expect(result.stdout.trim()).toBe("undefined");
  });

  it("has no __dirname or __filename", async () => {
    const result = await executeInSandbox(
      SAMPLE_DATA,
      `console.log(typeof __dirname, typeof __filename);`,
    );
    expect(result.stdout.trim()).toBe("undefined undefined");
  });

  it("has no setTimeout or setInterval", async () => {
    const result = await executeInSandbox(
      SAMPLE_DATA,
      `console.log(typeof setTimeout, typeof setInterval);`,
    );
    expect(result.stdout.trim()).toBe("undefined undefined");
  });
});

// ─── State leakage between executions ───────────────────────────────

describe("Cross-execution isolation", () => {
  it("does not leak globals between executions", async () => {
    await executeInSandbox(SAMPLE_DATA, `globalThis.SECRET = "leaked";`);
    const result = await executeInSandbox(SAMPLE_DATA, `console.log(typeof globalThis.SECRET);`);
    expect(result.stdout.trim()).toBe("undefined");
  });

  it("does not leak DATA between executions", async () => {
    await executeInSandbox('{"secret":"s3cret"}', `console.log("ok");`);
    const result = await executeInSandbox('{"public":true}', `console.log(DATA);`);
    expect(result.stdout).not.toContain("s3cret");
    expect(result.stdout).toContain("public");
  });
});

// ─── Resource limits ────────────────────────────────────────────────

describe("Resource limits", () => {
  it("terminates infinite loops via timeout", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `while(true) {}`);
    expect(result.error).toBeDefined();
  }, 15_000);

  it("terminates memory bombs via memory limit", async () => {
    const result = await executeInSandbox(
      SAMPLE_DATA,
      `const a = []; while(true) a.push("x".repeat(1e6));`,
    );
    expect(result.error).toBeDefined();
  }, 15_000);

  it("rejects DATA exceeding 10 MB", async () => {
    const big = "x".repeat(11 * 1024 * 1024);
    const result = await executeInSandbox(big, `console.log("hi");`);
    expect(result.error).toContain("too large");
    expect(result.stdout).toBe("");
  });
});

// ─── Prototype pollution ────────────────────────────────────────────

describe("Prototype pollution containment", () => {
  it("sandbox prototype pollution does not affect host", async () => {
    await executeInSandbox(SAMPLE_DATA, `Object.prototype.pwned = true; console.log({}.pwned);`);
    expect((({}) as Record<string, unknown>).pwned).toBeUndefined();
  });

  it("sandbox Array.prototype pollution does not affect host", async () => {
    await executeInSandbox(SAMPLE_DATA, `Array.prototype.evil = () => "hacked"; console.log([].evil());`);
    expect(([] as unknown as Record<string, unknown>).evil).toBeUndefined();
  });
});

// ─── Output control ─────────────────────────────────────────────────

describe("Output control", () => {
  it("eval return value is not emitted as stdout", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `42`);
    expect(result.stdout).toBe("");
  });

  it("only console.log produces output", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `console.log("visible"); "invisible";`);
    expect(result.stdout).toBe("visible");
    expect(result.stdout).not.toContain("invisible");
  });
});

// ─── Prompt injection via DATA ──────────────────────────────────────

describe("Prompt injection resistance", () => {
  it("script-like content in DATA is not auto-executed", async () => {
    const malicious = `"; console.log("INJECTED"); "`;
    const result = await executeInSandbox(malicious, `console.log(DATA.length);`);
    expect(result.stdout).not.toContain("INJECTED");
    expect(result.stdout.trim()).toBe(String(malicious.length));
  });

  it("DATA with eval() calls does not execute them", async () => {
    const payload = `eval("console.log('ESCAPED')")`;
    const result = await executeInSandbox(payload, `console.log(typeof DATA);`);
    expect(result.stdout.trim()).toBe("string");
    expect(result.stdout).not.toContain("ESCAPED");
  });
});

// ─── Allowed functionality ──────────────────────────────────────────

describe("Allowed operations work correctly", () => {
  it("can parse JSON from DATA", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `console.log(JSON.parse(DATA).value);`);
    expect(result.stdout.trim()).toBe("42");
  });

  it("can use Math functions", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `console.log(Math.max(1, 2, 3));`);
    expect(result.stdout.trim()).toBe("3");
  });

  it("can use Array.map/filter/reduce", async () => {
    const data = JSON.stringify({ items: [1, 2, 3, 4, 5] });
    const result = await executeInSandbox(
      data,
      `const d = JSON.parse(DATA); console.log(d.items.filter(x => x > 2).reduce((a, b) => a + b, 0));`,
    );
    expect(result.stdout.trim()).toBe("12");
  });

  it("reports correct size metrics", async () => {
    const result = await executeInSandbox(SAMPLE_DATA, `console.log("ok");`);
    expect(result.beforeBytes).toBe(Buffer.byteLength(SAMPLE_DATA, "utf-8"));
    expect(result.afterBytes).toBe(Buffer.byteLength("ok", "utf-8"));
    expect(result.reductionPct).toBeGreaterThan(0);
  });
});
