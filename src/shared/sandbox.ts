/**
 * WASM-sandboxed JavaScript executor for code mode.
 *
 * Runs LLM-generated processing scripts against raw tool output in a QuickJS
 * WASM sandbox. The sandbox has NO filesystem or network access — only DATA
 * (the tool's response as a string) and console.log() for output.
 *
 * Usage:
 *   import { executeInSandbox } from "./sandbox.js";
 *   const result = await executeInSandbox(rawJsonString, userScript);
 *   // result.stdout contains only what the script console.log()'d
 *
 * The QuickJS WASM module is loaded once and reused across calls.
 * Each execution gets a fresh context (no state leakage between calls).
 */

import { getQuickJS } from "quickjs-emscripten";
import type { QuickJSWASMModule } from "quickjs-emscripten";

// ─── Singleton ───────────────────────────────────────────────────────

let _quickJS: QuickJSWASMModule | null = null;

/** Load QuickJS once, reuse across all executions. */
async function getRuntime(): Promise<QuickJSWASMModule> {
  if (!_quickJS) _quickJS = await getQuickJS();
  return _quickJS;
}

// ─── Types ───────────────────────────────────────────────────────────

export interface SandboxResult {
  /** Script's console.log() output (at most MAX_OUTPUT_CHARS). */
  stdout: string;
  /** Size of the input data in bytes. */
  beforeBytes: number;
  /** Size of the script output in bytes. */
  afterBytes: number;
  /** Context reduction percentage (0-100). */
  reductionPct: number;
  /** Script error message, if execution failed. */
  error?: string;
  /** True when the script was stopped for exceeding the output limit. */
  outputLimitExceeded?: boolean;
}

// ─── Configuration ───────────────────────────────────────────────────

/** Max script execution time in milliseconds. */
const TIMEOUT_MS = 10_000;

/** Max DATA size we'll inject into the sandbox (10MB). */
const MAX_DATA_BYTES = 10 * 1024 * 1024;

/**
 * Max captured console.log output (characters). Output is accumulated in the
 * host process, outside the VM's memory limit, so it needs its own cap.
 */
export const MAX_OUTPUT_CHARS = 256 * 1024;

/**
 * console.log implemented inside the VM: values are stringified under the
 * VM's memory limit and truncated to the remaining budget before crossing
 * into the host, so the host never receives an oversized string.
 */
const CONSOLE_BOOTSTRAP = `(function () {
  var room = globalThis.__room, emit = globalThis.__emit, overflow = globalThis.__overflow;
  delete globalThis.__room; delete globalThis.__emit; delete globalThis.__overflow;
  function fmt(v) {
    if (typeof v === "string") return v;
    try { var s = JSON.stringify(v); return s === undefined ? String(v) : s; }
    catch (e) { return String(v); }
  }
  globalThis.console = {
    log: function () {
      var left = room();
      if (left <= 0) { overflow(); return; }
      var s = Array.prototype.map.call(arguments, fmt).join(" ");
      if (s.length > left) { emit(s.slice(0, left)); overflow(); return; }
      emit(s);
    }
  };
})();`;

// ─── Executor ────────────────────────────────────────────────────────

/**
 * Execute a JavaScript script in a WASM sandbox with DATA injected.
 *
 * The script can:
 *   - Read `DATA` (string — the raw tool response)
 *   - Use `JSON.parse(DATA)` to parse it
 *   - Use `console.log(...)` to produce output
 *   - Use standard JS: loops, map/filter/reduce, string ops, Math, etc.
 *
 * The script CANNOT:
 *   - Access the filesystem
 *   - Make network requests
 *   - Import modules
 *   - Access Node.js APIs
 *   - Leak state between calls
 *
 * @param data - Raw tool response string (injected as `DATA` global)
 * @param script - JavaScript code to execute
 * @returns SandboxResult with stdout and size metrics
 */
export async function executeInSandbox(data: string, script: string): Promise<SandboxResult> {
  const beforeBytes = Buffer.byteLength(data, "utf-8");

  // Guard against huge payloads
  if (beforeBytes > MAX_DATA_BYTES) {
    return {
      stdout: "",
      beforeBytes,
      afterBytes: 0,
      reductionPct: 0,
      error: `DATA too large: ${(beforeBytes / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_DATA_BYTES / 1024 / 1024}MB limit.`,
    };
  }

  const qjs = await getRuntime();
  const runtime = qjs.newRuntime();

  // Interrupt on timeout, or as soon as the output budget is exhausted.
  const deadline = Date.now() + TIMEOUT_MS;
  let outputLimitExceeded = false;
  runtime.setInterruptHandler(() => outputLimitExceeded || Date.now() > deadline);

  // Memory limit: 64MB (generous for JSON processing)
  runtime.setMemoryLimit(64 * 1024 * 1024);

  const vm = runtime.newContext();

  try {
    // ─── Inject DATA global ────────────────────────────────────────
    const dataHandle = vm.newString(data);
    vm.setProp(vm.global, "DATA", dataHandle);
    dataHandle.dispose();

    // ─── console.log → stdout (bounded) ───────────────────────────
    let stdout = "";
    const hostFns = {
      __room: vm.newFunction("__room", () => vm.newNumber(MAX_OUTPUT_CHARS - stdout.length)),
      __emit: vm.newFunction("__emit", chunk => {
        stdout += vm.getString(chunk) + "\n";
        if (stdout.length >= MAX_OUTPUT_CHARS) outputLimitExceeded = true;
      }),
      __overflow: vm.newFunction("__overflow", () => { outputLimitExceeded = true; }),
    };
    for (const [name, fn] of Object.entries(hostFns)) {
      vm.setProp(vm.global, name, fn);
      fn.dispose();
    }
    const bootstrap = vm.evalCode(CONSOLE_BOOTSTRAP);
    if (bootstrap.error) {
      bootstrap.error.dispose();
      throw new Error("Failed to initialize sandbox console");
    }
    bootstrap.value.dispose();

    // ─── Execute script ────────────────────────────────────────────
    const result = vm.evalCode(script);

    if (outputLimitExceeded) {
      if (result.error) result.error.dispose();
      else result.value.dispose();
      const captured = stdout.slice(0, MAX_OUTPUT_CHARS).trimEnd();
      const afterBytes = Buffer.byteLength(captured, "utf-8");
      return {
        stdout: captured,
        beforeBytes,
        afterBytes,
        reductionPct: beforeBytes > 0 ? Math.max(0, (1 - afterBytes / beforeBytes) * 100) : 0,
        outputLimitExceeded: true,
        error:
          `Output limit exceeded: console.log output reached ${MAX_OUTPUT_CHARS / 1024}KB and the script was stopped. ` +
          "Aggregate, filter, or slice the data so the script prints less.",
      };
    }

    if (result.error) {
      const errDump = vm.dump(result.error);
      result.error.dispose();
      const errMsg = typeof errDump === "object" ? JSON.stringify(errDump) : String(errDump);
      return {
        stdout: "",
        beforeBytes,
        afterBytes: 0,
        reductionPct: 0,
        error: errMsg,
      };
    }

    result.value.dispose();

    // ─── Compute metrics ───────────────────────────────────────────
    const trimmed = stdout.trimEnd();
    const afterBytes = Buffer.byteLength(trimmed, "utf-8");
    const reductionPct = beforeBytes > 0 ? (1 - afterBytes / beforeBytes) * 100 : 0;

    return {
      stdout: trimmed,
      beforeBytes,
      afterBytes,
      reductionPct: Math.max(0, reductionPct),
    };
  } finally {
    vm.dispose();
    runtime.dispose();
  }
}
