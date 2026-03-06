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

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.fda.gov",
  name: "fda",
  auth: { type: "query", key: "api_key", envVar: "DATA_GOV_API_KEY" },
  rateLimit: { perSecond: 4, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

// ─── Types ───────────────────────────────────────────────────────────

/** Open Fda Meta. */
export interface OpenFdaMeta {
  disclaimer: string;
  terms: string;
  license: string;
  last_updated: string;
  results: {
    skip: number;
    limit: number;
    total: number;
  };
}

/** Drug Event. */
export interface DrugEvent {
  safetyreportid: string;
  receivedate: string;
  receiptdate: string;
  serious: string;
  seriousnessdeath?: string;
  seriousnesshospitalization?: string;
  patient: {
    patientonsetage?: string;
    patientonsetageunit?: string;
    patientsex?: string;
    reaction: { reactionmeddrapt: string; reactionoutcome?: string }[];
    drug: {
      medicinalproduct: string;
      drugindication?: string;
      drugcharacterization?: string;
      openfda?: {
        brand_name?: string[];
        generic_name?: string[];
        manufacturer_name?: string[];
        route?: string[];
        substance_name?: string[];
      };
    }[];
  };
  [key: string]: unknown;
}

/** Drug Event Result. */
export interface DrugEventResult {
  meta: OpenFdaMeta;
  results: DrugEvent[];
}

/** Drug Label. */
export interface DrugLabel {
  id: string;
  effective_time?: string;
  indications_and_usage?: string[];
  warnings?: string[];
  dosage_and_administration?: string[];
  adverse_reactions?: string[];
  drug_interactions?: string[];
  description?: string[];
  boxed_warning?: string[];
  openfda: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    route?: string[];
    product_type?: string[];
    substance_name?: string[];
    rxcui?: string[];
    unii?: string[];
  };
  [key: string]: unknown;
}

/** Drug Label Result. */
export interface DrugLabelResult {
  meta: OpenFdaMeta;
  results: DrugLabel[];
}

/** Food Recall. */
export interface FoodRecall {
  report_date: string;
  recall_number: string;
  recall_initiation_date: string;
  classification: string;
  reason_for_recall: string;
  status: string;
  recalling_firm: string;
  city: string;
  state: string;
  country: string;
  product_description: string;
  product_quantity: string;
  distribution_pattern: string;
  voluntary_mandated: string;
  [key: string]: unknown;
}

/** Food Recall Result. */
export interface FoodRecallResult {
  meta: OpenFdaMeta;
  results: FoodRecall[];
}

/** Device Event. */
export interface DeviceEvent {
  event_key: string;
  report_number: string;
  date_received: string;
  event_type: string;
  device: {
    brand_name: string;
    generic_name: string;
    manufacturer_d_name: string;
    model_number?: string;
    openfda?: {
      device_name?: string;
      medical_specialty_description?: string;
      device_class?: string;
    };
  }[];
  mdr_text?: { text: string; text_type_code: string }[];
  [key: string]: unknown;
}

/** Device Event Result. */
export interface DeviceEventResult {
  meta: OpenFdaMeta;
  results: DeviceEvent[];
}

