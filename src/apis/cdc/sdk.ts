/**
 * CDC Open Data SDK — health statistics from data.cdc.gov (Socrata SODA API).
 *
 * API docs: https://dev.socrata.com/foundry/data.cdc.gov/
 * No auth required (optional app token for higher rate limits).
 * Rate limit: 1,000 req/hour without token, 20x with token.
 *
 * Usage:
 *   import { queryDataset, getLeadingCausesOfDeath } from "us-gov-open-data-mcp/sdk/cdc";
 *   const data = await getLeadingCausesOfDeath({ state: "New York", year: 2021 });
 */

import { createClient } from "../../shared/client.js";
import { integerValue, soqlContains, soqlString } from "../../shared/query-escape.js";
import { stateAs } from "../../shared/geo.js";

const api = createClient({
  baseUrl: "https://data.cdc.gov/resource",
  name: "cdc",
  rateLimit: { perSecond: 2, burst: 5 },
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours — CDC data updates slowly
});

// ─── Dataset IDs ─────────────────────────────────────────────────────

/** Available datasets with Socrata endpoint IDs. */
export const DATASETS = {
  leading_death: { id: "bi63-dtpu", name: "Leading Causes of Death", description: "U.S. leading causes of death by state and year (1999–2017, final; no newer release on data.cdc.gov)" },
  life_expectancy: { id: "w9j2-ggv5", name: "Life Expectancy", description: "Life expectancy at birth by race (All Races, Black, White) and sex (1900–2018)" },
  mortality_rates: { id: "489q-934x", name: "Provisional Mortality Rates", description: "Quarterly age-adjusted death rates by cause, sex, and state (2020–present)" },
  places_county: { id: "swc5-untb", name: "PLACES: County Health", description: "County-level health indicators: obesity, diabetes, smoking, depression, sleep, etc. (BRFSS-based)" },
  places_city: { id: "dxpw-cm5u", name: "PLACES: City Health", description: "City-level health indicators: obesity, diabetes, smoking, depression, sleep, etc. (BRFSS-based)" },
  covid_cases: { id: "pwn4-m3yp", name: "COVID-19 Cases & Deaths (archived)", description: "COVID-19 weekly cases and deaths by state, archived in 2023 after national case reporting ended; current COVID-19 deaths are in weekly_deaths" },
  covid_conditions: { id: "hk9y-quqm", name: "COVID-19 Conditions", description: "COVID-19 deaths by contributing condition, age group, and state" },
  weekly_deaths: { id: "r8kw-7aab", name: "Weekly Death Surveillance", description: "Provisional weekly death counts by state: COVID-19, pneumonia, influenza, total deaths (updated weekly, 2020–present)" },
  disability: { id: "s2qv-b27b", name: "Disability Prevalence", description: "Disability status and types by state: mobility, cognitive, hearing, vision, self-care (BRFSS)" },
  weekly_deaths_by_cause: { id: "muzy-jte6", name: "Weekly Deaths by Cause", description: "Weekly deaths by state and cause: heart disease, cancer, diabetes, stroke, COVID, respiratory (2020–2023)" },
  drug_overdose_state: { id: "xbxb-epbu", name: "Drug Poisoning Mortality by State", description: "Drug poisoning/overdose death rates by state, sex, race, and age (1999–2016)" },
  drug_overdose_provisional: { id: "xkb8-kh2a", name: "Provisional Drug Overdose Deaths", description: "VSRR provisional 12-month-ending drug overdose death counts by state and drug (2015–present, monthly)" },
  life_expectancy_state: { id: "it4f-frdc", name: "State Life Expectancy by Sex", description: "Life expectancy at birth by state and sex (2021; also 2018–2020)" },
  nutrition_obesity: { id: "hn4x-zwk7", name: "Nutrition, Physical Activity & Obesity", description: "Adult obesity, physical inactivity, and fruit/vegetable consumption by state from BRFSS" },
  death_rates_historical: { id: "6rkc-nb2q", name: "Historical Death Rates by Cause", description: "Age-adjusted death rates for major causes (heart disease, cancer, stroke, etc.) since 1900" },
  birth_indicators: { id: "76vv-a7x8", name: "Quarterly Birth Indicators", description: "Provisional quarterly birth rates, teen births, preterm births, cesarean rates by race/ethnicity" },
} as const;

// ─── Types ───────────────────────────────────────────────────────────

/** Cdc Record. */
export interface CdcRecord { [key: string]: string | number | null; }

// ─── Public API ──────────────────────────────────────────────────────

