/**
 * FEMA OpenFEMA SDK — typed API client for disaster declarations, grants, and assistance data.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getDisasterDeclarations, getHousingAssistance } from "us-gov-open-data-mcp/sdk/fema";
 *
 * No API key required.
 * Docs: https://www.fema.gov/about/openfema/api
 */

import { createClient } from "../../shared/client.js";
import { integerValue, odataString } from "../../shared/query-escape.js";
import { stateAs } from "../../shared/geo.js";

// ─── Client ──────────────────────────────────────────────────────────

// Paths carry the dataset version (/v2/..., /v3/...): OpenFEMA versions each dataset separately.
const api = createClient({
  baseUrl: "https://www.fema.gov/api/open",
  name: "fema",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour — disaster data updates periodically
});

// ─── Types ───────────────────────────────────────────────────────────

/** Disaster Declaration. */
export interface DisasterDeclaration {
  disasterNumber?: number;
  declarationDate?: string;
  disasterName?: string;
  incidentType?: string;
  declarationType?: string;
  state?: string;
  fipsStateCode?: string;
  fipsCountyCode?: string;
  designatedArea?: string;
  ihProgramDeclared?: boolean;
  iaProgramDeclared?: boolean;
  paProgramDeclared?: boolean;
  hmProgramDeclared?: boolean;
  incidentBeginDate?: string;
  incidentEndDate?: string;
  lastRefresh?: string;
  [key: string]: unknown;
}

/** Housing Assistance Record. */
export interface HousingAssistanceRecord {
  disasterNumber?: number;
  state?: string;
  county?: string;
  zipCode?: string;
  validRegistrations?: number;
  totalInspected?: number;
  totalDamage?: number;
  totalApprovedIhpAmount?: number;
  repairReplaceAmount?: number;
  rentalAmount?: number;
  otherNeedsAmount?: number;
  approvedForFemaAssistance?: number;
  [key: string]: unknown;
}

/** Public Assistance Record. */
export interface PublicAssistanceRecord {
  disasterNumber?: number;
  state?: string;
  applicantName?: string;
  county?: string;
  damageCategory?: string;
  projectAmount?: number;
  federalShareObligated?: number;
  obligatedDate?: string;
  projectTitle?: string;
  [key: string]: unknown;
}

/** Nfip Claim. */
export interface NfipClaim {
  state?: string;
  countyCode?: string;
  dateOfLoss?: string;
  amountPaidOnBuildingClaim?: number;
  amountPaidOnContentsClaim?: number;
  totalBuildingInsuranceCoverage?: number;
  floodZone?: string;
  yearOfLoss?: number;
  [key: string]: unknown;
}

/** Fema Region. */
export interface FemaRegion {
  regionNumber?: number;
  regionName?: string;
  regionAddress?: string;
  states?: string;
  [key: string]: unknown;
}

/** Fema List Response. */
// biome-ignore lint/correctness/noUnusedVariables: T is unused, but kept so existing FemaListResponse<X> annotations still compile.
export interface FemaListResponse<T> {
  metadata?: {
    count?: number;
    skip?: number;
    top?: number;
    entityName?: string;
  };
  [key: string]: unknown;
}

// ─── Datasets ────────────────────────────────────────────────────────

/** Available datasets with their OpenFEMA entity names and API versions. */
export const DATASETS = {
  disaster_declarations: {
    endpoint: "DisasterDeclarationsSummaries",
    version: "v2",
    name: "Disaster Declarations",
    description: "All federally declared disasters since 1953: major disasters, emergencies, fire management",
  },
  housing_owners: {
    endpoint: "HousingAssistanceOwners",
    version: "v2",
    name: "Housing Assistance (Owners)",
    description: "Individual Assistance for homeowners: inspections, damage severity, assistance amounts by county/zip",
  },
  housing_renters: {
    endpoint: "HousingAssistanceRenters",
    version: "v2",
    name: "Housing Assistance (Renters)",
    description: "Individual Assistance for renters: inspections, damage severity, assistance amounts by county/zip",
  },
  public_assistance: {
    endpoint: "PublicAssistanceGrantAwardActivities",
    version: "v2",
    name: "Public Assistance Awards",
    description: "PA project awards: applicant, county, damage category, federal share obligated",
  },
  public_assistance_details: {
    endpoint: "PublicAssistanceFundedProjectsDetails",
    version: "v2",
    name: "PA Funded Projects",
    description: "Detailed public assistance funded projects with damage categories and amounts",
  },
  nfip_claims: {
    endpoint: "NfipClaims",
    version: "v3",
    name: "NFIP Flood Insurance Claims",
    description: "National Flood Insurance Program claims: loss amounts, flood zones, damage details",
  },
  nfip_policies: {
    endpoint: "NfipPolicies",
    version: "v3",
    name: "NFIP Flood Insurance Policies",
    description: "National Flood Insurance Program policy transactions: coverage, premiums, locations",
  },
  hazard_mitigation: {
    endpoint: "HazardMitigationGrantProgramDisasterSummaries",
    version: "v3",
    name: "Hazard Mitigation Grants",
    description: "HMGP disaster-level financial summaries: obligations, project counts",
  },
  mission_assignments: {
    endpoint: "MissionAssignments",
    version: "v2",
    name: "Mission Assignments",
    description: "Work orders from FEMA to other federal agencies for disaster response (FY2013+)",
  },
  fema_regions: {
    endpoint: "FemaRegions",
    version: "v2",
    name: "FEMA Regions",
    description: "FEMA region boundaries, headquarters, and associated states",
  },
  registrations: {
    endpoint: "RegistrationIntakeIndividualsHouseholdPrograms",
    version: "v2",
    name: "IHP Registrations",
    description: "Registration and IHP data by city: call center, web, mobile registrations, eligible amounts",
  },
} as const;