/** Count Result. */
export interface CountResult {
  results: { term: string; count: number }[];
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search adverse drug events (FAERS).
 *
 * Example:
 *   await searchDrugEvents({ search: "patient.drug.openfda.brand_name:aspirin", limit: 5 });
 *   await searchDrugEvents({ search: "serious:1+AND+patient.patientsex:2", limit: 10 });
 */
export async function searchDrugEvents(opts: {
  search?: string;
  limit?: number;
  skip?: number;
} = {}): Promise<DrugEventResult> {
  return api.get<DrugEventResult>("/drug/event.json", {
    search: opts.search,
    limit: opts.limit ?? 10,
    skip: opts.skip,
  });
}

/**
 * Search drug labels (package inserts / prescribing information).
 *
 * Example:
 *   await searchDrugLabels({ search: "openfda.brand_name:tylenol", limit: 3 });
 */
export async function searchDrugLabels(opts: {
  search?: string;
  limit?: number;
} = {}): Promise<DrugLabelResult> {
  return api.get<DrugLabelResult>("/drug/label.json", {
    search: opts.search,
    limit: opts.limit ?? 10,
  });
}

/**
 * Search food recall enforcement reports.
 *
 * Example:
 *   await searchFoodRecalls({ search: "classification:\"Class I\"", limit: 10 });
 *   await searchFoodRecalls({ search: "recalling_firm:\"Trader Joe\"", limit: 5 });
 */
export async function searchFoodRecalls(opts: {
  search?: string;
  limit?: number;
} = {}): Promise<FoodRecallResult> {
  return api.get<FoodRecallResult>("/food/enforcement.json", {
    search: opts.search,
    limit: opts.limit ?? 10,
  });
}

/**
 * Search medical device adverse event reports (MAUDE).
 *
 * Example:
 *   await searchDeviceEvents({ search: "device.generic_name:pacemaker", limit: 10 });
 */
export async function searchDeviceEvents(opts: {
  search?: string;
  limit?: number;
} = {}): Promise<DeviceEventResult> {
  return api.get<DeviceEventResult>("/device/event.json", {
    search: opts.search,
    limit: opts.limit ?? 10,
  });
}

/**
 * Count/aggregate drug adverse events by a specific field.
 * Returns top terms with counts, useful for finding most-reported reactions or drugs.
 *
 * Example:
 *   // Top adverse reactions:
 *   await countDrugEvents("patient.reaction.reactionmeddrapt.exact");
 *
 *   // Top reported drugs:
 *   await countDrugEvents("patient.drug.openfda.brand_name.exact");
 *
 *   // Count by seriousness:
 *   await countDrugEvents("serious");
 */
export async function countDrugEvents(field: string, opts: {
  search?: string;
  limit?: number;
} = {}): Promise<CountResult> {
  return api.get<CountResult>("/drug/event.json", {
    search: opts.search,
    count: field,
    limit: opts.limit,
  });
}

// ─── Additional Endpoints ────────────────────────────────────────────

/** Drug Recall. */
export interface DrugRecall {
  report_date?: string;
  recall_number?: string;
  recall_initiation_date?: string;
  classification?: string;
  reason_for_recall?: string;
  status?: string;
  recalling_firm?: string;
  city?: string;
  state?: string;
  product_description?: string;
  product_quantity?: string;
  distribution_pattern?: string;
  openfda?: { brand_name?: string[]; generic_name?: string[]; manufacturer_name?: string[] };
  [key: string]: unknown;
}

/** Drug Recall Result. */
export interface DrugRecallResult { meta: OpenFdaMeta; results: DrugRecall[]; }

/** Approved Drug. */
export interface ApprovedDrug {
  application_number?: string;
  sponsor_name?: string;
  products?: Array<{
    brand_name?: string;
    active_ingredients?: Array<{ name: string; strength: string }>;
    route?: string;
    dosage_form?: string;
    marketing_status?: string;
  }>;
  submissions?: Array<{
    submission_type?: string;
    submission_number?: string;
    submission_status?: string;
    submission_status_date?: string;
    application_docs?: Array<{ id: string; url: string; type: string; title?: string }>;
  }>;
  openfda?: { brand_name?: string[]; generic_name?: string[]; manufacturer_name?: string[] };
  [key: string]: unknown;
}

/** Approved Drug Result. */
export interface ApprovedDrugResult { meta: OpenFdaMeta; results: ApprovedDrug[]; }

/** Food Adverse Event. */
export interface FoodAdverseEvent {
  report_number?: string;
  date_created?: string;
  date_started?: string;
  outcomes?: string[];
  products?: Array<{ name_brand?: string; industry_name?: string; role?: string }>;
  reactions?: string[];
  consumer?: { age?: string; age_unit?: string; gender?: string };
  [key: string]: unknown;
}

/** Food Adverse Event Result. */
export interface FoodAdverseEventResult { meta: OpenFdaMeta; results: FoodAdverseEvent[]; }

/** Device Recall. */
export interface DeviceRecall {
  res_event_number?: string;
  firm_fei_number?: string;
  k_numbers?: string[];
  product_description?: string;
  reason_for_recall?: string;
  root_cause_description?: string;
  event_date_terminated?: string;
  openfda?: { device_name?: string; device_class?: string; medical_specialty_description?: string };
  [key: string]: unknown;
}

/** Device Recall Result. */
export interface DeviceRecallResult { meta: OpenFdaMeta; results: DeviceRecall[]; }

/**
 * Search drug recall enforcement reports.
 *
 * Example:
 *   await searchDrugRecalls({ search: 'classification:"Class I"', limit: 10 });
 *   await searchDrugRecalls({ search: 'recalling_firm:"Pfizer"' });
 */
export async function searchDrugRecalls(opts: {
  search?: string;
  limit?: number;
  skip?: number;
} = {}): Promise<DrugRecallResult> {
  return api.get<DrugRecallResult>("/drug/enforcement.json", {
    search: opts.search,
    limit: opts.limit ?? 10,
    skip: opts.skip,
  });
}

/**
 * Search FDA-approved drugs (Drugs@FDA database).
 * Contains approval history, labeling, and active ingredients.
 *
 * Example:
 *   await searchApprovedDrugs({ search: 'openfda.brand_name:"Ozempic"' });
 *   await searchApprovedDrugs({ search: 'sponsor_name:"Pfizer"', limit: 10 });
 */
export async function searchApprovedDrugs(opts: {
  search?: string;
  limit?: number;
  skip?: number;
} = {}): Promise<ApprovedDrugResult> {
  return api.get<ApprovedDrugResult>("/drug/drugsfda.json", {
    search: opts.search,
    limit: opts.limit ?? 10,
    skip: opts.skip,
  });
}

/**
 * Search food adverse event reports (CAERS — FDA's food safety surveillance).
 *
 * Example:
 *   await searchFoodAdverseEvents({ search: 'products.industry_name:"Dietary Supplements"' });
 */
export async function searchFoodAdverseEvents(opts: {
  search?: string;
  limit?: number;
  skip?: number;
} = {}): Promise<FoodAdverseEventResult> {
  return api.get<FoodAdverseEventResult>("/food/event.json", {
    search: opts.search,
    limit: opts.limit ?? 10,
    skip: opts.skip,
  });
}

/**
 * Search medical device recall reports.
 *
 * Example:
 *   await searchDeviceRecalls({ search: 'openfda.device_name:"pacemaker"', limit: 10 });
 */
export async function searchDeviceRecalls(opts: {
  search?: string;
  limit?: number;
  skip?: number;
} = {}): Promise<DeviceRecallResult> {
  return api.get<DeviceRecallResult>("/device/recall.json", {
    search: opts.search,
    limit: opts.limit ?? 10,
    skip: opts.skip,
  });
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
