/**
 * Census SDK — typed API client for the U.S. Census Bureau Data API.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { queryCensus, searchVariables } from "us-gov-open-data-mcp/sdk/census";
 *
 *   const data = await queryCensus("2023/acs/acs1", "NAME,B01001_001E", "state:*");
 *   console.log(data.headers, data.rows);
 *
 * Requires CENSUS_API_KEY env var. Get one at https://api.census.gov/data/key_signup.html
 */

import { createClient } from "../../shared/client.js";
import { resolveState } from "../../shared/geo.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.census.gov/data",
  name: "census",
  auth: { type: "query", envParams: { key: "CENSUS_API_KEY" } },
  rateLimit: { perSecond: 3, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour — Census data updates annually
  // A query that matches no geography comes back as an empty 204, not JSON.
  emptyBodyAsNull: true,
});

// ─── Types ───────────────────────────────────────────────────────────

/** Transformed Census query result: first row becomes headers, rest becomes rows. */
export interface CensusQueryResult {
  headers: string[];
  rows: string[][];
}

/** Census Variable. */
export interface CensusVariable {
  label?: string;
  concept?: string;
  predicateType?: string;
}

/** Census Variable Match. */
export interface CensusVariableMatch {
  id: string;
  label: string;
  concept: string;
}

/** Census Dataset. */
export interface CensusDataset {
  path: string;
  name: string;
  description: string;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Commonly used Census API variable codes. */
export const commonVariables = {
  NAME: "Geographic area name",
  B01001_001E: "Total population",
  B01002_001E: "Median age",
  B02001_002E: "White alone population",
  B02001_003E: "Black/African American alone",
  B03003_003E: "Hispanic/Latino population",
  B19013_001E: "Median household income",
  B19001_001E: "Household income distribution (total)",
  B19301_001E: "Per capita income",
  B25077_001E: "Median home value (owner-occupied)",
  B25064_001E: "Median gross rent",
  B25003_001E: "Housing tenure (total occupied)",
  B25003_002E: "Owner-occupied housing units",
  B25003_003E: "Renter-occupied housing units",
  B17001_002E: "Population below poverty level",
  B15003_022E: "Bachelor's degree",
  B15003_023E: "Master's degree",
  B15003_025E: "Doctorate degree",
  B23025_002E: "In labor force",
  B23025_005E: "Unemployed",
} as const;

/** Datasets. */
export const datasets: CensusDataset[] = [
  { path: "2023/acs/acs1", name: "ACS 1-Year (2023)", description: "American Community Survey 1-year estimates — larger areas only" },
  { path: "2023/acs/acs5", name: "ACS 5-Year (2023)", description: "American Community Survey 5-year estimates — all geographies" },
  { path: "2022/acs/acs1", name: "ACS 1-Year (2022)", description: "ACS 1-year 2022" },
  { path: "2020/dec/pl", name: "Decennial 2020 PL", description: "2020 Census redistricting data" },
  { path: "2020/dec/dhc", name: "Decennial 2020 DHC", description: "2020 Census demographic and housing characteristics" },
  { path: "2010/dec/sf1", name: "Decennial 2010 SF1", description: "2010 Census Summary File 1" },
  { path: "2023/pep/population", name: "Population Estimates (2023)", description: "Annual population estimates" },
  { path: "2017/ecnbasic", name: "Economic Census (2017)", description: "Economic Census basic data" },
];

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Query the Census Bureau Data API.
 * The raw API returns a 2D string array; this transforms it into { headers, rows }.
 */
export async function queryCensus(
  dataset: string,
  variables: string,
  forGeo: string,
  inGeo?: string,
  extra?: Record<string, string>,
): Promise<CensusQueryResult> {
  const norm = dataset.startsWith("/") ? dataset : `/${dataset}`;
  const params: Record<string, string> = { get: variables, for: forGeo };
  if (inGeo) params.in = inGeo;
  if (extra) Object.assign(params, extra);

  const raw = await api.get<string[][]>(norm, params);
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("census: empty response — no data returned");
  }
  return { headers: raw[0], rows: raw.slice(1) };
}

