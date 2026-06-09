/**
 * Federal Register SDK — typed API client for the Federal Register.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchExecutiveOrders, searchPresidentialDocuments } from "us-gov-open-data-mcp/sdk/federal-register";
 *
 * No API key required — completely open.
 * Docs: https://www.federalregister.gov/developers/documentation/api/v1
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://www.federalregister.gov/api/v1",
  name: "federal-register",
  cacheTtlMs: 30 * 60 * 1000, // 30 min — documents don't change often
});

// ─── Types ───────────────────────────────────────────────────────────

/** Federal Register document metadata. */
export interface FRDocument {
  title: string;
  type: string;
  subtype?: string;
  abstract?: string;
  document_number: string;
  html_url: string;
  publication_date: string;
  signing_date?: string;
  executive_order_number?: number;
  presidential_document_type_id?: string;
  president?: { name: string; identifier: string };
  agencies?: { name?: string; raw_name?: string; id?: number }[];
  pdf_url?: string;
  citation?: string;
}

/** Federal Register search result. */
export interface FRSearchResult {
  count: number;
  total_pages: number;
  results: FRDocument[];
}

/** Document on public inspection (approved but not yet officially published). */
export interface FRPublicInspectionDoc {
  document_number: string;
  title: string;
  type: string;
  filing_type: string; // "regular" or "special" (expedited/emergency)
  filed_at: string;
  publication_date: string;
  agency_names?: string[];
  agencies?: { name?: string; raw_name?: string; id?: number }[];
  docket_numbers?: string[];
  num_pages?: number;
  excerpts?: string;
  html_url?: string;
  pdf_url?: string;
}

/** Public inspection list result. */
export interface FRPublicInspectionResult {
  count: number;
  results: FRPublicInspectionDoc[];
}

/** OFR-curated suggested search (topic bundle). */
export interface FRSuggestedSearch {
  title: string;
  slug: string;
  section: string;
  description?: string;
  documents_in_last_year?: number;
  documents_with_open_comment_periods?: number;
  search_conditions?: Record<string, unknown>;
}

// ─── Public API ──────────────────────────────────────────────────────

/** Search for presidential executive orders. Filter by president, year, or keyword. */
export async function searchExecutiveOrders(opts: {
  keyword?: string;
  president?: string;
  year?: number;
  per_page?: number;
  page?: number;
} = {}): Promise<FRSearchResult> {
  const params: Record<string, string | number | undefined> = {
    "conditions[type][]": "PRESDOCU",
    "conditions[presidential_document_type][]": "executive_order",
    "conditions[correction]": "0",
    per_page: opts.per_page ?? 20,
    page: opts.page ?? 1,
    order: "newest",
  };

  if (opts.keyword) params["conditions[term]"] = opts.keyword;
  if (opts.president) params["conditions[president][]"] = opts.president;
  if (opts.year) {
    params["conditions[publication_date][gte]"] = `${opts.year}-01-01`;
    params["conditions[publication_date][lte]"] = `${opts.year}-12-31`;
  }

  return api.get<FRSearchResult>("/documents.json", params);
}

/** Search all presidential documents: executive orders, memoranda, proclamations, etc. */
export async function searchPresidentialDocuments(opts: {
  keyword?: string;
  doc_type?: string;
  president?: string;
  start_date?: string;
  end_date?: string;
  per_page?: number;
} = {}): Promise<FRSearchResult> {
  const params: Record<string, string | number | undefined> = {
    "conditions[type][]": "PRESDOCU",
    "conditions[correction]": "0",
    per_page: opts.per_page ?? 20,
    order: "newest",
  };

  if (opts.doc_type) params["conditions[presidential_document_type][]"] = opts.doc_type;
  if (opts.keyword) params["conditions[term]"] = opts.keyword;
  if (opts.president) params["conditions[president][]"] = opts.president;
  if (opts.start_date) params["conditions[publication_date][gte]"] = opts.start_date;
  if (opts.end_date) params["conditions[publication_date][lte]"] = opts.end_date;

  return api.get<FRSearchResult>("/documents.json", params);
}

/** Search for proposed rules, final rules, and agency notices. */
export async function searchRules(opts: {
  keyword?: string;
  doc_type?: string;
  agency?: string;
  start_date?: string;
  end_date?: string;
  per_page?: number;
  significant?: boolean;
} = {}): Promise<FRSearchResult> {
  const params: Record<string, string | number | undefined> = {
    "conditions[correction]": "0",
    per_page: opts.per_page ?? 20,
    order: "newest",
  };

  if (opts.doc_type) params["conditions[type][]"] = opts.doc_type;
  if (opts.keyword) params["conditions[term]"] = opts.keyword;
  if (opts.agency) params["conditions[agencies][]"] = opts.agency;
  if (opts.start_date) params["conditions[publication_date][gte]"] = opts.start_date;
  if (opts.end_date) params["conditions[publication_date][lte]"] = opts.end_date;
  if (opts.significant) params["conditions[significant]"] = "1";

  return api.get<FRSearchResult>("/documents.json", params);
}

/**
 * Get details for a specific Federal Register document by document number.
 *
 * Example:
 *   const doc = await getDocumentDetail('2024-00001');
 */
export async function getDocumentDetail(documentNumber: string): Promise<FRDocument> {
  return api.get<FRDocument>(`/documents/${documentNumber}.json`);
}

/**
 * List all Federal Register agencies with metadata.
 * Returns agency names, short names, URLs, parent agencies, etc.
 */
export async function listAgencies(): Promise<Array<{ name: string; short_name?: string; slug: string; url: string; parent_id?: number; id: number; [key: string]: unknown }>> {
  return api.get("/agencies");
}

/**
 * Get documents currently on public inspection — approved for publication but
 * not yet officially published (i.e. appearing in the Federal Register tomorrow
 * or, for "special" filings, imminently). The forward-looking complement to the
 * published-documents search.
 */
export async function getCurrentPublicInspection(): Promise<FRPublicInspectionResult> {
  return api.get<FRPublicInspectionResult>("/public-inspection-documents/current.json");
}

/**
 * Get OFR-curated suggested searches — topical bundles (e.g. "Dodd-Frank",
 * "Endangered Species") grouped by section, each with counts of documents in the
 * last year and documents with open public comment periods. Optionally filter to
 * a single section (e.g. "money", "environment", "health-and-public-welfare").
 */
export async function getSuggestedSearches(section?: string): Promise<FRSuggestedSearch[]> {
  const data = await api.get<Record<string, FRSuggestedSearch[]>>("/suggested_searches.json");
  const sections = section ? [section] : Object.keys(data);
  const out: FRSuggestedSearch[] = [];
  for (const s of sections) {
    for (const entry of data[s] ?? []) out.push(entry);
  }
  return out;
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
