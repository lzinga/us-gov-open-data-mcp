/**
 * Package smoke test: pack the package, install the tarball into a scratch
 * project, and check what a consumer actually gets.
 *
 * - the tarball ships the built entry points, and no stale or dead files
 * - the package root and the ./sdk, ./sdk/<module>, ./client and
 *   ./package.json exports import cleanly
 * - importing the root is side-effect free: it starts no server, writes
 *   nothing to stdout, and creates no cache directory
 * - the us-gov-open-data-mcp bin runs (--version, --list-modules --json)
 *
 * Usage: npm run test:package (needs network access for npm install).
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = process.cwd();
const pkg = JSON.parse(readFileSync(join(repo, "package.json"), "utf-8"));
const work = mkdtempSync(join(tmpdir(), "govdata-pack-"));
const app = join(work, "app");
const cacheHome = join(work, "cache-home");
const isWindows = process.platform === "win32";
let failures = 0;

function run(cmd, args, opts = {}) {
  // npm/npx are .cmd shims on Windows and need a shell; quote arguments with spaces for it.
  // cmd.exe has no reliable escape for a double quote, so refuse arguments containing one.
  const shell = isWindows && (cmd === "npm" || cmd === "npx");
  if (shell && args.some(a => a.includes('"'))) throw new Error(`package-smoke: cannot pass a double quote to ${cmd} on Windows`);
  const quoted = shell ? args.map(a => (/\s/.test(a) ? `"${a}"` : a)) : args;
  const res = spawnSync(shell ? [cmd, ...quoted].join(" ") : cmd, shell ? [] : quoted, {
    cwd: opts.cwd ?? repo,
    env: { ...process.env, ...opts.env },
    encoding: "utf-8",
    shell,
    timeout: opts.timeoutMs ?? 300_000,
  });
  if (opts.check !== false && res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed (${res.status ?? res.signal}):\n${res.stdout}\n${res.stderr}`);
  }
  return res;
}

function check(label, ok, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

try {
  // 1. Pack a fresh build.
  run("npm", ["run", "build"]);
  const packed = JSON.parse(run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", work]).stdout);
  const { filename, files } = packed[0];
  const paths = new Set(files.map(f => f.path));
  for (const required of ["package.json", "README.md", "LICENSE", "dist/server.js", "dist/apis/index.js", "dist/apis/fred/sdk.js", "dist/shared/client.js"]) {
    check(`tarball contains ${required}`, paths.has(required));
  }
  const unexpected = [...paths].filter(p => p.startsWith("dist/sdk/") || p.startsWith("src/") || p.startsWith("tests/") || p === ".env");
  check("tarball has no dead or source files", unexpected.length === 0, unexpected.slice(0, 5).join(", "));

  // 2. Install it into a scratch project.
  mkdirSync(app);
  writeFileSync(join(app, "package.json"), JSON.stringify({ name: "govdata-package-smoke", private: true, type: "module" }));
  run("npm", ["install", join(work, filename), "--no-audit", "--no-fund", "--loglevel=error"], { cwd: app });

  const node = (script, env = {}) => run(process.execPath, ["--input-type=module", "-e", script], {
    cwd: app,
    env: { XDG_CACHE_HOME: cacheHome, ...env },
    check: false,
    timeoutMs: 30_000,
  });

  // 3. The root import is the SDK barrel and has no side effects.
  const root = node(`
    const sdk = await import("${pkg.name}");
    console.log(JSON.stringify({ namespaces: Object.keys(sdk).length, fred: typeof sdk.fred?.getObservations }));
  `);
  const rootOut = root.status === 0 ? JSON.parse(root.stdout.trim()) : null;
  // A started stdio server would log its startup warnings to stderr (and exit on stdin EOF).
  check("root import starts no server (exits, nothing on stderr)", root.status === 0 && root.stderr.trim() === "", root.stderr.trim().slice(0, 200));
  check("root import exposes the module namespaces", rootOut?.namespaces >= 40 && rootOut?.fred === "function", JSON.stringify(rootOut));
  check("root import writes nothing else to stdout", root.stdout.trim().split("\n").length === 1);
  check("root import creates no cache directory", !existsSync(cacheHome));

  // 4. Subpath exports.
  const subpaths = node(`
    const [barrel, fred, client, meta] = await Promise.all([
      import("${pkg.name}/sdk"),
      import("${pkg.name}/sdk/fred"),
      import("${pkg.name}/client"),
      import("${pkg.name}/package.json", { with: { type: "json" } }),
    ]);
    console.log(JSON.stringify({
      barrel: typeof barrel.treasury, fred: typeof fred.getObservations,
      client: typeof client.createClient, version: meta.default.version,
    }));
  `);
  const subOut = subpaths.status === 0 ? JSON.parse(subpaths.stdout.trim()) : null;
  check("./sdk, ./sdk/fred, ./client and ./package.json import",
    subOut?.barrel === "object" && subOut?.fred === "function" && subOut?.client === "function" && subOut?.version === pkg.version,
    subpaths.status === 0 ? JSON.stringify(subOut) : subpaths.stderr.trim().slice(0, 300));

  // 5. The bin.
  const bin = (args) => run("npx", ["--no-install", pkg.name, ...args], { cwd: app, env: { XDG_CACHE_HOME: cacheHome }, check: false, timeoutMs: 60_000 });
  const version = bin(["--version"]);
  check("bin --version prints the package version", version.status === 0 && version.stdout.trim() === pkg.version, version.stdout.trim() || version.stderr.trim());
  const list = bin(["--list-modules", "--json"]);
  let modules = [];
  try { modules = JSON.parse(list.stdout); } catch { /* reported below */ }
  check("bin --list-modules --json lists every module", list.status === 0 && modules.length >= 40, `${modules.length} modules`);
} catch (err) {
  console.error(err.message);
  failures++;
} finally {
  rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

if (failures) {
  console.error(`\n${failures} package check(s) failed.`);
  process.exit(1);
}
console.log("\nPackage smoke test passed.");
