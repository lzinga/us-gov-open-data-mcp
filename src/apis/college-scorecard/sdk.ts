/**
 * College Scorecard SDK — typed API client for the U.S. Department of Education College Scorecard API.
 *
 * API docs: https://collegescorecard.ed.gov/data/documentation/
 * GitHub: https://github.com/RTICWDT/open-data-maker/blob/master/API.md
 * Requires DATA_GOV_API_KEY (same key used for FBI/GovInfo — get one at https://api.data.gov/signup).
 *
 * Usage:
 *   import { searchSchools, getSchoolById } from "us-gov-open-data-mcp/sdk/college-scorecard";
 *   const results = await searchSchools({ name: "MIT", fields: POPULAR_FIELDS });
 */

import { createClient } from "../../shared/client.js";

const api = createClient({
  baseUrl: "https://api.data.gov/ed/collegescorecard/v1",
  name: "college-scorecard",
  auth: { type: "query", envParams: { api_key: "DATA_GOV_API_KEY" } },
  rateLimit: { perSecond: 5, burst: 15 },
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours — data updates annually
  timeoutMs: 30_000,
});

// ─── Types ───────────────────────────────────────────────────────────

/** Scorecard Response. */
export interface ScorecardResponse {
  metadata: { page: number; total: number; per_page: number };
  results: ScorecardSchool[];
}

/** Scorecard School. */
export interface ScorecardSchool {
  id?: number;
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Commonly requested fields for College Scorecard queries. */
export const POPULAR_FIELDS = [
  "id",
  "school.name",
  "school.state",
  "school.city",
  "school.school_url",
  "school.ownership", // 1=public, 2=private nonprofit, 3=private for-profit
  "school.degrees_awarded.predominant", // 1=certificate, 2=associate, 3=bachelor's, 4=graduate
  "latest.admissions.admission_rate.overall",
  "latest.student.size",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.cost.avg_net_price.overall",
  "latest.aid.median_debt.completers.overall",
  "latest.aid.pell_grant_rate",
  "latest.completion.rate_suppressed.overall",
  "latest.earnings.10_yrs_after_entry.median",
  "latest.earnings.6_yrs_after_entry.median",
  "latest.student.demographics.race_ethnicity.white",
  "latest.student.demographics.race_ethnicity.black",
  "latest.student.demographics.race_ethnicity.hispanic",
].join(",");

/** School ownership types */
export const OWNERSHIP = {
  1: "Public",
  2: "Private nonprofit",
  3: "Private for-profit",
} as const;

/** Predominant degree types */
export const DEGREE_TYPES = {
  0: "Not classified",
  1: "Certificate",
  2: "Associate",
  3: "Bachelor's",
  4: "Graduate",
} as const;

/** State FIPS to abbreviation for filtering */
export const STATE_FIPS = {
  AL: 1, AK: 2, AZ: 4, AR: 5, CA: 6, CO: 8, CT: 9, DE: 10, DC: 11, FL: 12,
  GA: 13, HI: 15, ID: 16, IL: 17, IN: 18, IA: 19, KS: 20, KY: 21, LA: 22,
  ME: 23, MD: 24, MA: 25, MI: 26, MN: 27, MS: 28, MO: 29, MT: 30, NE: 31,
  NV: 32, NH: 33, NJ: 34, NM: 35, NY: 36, NC: 37, ND: 38, OH: 39, OK: 40,
  OR: 41, PA: 42, RI: 44, SC: 45, SD: 46, TN: 47, TX: 48, UT: 49, VT: 50,
  VA: 51, WA: 53, WV: 54, WI: 55, WY: 56,
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/** Search for schools by name, state, or other criteria. */
export async function searchSchools(opts: {
  name?: string;
  state?: string;
  ownership?: number;
  degreePredominant?: number;
  fields?: string;
  perPage?: number;
  page?: number;
  sort?: string;
}): Promise<ScorecardResponse> {
  const params: Record<string, string | number | undefined> = {
    _fields: opts.fields || POPULAR_FIELDS,
    per_page: opts.perPage || 20,
    page: opts.page || 0,
  };
  if (opts.name) params["school.name"] = opts.name;
  if (opts.state) params["school.state"] = opts.state;
  if (opts.ownership !== undefined) params["school.ownership"] = opts.ownership;
  if (opts.degreePredominant !== undefined) params["school.degrees_awarded.predominant"] = opts.degreePredominant;
  if (opts.sort) params.sort = opts.sort;

  return api.get<ScorecardResponse>("/schools.json", params);
}

/** Get a specific school by its College Scorecard ID. */
export async function getSchoolById(id: number, fields?: string): Promise<ScorecardResponse> {
  return api.get<ScorecardResponse>("/schools.json", {
    id,
    _fields: fields || POPULAR_FIELDS,
  });
}

/** Search for schools with custom field filters and ranges. */
export async function querySchools(params: Record<string, string | number | undefined>): Promise<ScorecardResponse> {
  if (!params._fields) params._fields = POPULAR_FIELDS;
  if (!params.per_page) params.per_page = 20;
  return api.get<ScorecardResponse>("/schools.json", params);
}

/** Get the most expensive schools. */
export async function getMostExpensive(opts?: {
  ownership?: number; perPage?: number;
}): Promise<ScorecardResponse> {
  return searchSchools({
    degreePredominant: 3, // bachelor's
    ownership: opts?.ownership,
    perPage: opts?.perPage || 20,
    sort: "latest.cost.tuition.out_of_state:desc",
  });
}

/** Get schools with the highest earnings after graduation. */
export async function getHighestEarners(opts?: {
  ownership?: number; perPage?: number;
}): Promise<ScorecardResponse> {
  return searchSchools({
    degreePredominant: 3,
    ownership: opts?.ownership,
    perPage: opts?.perPage || 20,
    sort: "latest.earnings.10_yrs_after_entry.median:desc",
  });
}

/** Get schools with the highest completion (graduation) rates. */
export async function getHighestGraduationRates(opts?: {
  state?: string; perPage?: number;
}): Promise<ScorecardResponse> {
  return searchSchools({
    degreePredominant: 3,
    state: opts?.state,
    perPage: opts?.perPage || 20,
    sort: "latest.completion.rate_suppressed.overall:desc",
  });
}

/**
 * Clear Cache.
 */
export function clearCache(): void { api.clearCache(); }
