/**
 * Regulations.gov SDK — typed API client for the Regulations.gov API (v4).
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchDocuments, searchComments, searchDockets } from "us-gov-open-data-mcp/sdk/regulations";
 *
 *   const docs = await searchDocuments({ searchTerm: "water", agencyId: "EPA", pageSize: 10 });
 *   console.log(docs.data);
 *
 *   const comments = await searchComments({ searchTerm: "climate", pageSize: 5 });
 *   console.log(comments.data);
 *
 * Requires DATA_GOV_API_KEY env var. Get one at https://api.data.gov/signup/
 * Docs: https://open.gsa.gov/api/regulationsgov/
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.regulations.gov/v4",
  name: "regulations",
  auth: { type: "query", key: "api_key", envVar: "DATA_GOV_API_KEY" },
  rateLimit: { perSecond: 3, burst: 10 },
  cacheTtlMs: 30 * 60 * 1000, // 30 min
});

// ─── Types ───────────────────────────────────────────────────────────

/** Regulations Document. */
export interface RegulationsDocument {
  id: string;
  type: string;
  attributes: {
    agencyId: string;
    commentEndDate?: string;
    commentStartDate?: string;
    docketId: string;
    documentType: string;
    frDocNum?: string;
    lastModifiedDate: string;
    objectId: string;
    postedDate: string;
    subtype?: string;
    title: string;
    withdrawn: boolean;
    [key: string]: unknown;
  };
  links?: { self: string };
}

/** Regulations Comment. */
export interface RegulationsComment {
  id: string;
  type: string;
  attributes: {
    agencyId: string;
    comment?: string;
    docketId: string;
    documentType: string;
    lastModifiedDate: string;
    objectId: string;
    postedDate: string;
    title: string;
    withdrawn: boolean;
    [key: string]: unknown;
  };
  links?: { self: string };
}

/** Regulations Docket. */
export interface RegulationsDocket {
  id: string;
  type: string;
  attributes: {
    agencyId: string;
    docketType: string;
    lastModifiedDate: string;
    objectId: string;
    title: string;
    [key: string]: unknown;
  };
  links?: { self: string };
}

/** Regulations List Response. */
export interface RegulationsListResponse<T> {
  data: T[];
  meta?: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    numberOfElements: number;
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    firstPage: boolean;
    lastPage: boolean;
  };
}

/** Regulations Detail Response. */
export interface RegulationsDetailResponse<T> {
  data: T;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Regulations.gov document type filters. */
export const DOCUMENT_TYPES = {
  "Proposed Rule": "Proposed Rule",
  "Rule": "Final Rule",
  "Supporting & Related Material": "Supporting & Related Material",
  "Other": "Other",
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search for regulatory documents (proposed rules, final rules, supporting materials).
 */
export async function searchDocuments(opts: {
  searchTerm?: string;
  agencyId?: string;
  docketId?: string;
  documentType?: string;
  postedDate?: string;
  postedDateGe?: string;
  postedDateLe?: string;
  sort?: string;
  pageSize?: number;
  pageNumber?: number;
} = {}): Promise<RegulationsListResponse<RegulationsDocument>> {
  return api.get<RegulationsListResponse<RegulationsDocument>>("/documents", {
    "filter[searchTerm]": opts.searchTerm,
    "filter[agencyId]": opts.agencyId,
    "filter[docketId]": opts.docketId,
    "filter[documentType]": opts.documentType,
    "filter[postedDate]": opts.postedDate,
    "filter[postedDate][ge]": opts.postedDateGe,
    "filter[postedDate][le]": opts.postedDateLe,
    sort: opts.sort,
    "page[size]": opts.pageSize,
    "page[number]": opts.pageNumber,
  });
}

/**
 * Get detailed information for a single document by its document ID.
 */
export async function getDocument(documentId: string): Promise<RegulationsDetailResponse<RegulationsDocument>> {
  return api.get<RegulationsDetailResponse<RegulationsDocument>>(`/documents/${encodeURIComponent(documentId)}`);
}

/**
 * Search for public comments on regulatory documents.
 */
export async function searchComments(opts: {
  searchTerm?: string;
  agencyId?: string;
  docketId?: string;
  commentOnId?: string;
  postedDate?: string;
  postedDateGe?: string;
  postedDateLe?: string;
  sort?: string;
  pageSize?: number;
  pageNumber?: number;
} = {}): Promise<RegulationsListResponse<RegulationsComment>> {
  return api.get<RegulationsListResponse<RegulationsComment>>("/comments", {
    "filter[searchTerm]": opts.searchTerm,
    "filter[agencyId]": opts.agencyId,
    "filter[docketId]": opts.docketId,
    "filter[commentOnId]": opts.commentOnId,
    "filter[postedDate]": opts.postedDate,
    "filter[postedDate][ge]": opts.postedDateGe,
    "filter[postedDate][le]": opts.postedDateLe,
    sort: opts.sort,
    "page[size]": opts.pageSize,
    "page[number]": opts.pageNumber,
  });
}

/**
 * Get detailed information for a single comment.
 */
export async function getComment(commentId: string): Promise<RegulationsDetailResponse<RegulationsComment>> {
  return api.get<RegulationsDetailResponse<RegulationsComment>>(`/comments/${encodeURIComponent(commentId)}`);
}

/**
 * Search for regulatory dockets.
 */
export async function searchDockets(opts: {
  searchTerm?: string;
  agencyId?: string;
  docketType?: string;
  sort?: string;
  pageSize?: number;
  pageNumber?: number;
} = {}): Promise<RegulationsListResponse<RegulationsDocket>> {
  return api.get<RegulationsListResponse<RegulationsDocket>>("/dockets", {
    "filter[searchTerm]": opts.searchTerm,
    "filter[agencyId]": opts.agencyId,
    "filter[docketType]": opts.docketType,
    sort: opts.sort,
    "page[size]": opts.pageSize,
    "page[number]": opts.pageNumber,
  });
}

/**
 * Get detailed information for a single docket.
 */
export async function getDocket(docketId: string): Promise<RegulationsDetailResponse<RegulationsDocket>> {
  return api.get<RegulationsDetailResponse<RegulationsDocket>>(`/dockets/${encodeURIComponent(docketId)}`);
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
