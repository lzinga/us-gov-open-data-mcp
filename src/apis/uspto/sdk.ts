/**
 * USPTO PatentsView SDK — typed API client for patent data.
 *
 * Uses PatentsView API (https://patentsview.org/apis/api-endpoints)
 * maintained by the U.S. Patent & Trademark Office.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchPatents, getPatent } from "us-gov-open-data-mcp/sdk/uspto";
 *
 *   const results = await searchPatents({ query: "machine learning", yearFrom: 2023 });
 *   console.log(results.total, results.patents);
 *
 * No API key required — completely open.
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.patentsview.org",
  name: "uspto",
  // No auth — completely open API
  rateLimit: { perSecond: 5, burst: 15 },
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours — patent data doesn't change frequently
  timeoutMs: 30_000,
});

// ─── Types ───────────────────────────────────────────────────────────

/** Patent. */
export interface Patent {
  patentNumber: string;
  patentTitle: string;
  patentDate: string;
  patentAbstract: string | null;
  patentType: string | null;
  numClaims: number | null;
  assigneeOrganization: string | null;
  inventorNames: string[];
  cpcGroup: string | null;
}

/** Patent Search Result. */
export interface PatentSearchResult {
  total: number;
  patents: Patent[];
}

/** Inventor. */
export interface Inventor {
  inventorId: string;
  inventorFirstName: string;
  inventorLastName: string;
  inventorCity: string | null;
  inventorState: string | null;
  inventorCountry: string | null;
  patentCount: number;
}

/** Inventor Search Result. */
export interface InventorSearchResult {
  total: number;
  inventors: Inventor[];
}

/** Assignee. */
export interface Assignee {
  assigneeId: string;
  assigneeOrganization: string | null;
  assigneeType: string | null;
  assigneeCity: string | null;
  assigneeState: string | null;
  assigneeCountry: string | null;
  patentCount: number;
}

/** Assignee Search Result. */
export interface AssigneeSearchResult {
  total: number;
  assignees: Assignee[];
}

/** Cpc Subsection. */
export interface CpcSubsection {
  cpcSubsectionId: string;
  cpcSubsectionTitle: string;
  patentCount: number;
}

// ─── Query builders ──────────────────────────────────────────────────

/**
 * PatentsView uses a JSON query syntax.
 * Build a query object from user-friendly params.
 */
function buildPatentQuery(params: {
  query?: string;
  title?: string;
  abstract?: string;
  assignee?: string;
  inventor?: string;
  cpcSection?: string;
  yearFrom?: number;
  yearTo?: number;
  patentNumber?: string;
  patentType?: string;
}): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = [];

  if (params.patentNumber) {
    conditions.push({ _eq: { patent_number: params.patentNumber } });
  }
  if (params.query) {
    // Search title and abstract
    conditions.push({
      _or: [
        { _text_any: { patent_title: params.query } },
        { _text_any: { patent_abstract: params.query } },
      ],
    });
  }
  if (params.title) {
    conditions.push({ _text_any: { patent_title: params.title } });
  }
  if (params.abstract) {
    conditions.push({ _text_any: { patent_abstract: params.abstract } });
  }
  if (params.assignee) {
    conditions.push({ _text_any: { assignee_organization: params.assignee } });
  }
  if (params.inventor) {
    conditions.push({
      _or: [
        { _text_any: { inventor_first_name: params.inventor } },
        { _text_any: { inventor_last_name: params.inventor } },
      ],
    });
  }
  if (params.cpcSection) {
    conditions.push({ _eq: { cpc_section_id: params.cpcSection } });
  }
  if (params.patentType) {
    conditions.push({ _eq: { patent_type: params.patentType } });
  }
  if (params.yearFrom) {
    conditions.push({ _gte: { patent_date: `${params.yearFrom}-01-01` } });
  }
  if (params.yearTo) {
    conditions.push({ _lte: { patent_date: `${params.yearTo}-12-31` } });
  }

  if (conditions.length === 0) {
    // Default: recent patents
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return { _gte: { patent_date: date.toISOString().split("T")[0] } };
  }

  return conditions.length === 1 ? conditions[0] : { _and: conditions };
}

