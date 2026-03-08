/**
 * Open Payments SDK — typed API client for CMS Open Payments (Sunshine Act) data.
 *
 * Tracks payments from pharmaceutical and medical device companies to doctors and teaching hospitals.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchPayments, getTopCompanies } from "us-gov-open-data-mcp/sdk/open-payments";
 *
 *   const payments = await searchPayments({ company: "Pfizer", limit: 10 });
 *   const top = await getTopCompanies({ year: "2024" });
 *
 * No API key required.
 * Docs: https://openpaymentsdata.cms.gov/about/api
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://openpaymentsdata.cms.gov/api/1",
  name: "open-payments",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour -- data updates periodically
  timeoutMs: 60_000, // CMS dataset is large; default 30s times out on sort queries
});

// ─── Types ───────────────────────────────────────────────────────────

/** General Payment. */
export interface GeneralPayment {
  change_type?: string;
  covered_recipient_type?: string;
  covered_recipient_profile_id?: string;
  covered_recipient_npi?: string;
  covered_recipient_first_name?: string;
  covered_recipient_last_name?: string;
  covered_recipient_primary_type_1?: string;
  covered_recipient_specialty_1?: string;
  recipient_city?: string;
  recipient_state?: string;
  recipient_zip_code?: string;
  submitting_applicable_manufacturer_or_applicable_gpo_name?: string;
  applicable_manufacturer_or_applicable_gpo_making_payment_name?: string;
  total_amount_of_payment_usdollars?: string;
  date_of_payment?: string;
  nature_of_payment_or_transfer_of_value?: string;
  form_of_payment_or_transfer_of_value?: string;
  name_of_drug_or_biological_or_device_or_medical_supply_1?: string;
  indicate_drug_or_biological_or_device_or_medical_supply_1?: string;
  product_category_or_therapeutic_area_1?: string;
  teaching_hospital_name?: string;
  teaching_hospital_id?: string;
  program_year?: string;
  payment_publication_date?: string;
  [key: string]: unknown;
}

/** Payment Query Result. */
export interface PaymentQueryResult {
  results: GeneralPayment[];
  count: number;
  schema: Record<string, unknown>;
  query: Record<string, unknown>;
}

/** Grouped Payment. */
export interface GroupedPayment {
  reporting_entity_name?: string;
  total_payment_amount?: string;
  number_of_payments?: string;
  nature_of_payment?: string;
  covered_recipient_type?: string;
  [key: string]: unknown;
}

// ─── Dataset Discovery ───────────────────────────────────────────────
// Auto-discovers dataset IDs from the CMS metastore instead of hardcoding.
// Cached after first call — only one network request per session.

interface DatasetEntry {
  identifier: string;
  title: string;
  distribution?: Array<{ identifier: string }>;
}

let _datasetCache: DatasetEntry[] | null = null;

async function getDatasets(): Promise<DatasetEntry[]> {
  if (_datasetCache) return _datasetCache;
  const data = await api.get<DatasetEntry[]>("/metastore/schemas/dataset/items", {
    "show-reference-ids": "true",
  });
  _datasetCache = Array.isArray(data) ? data : [];
  return _datasetCache;
}

function findDataset(datasets: DatasetEntry[], pattern: RegExp): string | null {
  const match = datasets.find(d => pattern.test(d.title));
  // The datastore/query endpoint needs the DISTRIBUTION ID, not the dataset ID
  return match?.distribution?.[0]?.identifier ?? match?.identifier ?? null;
}

/**
 * Find the distribution ID for a given payment type and year.
 * Auto-discovers from the metastore — always gets the latest available data.
 * Returns the distribution ID (needed for /datastore/query/), not the dataset ID.
 */
export async function resolveDatasetId(type: "general" | "research" | "ownership", year?: string): Promise<string> {
  const datasets = await getDatasets();

  // If specific year requested, look for it
  if (year) {
    const pattern = new RegExp(`^${year}\\s+${type === "general" ? "General" : type === "research" ? "Research" : "Ownership"}\\s+Payment\\s+Data`, "i");
    const id = findDataset(datasets, pattern);
    if (id) return id;
  }

  // Otherwise find the latest year available
  const typeLabel = type === "general" ? "General" : type === "research" ? "Research" : "Ownership";
  const matching = datasets
    .filter(d => new RegExp(`^\\d{4}\\s+${typeLabel}\\s+Payment\\s+Data$`, "i").test(d.title))
    .sort((a, b) => b.title.localeCompare(a.title)); // Sort descending by year

  if (matching.length > 0) {
    return matching[0].distribution?.[0]?.identifier ?? matching[0].identifier;
  }

  // Hardcoded fallback for 2024 general data
  return "9323b84e-cda3-5f6b-a501-b76926c7c035";
}