/** Generic Socrata SODA query against any CDC dataset. */
export async function queryDataset(datasetId: string, opts: {
  where?: string;    // SODA $where clause: "year = '2021' AND state = 'New York'"
  select?: string;   // SODA $select: "year, state, deaths"
  group?: string;    // SODA $group: "year, state"
  order?: string;    // SODA $order: "year DESC"
  limit?: number;    // max rows (default 1000)
} = {}): Promise<CdcRecord[]> {
  return api.get<CdcRecord[]>(`/${datasetId}.json`, {
    "$where": opts.where,
    "$select": opts.select,
    "$group": opts.group,
    "$order": opts.order,
    "$limit": opts.limit ?? 1000,
  });
}

/** Leading causes of death by state/year. */
export async function getLeadingCausesOfDeath(opts?: {
  state?: string; year?: number; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  if (opts?.state) clauses.push(`state = ${soqlString(stateAs(opts.state, "name"))}`);
  if (opts?.year) clauses.push(`year = ${soqlString(integerValue(opts.year, "year"))}`);
  return queryDataset(DATASETS.leading_death.id, {
    where: clauses.length ? clauses.join(" AND ") : undefined,
    order: "deaths DESC",
    limit: opts?.limit ?? 200,
  });
}

/** Life expectancy at birth by race and sex (dataset w9j2-ggv5, 1900–2018). */
export async function getLifeExpectancy(opts?: {
  year?: number; race?: string; sex?: string; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  if (opts?.year) clauses.push(`year = ${soqlString(integerValue(opts.year, "year"))}`);
  if (opts?.race) clauses.push(`race = ${soqlString(opts.race)}`);
  if (opts?.sex) clauses.push(`sex = ${soqlString(opts.sex)}`);
  return queryDataset(DATASETS.life_expectancy.id, {
    where: clauses.length ? clauses.join(" AND ") : undefined,
    order: "year DESC",
    limit: opts?.limit ?? 200,
  });
}

/** State life expectancy releases; each year is its own dataset with its own field names. */
const STATE_LIFE_EXPECTANCY: Record<number, { id: string; stateField: string; valueField: string }> = {
  2018: { id: "a5a8-jsrq", stateField: "state", valueField: "leb" },
  2019: { id: "ncvk-7amm", stateField: "state", valueField: "leb" },
  2020: { id: "ss2j-8ajj", stateField: "state", valueField: "le" },
  2021: { id: "it4f-frdc", stateField: "area", valueField: "leb" },
};
export const STATE_LIFE_EXPECTANCY_YEARS = Object.keys(STATE_LIFE_EXPECTANCY).map(Number);

/** Life expectancy at birth by state and sex (2018–2021; default the latest), highest first. */
export async function getStateLifeExpectancy(opts: {
  state?: string; year?: number; sex?: "Total" | "Male" | "Female";
} = {}): Promise<{ year: number; state: string; sex: string; lifeExpectancy: number | null; standardError: number | null }[]> {
  const year = opts.year ?? Math.max(...STATE_LIFE_EXPECTANCY_YEARS);
  const ds = STATE_LIFE_EXPECTANCY[year];
  if (!ds) throw new Error(`State life expectancy is available for ${STATE_LIFE_EXPECTANCY_YEARS.join(", ")}, not ${year}.`);
  const clauses: string[] = [];
  if (opts.state) clauses.push(`${ds.stateField} = ${soqlString(stateAs(opts.state, "name"))}`);
  if (opts.sex) clauses.push(`sex = ${soqlString(opts.sex)}`);
  const rows = await queryDataset(ds.id, { where: clauses.length ? clauses.join(" AND ") : undefined, limit: 500 });
  const num = (v: unknown) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
  return rows
    .map(r => ({ year, state: String(r[ds.stateField]), sex: String(r.sex), lifeExpectancy: num(r[ds.valueField]), standardError: num(r.se) }))
    .sort((a, b) => (b.lifeExpectancy ?? -1) - (a.lifeExpectancy ?? -1));
}

/** Provisional mortality rates by cause, sex, and state (dataset 489q-934x, quarterly, 2020–present). */
export async function getMortalityRates(opts?: {
  quarter?: string; cause?: string; rateType?: string; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  if (opts?.quarter) clauses.push(`year_and_quarter = ${soqlString(opts.quarter)}`);
  if (opts?.cause) clauses.push(`cause_of_death = ${soqlString(opts.cause)}`);
  if (opts?.rateType) clauses.push(`rate_type = ${soqlString(opts.rateType)}`);
  else clauses.push(`rate_type = 'Age-adjusted'`);
  clauses.push(`time_period = '12 months ending with quarter'`);
  return queryDataset(DATASETS.mortality_rates.id, {
    where: clauses.join(" AND "),
    order: "year_and_quarter DESC",
    limit: opts?.limit ?? 200,
  });
}

/** PLACES county-level health indicators (obesity, diabetes, smoking, depression, etc.). */
export async function getPlacesHealth(opts?: {
  state?: string; measure?: string; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  if (opts?.state) clauses.push(`stateabbr = ${soqlString(stateAs(opts.state, "usps").toUpperCase())}`);
  if (opts?.measure) clauses.push(`measureid = ${soqlString(opts.measure.toUpperCase())}`);
  return queryDataset(DATASETS.places_county.id, {
    where: clauses.length ? clauses.join(" AND ") : undefined,
    select: "stateabbr, statedesc, locationname, measureid, short_question_text, data_value, data_value_type, totalpopulation, category",
    order: "data_value DESC",
    limit: opts?.limit ?? 200,
  });
}

/** PLACES city-level health indicators (obesity, diabetes, smoking, depression, etc.). */
export async function getPlacesCityHealth(opts?: {
  state?: string; measure?: string; city?: string; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  if (opts?.state) clauses.push(`stateabbr = ${soqlString(stateAs(opts.state, "usps").toUpperCase())}`);
  if (opts?.measure) {
    // The measure names a column (e.g. obesity_crudeprev), so only allow identifier characters.
    if (!/^[a-z0-9]+$/i.test(opts.measure)) throw new Error(`Invalid PLACES measure "${opts.measure}"`);
    clauses.push(`${opts.measure.toLowerCase()}_crudeprev IS NOT NULL`);
  }
  if (opts?.city) clauses.push(`upper(placename) LIKE ${soqlContains(opts.city.toUpperCase())}`);
  return queryDataset(DATASETS.places_city.id, {
    where: clauses.length ? clauses.join(" AND ") : undefined,
    order: "stateabbr, placename",
    limit: opts?.limit ?? 200,
  });
}

/** COVID-19 weekly cases and deaths by state. */
export async function getCovidData(opts?: {
  state?: string; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  if (opts?.state) clauses.push(`state = ${soqlString(stateAs(opts.state, "usps").toUpperCase())}`);
  return queryDataset(DATASETS.covid_cases.id, {
    where: clauses.length ? clauses.join(" AND ") : undefined,
    order: "date_updated DESC",
    limit: opts?.limit ?? 200,
  });
}

/** Weekly provisional death counts by state — COVID, pneumonia, influenza, total. Updated weekly. */
export async function getWeeklyDeaths(opts?: {
  state?: string; year?: number; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  clauses.push(`group = 'By Week'`);
  if (opts?.state) clauses.push(`state = ${soqlString(stateAs(opts.state, "name"))}`);
  if (opts?.year) clauses.push(`year = ${soqlString(integerValue(opts.year, "year"))}`);
  return queryDataset(DATASETS.weekly_deaths.id, {
    where: clauses.join(" AND "),
    order: "end_date DESC",
    limit: opts?.limit ?? 200,
  });
}

/** Disability prevalence by state and type from BRFSS. */
export async function getDisabilityData(opts?: {
  state?: string; disabilityType?: string; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  clauses.push(`stratificationcategoryid1 = 'CAT1'`); // Overall (not by age/race subgroup)
  if (opts?.state) clauses.push(`locationabbr = ${soqlString(stateAs(opts.state, "usps").toUpperCase())}`);
  if (opts?.disabilityType) clauses.push(`response = ${soqlString(opts.disabilityType)}`);
  return queryDataset(DATASETS.disability.id, {
    where: clauses.join(" AND "),
    select: "locationabbr, locationdesc, response, data_value, data_value_type, year, number, weightednumber",
    order: "year DESC, locationabbr",
    limit: opts?.limit ?? 200,
  });
}

/**
 * Clear Cache.
 */
export function clearCache(): void { api.clearCache(); }

// ─── Additional high-value SDK functions ─────────────────────────────

/** Drug overdose/poisoning mortality by state (1999–2016). */
export async function getDrugOverdoseData(opts?: {
  state?: string; year?: number; sex?: string; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  if (opts?.state) clauses.push(`state = ${soqlString(stateAs(opts.state, "name"))}`);
  if (opts?.year) clauses.push(`year = ${soqlString(integerValue(opts.year, "year"))}`);
  if (opts?.sex) clauses.push(`sex = ${soqlString(opts.sex)}`);
  return queryDataset(DATASETS.drug_overdose_state.id, {
    where: clauses.length ? clauses.join(" AND ") : undefined,
    order: "year DESC",
    limit: opts?.limit ?? 200,
  });
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Drug types in the provisional overdose counts (the `indicator` field). */
export const OVERDOSE_INDICATORS = [
  "Number of Drug Overdose Deaths",
  "Opioids (T40.0-T40.4,T40.6)",
  "Synthetic opioids, excl. methadone (T40.4)",
  "Heroin (T40.1)",
  "Natural & semi-synthetic opioids (T40.2)",
  "Methadone (T40.3)",
  "Cocaine (T40.5)",
  "Psychostimulants with abuse potential (T43.6)",
] as const;

/**
 * Provisional drug overdose death counts (VSRR), 12 months ending in each
 * month, by state (or "US") and drug, 2015 to about six months ago. Newest
 * first.
 */
export async function getProvisionalOverdoseDeaths(opts?: {
  state?: string; year?: number; indicator?: string; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [`period = '12 month-ending'`];
  if (opts?.state) clauses.push(`state = ${soqlString(stateAs(opts.state, "usps").toUpperCase())}`);
  if (opts?.year) clauses.push(`year = ${soqlString(integerValue(opts.year, "year"))}`);
  clauses.push(`indicator = ${soqlString(opts?.indicator ?? OVERDOSE_INDICATORS[0])}`);
  const rows = await queryDataset(DATASETS.drug_overdose_provisional.id, {
    select: "state, state_name, year, month, indicator, data_value, predicted_value, percent_complete, footnote",
    where: clauses.join(" AND "),
    order: "year DESC",
    // Months are names, so sort them here: fetch whole years, then trim.
    limit: 5000,
  });
  const monthIndex = (r: CdcRecord) => MONTHS.indexOf(String(r.month));
  return rows
    .sort((a, b) => Number(b.year) - Number(a.year) || monthIndex(b) - monthIndex(a) || String(a.state).localeCompare(String(b.state)))
    .slice(0, opts?.limit ?? 200);
}

/** Nutrition, physical activity, and obesity by state from BRFSS. */
export async function getNutritionObesityData(opts?: {
  state?: string; topic?: string; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  clauses.push(`data_value IS NOT NULL`);
  if (opts?.state) clauses.push(`locationabbr = ${soqlString(stateAs(opts.state, "usps").toUpperCase())}`);
  if (opts?.topic) clauses.push(`class LIKE ${soqlContains(opts.topic)}`);
  return queryDataset(DATASETS.nutrition_obesity.id, {
    where: clauses.join(" AND "),
    select: "yearstart, yearend, locationabbr, locationdesc, class, topic, question, data_value, data_value_unit, stratificationcategory1, stratification1",
    order: "yearend DESC",
    limit: opts?.limit ?? 200,
  });
}

/** Historical age-adjusted death rates for major causes since 1900. */
export async function getHistoricalDeathRates(opts?: {
  cause?: string; startYear?: number; endYear?: number; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  if (opts?.cause) clauses.push(`leading_causes = ${soqlString(opts.cause)}`);
  if (opts?.startYear) clauses.push(`year >= ${soqlString(integerValue(opts.startYear, "start_year"))}`);
  if (opts?.endYear) clauses.push(`year <= ${soqlString(integerValue(opts.endYear, "end_year"))}`);
  return queryDataset(DATASETS.death_rates_historical.id, {
    where: clauses.length ? clauses.join(" AND ") : undefined,
    order: "year DESC",
    limit: opts?.limit ?? 200,
  });
}

/** Quarterly provisional birth indicators (birth rates, teen births, preterm, cesarean). */
export async function getBirthIndicators(opts?: {
  topic?: string; raceEthnicity?: string; limit?: number;
}): Promise<CdcRecord[]> {
  const clauses: string[] = [];
  if (opts?.topic) clauses.push(`topic_subgroup LIKE ${soqlContains(opts.topic)}`);
  if (opts?.raceEthnicity) clauses.push(`race_ethnicity = ${soqlString(opts.raceEthnicity)}`);
  return queryDataset(DATASETS.birth_indicators.id, {
    where: clauses.length ? clauses.join(" AND ") : undefined,
    order: "year_and_quarter DESC",
    limit: opts?.limit ?? 200,
  });
}
