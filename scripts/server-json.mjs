/**
 * Keeps server.json, the MCP Registry listing, in step with package.json.
 *
 *   node scripts/server-json.mjs          exit 1 unless server.json matches package.json
 *   node scripts/server-json.mjs --write  copy package.json's version into server.json
 *
 * The registry requires server.json's name to equal package.json's mcpName,
 * and the listed npm version must be the one just published.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Differences between server.json and package.json that would make the
 * registry reject or mislabel the listing. Empty when they agree.
 *
 * @param {any} server parsed server.json
 * @param {any} pkg parsed package.json
 * @returns {string[]}
 */
export function checkServerJson(server, pkg) {
  const problems = [];
  if (server.name !== pkg.mcpName) {
    problems.push(`server.json name "${server.name}" differs from package.json mcpName "${pkg.mcpName}"`);
  }
  if (server.version !== pkg.version) {
    problems.push(`server.json version ${server.version} differs from package.json version ${pkg.version}`);
  }
  const npm = (server.packages ?? []).filter(p => p.registryType === "npm");
  if (!npm.length) problems.push("server.json lists no npm package");
  for (const p of npm) {
    if (p.identifier !== pkg.name) problems.push(`server.json npm identifier "${p.identifier}" differs from package.json name "${pkg.name}"`);
    if (p.version !== pkg.version) problems.push(`server.json npm package version ${p.version} differs from package.json version ${pkg.version}`);
  }
  return problems;
}

/**
 * server.json with its version and npm package versions set to package.json's.
 *
 * @param {any} server parsed server.json
 * @param {any} pkg parsed package.json
 * @returns {any}
 */
export function syncServerJson(server, pkg) {
  return {
    ...server,
    version: pkg.version,
    packages: (server.packages ?? []).map(p => (p.registryType === "npm" ? { ...p, version: pkg.version } : p)),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const read = file => JSON.parse(readFileSync(file, "utf8"));
  const pkg = read("package.json");
  if (process.argv.includes("--write")) {
    writeFileSync("server.json", `${JSON.stringify(syncServerJson(read("server.json"), pkg), null, 2)}\n`);
    console.log(`server.json set to version ${pkg.version}`);
  }
  const problems = checkServerJson(read("server.json"), pkg);
  for (const p of problems) console.error(`::error::${p}`);
  if (problems.length) process.exit(1);
  console.log(`server.json matches package.json (${pkg.mcpName} ${pkg.version})`);
}