/** Retired OpenFEMA entity names and the entities that replaced them. */
const RENAMED_ENTITIES: Record<string, string> = {
  FimaNfipClaims: "NfipClaims",
  FimaNfipPolicies: "NfipPolicies",
};

// ─── Helpers ─────────────────────────────────────────────────────────

function extractArray<T>(res: unknown, endpoint: string): T[] {
  if (typeof res === "object" && res !== null) {
    const obj = res as Record<string, unknown>;
    // OpenFEMA returns data in a key matching the endpoint name
    if (Array.isArray(obj[endpoint])) return obj[endpoint] as T[];
    // Fallback search
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && key !== "metadata") return obj[key] as T[];
    }
  }
  if (Array.isArray(res)) return res as T[];
  return [];
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search for disaster declarations. Supports OData-style filtering.
 */
export async function getDisasterDeclarations(opts?: {
  state?: string;
  year?: number;
  incidentType?: string;
  declarationType?: string;
  top?: number;
  skip?: number;
  orderBy?: string;
}): Promise<DisasterDeclaration[]> {
  const params: Record<string, string> = {
    $format: "json",
    $top: String(opts?.top ?? 50),
    $orderby: opts?.orderBy ?? "declarationDate desc",
  };
  if (opts?.skip) params.$skip = String(opts.skip);

  const filters: string[] = [];
  if (opts?.state) filters.push(`state eq ${odataString(stateAs(opts.state, "usps").toUpperCase())}`);
  if (opts?.year) {
    const year = integerValue(opts.year, "year");
    filters.push(`declarationDate ge '${year}-01-01T00:00:00.000z'`);
    filters.push(`declarationDate le '${year}-12-31T23:59:59.999z'`);
  }
  if (opts?.incidentType) filters.push(`incidentType eq ${odataString(opts.incidentType)}`);
  if (opts?.declarationType) filters.push(`declarationType eq ${odataString(opts.declarationType)}`);
  if (filters.length) params.$filter = filters.join(" and ");

  const res = await api.get("/v2/DisasterDeclarationsSummaries", params);
  return extractArray<DisasterDeclaration>(res, "DisasterDeclarationsSummaries");
}

/**
 * Get housing assistance data for homeowners by disaster/state/county.
 */
export async function getHousingAssistance(opts?: {
  disasterNumber?: number;
  state?: string;
  county?: string;
  top?: number;
  skip?: number;
}): Promise<HousingAssistanceRecord[]> {
  const params: Record<string, string> = {
    $format: "json",
    $top: String(opts?.top ?? 50),
    $orderby: "totalApprovedIhpAmount desc",
  };
  if (opts?.skip) params.$skip = String(opts.skip);

  const filters: string[] = [];
  if (opts?.disasterNumber) filters.push(`disasterNumber eq ${odataString(integerValue(opts.disasterNumber, "disaster_number"))}`);
  if (opts?.state) filters.push(`state eq ${odataString(stateAs(opts.state, "usps").toUpperCase())}`);
  if (opts?.county) filters.push(`county eq ${odataString(opts.county)}`);
  if (filters.length) params.$filter = filters.join(" and ");

  const res = await api.get("/v2/HousingAssistanceOwners", params);
  return extractArray<HousingAssistanceRecord>(res, "HousingAssistanceOwners");
}

/**
 * Get Public Assistance grant award activities.
 */
