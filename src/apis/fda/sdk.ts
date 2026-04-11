/**
 * FDA SDK — typed API client for the openFDA APIs.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchDrugEvents, searchFoodRecalls, countDrugEvents } from "us-gov-open-data-mcp/sdk/fda";
 *
 *   const events = await searchDrugEvents({ search: "patient.drug.openfda.brand_name:aspirin", limit: 5 });
 *   console.log(events.meta.results.total, events.results);
 *
 *   const topReactions = await countDrugEvents("patient.reaction.reactionmeddrapt.exact");
 *   console.log(topReactions.results); // [{term, count}, ...]
 *
 *   const recalls = await searchFoodRecalls({ search: "classification:\"Class I\"", limit: 10 });
 *   console.log(recalls.results);
 *
 * No API key required (240 req/min without key, 120K req/day with key).
 * Optional DATA_GOV_API_KEY for higher limits — get one at https://api.data.gov/signup/
 * Docs: https://open.fda.gov/apis/
 */

import { createClient } from "../../shared/client.js";

// Re-export types so downstream consumers can import from sdk
export type {
  OpenFdaMeta, FdaResult, CountResult,
  OpenFdaDrugAnnotation, OpenFdaDeviceAnnotation, EnforcementRecall,
  DrugEvent, DrugLabel, DrugNdc, DrugShortage, ApprovedDrug,
  DeviceEvent, Device510k, DeviceClassification, DevicePma, DeviceUdi,
  DeviceRegistration, CovidSerology,
  FoodAdverseEvent, AnimalEvent, TobaccoProblem,
  HistoricalDocument, Nsde, SubstanceData, Unii,
} from "./types.js";

import type {
  FdaResult, CountResult,
  DrugEvent, DrugLabel, DrugNdc, DrugShortage, ApprovedDrug,
  DeviceEvent, Device510k, DeviceClassification, DevicePma, DeviceUdi,
  DeviceRegistration, CovidSerology, EnforcementRecall,
  FoodAdverseEvent, AnimalEvent, TobaccoProblem,
  HistoricalDocument, Nsde, SubstanceData, Unii,
} from "./types.js";

