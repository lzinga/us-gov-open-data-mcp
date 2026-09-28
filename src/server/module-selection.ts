/**
 * Which modules the server loads.
 *
 * - `--modules fred,bls` / `MODULES`: modules by name.
 * - `--domains economy,health` / `DOMAINS`: every module in those domains.
 *   When both are given, the selection is their union. With neither, all
 *   modules are loaded.
 * - `--hide-unconfigured` / `HIDE_UNCONFIGURED=1`: after selecting, drop
 *   modules whose required API key isn't set. Optional-key modules stay.
 *
 * Unknown module or domain names are errors, not silently ignored, so a typo
 * can't quietly load a different set of tools than intended.
 */

import { DOMAINS, authEnvVars, requiresKey, type ApiModule } from "../shared/types.js";

export interface ModuleSelection {
  modules?: string;
  domains?: string;
  hideUnconfigured?: boolean;
}

export interface SelectionResult {
  active: ApiModule[];
  /** Selected modules dropped by hideUnconfigured, with their missing env vars. */
  hidden: { name: string; missing: string[] }[];
}

const list = (s: string | undefined) => (s ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);

/** Apply a selection to the discovered modules. Throws with a helpful message on bad input. */
export function selectModules(
  all: ApiModule[],
  sel: ModuleSelection,
  env: NodeJS.ProcessEnv = process.env,
): SelectionResult {
  const wantedModules = list(sel.modules);
  const wantedDomains = list(sel.domains);

  const byName = new Map(all.map(m => [m.name.toLowerCase(), m]));
  const unknownModules = wantedModules.filter(n => !byName.has(n));
  if (unknownModules.length) {
    throw new Error(
      `Unknown module${unknownModules.length > 1 ? "s" : ""}: ${unknownModules.join(", ")}. ` +
      `Available: ${all.map(m => m.name).join(", ")}`,
    );
  }
  const knownDomains = new Set<string>(DOMAINS);
  const unknownDomains = wantedDomains.filter(d => !knownDomains.has(d));
  if (unknownDomains.length) {
    throw new Error(
      `Unknown domain${unknownDomains.length > 1 ? "s" : ""}: ${unknownDomains.join(", ")}. ` +
      `Available: ${DOMAINS.join(", ")}`,
    );
  }

  let selected = all;
  if (wantedModules.length || wantedDomains.length) {
    const names = new Set(wantedModules);
    const domains = new Set(wantedDomains);
    selected = all.filter(m => names.has(m.name.toLowerCase()) || m.domains.some(d => domains.has(d)));
  }

  const hidden: SelectionResult["hidden"] = [];
  if (sel.hideUnconfigured) {
    selected = selected.filter(m => {
      if (!m.auth || !requiresKey(m)) return true;
      const missing = authEnvVars(m.auth).filter(v => !env[v]);
      if (!missing.length) return true;
      hidden.push({ name: m.name, missing });
      return false;
    });
  }

  if (!selected.length) {
    throw new Error(
      hidden.length
        ? `No modules left to load: every selected module needs a key that isn't set (${hidden.map(h => `${h.name}: ${h.missing.join(", ")}`).join("; ")}).`
        : "No modules matched the selection.",
    );
  }
  return { active: selected, hidden };
}
