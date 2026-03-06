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

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
