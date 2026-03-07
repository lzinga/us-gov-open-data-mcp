/**
 * FBI Crime Data Explorer (CDE) SDK — typed API client.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getAgenciesByState, getSummarizedCrime, getArrestData } from "us-gov-open-data-mcp/sdk/fbi";
 *
 * Requires DATA_GOV_API_KEY env var. Get one at https://api.data.gov/signup/
 * Base URL: https://api.usa.gov/crime/fbi/cde
 * Docs: https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.usa.gov/crime/fbi/cde",
  name: "fbi",
  auth: { type: "query", envParams: { API_KEY: "DATA_GOV_API_KEY" } },
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour — crime data updates infrequently
});

// ─── Reference Data ──────────────────────────────────────────────────

/** Summarized (UCR) offense codes for /summarized endpoints */
export const SUMMARIZED_OFFENSES = {
  V: "Violent Crime",
  P: "Property Crime",
  HOM: "Homicide",
  RPE: "Rape",
  ROB: "Robbery",
  ASS: "Aggravated Assault",
  BUR: "Burglary",
  LAR: "Larceny/Theft",
  MVT: "Motor Vehicle Theft",
  ARS: "Arson",
} as const;

/** Arrest offense codes (numeric) for /arrest endpoints */
export const ARREST_OFFENSES = {
  all: "All Offenses", "11": "Murder", "12": "Simple Assault", "20": "Rape",
  "23": "Larceny-Theft", "30": "Robbery", "50": "Aggravated Assault",
  "55": "Other Assaults", "60": "Burglary", "70": "Motor Vehicle Theft",
  "90": "Arson", "101": "Forgery/Counterfeiting", "102": "Fraud",
  "110": "Embezzlement", "140": "Vandalism", "141": "Weapons Violations",
  "142": "Sex Offenses", "143": "Drug Abuse - Grand Total",
  "150": "Drug Abuse Violations", "151": "Drug Sale - Opium/Cocaine",
  "152": "Drug Sale - Marijuana", "153": "Drug Sale - Synthetic",
  "154": "Drug Sale - Other", "155": "Drug Possession - Opium/Cocaine",
  "156": "Drug Possession - Marijuana", "157": "Drug Possession - Synthetic",
  "158": "Drug Possession - Other", "159": "Drug Sale Subtotal",
  "160": "Drug Possession Subtotal", "170": "Gambling Total",
  "171": "Bookmaking", "172": "Numbers/Lottery", "173": "Other Gambling",
  "180": "Offenses Against Family", "190": "DUI", "200": "Liquor Laws",
  "210": "Drunkenness", "220": "Disorderly Conduct", "230": "Vagrancy",
  "240": "Suspicion", "250": "Curfew/Loitering", "260": "Prostitution",
  "270": "All Other Offenses", "280": "Stolen Property", "290": "Runaways",
  "300": "Human Trafficking - Sex", "310": "Human Trafficking - Servitude",
  "330": "Negligent Manslaughter",
} as const;

/** Supplemental/Expanded Property offense codes */
export const SUPPLEMENTAL_OFFENSES = {
  NB: "Burglary", NL: "Larceny", NMVT: "Motor Vehicle Theft", NROB: "Robbery",
} as const;