/**
 * Search for Census variable names/codes by keyword within a dataset.
 * Fetches the dataset's variables.json and filters locally.
 */
export async function searchVariables(
  dataset: string,
  keyword: string,
  maxResults = 20,
): Promise<CensusVariableMatch[]> {
  const norm = dataset.startsWith("/") ? dataset : `/${dataset}`;
  const data = await api.get<{ variables: Record<string, CensusVariable> }>(`${norm}/variables.json`);

  const kw = keyword.toLowerCase();
  const matches: CensusVariableMatch[] = [];
  for (const [id, info] of Object.entries(data.variables)) {
    const label = info.label || "";
    const concept = info.concept || "";
    if (
      label.toLowerCase().includes(kw) ||
      concept.toLowerCase().includes(kw) ||
      id.toLowerCase().includes(kw)
    ) {
      matches.push({ id, label, concept });
      if (matches.length >= maxResults) break;
    }
  }
  return matches;
}

// ─── Place profile ───────────────────────────────────────────────────

/** ACS 5-year detailed-table variables behind a place profile (stable across years). */
const PROFILE_VARIABLES = [
  "B01003_001E", // total population
  "B19013_001E", // median household income
  "B01002_001E", // median age
  "B17001_001E", "B17001_002E", // poverty universe, below poverty
  "B25077_001E", // median home value
  "B25064_001E", // median gross rent
  "B23025_003E", "B23025_005E", // civilian labor force, unemployed
  "B15003_001E", "B15003_022E", "B15003_023E", "B15003_024E", "B15003_025E", // 25+, bachelor's … doctorate
] as const;

/** An area's key ACS 5-year indicators. */
export interface PlaceProfile {
  name: string;
  geography: "state" | "county" | "place" | "zcta";
  fips: string;
  year: number;
  population: number | null;
  medianHouseholdIncome: number | null;
  medianAge: number | null;
  povertyRatePct: number | null;
  unemploymentRatePct: number | null;
  medianHomeValue: number | null;
  medianGrossRent: number | null;
  bachelorsOrHigherPct: number | null;
  /** Caveats, e.g. a top-coded median ("$2,000,000 or more"). */
  notes?: string[];
}

/**
 * Latest ACS 5-year release: year Y is published in December of Y+1, so
 * before December the newest is two years back.
 */
export function latestAcs5Year(now = new Date()): number {
  return now.getUTCMonth() === 11 ? now.getUTCFullYear() - 1 : now.getUTCFullYear() - 2;
}

const baseName = (s: string) => s.toLowerCase().split(",")[0]
  .replace(/\s+(city|town|village|borough|cdp|municipality|county|parish|census area|city and borough)$/, "").trim();

/** Resolve a name or FIPS code within a state against the Census list of that geography. */
async function resolveWithin(year: number, level: "county" | "place", input: string, state: { fips: string; name: string }): Promise<{ code: string; name: string }> {
  const stateFips = state.fips;
  const digits = level === "county" ? 3 : 5;
  const raw = input.trim();
  if (new RegExp(`^\\d{${digits}}$`).test(raw)) return { code: raw, name: raw };
  if (level === "county" && /^\d{5}$/.test(raw)) return { code: raw.slice(2), name: raw };
  const list = await queryCensus(`${year}/acs/acs5`, "NAME", `${level}:*`, `state:${stateFips}`);
  const want = baseName(raw);
  const matches = list.rows.filter(r => baseName(r[0]) === want);
  // Several places can share a name (e.g. a city and a CDP): prefer the incorporated one.
  const best = matches.find(r => / (city|town|village|borough)\b/i.test(r[0])) ?? matches[0];
  if (!best) {
    const close = list.rows.filter(r => r[0].toLowerCase().includes(want)).slice(0, 5).map(r => r[0]);
    throw new Error(`No ${level} named "${input}" in ${state.name}.${close.length ? ` Did you mean: ${close.join("; ")}?` : ""}`);
  }
  return { code: best[best.length - 1], name: best[0] };
}