export async function getPublicAssistance(opts?: {
  disasterNumber?: number;
  state?: string;
  top?: number;
  skip?: number;
}): Promise<PublicAssistanceRecord[]> {
  const params: Record<string, string> = {
    $format: "json",
    $top: String(opts?.top ?? 50),
    $orderby: "obligatedDate desc",
  };
  if (opts?.skip) params.$skip = String(opts.skip);

  const filters: string[] = [];
  if (opts?.disasterNumber) filters.push(`disasterNumber eq ${odataString(integerValue(opts.disasterNumber, "disaster_number"))}`);
  if (opts?.state) filters.push(`state eq ${odataString(stateAs(opts.state, "usps").toUpperCase())}`);
  if (filters.length) params.$filter = filters.join(" and ");

  const res = await api.get("/v2/PublicAssistanceGrantAwardActivities", params);
  return extractArray<PublicAssistanceRecord>(res, "PublicAssistanceGrantAwardActivities");
}

/**
 * Get FEMA regions.
 */
export async function getFemaRegions(): Promise<FemaRegion[]> {
  const res = await api.get("/v2/FemaRegions", { $format: "json" });
  return extractArray<FemaRegion>(res, "FemaRegions");
}

/**
 * Latest current version of an OpenFEMA entity ("v3"), from the DataSets
 * catalog. Null when the catalog has no such entity; undefined when the
 * catalog could not be read.
 */
async function latestVersion(entity: string): Promise<string | null | undefined> {
  let res: { DataSets?: { version: number; depDate?: string | null }[] };
  try {
    res = await api.get("/v1/DataSets", {
      $format: "json",
      $select: "name,version,depDate",
      $filter: `name eq ${odataString(entity)}`,
      $orderby: "version desc",
    });
  } catch {
    return undefined;
  }
  const sets = res.DataSets ?? [];
  const current = sets.find(s => !s.depDate) ?? sets[0];
  return current ? `v${current.version}` : null;
}

/**
 * Resolve a dataset key (nfip_claims), entity name (NfipClaims) or
 * versioned entity (v1/IpawsArchivedAlerts) to its API path.
 */
export async function resolveDataset(dataset: string): Promise<{ path: string; entity: string }> {
  const known = (DATASETS as Record<string, { endpoint: string; version: string }>)[dataset.trim()];
  if (known) return { path: `/${known.version}/${known.endpoint}`, entity: known.endpoint };

  const m = /^(?:(v\d+)\/)?([A-Za-z][A-Za-z0-9]*)$/.exec(dataset.trim());
  if (!m) {
    throw new Error(
      `"${dataset}" is not a FEMA dataset. Use a key (${Object.keys(DATASETS).join(", ")}) ` +
      `or an OpenFEMA entity name such as "IpawsArchivedAlerts" or "v1/IpawsArchivedAlerts".`,
    );
  }
  const entity = RENAMED_ENTITIES[m[2]] ?? m[2];
  if (m[1]) return { path: `/${m[1]}/${entity}`, entity };

  const listed = Object.values(DATASETS).find(d => d.endpoint.toLowerCase() === entity.toLowerCase());
  if (listed) return { path: `/${listed.version}/${listed.endpoint}`, entity: listed.endpoint };

  const version = await latestVersion(entity);
  if (version === null) {
    throw new Error(`OpenFEMA has no dataset named "${entity}". Entity names are case-sensitive; see https://www.fema.gov/about/openfema/data-sets.`);
  }
  return { path: `/${version ?? "v2"}/${entity}`, entity };
}

/**
 * General-purpose query against any OpenFEMA dataset, at its current version.
 */
export async function queryDataset(opts: {
  dataset: string;
  filter?: string;
  select?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
}): Promise<unknown[]> {
  const { path, entity } = await resolveDataset(opts.dataset);
  const params: Record<string, string> = {
    $format: "json",
    $top: String(opts.top ?? 50),
  };
  if (opts.filter) params.$filter = opts.filter;
  if (opts.select) params.$select = opts.select;
  if (opts.orderBy) params.$orderby = opts.orderBy;
  if (opts.skip) params.$skip = String(opts.skip);

  const res = await api.get(path, params);
  return extractArray<unknown>(res, entity);
}

/** Clear the FEMA SDK cache. */
export function clearCache(): void {
  api.clearCache();
}

// ─── NFIP flood insurance claims ─────────────────────────────────────