// ─── API functions ───────────────────────────────────────────────────

/**
 * Search for patents using keyword, assignee, inventor, date range, or CPC class.
 */
export async function searchPatents(params: {
  query?: string;
  title?: string;
  abstract?: string;
  assignee?: string;
  inventor?: string;
  cpcSection?: string;
  yearFrom?: number;
  yearTo?: number;
  patentNumber?: string;
  patentType?: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<PatentSearchResult> {
  const q = JSON.stringify(buildPatentQuery(params));
  const f = JSON.stringify([
    "patent_number",
    "patent_title",
    "patent_date",
    "patent_abstract",
    "patent_type",
    "patent_num_claims",
    "assignee_organization",
    "inventor_first_name",
    "inventor_last_name",
    "cpc_group_id",
  ]);
  const o = JSON.stringify({
    page: params.page || 1,
    per_page: Math.min(params.perPage || 25, 50),
  });
  const s = JSON.stringify([{
    [params.sortBy || "patent_date"]: params.sortOrder || "desc",
  }]);

  const res = await api.get<{
    patents?: Record<string, unknown>[];
    total_patent_count?: number;
    count?: number;
  }>("/patents/query", { q, f, o, s });

  const patents = (res.patents ?? []).map(mapPatent);

  return {
    total: res.total_patent_count ?? res.count ?? patents.length,
    patents,
  };
}

/**
 * Get details for a specific patent by number.
 */
export async function getPatent(patentNumber: string): Promise<Patent | null> {
  const result = await searchPatents({ patentNumber, perPage: 1 });
  return result.patents[0] ?? null;
}

/**
 * Search for inventors by name or location.
 */
export async function searchInventors(params: {
  name?: string;
  firstName?: string;
  lastName?: string;
  state?: string;
  country?: string;
  page?: number;
  perPage?: number;
}): Promise<InventorSearchResult> {
  const conditions: Record<string, unknown>[] = [];

  if (params.name) {
    conditions.push({
      _or: [
        { _text_any: { inventor_first_name: params.name } },
        { _text_any: { inventor_last_name: params.name } },
      ],
    });
  }
  if (params.firstName) {
    conditions.push({ _text_any: { inventor_first_name: params.firstName } });
  }
  if (params.lastName) {
    conditions.push({ _text_any: { inventor_last_name: params.lastName } });
  }
  if (params.state) {
    conditions.push({ _eq: { inventor_state: params.state } });
  }
  if (params.country) {
    conditions.push({ _eq: { inventor_country: params.country } });
  }

  const q = JSON.stringify(
    conditions.length === 0
      ? { _gte: { patent_date: "2024-01-01" } }
      : conditions.length === 1
        ? conditions[0]
        : { _and: conditions },
  );

  const f = JSON.stringify([
    "inventor_id",
    "inventor_first_name",
    "inventor_last_name",
    "inventor_city",
    "inventor_state",
    "inventor_country",
    "patent_number",
  ]);
  const o = JSON.stringify({
    page: params.page || 1,
    per_page: Math.min(params.perPage || 25, 50),
  });

  const res = await api.get<{
    inventors?: Record<string, unknown>[];
    total_inventor_count?: number;
    count?: number;
  }>("/inventors/query", { q, f, o });

  // Group by inventor to get patent counts
  const inventorMap = new Map<string, Inventor>();
  for (const r of res.inventors ?? []) {
    const id = String(r.inventor_id ?? "");
    if (!id) continue;
    if (!inventorMap.has(id)) {
      inventorMap.set(id, {
        inventorId: id,
        inventorFirstName: String(r.inventor_first_name ?? ""),
        inventorLastName: String(r.inventor_last_name ?? ""),
        inventorCity: (r.inventor_city as string) || null,
        inventorState: (r.inventor_state as string) || null,
        inventorCountry: (r.inventor_country as string) || null,
        patentCount: 0,
      });
    }
    inventorMap.get(id)!.patentCount += 1;
  }

  return {
    total: res.total_inventor_count ?? res.count ?? inventorMap.size,
    inventors: Array.from(inventorMap.values()),
  };
}

/**
 * Search for assignees (companies/organizations) by name or location.
 */
export async function searchAssignees(params: {
  organization?: string;
  state?: string;
  country?: string;
  type?: string;
  page?: number;
  perPage?: number;
}): Promise<AssigneeSearchResult> {
  const conditions: Record<string, unknown>[] = [];

  if (params.organization) {
    conditions.push({ _text_any: { assignee_organization: params.organization } });
  }
  if (params.state) {
    conditions.push({ _eq: { assignee_state: params.state } });
  }
  if (params.country) {
    conditions.push({ _eq: { assignee_country: params.country } });
  }
  if (params.type) {
    conditions.push({ _eq: { assignee_type: params.type } });
  }

  const q = JSON.stringify(
    conditions.length === 0
      ? { _gte: { patent_date: "2024-01-01" } }
      : conditions.length === 1
        ? conditions[0]
        : { _and: conditions },
  );

  const f = JSON.stringify([
    "assignee_id",
    "assignee_organization",
    "assignee_type",
    "assignee_city",
    "assignee_state",
    "assignee_country",
    "patent_number",
  ]);
  const o = JSON.stringify({
    page: params.page || 1,
    per_page: Math.min(params.perPage || 25, 50),
  });

  const res = await api.get<{
    assignees?: Record<string, unknown>[];
    total_assignee_count?: number;
    count?: number;
  }>("/assignees/query", { q, f, o });

  // Group by assignee
  const assigneeMap = new Map<string, Assignee>();
  for (const r of res.assignees ?? []) {
    const id = String(r.assignee_id ?? "");
    if (!id) continue;
    if (!assigneeMap.has(id)) {
      assigneeMap.set(id, {
        assigneeId: id,
        assigneeOrganization: (r.assignee_organization as string) || null,
        assigneeType: (r.assignee_type as string) || null,
        assigneeCity: (r.assignee_city as string) || null,
        assigneeState: (r.assignee_state as string) || null,
        assigneeCountry: (r.assignee_country as string) || null,
        patentCount: 0,
      });
    }
    assigneeMap.get(id)!.patentCount += 1;
  }

  return {
    total: res.total_assignee_count ?? res.count ?? assigneeMap.size,
    assignees: Array.from(assigneeMap.values()),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function mapPatent(r: Record<string, unknown>): Patent {
  // Inventors may be nested array or flat
  const inventorFirst = r.inventor_first_name;
  const inventorLast = r.inventor_last_name;
  let inventorNames: string[] = [];

  if (Array.isArray(inventorFirst)) {
    inventorNames = inventorFirst.map((f: string, i: number) => {
      const last = Array.isArray(inventorLast) ? inventorLast[i] : inventorLast;
      return `${f} ${last ?? ""}`.trim();
    });
  } else if (typeof inventorFirst === "string") {
    inventorNames = [`${inventorFirst} ${inventorLast ?? ""}`.trim()];
  }

  // CPC may be array or flat
  const cpcRaw = r.cpc_group_id;
  const cpcGroup = Array.isArray(cpcRaw) ? cpcRaw[0] : (cpcRaw as string) || null;

  // Assignee may be array or flat
  const assigneeRaw = r.assignee_organization;
  const assigneeOrg = Array.isArray(assigneeRaw) ? assigneeRaw[0] : (assigneeRaw as string) || null;

  return {
    patentNumber: String(r.patent_number ?? ""),
    patentTitle: String(r.patent_title ?? ""),
    patentDate: String(r.patent_date ?? ""),
    patentAbstract: r.patent_abstract ? String(r.patent_abstract).substring(0, 500) : null,
    patentType: (r.patent_type as string) || null,
    numClaims: r.patent_num_claims != null ? Number(r.patent_num_claims) : null,
    assigneeOrganization: assigneeOrg,
    inventorNames,
    cpcGroup: cpcGroup || null,
  };
}

// ─── Cache management ────────────────────────────────────────────────

/**
 * Clear Cache.
 */
export function clearCache(): void {
  api.clearCache();
}
