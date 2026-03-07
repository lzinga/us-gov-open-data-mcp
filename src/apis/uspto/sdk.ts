/**
 * USPTO Open Data Portal (ODP) SDK - typed API client for U.S. patent data.
 *
 * Uses the USPTO ODP API ({@link https://api.uspto.gov})
 * Swagger: {@link https://data.uspto.gov/swagger/swagger.yaml}
 * Getting started: {@link https://data.uspto.gov/apis/getting-started}
 *
 * Standalone, no MCP server required. Usage:
 *
 *   import { searchApplications, getApplication } from "us-gov-open-data-mcp/sdk/uspto";
 *
 *   const results = await searchApplications({ q: "applicationMetaData.applicationTypeLabelName:Utility" });
 *   console.log(results);
 *
 * Requires `USPTO_API_KEY` env var. Get one free at {@link https://data.uspto.gov/apis/getting-started}.
 *
 * Rate limits:
 *   - Burst: 1 (sequential only, one request at a time per key)
 *   - Rate: 4–15 req/sec depending on endpoint
 *   - Meta data retrieval: 5M calls/week combined
 *   - Documents API: 1.2M calls/week
 *   - Weekly reset: Sunday midnight UTC
 *   - On HTTP 429, wait at least 5 seconds before retrying
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.uspto.gov",
  name: "uspto",
  auth: { type: "header", key: "X-API-KEY", envVar: "USPTO_API_KEY" },
  // burst=1 (sequential per key), rate 4-15 req/sec depending on endpoint
  rateLimit: { perSecond: 4, burst: 1 },
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours - patent data doesn't change frequently
  timeoutMs: 30_000,
});

// ─── Constants ───────────────────────────────────────────────────────

/** Patent application type codes used in ODP queries. */
export const applicationTypeCodes = {
  UTL: "Utility",
  DES: "Design",
  PLT: "Plant",
  PPA: "Provisional",
  REI: "Reissue",
} as const;

/** PTAB trial type codes. */
export const trialTypeCodes = {
  IPR: "Inter Partes Review",
  PGR: "Post Grant Review",
  CBM: "Covered Business Method",
  DER: "Derivation",
} as const;

// ─── Types ───────────────────────────────────────────────────────────

/** Generic ODP API search response wrapper. */
export interface OdpSearchResult {
  count: number;
  requestIdentifier?: string;
  results: Record<string, unknown>[];
  facets?: Record<string, { value: string; count: number }[]>;
}

/** ODP POST search filter: narrows results by field value(s). */
export interface OdpFilter {
  /** Qualified field name (e.g. "applicationMetaData.applicationTypeLabelName") */
  name: string;
  /** One or more values. Multiple values act as OR within the filter. */
  value: string[];
}

/** ODP POST search range filter: narrows results by value range. */
export interface OdpRangeFilter {
  /** Qualified field name (e.g. "applicationMetaData.grantDate") */
  field: string;
  /** Range start (inclusive). Date as yyyy-MM-dd or number as string. */
  valueFrom: string;
  /** Range end (inclusive) */
  valueTo: string;
}

/** ODP POST search sort spec. */
export interface OdpSort {
  /** Qualified field name. Text fields are not valid for sorting. */
  field: string;
  /** Sort direction */
  order: "asc" | "desc";
}

// ─── API functions ───────────────────────────────────────────────────