/** One NFIP claim, with the paid amounts summed. */
export interface NfipClaimSummary {
  dateOfLoss: string | null;
  yearOfLoss: number | null;
  floodEvent: string | null;
  state: string | null;
  countyFips: string | null;
  zip: string | null;
  floodZone: string | null;
  primaryResidence: boolean | null;
  buildingDamage: number | null;
  contentsDamage: number | null;
  paidBuilding: number | null;
  paidContents: number | null;
  paidIcc: number | null;
  /** Building + contents + increased-cost-of-compliance payments. */
  totalPaid: number;
  buildingCoverage: number | null;
  contentsCoverage: number | null;
  waterDepthInches: number | null;
}

/** Storm-type words FEMA may or may not include: "Hurricane Ian", "2025-08-Erin-HU", "2025 July TS Chantal". */
const STORM_TYPE = /^(?:hurricane|tropical\s+(?:storm|depression|cyclone)|super\s*storm|typhoon|ts|td|hu)\s+/i;

/** Characters FEMA puts between the words of an event name. */
const WORD_BREAKS = [" ", "-", "/"];

/** The name to search for: whitespace tidied and a leading storm type dropped. */
function eventName(input: string): string {
  const typed = input.trim().replace(/\s+/g, " ");
  return typed.replace(STORM_TYPE, "") || typed;
}

/** True when floodEventFilter() matches `input` as a whole word: it names one word, once any storm type is dropped. */
export function isOneWordEvent(input: string): boolean {
  return !eventName(input).includes(" ");
}

/**
 * Clauses matching `word` only where it stands alone in the name: at either
 * end or next to a space, hyphen or slash. "Earl" then finds "Hurricane Earl"
 * but not "Early summer storms", and "Erin" finds "2025-08-Erin-HU".
 */
function wholeWordClauses(word: string): string[] {
  const q = odataString;
  return [
    `floodEvent eq ${q(word)}`,
    ...WORD_BREAKS.map(b => `startswith(floodEvent,${q(word + b)})`),
    ...WORD_BREAKS.map(b => `endswith(floodEvent,${q(b + word)})`),
    ...WORD_BREAKS.flatMap(before => WORD_BREAKS.map(after => `contains(floodEvent,${q(before + word + after)})`)),
  ];
}

/**
 * OData filter for a flood event name. OpenFEMA's contains() is
 * case-sensitive (and rejects tolower()), and FEMA writes names several ways,
 * so this drops a leading storm type and ORs the name as typed, in Title
 * Case, Sentence case and lower case, plus forms without spaces for names
 * like "2026-03-KonaStorm".
 *
 * A one-word name must match a whole word ("Earl" is not "Early summer
 * storms") unless `substring` is set; longer names match anywhere. A one-word
 * name has at most three forms, so the filter stays at 48 clauses or fewer,
 * well under OpenFEMA's limit (it rejects about 90).
 */
