/**
 * NAEP (Nation's Report Card) SDK — typed API client for the NAEP Data Service API.
 *
 * API docs: https://www.nationsreportcard.gov/api_documentation.aspx
 * No API key required. Returns JSON.
 *
 * Usage:
 *   import { getScores, getAchievementLevels, compareAcrossYears } from "us-gov-open-data-mcp/sdk/naep";
 *   const scores = await getScores({ subject: "reading", grade: 4, year: "2022" });
 */

import { createClient } from "../client.js";

const api = createClient({
  baseUrl: "https://www.nationsreportcard.gov",
  name: "naep",
  rateLimit: { perSecond: 3, burst: 6 },
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours — NAEP data updates ~every 2 years
  timeoutMs: 30_000,
});

// ─── Types ───────────────────────────────────────────────────────────

export interface NaepResult {
  year: string;
  sample: string;
  cohort: string;
  jurisdiction: string;
  stattype: string;
  subject: string;
  grade: string;
  subscale: string;
  variable: string;
  varValue: string;
  varValueLabel: string;
  value: string;
  se: string;
  errorFlag: number;
  [key: string]: unknown;
}

export interface NaepResponse {
  status: number;
  result: NaepResult[];
}

export interface NaepGapResult extends NaepResult {
  focalValue: string;
  targetValue: string;
  gap: string;
  significance: string;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Subject + subscale codes verified against the NAEP Data Service API.
 * Use the short key (e.g. 'math') or any alias. The resolver handles variations.
 * Valid grades and latest assessment year shown per subject. */
export const SUBJECTS: Record<string, { code: string; subscale: string; label: string; grades: number[] }> = {
  reading:    { code: "reading",     subscale: "RRPCM", label: "Reading (composite)",                grades: [4, 8, 12] },   // Latest: 2024
  math:       { code: "mathematics", subscale: "MRPCM", label: "Mathematics (composite)",            grades: [4, 8] },       // Latest: 2024 (no grade 12)
  science:    { code: "science",     subscale: "SRPUV", label: "Science (overall)",                  grades: [4, 8, 12] },   // Latest: 4=2019, 8=2024, 12=2019
  writing:    { code: "writing",     subscale: "WRIRP", label: "Writing",                            grades: [4, 8, 12] },   // Latest: 4=2002, 8/12=2011
  civics:     { code: "civics",      subscale: "CIVRP", label: "Civics",                             grades: [4, 8, 12] },   // Latest: 4/12=2010, 8=2022
  history:    { code: "history",     subscale: "HRPCM", label: "U.S. History (composite)",           grades: [4, 8, 12] },   // Latest: 4/12=2010, 8=2022
  geography:  { code: "geography",   subscale: "GRPCM", label: "Geography (composite)",              grades: [4, 8, 12] },   // Latest: 4/12=2010, 8=2018
  economics:  { code: "economics",   subscale: "ERPCM", label: "Economics",                          grades: [12] },         // Latest: 2012
  tel:        { code: "tel",         subscale: "TRPUN", label: "Technology & Engineering Literacy",   grades: [8] },          // Latest: 2018
  music:      { code: "music",       subscale: "MUSRP", label: "Music",                              grades: [8] },          // Latest: 2016
};

/** Common variable codes */
export const VARIABLES: Record<string, string> = {
  TOTAL: "All students",
  GENDER: "Gender (Male/Female)",
  SDRACE: "Race/ethnicity (trend reporting)",
  SRACE10: "Race/ethnicity (2011 guidelines)",
  SLUNCH3: "School lunch eligibility (poverty proxy)",
  PARED: "Parental education level",
  SCHTYPE: "School type (public/nonpublic)",
  CHRTRPT: "Charter school status",
  UTOL4: "School location (city/suburb/town/rural)",
  CENSREG: "Census region",
  IEP: "Disability status (IEP/504)",
  LEP: "English language learner status",
};

/** Stat type codes */
export const STAT_TYPES: Record<string, string> = {
  "MN:MN": "Average scale score (mean)",
  "RP:RP": "Row percent",
  "ALC:BB": "% Below Basic (cumulative)",
  "ALC:AB": "% At or Above Basic (cumulative)",
  "ALC:AP": "% At or Above Proficient (cumulative)",
  "ALC:AD": "% At Advanced (cumulative)",
  "ALD:BA": "% At Basic (discrete)",
  "ALD:PR": "% At Proficient (discrete)",
  "ALD:AD": "% At Advanced (discrete)",
  "SD:SD": "Standard deviations",
  "PC:P1": "10th percentile score",
  "PC:P2": "25th percentile score",
  "PC:P5": "50th percentile score",
  "PC:P7": "75th percentile score",
  "PC:P9": "90th percentile score",
};

/** State jurisdiction codes */
export const JURISDICTIONS: Record<string, string> = {
  // National
  NP: "National public", NT: "National total", NR: "National private", NL: "Large city",
  // States
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  // DoDEA
  DS: "DoDEA", DD: "DoDEA/DDESS", DO: "DoDEA/DoDDS",
  // Districts (Trial Urban District Assessment - TUDA)
  XQ: "Albuquerque", XA: "Atlanta", XU: "Austin", XM: "Baltimore City",
  XB: "Boston", XT: "Charlotte", XC: "Chicago", XX: "Clark County (NV)",
  XV: "Cleveland", XS: "Dallas", XY: "Denver", XR: "Detroit",
  XW: "District of Columbia (DCPS)", XE: "Duval County (FL)", XZ: "Fort Worth (TX)",
  XF: "Fresno", XG: "Guilford County (NC)", XO: "Hillsborough County (FL)",
  XH: "Houston", XJ: "Jefferson County (KY)", XL: "Los Angeles",
  XI: "Miami-Dade", XK: "Milwaukee", XN: "New York City",
  XP: "Philadelphia", XD: "San Diego", YA: "Shelby County (TN)",
  // Territories
  AS: "American Samoa", GU: "Guam", PR: "Puerto Rico", VI: "Virgin Islands",
};

/** All subscales per subject from the NAEP API documentation. */
export const SUBSCALES: Record<string, Record<string, string>> = {
  reading: {
    RRPCM: "Composite scale",
    RRPS1: "Literary experience",
    RRPS2: "Gain information",
    RRPS3: "Perform a task",
    RRPS4: "Gain and use information",
  },
  mathematics: {
    MRPCM: "Composite scale (1990R2)",
    MRPS1: "Number properties and operations",
    MRPS2: "Measurement",
    MRPS3: "Geometry",
    MRPS4: "Data analysis, statistics, and probability",
    MRPS5: "Algebra",
    MWPCM: "Composite scale (2005R3)",
    MWPS1: "Number properties and operations (2005R3)",
    MWPS2: "Measurement and geometry (2005R3)",
    MWPS3: "Data analysis, statistics, and probability (2005R3)",
    MWPS4: "Algebra (2005R3)",
  },
  science: {
    SRPUV: "Overall science scale (2005R3)",
    SRPCM: "Composite scale (1990R2)",
    SRPS1: "Physical science",
    SRPS2: "Earth science",
    SRPS3: "Life science",
  },
  writing: { WRIRP: "Writing scale" },
  civics: { CIVRP: "Civics scale" },
  economics: {
    ERPCM: "Composite scale",
    ERPS1: "Market scale",
    ERPS2: "National scale",
    ERPS3: "International scale",
  },
  geography: {
    GRPCM: "Composite scale",
    GRPS1: "Space and place",
    GRPS2: "Environment and society",
    GRPS3: "Spatial dynamics",
  },
  history: {
    HRPCM: "Composite scale",
    HRPS1: "Democracy",
    HRPS2: "Cultures",
    HRPS3: "Technology",
    HRPS4: "World role",
  },
  tel: {
    TRPUN: "Overall scale",
    TRPP1: "Communicating and collaborating",
    TRPP2: "Developing solutions and achieving goals",
    TRPP3: "Understanding technological principles",
  },
  music: { MUSRP: "Music scale" },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function resolveSubject(subjectInput: string): { subject: string; subscale: string } {
  const lower = subjectInput.toLowerCase().trim();
  const entry = SUBJECTS[lower];
  if (entry) return { subject: entry.code, subscale: entry.subscale };

  // Comprehensive alias map for every reasonable variation
  const aliases: Record<string, string> = {
    // Mathematics
    mathematics: "math",
    maths: "math",
    "math composite": "math",
    "mathematics composite": "math",

    // Reading
    "reading composite": "reading",
    "english": "reading",
    "ela": "reading",
    "english language arts": "reading",
    "language arts": "reading",

    // Science
    "science overall": "science",
    "sciences": "science",

    // Writing
    "writing composition": "writing",

    // History
    "u.s. history": "history",
    "us history": "history",
    "american history": "history",
    "united states history": "history",

    // Civics
    "social studies": "civics",
    "government": "civics",
    "civic": "civics",
    "civics education": "civics",

    // Geography
    "geo": "geography",
    "world geography": "geography",

    // Economics
    "econ": "economics",
    "economy": "economics",

    // TEL
    "technology": "tel",
    "technology and engineering literacy": "tel",
    "technology literacy": "tel",
    "tech literacy": "tel",
    "engineering": "tel",
  };

  const aliasKey = aliases[lower];
  if (aliasKey && SUBJECTS[aliasKey]) {
    const resolved = SUBJECTS[aliasKey];
    return { subject: resolved.code, subscale: resolved.subscale };
  }

  // Last resort: check if input matches any SUBJECTS code directly (e.g. "mathematics" matches math.code)
  for (const [, val] of Object.entries(SUBJECTS)) {
    if (val.code.toLowerCase() === lower) {
      return { subject: val.code, subscale: val.subscale };
    }
  }

  // Allow raw codes but warn if subscale might be wrong
  return { subject: subjectInput, subscale: subjectInput.toUpperCase() };
}

// ─── Public API ──────────────────────────────────────────────────────

/** Get NAEP scores (mean, percentiles, or achievement levels) by subject, grade, jurisdiction, and variable.
 * Supports crosstab variables (e.g. 'SDRACE+GENDER'), categoryindex filtering, and StackType ordering. */
export async function getScores(opts: {
  subject: string;
  grade: number;
  variable?: string;
  jurisdiction?: string;
  stattype?: string;
  year?: string;
  subscale?: string;
  categoryindex?: string;
  stackType?: "ColThenRow" | "RowThenCol";
}): Promise<NaepResponse> {
  const resolved = resolveSubject(opts.subject);
  const params: Record<string, string> = {
    type: "data",
    subject: resolved.subject,
    grade: String(opts.grade),
    subscale: opts.subscale || resolved.subscale,
    variable: opts.variable || "TOTAL",
    jurisdiction: opts.jurisdiction || "NP",
    stattype: opts.stattype || "MN:MN",
    Year: opts.year || "Current",
  };
  if (opts.categoryindex) params.categoryindex = opts.categoryindex;
  if (opts.stackType) params.StackType = opts.stackType;
  return api.get<NaepResponse>("/Dataservice/GetAdhocData.aspx", params);
}

/** Get achievement level percentages (Below Basic, Basic, Proficient, Advanced). */
export async function getAchievementLevels(opts: {
  subject: string;
  grade: number;
  variable?: string;
  jurisdiction?: string;
  year?: string;
}): Promise<NaepResponse> {
  const resolved = resolveSubject(opts.subject);
  const params: Record<string, string> = {
    type: "data",
    subject: resolved.subject,
    grade: String(opts.grade),
    subscale: resolved.subscale,
    variable: opts.variable || "TOTAL",
    jurisdiction: opts.jurisdiction || "NP",
    stattype: "ALC:BB,ALC:AB,ALC:AP,ALC:AD",
    Year: opts.year || "Current",
  };
  return api.get<NaepResponse>("/Dataservice/GetAdhocData.aspx", params);
}

/** Compare scores across years (significance testing).
 * API type: sigacrossyear. Must have 2+ years comma-separated. */
export async function compareAcrossYears(opts: {
  subject: string;
  grade: number;
  years: string;
  variable?: string;
  jurisdiction?: string;
}): Promise<NaepResponse> {
  const resolved = resolveSubject(opts.subject);
  const params: Record<string, string> = {
    type: "sigacrossyear",
    subject: resolved.subject,
    grade: String(opts.grade),
    subscale: resolved.subscale,
    variable: opts.variable || "TOTAL",
    jurisdiction: opts.jurisdiction || "NP",
    stattype: "MN:MN",
    Year: opts.years,
  };
  return api.get<NaepResponse>("/Dataservice/GetAdhocData.aspx", params);
}

/** Compare scores across jurisdictions (states/districts).
 * API type: sigacrossjuris. Must have 2+ jurisdictions comma-separated. */
export async function compareAcrossJurisdictions(opts: {
  subject: string;
  grade: number;
  jurisdictions: string;
  variable?: string;
  year?: string;
}): Promise<NaepResponse> {
  const resolved = resolveSubject(opts.subject);
  const params: Record<string, string> = {
    type: "sigacrossjuris",
    subject: resolved.subject,
    grade: String(opts.grade),
    subscale: resolved.subscale,
    variable: opts.variable || "TOTAL",
    jurisdiction: opts.jurisdictions,
    stattype: "MN:MN",
    Year: opts.year || "Current",
  };
  return api.get<NaepResponse>("/Dataservice/GetAdhocData.aspx", params);
}

/** Compare scores across demographic groups (race, gender, etc.).
 * API type: sigacrossvalue. Variable must be non-TOTAL. Supports crosstab (e.g. 'SDRACE+GENDER'). */
export async function compareAcrossGroups(opts: {
  subject: string;
  grade: number;
  variable: string;
  jurisdiction?: string;
  year?: string;
  categoryindex?: string;
}): Promise<NaepResponse> {
  const resolved = resolveSubject(opts.subject);
  const params: Record<string, string> = {
    type: "sigacrossvalue",
    subject: resolved.subject,
    grade: String(opts.grade),
    subscale: resolved.subscale,
    variable: opts.variable,
    jurisdiction: opts.jurisdiction || "NP",
    stattype: "MN:MN",
    Year: opts.year || "Current",
  };
  if (opts.categoryindex) params.categoryindex = opts.categoryindex;
  return api.get<NaepResponse>("/Dataservice/GetAdhocData.aspx", params);
}

/** Gap between year changes across jurisdictions.
 * API type: gaponyearacrossjuris. Must have exactly 2 years and 2+ jurisdictions. */
export async function gapYearAcrossJurisdictions(opts: {
  subject: string;
  grade: number;
  years: string;
  jurisdictions: string;
  variable?: string;
}): Promise<NaepResponse> {
  const resolved = resolveSubject(opts.subject);
  const params: Record<string, string> = {
    type: "gaponyearacrossjuris",
    subject: resolved.subject,
    grade: String(opts.grade),
    subscale: resolved.subscale,
    variable: opts.variable || "TOTAL",
    jurisdiction: opts.jurisdictions,
    stattype: "MN:MN",
    Year: opts.years,
  };
  return api.get<NaepResponse>("/Dataservice/GetAdhocData.aspx", params);
}

/** Gap of demographic group differences across years.
 * API type: gaponvaracrossyear. Must have 2+ years and a non-TOTAL variable. */
export async function gapVariableAcrossYears(opts: {
  subject: string;
  grade: number;
  variable: string;
  years: string;
  jurisdiction?: string;
}): Promise<NaepResponse> {
  const resolved = resolveSubject(opts.subject);
  const params: Record<string, string> = {
    type: "gaponvaracrossyear",
    subject: resolved.subject,
    grade: String(opts.grade),
    subscale: resolved.subscale,
    variable: opts.variable,
    jurisdiction: opts.jurisdiction || "NP",
    stattype: "MN:MN",
    Year: opts.years,
  };
  return api.get<NaepResponse>("/Dataservice/GetAdhocData.aspx", params);
}

/** Gap of demographic group differences across jurisdictions.
 * API type: gaponvaracrossjuris. Must have 2+ jurisdictions and a non-TOTAL variable. */
export async function gapVariableAcrossJurisdictions(opts: {
  subject: string;
  grade: number;
  variable: string;
  jurisdictions: string;
  year?: string;
}): Promise<NaepResponse> {
  const resolved = resolveSubject(opts.subject);
  const params: Record<string, string> = {
    type: "gaponvaracrossjuris",
    subject: resolved.subject,
    grade: String(opts.grade),
    subscale: resolved.subscale,
    variable: opts.variable,
    jurisdiction: opts.jurisdictions,
    stattype: "MN:MN",
    Year: opts.year || "Current",
  };
  return api.get<NaepResponse>("/Dataservice/GetAdhocData.aspx", params);
}

/** List available independent variables for a subject and cohort/year.
 * API type: independentvariables. Useful for discovering what variables are available. */
export async function getAvailableVariables(opts: {
  subject: string;
  cohort: number;
  years: string;
}): Promise<NaepResponse> {
  const resolved = resolveSubject(opts.subject);
  const params: Record<string, string> = {
    type: "independentvariables",
    subject: resolved.subject,
    cohort: String(opts.cohort),
    Year: opts.years,
  };
  return api.get<NaepResponse>("/Dataservice/GetAdhocData.aspx", params);
}

export function clearCache(): void { api.clearCache(); }
