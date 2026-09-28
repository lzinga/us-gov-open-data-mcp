/**
 * Computes the next release version for the Prepare Release workflow.
 *
 * Releases use CalVer YYYY.M.D (UTC date). Same-day suffixes such as
 * 2026.9.14-2 are never generated: SemVer treats them as prereleases that sort
 * *before* 2026.9.14, so npm and semver ranges would see the re-release as
 * older. A second release on the same day needs an explicit version, which
 * must be a plain X.Y.Z greater than every version already published to npm
 * or tagged in git.
 *
 * Usage:
 *   node scripts/release-version.mjs                            # today's CalVer
 *   VERSION_OVERRIDE=2026.9.15 node scripts/release-version.mjs
 *
 * Writes "version=<v>" to $GITHUB_OUTPUT when set, otherwise to stdout.
 */

import { execFileSync, execSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PLAIN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SEMVER = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/** CalVer for a date, in UTC: 2026-09-04 → "2026.9.4". */
export function calver(date) {
  return `${date.getUTCFullYear()}.${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
}

/** Parses a SemVer string (optional leading "v"); null if invalid. */
export function parseVersion(version) {
  const m = SEMVER.exec(String(version).trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), prerelease: m[4] ?? null };
}

function comparePrerelease(a, b) {
  const pa = a.split("."), pb = b.split(".");
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    const na = /^\d+$/.test(pa[i]), nb = /^\d+$/.test(pb[i]);
    if (na && nb) {
      const d = Number(pa[i]) - Number(pb[i]);
      if (d) return Math.sign(d);
    } else if (na !== nb) {
      return na ? -1 : 1;
    } else if (pa[i] !== pb[i]) {
      return pa[i] < pb[i] ? -1 : 1;
    }
  }
  return 0;
}

/** SemVer precedence: -1, 0 or 1. Build metadata is ignored. */
export function compareVersions(a, b) {
  const pa = parseVersion(a), pb = parseVersion(b);
  if (!pa || !pb) throw new Error(`Cannot compare "${a}" and "${b}".`);
  for (const k of ["major", "minor", "patch"]) {
    if (pa[k] !== pb[k]) return pa[k] < pb[k] ? -1 : 1;
  }
  if (pa.prerelease === pb.prerelease) return 0;
  if (pa.prerelease === null) return 1;
  if (pb.prerelease === null) return -1;
  return comparePrerelease(pa.prerelease, pb.prerelease);
}

/**
 * The version to release: the override if given, else today's CalVer.
 * Throws if it is not a plain X.Y.Z, already exists, or does not sort after
 * every existing version.
 *
 * @param {{ override?: string, existing: string[], now?: Date }} options
 * @returns {string}
 */
export function nextVersion({ override, existing, now = new Date() }) {
  const known = existing.map(v => String(v).trim().replace(/^v/, "")).filter(v => parseVersion(v));
  const latest = known.reduce((max, v) => (max === null || compareVersions(v, max) > 0 ? v : max), null);
  const explicit = Boolean(override && override.trim());
  const candidate = explicit ? override.trim().replace(/^v/, "") : calver(now);

  if (!PLAIN.test(candidate)) {
    throw new Error(`Invalid version "${candidate}": use X.Y.Z without a prerelease or build suffix.`);
  }
  if (known.some(v => compareVersions(v, candidate) === 0)) {
    throw new Error(explicit
      ? `Version ${candidate} already exists.`
      : `Version ${candidate} (today's CalVer) already exists. For another release today, run again with an explicit version greater than ${latest}.`);
  }
  if (latest && compareVersions(candidate, latest) <= 0) {
    throw new Error(`Version ${candidate} must be greater than the latest existing version ${latest}.`);
  }
  return candidate;
}

/** Versions from `npm view <pkg> versions --json` output (a string when there is only one). */
export function parseNpmVersions(output) {
  const parsed = JSON.parse(output.trim() || "[]");
  return Array.isArray(parsed) ? parsed : [parsed];
}

function run(cmd, args) {
  const opts = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] };
  // npm is a .cmd shim on Windows, which needs a shell; the arguments here are constants.
  return process.platform === "win32" ? execSync([cmd, ...args].join(" "), opts) : execFileSync(cmd, args, opts);
}

function publishedVersions(pkg) {
  try {
    return parseNpmVersions(run("npm", ["view", pkg, "versions", "--json"]));
  } catch (err) {
    if (/E404/.test(`${err.stdout ?? ""}${err.stderr ?? ""}`)) return []; // never published
    throw err;
  }
}

function gitTags() {
  return run("git", ["tag", "--list", "v*"]).split("\n").map(t => t.trim()).filter(Boolean);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { name } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const version = nextVersion({
      override: process.env.VERSION_OVERRIDE,
      existing: [...publishedVersions(name), ...gitTags()],
    });
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
    else process.stdout.write(`version=${version}\n`);
    console.log(`Release version: ${version}`);
  } catch (err) {
    console.log(`::error::${err.message}`);
    process.exit(1);
  }
}