/**
 * Key ACS 5-year indicators for a state, county, city/town (place) or ZIP
 * code area (ZCTA): population, income, age, poverty, unemployment, housing
 * costs and education.
 */
export async function getPlaceProfile(opts: {
  state?: string;
  county?: string;
  place?: string;
  zcta?: string;
  year?: number;
}): Promise<PlaceProfile> {
  const year = opts.year ?? latestAcs5Year();
  let forGeo: string;
  let inGeo: string | undefined;
  let geography: PlaceProfile["geography"];
  let fips: string;
  if (opts.zcta) {
    if (!/^\d{5}$/.test(opts.zcta.trim())) throw new Error(`zcta must be a 5-digit ZIP code, not "${opts.zcta}".`);
    forGeo = `zip code tabulation area:${opts.zcta.trim()}`;
    geography = "zcta";
    fips = opts.zcta.trim();
  } else {
    if (!opts.state) throw new Error("Give a state (and optionally a county or place), or a zcta.");
    const state = resolveState(opts.state);
    if (opts.place) {
      const place = await resolveWithin(year, "place", opts.place, state);
      forGeo = `place:${place.code}`;
      inGeo = `state:${state.fips}`;
      geography = "place";
      fips = `${state.fips}${place.code}`;
    } else if (opts.county) {
      const county = await resolveWithin(year, "county", opts.county, state);
      forGeo = `county:${county.code}`;
      inGeo = `state:${state.fips}`;
      geography = "county";
      fips = `${state.fips}${county.code}`;
    } else {
      forGeo = `state:${state.fips}`;
      geography = "state";
      fips = state.fips;
    }
  }

  const res = await queryCensus(`${year}/acs/acs5`, ["NAME", ...PROFILE_VARIABLES].join(","), forGeo, inGeo);
  const row = res.rows[0];
  if (!row) throw new Error(`No ACS ${year} 5-year data for ${forGeo}${inGeo ? ` in ${inGeo}` : ""}.`);
  const v = (code: string): number | null => {
    const raw = row[res.headers.indexOf(code)];
    const n = Number(raw);
    // The Census API marks unavailable estimates with large negative sentinels (e.g. -666666666).
    return raw === undefined || raw === null || raw === "" || !Number.isFinite(n) || n < -1_000_000 ? null : n;
  };
  const pct = (num: number | null, den: number | null) => (num === null || !den ? null : Math.round((num / den) * 1000) / 10);
  const bachelorsPlus = ["B15003_022E", "B15003_023E", "B15003_024E", "B15003_025E"].map(v);
  // ACS reports medians above its top category as that category's floor plus one.
  const notes: string[] = [];
  if (v("B25077_001E") === 2_000_001) notes.push("medianHomeValue is top-coded: $2,000,000 or more");
  const rent = v("B25064_001E");
  if (rent !== null && [2001, 3501, 4001].includes(rent)) notes.push(`medianGrossRent is top-coded: $${(rent - 1).toLocaleString("en-US")} or more`);
  return {
    name: row[0],
    geography,
    fips,
    year,
    population: v("B01003_001E"),
    medianHouseholdIncome: v("B19013_001E"),
    medianAge: v("B01002_001E"),
    povertyRatePct: pct(v("B17001_002E"), v("B17001_001E")),
    unemploymentRatePct: pct(v("B23025_005E"), v("B23025_003E")),
    medianHomeValue: v("B25077_001E"),
    medianGrossRent: v("B25064_001E"),
    bachelorsOrHigherPct: bachelorsPlus.some(x => x === null) ? null : pct(bachelorsPlus.reduce((a, b) => a! + b!, 0), v("B15003_001E")),
    ...(notes.length ? { notes } : {}),
  };
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