async function resolveSummaryDatasetId(pattern: RegExp, fallback: string): Promise<string> {
  const datasets = await getDatasets();
  return findDataset(datasets, pattern) ?? fallback;
}

/** Get list of all available dataset years and types. */
export async function listAvailableDatasets(): Promise<Array<{ id: string; title: string }>> {
  const datasets = await getDatasets();
  return datasets
    .filter(d => /payment|profile|summary|dashboard/i.test(d.title))
    .map(d => ({ id: d.identifier, title: d.title }))
    .sort((a, b) => b.title.localeCompare(a.title));
}

/** Nature of payment categories. */
export const PAYMENT_TYPES = {
  "Food and Beverage": "Meals provided at meetings, conferences, etc.",
  "Travel and Lodging": "Travel, hotels, transportation",
  "Consulting Fee": "Paid to consult/advise the company",
  "Compensation for services other than consulting": "Speaking fees, advisory boards",
  "Honoraria": "Payments for speaking or presentations",
  "Gift": "Gifts to physicians",
  "Education": "Educational materials, textbooks",
  "Research": "Research funding (separate dataset)",
  "Royalty or License": "Royalties from patents or licenses",
  "Current or prospective ownership or investment interest": "Ownership stake (separate dataset)",
  "Charitable Contribution": "Charitable donations",
  "Grant": "Grants for education or research",
} as const;

// ─── Condition Builders ──────────────────────────────────────────────

interface FilterOpts {
  company?: string;
  doctor?: string;
  state?: string;
  specialty?: string;
}

/** Build GET-style condition params (conditions[0][property]=...) */
function buildGetConditions(opts: FilterOpts, params: Record<string, string | number | undefined>): void {
  let i = 0;
  const add = (property: string, value: string, operator: string) => {
    params[`conditions[${i}][property]`] = property;
    params[`conditions[${i}][value]`] = value;
    params[`conditions[${i}][operator]`] = operator;
    i++;
  };
  if (opts.company) add("submitting_applicable_manufacturer_or_applicable_gpo_name", `%${opts.company}%`, "LIKE");
  if (opts.doctor) add("covered_recipient_last_name", opts.doctor.toUpperCase(), "=");
  if (opts.state) add("recipient_state", opts.state.toUpperCase(), "=");
  if (opts.specialty) add("covered_recipient_specialty_1", `%${opts.specialty}%`, "LIKE");
}