export function floodEventFilter(input: string, opts: { substring?: boolean } = {}): string {
  const name = eventName(input);
  const oneWord = !name.includes(" ");
  const wholeWord = oneWord && !opts.substring;
  const lower = name.toLowerCase();
  const title = lower.replace(/(^|[\s\-/("])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());
  const sentence = lower.charAt(0).toUpperCase() + lower.slice(1);
  // Inside other names, a word starting lower-case finds other storms ("rina"
  // in "Katrina", "ana" in "Indiana"). FEMA capitalizes each part of a
  // run-together name, so a one-word substring search skips those forms.
  const candidates = oneWord && opts.substring
    ? [name, sentence].filter(form => !/^\p{Ll}/u.test(form))
    : [name, title, sentence, lower];
  const forms = new Set<string>();
  for (const form of candidates) {
    forms.add(form);
    if (form.includes(" ")) forms.add(form.replaceAll(" ", ""));
  }
  const clauses = [...forms].flatMap(form => (wholeWord ? wholeWordClauses(form) : [`contains(floodEvent,${odataString(form)})`]));
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(" or ")})`;
}

/**
 * How a flood event name was matched: as a whole word; anywhere (names of
 * two or more words); or, for a one-word name that no event has as a whole
 * word, inside event names ("Kona" in "2026-03-KonaStorm").
 */
export type FloodEventMatch = "whole word" | "anywhere" | "within names";

const NFIP_FIELDS = [
  "dateOfLoss", "yearOfLoss", "floodEvent", "state", "countyCode", "reportedZipCode", "ratedFloodZone", "primaryResidenceIndicator",
  "buildingDamageAmount", "contentsDamageAmount", "netBuildingPaymentAmount", "netContentsPaymentAmount", "netIccPaymentAmount",
  "totalBuildingInsuranceCoverage", "totalContentsInsuranceCoverage", "waterDepth",
];

/**
 * National Flood Insurance Program claims (NfipClaims v3), filtered by
 * place, year and named flood event. `total` is the number of claims
 * matching the filters; `claims` holds up to `limit` of them.
 *
 * A one-word event name is matched as a whole word. When that finds nothing
 * and no event anywhere has the word, it is matched inside event names
 * instead, and `floodEventMatch` says so.
 */
export async function getNfipClaims(opts: {
  state?: string;
  county?: string;
  zip?: string;
  yearFrom?: number;
  yearTo?: number;
  floodEvent?: string;
  sortBy?: "date" | "paid";
  limit?: number;
} = {}): Promise<{ total: number; claims: NfipClaimSummary[]; floodEventMatch?: FloodEventMatch }> {
  const filters: string[] = [];
  if (opts.state) filters.push(`state eq ${odataString(stateAs(opts.state, "usps").toUpperCase())}`);
  if (opts.county) {
    if (!/^\d{5}$/.test(opts.county.trim())) throw new Error(`county must be a 5-digit FIPS code (e.g. "48201"), not "${opts.county}".`);
    filters.push(`countyCode eq ${odataString(opts.county.trim())}`);
  }
  if (opts.zip) filters.push(`reportedZipCode eq ${odataString(opts.zip.trim())}`);
  if (opts.yearFrom !== undefined) filters.push(`yearOfLoss ge ${integerValue(opts.yearFrom, "year_from")}`);
  if (opts.yearTo !== undefined) filters.push(`yearOfLoss le ${integerValue(opts.yearTo, "year_to")}`);

  type Page = { metadata?: { count?: number }; NfipClaims?: Record<string, unknown>[] };
  const query = (clauses: string[], select: string, top: number) => api.get<Page>("/v3/NfipClaims", {
    $format: "json",
    $select: select,
    $filter: clauses.length ? clauses.join(" and ") : undefined,
    $orderby: opts.sortBy === "paid" ? "netBuildingPaymentAmount desc" : "dateOfLoss desc",
    $top: String(top),
    $count: "true",
  });
  const count = (page: Page) => page.metadata?.count ?? page.NfipClaims?.length ?? 0;
  const claimsQuery = (eventClause?: string) =>
    query(eventClause ? [...filters, eventClause] : filters, NFIP_FIELDS.join(","), Math.min(opts.limit ?? 50, 1000));

  const event = opts.floodEvent?.trim();
  let floodEventMatch: FloodEventMatch | undefined;
  let res: Page;
  if (!event) {
    res = await claimsQuery();
  } else if (!isOneWordEvent(event)) {
    floodEventMatch = "anywhere";
    res = await claimsQuery(floodEventFilter(event));
  } else {
    floodEventMatch = "whole word";
    res = await claimsQuery(floodEventFilter(event));
    // Nothing as a whole word. If some event has the word elsewhere (outside
    // these place and year filters), the empty result is right; if none does,
    // FEMA may have run it into a longer name ("Kona" in "2026-03-KonaStorm").
    if (!count(res)) {
      const wordExists = filters.length > 0 && count(await query([floodEventFilter(event)], "floodEvent", 1)) > 0;
      if (!wordExists) {
        floodEventMatch = "within names";
        res = await claimsQuery(floodEventFilter(event, { substring: true }));
      }
    }
  }
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  const claims = (res.NfipClaims ?? []).map(r => {
    const paidBuilding = num(r.netBuildingPaymentAmount);
    const paidContents = num(r.netContentsPaymentAmount);
    const paidIcc = num(r.netIccPaymentAmount);
    return {
      dateOfLoss: r.dateOfLoss ? String(r.dateOfLoss).slice(0, 10) : null,
      yearOfLoss: num(r.yearOfLoss),
      floodEvent: (r.floodEvent as string | null) ?? null,
      state: (r.state as string | null) ?? null,
      countyFips: (r.countyCode as string | null) ?? null,
      zip: (r.reportedZipCode as string | null) ?? null,
      floodZone: (r.ratedFloodZone as string | null) ?? null,
      primaryResidence: typeof r.primaryResidenceIndicator === "boolean" ? r.primaryResidenceIndicator : null,
      buildingDamage: num(r.buildingDamageAmount),
      contentsDamage: num(r.contentsDamageAmount),
      paidBuilding,
      paidContents,
      paidIcc,
      totalPaid: Math.round(((paidBuilding ?? 0) + (paidContents ?? 0) + (paidIcc ?? 0)) * 100) / 100,
      buildingCoverage: num(r.totalBuildingInsuranceCoverage),
      contentsCoverage: num(r.totalContentsInsuranceCoverage),
      waterDepthInches: num(r.waterDepth),
    };
  });
  return { total: res.metadata?.count ?? claims.length, claims, ...(floodEventMatch ? { floodEventMatch } : {}) };
}