/** Hate crime bias codes — complete list with all 34 queryable codes */
export const HATE_CRIME_BIAS_CODES = {
  // Race/Ethnicity/Ancestry
  all: "All Biases",
  "11": "Anti-White",
  "12": "Anti-Black or African American",
  "13": "Anti-American Indian or Alaska Native",
  "14": "Anti-Asian",
  "15": "Anti-Multiple Races, Group",
  "16": "Anti-Native Hawaiian or Other Pacific Islander",
  "31": "Anti-Arab",
  "32": "Anti-Hispanic or Latino",
  "33": "Anti-Other Race/Ethnicity/Ancestry",
  // Religion
  "21": "Anti-Jewish",
  "22": "Anti-Catholic",
  "23": "Anti-Protestant",
  "24": "Anti-Islamic (Muslim)",
  "25": "Anti-Other Religion",
  "26": "Anti-Multiple Religions, Group",
  "27": "Anti-Atheism/Agnosticism",
  "28": "Anti-Church of Jesus Christ",
  "29": "Anti-Jehovah's Witness",
  "81": "Anti-Eastern Orthodox (Russian, Greek, Other)",
  "82": "Anti-Other Christian",
  "83": "Anti-Buddhist",
  "84": "Anti-Hindu",
  "85": "Anti-Sikh",
  // Sexual Orientation
  "41": "Anti-Gay (Male)",
  "42": "Anti-Lesbian (Female)",
  "43": "Anti-Lesbian, Gay, Bisexual, or Transgender (Mixed Group)",
  "44": "Anti-Heterosexual",
  "45": "Anti-Bisexual",
  // Disability
  "51": "Anti-Physical Disability",
  "52": "Anti-Mental Disability",
  // Gender
  "61": "Anti-Male",
  "62": "Anti-Female",
  // Gender Identity
  "71": "Anti-Transgender",
  "72": "Anti-Gender Non-Conforming",
} as const;

/** NIBRS offense codes — complete list (71 codes from CDE Swagger) */
export const NIBRS_OFFENSES = {
  // Homicide
  "09A": "Murder/Nonnegligent Manslaughter", "09B": "Negligent Manslaughter", "09C": "Justifiable Homicide",
  // Kidnapping
  "100": "Kidnapping/Abduction",
  // Sex Offenses - Forcible
  "11A": "Rape", "11B": "Sodomy", "11C": "Sexual Assault With Object", "11D": "Fondling",
  // Robbery
  "120": "Robbery",
  // Assault
  "13A": "Aggravated Assault", "13B": "Simple Assault", "13C": "Intimidation",
  // Arson
  "200": "Arson",
  // Extortion
  "210": "Extortion/Blackmail",
  // Burglary
  "220": "Burglary/Breaking & Entering",
  // Larceny/Theft
  "23*": "Larceny/Theft (Aggregate)", "23A": "Pocket-picking", "23B": "Purse-snatching",
  "23C": "Shoplifting", "23D": "Theft From Building", "23E": "Theft From Coin Machine",
  "23F": "Theft From Motor Vehicle", "23G": "Theft of Motor Vehicle Parts", "23H": "All Other Larceny",
  // Motor Vehicle Theft
  "240": "Motor Vehicle Theft",
  // Counterfeiting
  "250": "Counterfeiting/Forgery",
  // Fraud
  "26A": "False Pretenses/Swindle", "26B": "Credit Card/ATM Fraud", "26C": "Impersonation",
  "26D": "Welfare Fraud", "26E": "Wire Fraud", "26F": "Identity Theft",
  "26G": "Hacking/Computer Invasion", "26H": "Money Laundering",
  // Embezzlement
  "270": "Embezzlement",
  // Stolen Property
  "280": "Stolen Property Offenses",
  // Vandalism
  "290": "Vandalism/Destruction of Property",
  // Immigration
  "30A": "Harboring Escapee/Concealing from Arrest", "30B": "Flight to Avoid Prosecution",
  "30C": "Flight to Avoid Deportation", "30D": "Re-entry After Deportation",
  // Drug Offenses
  "35A": "Drug/Narcotic Violations", "35B": "Drug Equipment Violations",
  // Sex Offenses - Non-Forcible
  "36A": "Incest", "36B": "Statutory Rape",
  // Sex Offenses (aggregate)
  "360": "Sex Offenses (Non-Forcible Aggregate)",
  // Pornography
  "370": "Pornography/Obscene Material",
  // Gambling
  "39A": "Betting/Wagering", "39B": "Operating/Promoting Gambling",
  "39C": "Gambling Equipment Violations", "39D": "Sports Tampering",
  // Prostitution
  "40A": "Prostitution", "40B": "Assisting/Promoting Prostitution", "40C": "Purchasing Prostitution",
  // Immigration Offenses
  "49A": "False Citizenship", "49B": "Smuggling Aliens", "49C": "Illegal Entry into the United States",
  // Bribery
  "510": "Bribery",
  // Weapons
  "520": "Weapon Law Violations", "521": "Violation of National Firearm Act",
  "522": "Weapons of Mass Destruction", "526": "Failure to Register as Sex Offender",
  // Federal Substance Offenses
  "58A": "Export Violations", "58B": "Import Violations",
  "61A": "Federal Liquor Offenses", "61B": "Federal Tobacco Offenses",
  // Espionage/Treason
  "101": "Treason", "103": "Espionage",
  // Miscellaneous
  "620": "Wildlife Trafficking",
  // Human Trafficking
  "64A": "Human Trafficking - Commercial Sex Acts", "64B": "Human Trafficking - Involuntary Servitude",
  // Animal Cruelty
  "720": "Animal Cruelty",
} as const;