/** Build POST-style condition array for JSON body */
function buildPostConditions(opts: FilterOpts): Array<{ property: string; value: string; operator: string }> {
  const conditions: Array<{ property: string; value: string; operator: string }> = [];
  if (opts.company) conditions.push({ property: "submitting_applicable_manufacturer_or_applicable_gpo_name", value: `%${opts.company}%`, operator: "LIKE" });
  if (opts.doctor) conditions.push({ property: "covered_recipient_last_name", value: opts.doctor.toUpperCase(), operator: "=" });
  if (opts.state) conditions.push({ property: "recipient_state", value: opts.state.toUpperCase(), operator: "=" });
  if (opts.specialty) conditions.push({ property: "covered_recipient_specialty_1", value: `%${opts.specialty}%`, operator: "LIKE" });
  return conditions;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search general payment data — pharma/device company payments to doctors.
 *
 * Example:
 *   const data = await searchPayments({ company: "Pfizer", year: "2024", limit: 10 });
 *   const data = await searchPayments({ doctor: "Smith", state: "CA" });
 */
export async function searchPayments(opts?: {
  company?: string;
  doctor?: string;
  state?: string;
  specialty?: string;
  year?: string;
  limit?: number;
  offset?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveDatasetId("general", opts?.year);

  const params: Record<string, string | number | undefined> = {
    limit: opts?.limit ?? 20,
    offset: opts?.offset,
  };
  buildGetConditions(opts ?? {}, params);

  return api.get<PaymentQueryResult>(`/datastore/query/${datasetId}`, params);
}

/**
 * Get summary data grouped by reporting entity (company) for all years.
 *
 * Example:
 *   const data = await getPaymentsByCompany({ limit: 10 });
 */
export async function getPaymentsByCompany(opts?: {
  limit?: number;
  offset?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveSummaryDatasetId(
    /payments grouped by reporting entities$/i,
    "6a1444f2-7475-5560-9688-d397221c57e6",
  );
  return api.get<PaymentQueryResult>(`/datastore/query/${datasetId}`, {
    limit: opts?.limit ?? 20,
    offset: opts?.offset,
  });
}

/**
 * Get national-level payment totals and averages for all years.
 */
export async function getNationalTotals(opts?: {
  limit?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveSummaryDatasetId(
    /national level payment total/i,
    "d304da01-cf97-537f-9906-c2cdca4b6234",
  );
  return api.get<PaymentQueryResult>(`/datastore/query/${datasetId}`, {
    limit: opts?.limit ?? 20,
  });
}

/**
 * Get state-level payment totals and averages for all years.
 */
export async function getStateTotals(opts?: {
  limit?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveSummaryDatasetId(
    /state level payment total/i,
    "6edba161-b520-5b8c-80bc-f6acef1aab23",
  );
  return api.get<PaymentQueryResult>(`/datastore/query/${datasetId}`, {
    limit: opts?.limit ?? 60,
  });
}

/**
 * Search research payment data — grants and research funding to doctors.
 * Separate from general payments — these are for clinical research.
 *
 * Example:
 *   const data = await searchResearchPayments({ company: "Pfizer", year: "2024", limit: 10 });
 */
export async function searchResearchPayments(opts?: {
  company?: string;
  doctor?: string;
  state?: string;
  year?: string;
  limit?: number;
  offset?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveDatasetId("research", opts?.year);
  const params: Record<string, string | number | undefined> = {
    limit: opts?.limit ?? 20,
    offset: opts?.offset,
  };
  buildGetConditions(opts ?? {}, params);
  return api.get<PaymentQueryResult>(`/datastore/query/${datasetId}`, params);
}

/**
 * Search ownership payment data — doctors with ownership/investment stakes in pharma companies.
 * The deepest form of conflict of interest.
 *
 * Example:
 *   const data = await searchOwnershipPayments({ company: "Pfizer", year: "2024", limit: 10 });
 */
export async function searchOwnershipPayments(opts?: {
  company?: string;
  doctor?: string;
  state?: string;
  year?: string;
  limit?: number;
  offset?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveDatasetId("ownership", opts?.year);
  const params: Record<string, string | number | undefined> = {
    limit: opts?.limit ?? 20,
    offset: opts?.offset,
  };
  buildGetConditions(opts ?? {}, params);
  return api.get<PaymentQueryResult>(`/datastore/query/${datasetId}`, params);
}

/**
 * Get payments grouped by individual physician across all years.
 * Pre-aggregated — shows total payments per doctor without needing client-side grouping.
 *
 * Example:
 *   const data = await getPaymentsByPhysician({ limit: 20 });
 */
export async function getPaymentsByPhysician(opts?: {
  limit?: number;
  offset?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveSummaryDatasetId(
    /payments grouped by physician.*all years/i,
    "37e410c6-8a6d-5080-b4d0-273b9fa4281c",
  );
  return api.get<PaymentQueryResult>(`/datastore/query/${datasetId}`, {
    limit: opts?.limit ?? 20,
    offset: opts?.offset,
  });
}

/**
 * Get payments grouped by teaching hospital.
 * Shows total payments to teaching hospitals from pharma companies.
 *
 * Example:
 *   const data = await getPaymentsByTeachingHospital({ limit: 20 });
 */
export async function getPaymentsByTeachingHospital(opts?: {
  limit?: number;
  offset?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveSummaryDatasetId(
    /payments grouped by teaching hospital/i,
    "31c2e685-0f15-5a46-b035-35ef39c3295a",
  );
  return api.get<PaymentQueryResult>(`/datastore/query/${datasetId}`, {
    limit: opts?.limit ?? 20,
    offset: opts?.offset,
  });
}

/**
 * Get national averages by provider specialty for all years.
 * Shows which medical specialties receive the most pharma money.
 *
 * Example:
 *   const data = await getPaymentsBySpecialty({ limit: 30 });
 */
export async function getPaymentsBySpecialty(opts?: {
  limit?: number;
  offset?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveSummaryDatasetId(
    /national level payment total.*by provider specialty/i,
    "306e29af-4ffd-59ee-9aaa-95a0961de6dc",
  );
  return api.get<PaymentQueryResult>(`/datastore/query/${datasetId}`, {
    limit: opts?.limit ?? 30,
    offset: opts?.offset,
  });
}

/**
 * Get physician/provider profile information.
 * Supplements payment data with doctor profile details.
 *
 * Example:
 *   const data = await getProviderProfiles({ limit: 10 });
 */
export async function getProviderProfiles(opts?: {
  limit?: number;
  offset?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveSummaryDatasetId(
    /profile information$/i,
    "6bb57518-b78e-5e8c-9f23-1f3a651e95fa",
  );
  return api.get<PaymentQueryResult>(`/datastore/query/${datasetId}`, {
    limit: opts?.limit ?? 20,
    offset: opts?.offset,
  });
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}

// ─── SQL Query (fast sorted/filtered queries) ───────────────────

/**
 * Run a SQL-like query against a datastore resource.
 * Faster than POST for simple sorted/filtered queries.
 * Note: amounts are stored as strings, so ORDER BY sorts lexicographically.
 * For proper numeric sorting, use searchPaymentsAdvanced (POST with sorts).
 *
 * Example:
 *   await sqlQuery(distId, {
 *     select: "covered_recipient_last_name,total_amount_of_payment_usdollars",
 *     where: 'recipient_state = "CA"',
 *     orderBy: "total_amount_of_payment_usdollars DESC",
 *     limit: 10,
 *   });
 */
export async function sqlQuery(
  distributionId: string,
  opts: { select?: string; where?: string; orderBy?: string; limit?: number; offset?: number },
): Promise<Record<string, unknown>[]> {
  const clauses: string[] = [];
  clauses.push(`[SELECT ${opts.select || "*"} FROM ${distributionId}]`);
  if (opts.where) clauses.push(`[WHERE ${opts.where}]`);
  if (opts.orderBy) clauses.push(`[ORDER BY ${opts.orderBy}]`);
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  clauses.push(`[LIMIT ${limit} OFFSET ${offset}]`);

  return api.get<Record<string, unknown>[]>("/datastore/sql", {
    query: clauses.join(""),
  });
}

/**
 * Search the Open Payments catalog using fulltext search with facets.
 * Searches across all dataset metadata (titles, descriptions, keywords).
 */
export async function searchCatalog(opts: {
  query?: string;
  keyword?: string;
  theme?: string;
  pageSize?: number;
  page?: number;
} = {}): Promise<{ total: number; results: Record<string, unknown> }> {
  return api.get<{ total: number; results: Record<string, unknown> }>("/search", {
    fulltext: opts.query || "",
    keyword: opts.keyword,
    theme: opts.theme,
    "page-size": opts.pageSize ?? 20,
    page: opts.page ?? 1,
  });
}

// ─── Advanced Query (POST with sorting/grouping) ─────────────────────

/**
 * Advanced search with sorting — find the highest-paid doctors, biggest company payments, etc.
 * Uses POST to support sorting by amount (GET doesn't support sorts).
 */
export async function searchPaymentsAdvanced(opts: {
  company?: string;
  doctor?: string;
  state?: string;
  specialty?: string;
  year?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveDatasetId("general", opts.year);
  const body: Record<string, unknown> = {
    limit: opts.limit ?? 20,
    offset: opts.offset ?? 0,
    conditions: buildPostConditions(opts),
    sorts: opts.sortBy ? [{ property: opts.sortBy, order: opts.sortOrder ?? "desc" }] : [],
  };
  return api.post<PaymentQueryResult>(`/datastore/query/${datasetId}`, body);
}

/**
 * Get total payments grouped by doctor — uses POST with aggregate SUM + grouping.
 * Returns each doctor's total payment amount across all their individual payments.
 * Sorted by total descending to find the highest-paid doctors.
 */
export async function getTopDoctorTotals(opts: {
  state?: string;
  specialty?: string;
  company?: string;
  year?: string;
  limit?: number;
}): Promise<PaymentQueryResult> {
  const datasetId = await resolveDatasetId("general", opts?.year);

  const body: Record<string, unknown> = {
    conditions: buildPostConditions(opts ?? {}),
    properties: [
      "covered_recipient_first_name",
      "covered_recipient_last_name",
      "covered_recipient_specialty_1",
      "recipient_city",
      "recipient_state",
      {
        expression: { operator: "sum", operands: ["total_amount_of_payment_usdollars"] },
        alias: "total_payments",
      },
      {
        expression: { operator: "count", operands: ["total_amount_of_payment_usdollars"] },
        alias: "payment_count",
      },
    ],
    groupings: [
      "covered_recipient_first_name",
      "covered_recipient_last_name",
      "covered_recipient_specialty_1",
      "recipient_city",
      "recipient_state",
    ],
    sorts: [{ property: "total_payments", order: "desc" }],
    limit: opts?.limit ?? 20,
    offset: 0,
  };

  return api.post<PaymentQueryResult>(`/datastore/query/${datasetId}`, body);
}