export { FDA_ENDPOINTS, FDA_COUNT_FIELDS } from "./types.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.fda.gov",
  name: "fda",
  auth: { type: "query", envParams: { api_key: "DATA_GOV_API_KEY" } },
  rateLimit: { perSecond: 4, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
  checkError: (data) => {
    const err = (data as { error?: { code?: string; message?: string } })?.error;
    if (err?.message) return `${err.code ?? "FDA_ERROR"}: ${err.message}`;
    return null;
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────

/** Standard search options accepted by all OpenFDA endpoints. */
interface SearchOpts { search?: string; limit?: number; skip?: number }

/**
 * Normalize FDA search syntax: convert `+AND+`, `+OR+`, `+NOT+` to spaces
 * so the shared client's encodeURIComponent doesn't break them.
 * The FDA API accepts `%20` (space) in place of `+` for query operators.
 */
function normSearch(search?: string): string | undefined {
  if (!search) return search;
  return search.replace(/\+AND\+/g, " AND ").replace(/\+OR\+/g, " OR ").replace(/\+NOT\+/g, " NOT ");
}

/** Generic search for any OpenFDA endpoint. */
function fdaSearch<T>(path: string, opts: SearchOpts = {}): Promise<FdaResult<T>> {
  return api.get<FdaResult<T>>(`/${path}.json`, {
    search: normSearch(opts.search),
    limit: opts.limit ?? 10,
    skip: opts.skip,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// DRUG ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Search adverse drug events (FAERS). 20M+ reports.
 *
 * Example:
 *   await searchDrugEvents({ search: "patient.drug.openfda.brand_name:aspirin", limit: 5 });
 *   await searchDrugEvents({ search: "serious:1 AND patient.patientsex:2", limit: 10 });
 */
export async function searchDrugEvents(opts: SearchOpts = {}): Promise<FdaResult<DrugEvent>> {
  return fdaSearch<DrugEvent>("drug/event", opts);
}

/**
 * Search drug labels (package inserts / prescribing information — SPL).
 * Each result contains standard SPL fields, product-specific sections
 * (indications, warnings, boxed_warning, adverse_reactions, etc.),
 * and an openfda annotation with harmonized identifiers.
 *
 * Example:
 *   await searchDrugLabels({ search: 'openfda.brand_name:"Tylenol"', limit: 3 });
 *   await searchDrugLabels({ search: '_exists_:boxed_warning', limit: 5 });
 */
export async function searchDrugLabels(opts: SearchOpts = {}): Promise<FdaResult<DrugLabel>> {
  return fdaSearch<DrugLabel>("drug/label", opts);
}

/**
 * Search the NDC Directory — National Drug Code product listings. 132K+ records.
 * Each entry has product data, packaging info, active ingredients, and openfda annotations.
 *
 * Example:
 *   await searchDrugNdc({ search: 'brand_name:"Tylenol"', limit: 5 });
 *   await searchDrugNdc({ search: 'dea_schedule:"CII"', limit: 10 });
 *   await searchDrugNdc({ search: 'dosage_form:"LOTION"', limit: 1 });
 */
export async function searchDrugNdc(opts: SearchOpts = {}): Promise<FdaResult<DrugNdc>> {
  return fdaSearch<DrugNdc>("drug/ndc", opts);
}

/**
 * Search drug recall enforcement reports.
 *
 * Example:
 *   await searchDrugRecalls({ search: 'classification:"Class I"', limit: 10 });
 *   await searchDrugRecalls({ search: 'recalling_firm:"Pfizer"' });
 */
export async function searchDrugRecalls(opts: SearchOpts = {}): Promise<FdaResult<EnforcementRecall>> {
  return fdaSearch<EnforcementRecall>("drug/enforcement", opts);
}

/**
 * Search FDA-approved drugs (Drugs@FDA database).
 * Contains approval history, labeling, and active ingredients.
 *
 * Example:
 *   await searchApprovedDrugs({ search: 'openfda.brand_name:"Ozempic"' });
 *   await searchApprovedDrugs({ search: 'sponsor_name:"Pfizer"', limit: 10 });
 */
export async function searchApprovedDrugs(opts: SearchOpts = {}): Promise<FdaResult<ApprovedDrug>> {
  return fdaSearch<ApprovedDrug>("drug/drugsfda", opts);
}

/**
 * Search drug shortages. 1.7K records — tracks which drugs are in shortage and why.
 *
 * Example:
 *   await searchDrugShortages({ search: 'status:"Currently in Shortage"', limit: 10 });
 *   await searchDrugShortages({ search: 'dosage_form:"Capsule"', limit: 5 });
 *   await searchDrugShortages({ search: 'therapeutic_category:"Antiviral"' });
 */
export async function searchDrugShortages(opts: SearchOpts = {}): Promise<FdaResult<DrugShortage>> {
  return fdaSearch<DrugShortage>("drug/shortages", opts);
}

// ═══════════════════════════════════════════════════════════════════════
// DEVICE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Search medical device adverse event reports (MAUDE).
 *
 * Example:
 *   await searchDeviceEvents({ search: "device.generic_name:pacemaker", limit: 10 });
 */
export async function searchDeviceEvents(opts: SearchOpts = {}): Promise<FdaResult<DeviceEvent>> {
  return fdaSearch<DeviceEvent>("device/event", opts);
}

/**
 * Search 510(k) premarket clearances. 174K+ records since 1976.
 * Each result includes device name, applicant, decision, clearance type, and advisory committee.
 *
 * Example:
 *   await searchDevice510k({ search: 'advisory_committee:cv', limit: 5 });
 *   await searchDevice510k({ search: 'openfda.regulation_number:868.5895' });
 *   await searchDevice510k({ search: 'device_name:"pacemaker"', limit: 10 });
 */
export async function searchDevice510k(opts: SearchOpts = {}): Promise<FdaResult<Device510k>> {
  return fdaSearch<Device510k>("device/510k", opts);
}

/**
 * Search medical device classification. ~1,700 generic device types.
 * Returns device class (I/II/III), product codes, regulation numbers, and definitions.
 *
 * Example:
 *   await searchDeviceClassification({ search: 'regulation_number:872.6855' });
 *   await searchDeviceClassification({ search: 'product_code:NOB' });
 */
export async function searchDeviceClassification(opts: SearchOpts = {}): Promise<FdaResult<DeviceClassification>> {
  return fdaSearch<DeviceClassification>("device/classification", opts);
}

/**
 * Search device recall enforcement reports.
 * Same schema as drug/food enforcement. Records before June 2012 may lack some fields.
 *
 * Example:
 *   await searchDeviceEnforcement({ search: 'classification:"Class III"' });
 *   await searchDeviceEnforcement({ search: 'report_date:[20040101+TO+20131231]' });
 */
export async function searchDeviceEnforcement(opts: SearchOpts = {}): Promise<FdaResult<EnforcementRecall>> {
  return fdaSearch<EnforcementRecall>("device/enforcement", opts);
}

/**
 * Search medical device recall reports (RES system).
 *
 * Example:
 *   await searchDeviceRecalls({ search: 'openfda.device_name:"pacemaker"', limit: 10 });
 */
export async function searchDeviceRecalls(opts: SearchOpts = {}): Promise<FdaResult<Record<string, unknown>>> {
  return fdaSearch<Record<string, unknown>>("device/recall", opts);
}

/**
 * Search Premarket Approval (PMA) decisions for Class III devices.
 *
 * Example:
 *   await searchDevicePma({ search: 'decision_code:APPR', limit: 5 });
 *   await searchDevicePma({ search: 'product_code:LWP' });
 */
export async function searchDevicePma(opts: SearchOpts = {}): Promise<FdaResult<DevicePma>> {
  return fdaSearch<DevicePma>("device/pma", opts);
}

/**
 * Search device registration & listing. 336K+ establishment records.
 *
 * Example:
 *   await searchDeviceRegistrations({ search: 'products.product_code:HQY' });
 *   await searchDeviceRegistrations({ search: 'products.openfda.regulation_number:886.5850' });
 */
export async function searchDeviceRegistrations(opts: SearchOpts = {}): Promise<FdaResult<DeviceRegistration>> {
  return fdaSearch<DeviceRegistration>("device/registrationlisting", opts);
}

/**
 * Search Unique Device Identifiers (GUDID).
 * Detailed device records including description, MRI safety, product codes, sterilization.
 * Note: Booleans stored as strings ("true"/"false").
 *
 * Example:
 *   await searchDeviceUdi({ search: 'brand_name:"CoRoent"' });
 *   await searchDeviceUdi({ search: 'is_rx:true', limit: 5 });
 */
export async function searchDeviceUdi(opts: SearchOpts = {}): Promise<FdaResult<DeviceUdi>> {
  return fdaSearch<DeviceUdi>("device/udi", opts);
}

/**
 * Search COVID-19 serology test evaluations.
 *
 * Example:
 *   await searchCovidSerology({ search: 'antibody_truth:"Positive"' });
 *   await searchCovidSerology({ search: 'manufacturer:"Abbott"' });
 */
export async function searchCovidSerology(opts: SearchOpts = {}): Promise<FdaResult<CovidSerology>> {
  return fdaSearch<CovidSerology>("device/covid19serology", opts);
}

// ═══════════════════════════════════════════════════════════════════════
// FOOD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Search food recall enforcement reports.
 *
 * Example:
 *   await searchFoodRecalls({ search: 'classification:"Class I"', limit: 10 });
 */
export async function searchFoodRecalls(opts: SearchOpts = {}): Promise<FdaResult<EnforcementRecall>> {
  return fdaSearch<EnforcementRecall>("food/enforcement", opts);
}

/**
 * Search food adverse event reports (CAERS — FDA's food safety surveillance).
 *
 * Example:
 *   await searchFoodAdverseEvents({ search: 'products.industry_name:"Dietary Supplements"' });
 */
export async function searchFoodAdverseEvents(opts: SearchOpts = {}): Promise<FdaResult<FoodAdverseEvent>> {
  return fdaSearch<FoodAdverseEvent>("food/event", opts);
}

// ═══════════════════════════════════════════════════════════════════════
// ANIMAL & VETERINARY ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Search animal/veterinary adverse events. 1.3M+ reports.
 * Each record has: header, animal info (species, breed), drugs, reactions (VEDDRA terms), outcomes.
 * Some fields may contain 'MSK' (masked) values for privacy.
 *
 * Example:
 *   await searchAnimalEvents({ search: 'original_receive_date:[20040101+TO+20161107]', limit: 5 });
 *   await searchAnimalEvents({ search: 'animal.species:"Dog"', limit: 10 });
 */
export async function searchAnimalEvents(opts: SearchOpts = {}): Promise<FdaResult<AnimalEvent>> {
  return fdaSearch<AnimalEvent>("animalandveterinary/event", opts);
}

// ═══════════════════════════════════════════════════════════════════════
// TOBACCO ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Search tobacco problem reports. ~1.3K records.
 * Reports about tobacco products that are damaged, defective, or cause health effects.
 * E-cigarettes/vaping products dominate (~60% of reports).
 *
 * Example:
 *   await searchTobaccoProblems({ search: 'date_submitted:[20180101+TO+20200723]' });
 */
export async function searchTobaccoProblems(opts: SearchOpts = {}): Promise<FdaResult<TobaccoProblem>> {
  return fdaSearch<TobaccoProblem>("tobacco/problem", opts);
}

// ═══════════════════════════════════════════════════════════════════════
// OTHER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Search historical FDA documents (press releases, 1913–2014). Full-text OCR search.
 *
 * Example:
 *   await searchHistoricalDocs({ search: 'doc_type:pr AND text:"poison prevention"', limit: 5 });
 *   await searchHistoricalDocs({ search: 'year:1920 AND text:Botulism' });
 */
export async function searchHistoricalDocs(opts: SearchOpts = {}): Promise<FdaResult<HistoricalDocument>> {
  return fdaSearch<HistoricalDocument>("other/historicaldocument", opts);
}

/**
 * Search NDC SPL Data Elements (NSDE).
 * Use `_missing_:marketing_end_date` for products still on market,
 * `_exists_:marketing_end_date` for discontinued.
 *
 * Example:
 *   await searchNsde({ search: 'package_ndc:"55700-019-60"' });
 *   await searchNsde({ search: '_missing_:"marketing_end_date"', limit: 10 });
 */
export async function searchNsde(opts: SearchOpts = {}): Promise<FdaResult<Nsde>> {
  return fdaSearch<Nsde>("other/nsde", opts);
}

/**
 * Search FDA substance data (molecular-level). Search by name, CAS code, UNII, or formula.
 *
 * Example:
 *   await searchSubstances({ search: 'names.name:"PARACETAMOL"' });
 *   await searchSubstances({ search: 'codes.code:"220127-57-1"' });
 *   await searchSubstances({ search: 'structure.formula:"C6H12"' });
 */
export async function searchSubstances(opts: SearchOpts = {}): Promise<FdaResult<SubstanceData>> {
  return fdaSearch<SubstanceData>("other/substance", opts);
}

/**
 * Search UNII (Unique Ingredient Identifiers).
 *
 * Example:
 *   await searchUnii({ search: 'unii:"L7V4I673D2"' });
 *   await searchUnii({ search: 'substance_name:"ASPIRIN"' });
 */
export async function searchUnii(opts: SearchOpts = {}): Promise<FdaResult<Unii>> {
  return fdaSearch<Unii>("other/unii", opts);
}

// ═══════════════════════════════════════════════════════════════════════
// GENERIC COUNT / AGGREGATE — Works on ANY endpoint
// ═══════════════════════════════════════════════════════════════════════

/**
 * Count/aggregate drug adverse events by a specific field (legacy — kept for backward compat).
 *
 * Example:
 *   await countDrugEvents("patient.reaction.reactionmeddrapt.exact");
 */
export async function countDrugEvents(field: string, opts: {
  search?: string;
  limit?: number;
} = {}): Promise<CountResult> {
  return countEndpoint("drug/event", field, opts);
}

/**
 * Count/aggregate any OpenFDA endpoint by a specific field.
 * Returns top terms with counts. Use `.exact` suffix for full phrase counts.
 *
 * Example:
 *   await countEndpoint("drug/ndc", "pharm_class.exact");
 *   await countEndpoint("device/510k", "country_code");
 *   await countEndpoint("tobacco/problem", "tobacco_products.exact");
 *   await countEndpoint("drug/event", "patient.reaction.reactionmeddrapt.exact", { search: "serious:1" });
 */
export async function countEndpoint(endpoint: string, field: string, opts: {
  search?: string;
  limit?: number;
} = {}): Promise<CountResult> {
  return api.get<CountResult>(`/${endpoint}.json`, {
    search: normSearch(opts.search),
    count: field,
    limit: opts.limit,
  });
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