/** LESDC chart types */
export const LESDC_CHART_TYPES = [
  "race", "demographics", "manner", "location", "employment",
  "occupation", "military", "totals", "duty", "exp", "expfollowing",
  "experience", "suffered", "prior", "investigation", "wellness",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────

/** Format MM-YYYY for date query params */
function mmYYYY(year: number, month = 1): string {
  return `${String(month).padStart(2, "0")}-${year}`;
}

// ─── Public API ──────────────────────────────────────────────────────

// ── 1. Agency Lookup ─────────────────────────────────────────────────

/** Get all law enforcement agencies in a state, grouped by county. */
export async function getAgenciesByState(state: string): Promise<unknown> {
  return api.get(`/agency/byStateAbbr/${state.toUpperCase()}`);
}

// ── 2. Summarized Crime (UCR) ────────────────────────────────────────

/**
 * Get summarized crime data (UCR) at national, state, or agency level.
 * Offenses: V (violent), P (property), HOM, RPE, ROB, ASS, BUR, LAR, MVT, ARS
 */
export async function getSummarizedCrime(opts: {
  level: "national" | "state" | "agency";
  offense: string;
  state?: string;
  ori?: string;
  fromYear?: number;
  toYear?: number;
}): Promise<unknown> {
  const from = mmYYYY(opts.fromYear ?? new Date().getFullYear() - 5);
  const to = mmYYYY(opts.toYear ?? new Date().getFullYear(), 12);

  let path: string;
  if (opts.level === "national") {
    path = `/summarized/national/${opts.offense}`;
  } else if (opts.level === "state" && opts.state) {
    path = `/summarized/state/${opts.state.toUpperCase()}/${opts.offense}`;
  } else if (opts.level === "agency" && opts.ori) {
    path = `/summarized/agency/${opts.ori}/${opts.offense}`;
  } else {
    throw new Error("State required for state-level, ORI required for agency-level");
  }

  return api.get(path, { from, to });
}

// ── 3. Arrest Data ───────────────────────────────────────────────────

/**
 * Get arrest data at national, state, or agency level.
 * CRITICAL: `type` param is required (counts or totals) — API returns empty without it.
 * Offense codes are numeric: 'all', '11' (murder), '20' (rape), '30' (robbery), etc.
 */
export async function getArrestData(opts: {
  level: "national" | "state" | "agency";
  offense: string;
  state?: string;
  ori?: string;
  type?: "counts" | "totals";
  fromYear?: number;
  toYear?: number;
}): Promise<unknown> {
  const from = mmYYYY(opts.fromYear ?? new Date().getFullYear() - 5);
  const to = mmYYYY(opts.toYear ?? new Date().getFullYear(), 12);
  const type = opts.type ?? "counts";

  let path: string;
  if (opts.level === "national") {
    path = `/arrest/national/${opts.offense}`;
  } else if (opts.level === "state" && opts.state) {
    path = `/arrest/state/${opts.state.toUpperCase()}/${opts.offense}`;
  } else if (opts.level === "agency" && opts.ori) {
    path = `/arrest/agency/${opts.ori}/${opts.offense}`;
  } else {
    throw new Error("State required for state-level, ORI required for agency-level");
  }

  return api.get(path, { type, from, to });
}

// ── 4. Expanded Homicide (SHR) ───────────────────────────────────────

/** Get Supplementary Homicide Report data (victim/offender demographics, weapons, circumstances). */
export async function getExpandedHomicide(opts: {
  level: "national" | "state" | "agency";
  state?: string;
  ori?: string;
  type?: "counts" | "totals";
  fromYear?: number;
  toYear?: number;
}): Promise<unknown> {
  const from = mmYYYY(opts.fromYear ?? new Date().getFullYear() - 5);
  const to = mmYYYY(opts.toYear ?? new Date().getFullYear(), 12);

  let path: string;
  if (opts.level === "national") path = `/shr/national`;
  else if (opts.level === "state" && opts.state) path = `/shr/state/${opts.state.toUpperCase()}`;
  else if (opts.level === "agency" && opts.ori) path = `/shr/agency/${opts.ori}`;
  else throw new Error("State required for state-level, ORI required for agency-level");

  return api.get(path, { type: opts.type ?? "counts", from, to });
}

// ── 5. Expanded Property (Supplemental) ──────────────────────────────

/** Get expanded property details. Offenses: NB (burglary), NL (larceny), NMVT, NROB */
export async function getExpandedProperty(opts: {
  level: "national" | "state" | "agency";
  offense: string;
  state?: string;
  ori?: string;
  type?: "counts" | "totals";
  fromYear?: number;
  toYear?: number;
}): Promise<unknown> {
  const from = mmYYYY(opts.fromYear ?? new Date().getFullYear() - 5);
  const to = mmYYYY(opts.toYear ?? new Date().getFullYear(), 12);

  let path: string;
  if (opts.level === "national") path = `/supplemental/national/${opts.offense}`;
  else if (opts.level === "state" && opts.state) path = `/supplemental/state/${opts.state.toUpperCase()}/${opts.offense}`;
  else if (opts.level === "agency" && opts.ori) path = `/supplemental/agency/${opts.ori}/${opts.offense}`;
  else throw new Error("State required for state-level, ORI required for agency-level");

  return api.get(path, { type: opts.type ?? "counts", from, to });
}

// ── 6. Hate Crime ────────────────────────────────────────────────────

/** Get hate crime data. Optionally filter by bias code. */
export async function getHateCrime(opts: {
  level: "national" | "state" | "agency";
  state?: string;
  ori?: string;
  bias?: string;
  type?: "counts" | "totals";
  fromYear?: number;
  toYear?: number;
}): Promise<unknown> {
  const from = mmYYYY(opts.fromYear ?? new Date().getFullYear() - 5);
  const to = mmYYYY(opts.toYear ?? new Date().getFullYear(), 12);
  const params: Record<string, string> = { from, to };
  if (opts.type) params.type = opts.type;

  let path: string;
  if (opts.level === "national") {
    path = opts.bias ? `/hate-crime/national/${opts.bias}` : `/hate-crime/national`;
    if (!opts.bias) params.type = params.type ?? "totals";
  } else if (opts.level === "state" && opts.state) {
    const st = opts.state.toUpperCase();
    path = opts.bias ? `/hate-crime/state/${st}/${opts.bias}` : `/hate-crime/state/${st}`;
  } else if (opts.level === "agency" && opts.ori) {
    path = opts.bias ? `/hate-crime/agency/${opts.ori}/${opts.bias}` : `/hate-crime/agency/${opts.ori}`;
  } else {
    throw new Error("State required for state-level, ORI required for agency-level");
  }

  return api.get(path, params);
}

// ── 7. Law Enforcement Employees (PE) ────────────────────────────────

/** Get law enforcement employee data. Date format: YYYY (not MM-YYYY). */
export async function getLawEnforcementEmployees(opts: {
  state?: string;
  ori?: string;
  fromYear?: number;
  toYear?: number;
}): Promise<unknown> {
  const from = String(opts.fromYear ?? new Date().getFullYear() - 5);
  const to = String(opts.toYear ?? new Date().getFullYear());

  let path: string;
  if (opts.ori && opts.state) path = `/pe/${opts.state.toUpperCase()}/${opts.ori}`;
  else if (opts.state) path = `/pe/${opts.state.toUpperCase()}`;
  else path = `/pe`;

  return api.get(path, { from, to });
}

// ── 8. LESDC (Law Enforcement Suicide Data) ──────────────────────────

/** Get Law Enforcement Suicide Data Collection. Chart types: race, demographics, manner, location, etc. */
export async function getLesdcData(opts: {
  chartType: string;
  year: number;
}): Promise<unknown> {
  return api.get(`/lesdc`, { chartType: opts.chartType, year: String(opts.year) });
}

// ── 9. Use of Force ──────────────────────────────────────────────────

/** Get federal Use of Force data by year. */
export async function getUseOfForceFederal(opts: {
  year: number;
  quarter?: number;
}): Promise<unknown> {
  return api.get(`/participation/national/uof-fed/federalByYear`, {
    year: String(opts.year), quarter: String(opts.quarter ?? 4),
  });
}

/** Get national Use of Force participation data. */
export async function getUseOfForceNational(opts?: {
  year?: number;
  quarter?: number;
}): Promise<unknown> {
  const params: Record<string, string> = {};
  if (opts?.year) params.year = String(opts.year);
  if (opts?.quarter) params.quarter = String(opts.quarter);
  return api.get(`/participation/national/uof/nationalByYear`, params);
}

/** Get state-level Use of Force participation. */
export async function getUseOfForceState(opts: {
  state: string;
  year: number;
  quarter?: number;
}): Promise<unknown> {
  return api.get(`/participation/state/${opts.state.toUpperCase()}/uof/states`, {
    year: String(opts.year), quarter: String(opts.quarter ?? 4),
  });
}

/** Get Use of Force incident reports. grp: A=All, F=Federal, S=State. spec: ORI or state abbr. */
export async function getUseOfForceReports(opts: {
  grp: string;
  spec: string;
  year: number;
  quarter?: number;
}): Promise<unknown> {
  return api.get(`/uof/reports/${opts.grp}/${opts.spec}`, {
    year: String(opts.year), quarter: String(opts.quarter ?? 4),
  });
}

// ── Cache Control ────────────────────────────────────────────────────

// ── 10. NIBRS (Incident-Based Reporting) ─────────────────────────────

/**
 * Get NIBRS data at national, state, or agency level.
 * Offense codes use NIBRS alphanumeric format: 13A, 09A, 23H, 120, etc.
 */
export async function getNibrsData(opts: {
  level: "national" | "state" | "agency";
  offense: string;
  state?: string;
  ori?: string;
  type?: "counts" | "totals";
  fromYear?: number;
  toYear?: number;
}): Promise<unknown> {
  const from = mmYYYY(opts.fromYear ?? new Date().getFullYear() - 5);
  const to = mmYYYY(opts.toYear ?? new Date().getFullYear(), 12);
  const type = opts.type ?? "counts";

  let path: string;
  if (opts.level === "national") path = `/nibrs/national/${opts.offense}`;
  else if (opts.level === "state" && opts.state) path = `/nibrs/state/${opts.state.toUpperCase()}/${opts.offense}`;
  else if (opts.level === "agency" && opts.ori) path = `/nibrs/agency/${opts.ori}/${opts.offense}`;
  else throw new Error("State required for state-level, ORI required for agency-level");

  return api.get(path, { type, from, to });
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
