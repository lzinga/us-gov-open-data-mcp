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

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.census.gov/data",
  name: "census",
  auth: { type: "query", key: "key", envVar: "CENSUS_API_KEY" },
  rateLimit: { perSecond: 3, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour — Census data updates annually
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

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
