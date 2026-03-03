/**
 * CFPB SDK — typed API client for the Consumer Financial Protection Bureau
 * Consumer Complaint Database.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchComplaints, getCompanyComplaints, getComplaintTrends } from "us-gov-open-data/sdk/cfpb";
 *
 *   const data = await searchComplaints({ product: "Mortgage", state: "CA" });
 *   console.log(data);
 *
 * No API key required.
 * Docs: https://cfpb.github.io/api/ccdb/
 * Database: https://www.consumerfinance.gov/data-research/consumer-complaints/
 */

import { createClient } from "../client.js";

// ─── Client ──────────────────────────────────────────────────────────

const client = createClient({
  baseUrl: "https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1",
  name: "cfpb",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

// ─── Types ───────────────────────────────────────────────────────────

export interface Complaint {
  complaint_id?: number;
  date_received?: string;
  product?: string;
  sub_product?: string;
  issue?: string;
  sub_issue?: string;
  company?: string;
  state?: string;
  zip_code?: string;
  company_response?: string;
  company_public_response?: string;
  consumer_consent_provided?: string;
  consumer_disputed?: string;
  consumer_complaint_narrative?: string;
  timely?: string;
  date_sent_to_company?: string;
  submitted_via?: string;
  tags?: string;
  has_narrative?: boolean;
  [key: string]: unknown;
}

export interface ComplaintSearchResult {
  hits: {
    total: number | { value: number; relation: string };
    hits: Array<{
      _source: Complaint;
      [key: string]: unknown;
    }>;
  };
  _meta?: {
    total_record_count?: number;
    last_updated?: string;
    last_indexed?: string;
    license?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AggregationBucket {
  key: string;
  doc_count: number;
  [key: string]: unknown;
}

export interface SuggestResult {
  suggest: Array<{
    text: string;
    options: Array<{ text: string; [key: string]: unknown }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Financial product categories tracked by CFPB. */
export const PRODUCTS: Record<string, string> = {
  "Credit reporting, credit repair services, or other personal consumer reports": "Credit reporting & repair",
  "Debt collection": "Debt collection practices",
  "Mortgage": "Home mortgage complaints",
  "Credit card or prepaid card": "Credit/prepaid card issues",
  "Checking or savings account": "Bank account problems",
  "Student loan": "Student loan servicing",
  "Vehicle loan or lease": "Auto loans and leases",
  "Money transfer, virtual currency, or money service": "Transfers & crypto",
  "Payday loan, title loan, or personal loan": "Payday/personal loans",
  "Credit card": "Legacy credit card category",
};

/** Fields available for aggregation. */
export const AGG_FIELDS: Record<string, string> = {
  product: "Financial product category",
  sub_product: "Product subcategory",
  issue: "Issue type",
  company: "Company name",
  state: "State abbreviation",
  company_response: "Company response type",
  timely: "Whether company responded timely (Yes/No)",
  consumer_disputed: "Whether consumer disputed (Yes/No)",
  submitted_via: "Submission channel (Web, Referral, Phone, etc.)",
  tags: "Special tags (Older American, Servicemember, etc.)",
};

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search consumer complaints with filters.
 * Note: The `company` parameter requires the exact official name (e.g. "WELLS FARGO & COMPANY").
 * If an exact company match returns 0 results, automatically retries using `search_term` for
 * a fuzzy match across all fields.
 *
 * Example:
 *   const data = await searchComplaints({ product: "Mortgage", state: "CA", size: 25 });
 *   const recent = await searchComplaints({ company: "Wells Fargo", sort: "created_date_desc" });
 */
export async function searchComplaints(opts: {
  search_term?: string;
  product?: string;
  company?: string;
  state?: string;
  issue?: string;
  date_received_min?: string;
  date_received_max?: string;
  company_response?: string;
  consumer_disputed?: string;
  has_narrative?: boolean;
  tags?: string;
  size?: number;
  frm?: number;
  sort?: string;
  field?: string;
  no_aggs?: boolean;
}): Promise<ComplaintSearchResult> {
  const params: Record<string, string | number | undefined> = {};

  if (opts.search_term) params.search_term = opts.search_term;
  if (opts.product) params.product = opts.product;
  if (opts.company) params.company = opts.company;
  if (opts.state) params.state = opts.state;
  if (opts.issue) params.issue = opts.issue;
  if (opts.date_received_min) params.date_received_min = opts.date_received_min;
  if (opts.date_received_max) params.date_received_max = opts.date_received_max;
  if (opts.company_response) params.company_response = opts.company_response;
  if (opts.consumer_disputed) params.consumer_disputed = opts.consumer_disputed;
  if (opts.has_narrative !== undefined) params.has_narrative = opts.has_narrative ? "true" : "false";
  if (opts.tags) params.tags = opts.tags;
  if (opts.size !== undefined) params.size = opts.size;
  if (opts.frm !== undefined) params.frm = opts.frm;
  if (opts.sort) params.sort = opts.sort;
  if (opts.field) params.field = opts.field;
  if (opts.no_aggs) params.no_aggs = "true";

  const result = await client.get<ComplaintSearchResult>("/", params);

  // If company filter returned 0 results, retry with search_term for fuzzy matching
  const total = typeof result.hits?.total === "object" ? result.hits.total.value : result.hits?.total ?? 0;
  if (total === 0 && opts.company && !opts.search_term) {
    const retryParams = { ...params };
    delete retryParams.company;
    retryParams.search_term = opts.company;
    const retryResult = await client.get<ComplaintSearchResult>("/", retryParams);
    const retryTotal = typeof retryResult.hits?.total === "object" ? retryResult.hits.total.value : retryResult.hits?.total ?? 0;
    if (retryTotal > 0) {
      return retryResult;
    }
  }

  return result;
}

/**
 * Get complaint aggregations/counts grouped by a field.
 * Uses the search endpoint with size=0 to return only aggregations.
 *
 * Example:
 *   const byProduct = await getComplaintAggregations({ field: "product" });
 *   const byCompany = await getComplaintAggregations({ field: "company", state: "TX", size: 20 });
 */
export async function getComplaintAggregations(opts: {
  field: string;
  search_term?: string;
  product?: string;
  company?: string;
  state?: string;
  issue?: string;
  date_received_min?: string;
  date_received_max?: string;
  tags?: string;
  size?: number;
}): Promise<ComplaintSearchResult> {
  return searchComplaints({
    ...opts,
    size: 0,
    no_aggs: false,
    field: opts.field,
  });
}

/**
 * Get complaint trends over time.
 * Returns complaint data with date-based aggregations for trend analysis.
 *
 * Example:
 *   const trends = await getComplaintTrends({ product: "Mortgage", date_received_min: "2020-01-01" });
 */
export async function getComplaintTrends(opts: {
  product?: string;
  company?: string;
  state?: string;
  issue?: string;
  date_received_min?: string;
  date_received_max?: string;
  trend_interval?: string;
}): Promise<ComplaintSearchResult> {
  const params: Record<string, string | number | undefined> = {
    size: 0,
    trend_interval: opts.trend_interval ?? "month",
  };

  if (opts.product) params.product = opts.product;
  if (opts.company) params.company = opts.company;
  if (opts.state) params.state = opts.state;
  if (opts.issue) params.issue = opts.issue;
  if (opts.date_received_min) params.date_received_min = opts.date_received_min;
  if (opts.date_received_max) params.date_received_max = opts.date_received_max;

  return client.get<ComplaintSearchResult>("/", params);
}

/**
 * Get company name suggestions/autocomplete.
 *
 * Example:
 *   const suggestions = await suggestCompany("wells");
 */
export async function suggestCompany(text: string, size?: number): Promise<SuggestResult> {
  return client.get<SuggestResult>("/_suggest_company", {
    text,
    size: size ?? 10,
  });
}

/** Clear cached responses. */
export function clearCache(): void {
  client.clearCache();
}