/** Build a POST search body from common params. All fields are optional per the ODP docs. */
function buildSearchBody(params: {
  q?: string;
  filters?: OdpFilter[];
  rangeFilters?: OdpRangeFilter[];
  sort?: OdpSort[];
  fields?: string[];
  offset?: number;
  limit?: number;
  facets?: string[];
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (params.q != null) body.q = params.q;
  if (params.filters?.length) body.filters = params.filters;
  if (params.rangeFilters?.length) body.rangeFilters = params.rangeFilters;
  if (params.sort?.length) body.sort = params.sort;
  if (params.fields?.length) body.fields = params.fields;
  if (params.facets?.length) body.facets = params.facets;
  body.pagination = {
    offset: params.offset ?? 0,
    limit: params.limit ?? 25,
  };
  return body;
}

/**
 * Search patent applications using ODP query syntax (POST).
 *
 * The `q` param supports opensearch simple query string DSL:
 *   - Free-form: "Design" searches all fields
 *   - Field-specific: "applicationMetaData.applicationTypeLabelName:Utility"
 *   - Boolean: AND, OR, NOT
 *   - Wildcards: * (zero or more), ? (single char)
 *   - Ranges: "applicationMetaData.filingDate:[2024-01-01 TO 2024-08-30]"
 *   - Comparison: "applicationMetaData.applicationStatusCode:>=600"
 *   - Phrases: '"Patented Case"'
 */
export async function searchApplications(params: {
  q?: string;
  filters?: OdpFilter[];
  rangeFilters?: OdpRangeFilter[];
  sort?: OdpSort[];
  fields?: string[];
  offset?: number;
  limit?: number;
  facets?: string[];
}): Promise<OdpSearchResult> {
  const res = await api.post<Record<string, unknown>>(
    "/api/v1/patent/applications/search",
    buildSearchBody(params),
  );

  return {
    count: Number(res.count ?? 0),
    requestIdentifier: res.requestIdentifier as string | undefined,
    results: Array.isArray(res.patentFileWrapperDataBag) ? res.patentFileWrapperDataBag : [],
    facets: res.facets as Record<string, { value: string; count: number }[]> | undefined,
  };
}

/**
 * Get full patent application data by application number.
 */
export async function getApplication(applicationNumber: string): Promise<Record<string, unknown> | null> {
  const res = await api.get<Record<string, unknown>>(
    `/api/v1/patent/applications/${encodeURIComponent(applicationNumber)}`,
  );

  const bag = Array.isArray(res.patentFileWrapperDataBag) ? res.patentFileWrapperDataBag : [];
  return bag[0] ?? null;
}

/**
 * Get continuity (parent/child application chain) data for an application.
 */
export async function getApplicationContinuity(applicationNumber: string): Promise<Record<string, unknown> | null> {
  const res = await api.get<Record<string, unknown>>(
    `/api/v1/patent/applications/${encodeURIComponent(applicationNumber)}/continuity`,
  );

  const bag = Array.isArray(res.patentFileWrapperDataBag) ? res.patentFileWrapperDataBag : [];
  return bag[0] ?? null;
}

/**
 * Get assignment (ownership transfer) data for an application.
 */
export async function getApplicationAssignment(applicationNumber: string): Promise<Record<string, unknown> | null> {
  const res = await api.get<Record<string, unknown>>(
    `/api/v1/patent/applications/${encodeURIComponent(applicationNumber)}/assignment`,
  );

  const bag = Array.isArray(res.patentFileWrapperDataBag) ? res.patentFileWrapperDataBag : [];
  return bag[0] ?? null;
}

/**
 * Get transaction (prosecution history) data for an application.
 */
export async function getApplicationTransactions(applicationNumber: string): Promise<Record<string, unknown> | null> {
  const res = await api.get<Record<string, unknown>>(
    `/api/v1/patent/applications/${encodeURIComponent(applicationNumber)}/transactions`,
  );

  const bag = Array.isArray(res.patentFileWrapperDataBag) ? res.patentFileWrapperDataBag : [];
  return bag[0] ?? null;
}

/**
 * List documents filed in a patent application.
 */
export async function getApplicationDocuments(params: {
  applicationNumber: string;
  documentCodes?: string;
  officialDateFrom?: string;
  officialDateTo?: string;
}): Promise<Record<string, unknown>> {
  const queryParams: Record<string, string> = {};
  if (params.documentCodes) queryParams.documentCodes = params.documentCodes;
  if (params.officialDateFrom) queryParams.officialDateFrom = params.officialDateFrom;
  if (params.officialDateTo) queryParams.officialDateTo = params.officialDateTo;

  return api.get<Record<string, unknown>>(
    `/api/v1/patent/applications/${encodeURIComponent(params.applicationNumber)}/documents`,
    queryParams,
  );
}

/**
 * Get patent term adjustment data for an application.
 */
export async function getApplicationAdjustment(applicationNumber: string): Promise<Record<string, unknown> | null> {
  const res = await api.get<Record<string, unknown>>(
    `/api/v1/patent/applications/${encodeURIComponent(applicationNumber)}/adjustment`,
  );

  const bag = Array.isArray(res.patentFileWrapperDataBag) ? res.patentFileWrapperDataBag : [];
  return bag[0] ?? null;
}

/**
 * Get foreign priority data for an application.
 */
export async function getApplicationForeignPriority(applicationNumber: string): Promise<Record<string, unknown> | null> {
  const res = await api.get<Record<string, unknown>>(
    `/api/v1/patent/applications/${encodeURIComponent(applicationNumber)}/foreign-priority`,
  );

  const bag = Array.isArray(res.patentFileWrapperDataBag) ? res.patentFileWrapperDataBag : [];
  return bag[0] ?? null;
}

/**
 * Get attorney/agent data for an application.
 */
export async function getApplicationAttorney(applicationNumber: string): Promise<Record<string, unknown> | null> {
  const res = await api.get<Record<string, unknown>>(
    `/api/v1/patent/applications/${encodeURIComponent(applicationNumber)}/attorney`,
  );

  const bag = Array.isArray(res.patentFileWrapperDataBag) ? res.patentFileWrapperDataBag : [];
  return bag[0] ?? null;
}

/**
 * Search PTAB trial proceedings (IPR, PGR, CBM, derivation) via POST.
 */
export async function searchPtabProceedings(params: {
  q?: string;
  filters?: OdpFilter[];
  rangeFilters?: OdpRangeFilter[];
  sort?: OdpSort[];
  fields?: string[];
  offset?: number;
  limit?: number;
  facets?: string[];
}): Promise<OdpSearchResult> {
  const res = await api.post<Record<string, unknown>>(
    "/api/v1/patent/trials/proceedings/search",
    buildSearchBody(params),
  );

  return {
    count: Number(res.count ?? 0),
    requestIdentifier: res.requestIdentifier as string | undefined,
    results: Array.isArray(res.patentTrialProceedingDataBag) ? res.patentTrialProceedingDataBag : [],
  };
}

/**
 * Get a specific PTAB trial proceeding by trial number.
 */
export async function getPtabProceeding(trialNumber: string): Promise<Record<string, unknown> | null> {
  const res = await api.get<Record<string, unknown>>(
    `/api/v1/patent/trials/proceedings/${encodeURIComponent(trialNumber)}`,
  );

  const bag = Array.isArray(res.patentTrialProceedingDataBag) ? res.patentTrialProceedingDataBag : [];
  return bag[0] ?? null;
}

/**
 * Search PTAB trial decisions via POST.
 */
export async function searchPtabDecisions(params: {
  q?: string;
  filters?: OdpFilter[];
  rangeFilters?: OdpRangeFilter[];
  sort?: OdpSort[];
  fields?: string[];
  offset?: number;
  limit?: number;
  facets?: string[];
}): Promise<OdpSearchResult> {
  const res = await api.post<Record<string, unknown>>(
    "/api/v1/patent/trials/decisions/search",
    buildSearchBody(params),
  );

  return {
    count: Number(res.count ?? 0),
    requestIdentifier: res.requestIdentifier as string | undefined,
    results: Array.isArray(res.patentTrialDecisionDataBag) ? res.patentTrialDecisionDataBag : [],
  };
}

/**
 * Search petition decisions via POST.
 */
export async function searchPetitionDecisions(params: {
  q?: string;
  filters?: OdpFilter[];
  rangeFilters?: OdpRangeFilter[];
  sort?: OdpSort[];
  fields?: string[];
  offset?: number;
  limit?: number;
  facets?: string[];
}): Promise<OdpSearchResult> {
  const res = await api.post<Record<string, unknown>>(
    "/api/v1/petition/decisions/search",
    buildSearchBody(params),
  );

  return {
    count: Number(res.count ?? 0),
    requestIdentifier: res.requestIdentifier as string | undefined,
    results: Array.isArray(res.petitionDecisionBag) ? res.petitionDecisionBag : [],
  };
}

// ─── Cache management ────────────────────────────────────────────────

/**
 * Clear the in-memory + disk cache for USPTO ODP requests.
 */
export function clearCache(): void {
  api.clearCache();
}