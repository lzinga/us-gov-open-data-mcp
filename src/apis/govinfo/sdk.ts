/**
 * GovInfo SDK — typed API client for GovInfo (Government Publishing Office).
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchPublications, getBillText } from "us-gov-open-data-mcp/sdk/govinfo";
 *
 *   const results = await searchPublications({ query: "infrastructure" });
 *   const bill = await getBillText({ congress: 117, billType: "hr", billNumber: 5376 });
 *
 * Requires DATA_GOV_API_KEY env var. Get one at https://api.data.gov/signup/
 * (Same key used by FBI Crime Data.)
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.govinfo.gov",
  name: "govinfo",
  auth: { type: "query", envParams: { api_key: "DATA_GOV_API_KEY" } },
  rateLimit: { perSecond: 3, burst: 8 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour — published docs don't change
});

// ─── Types ───────────────────────────────────────────────────────────

/** Publication Result. */
export interface PublicationResult {
  title: string;
  packageId: string;
  dateIssued: string;
  collectionCode: string;
}

/** Search Result. */
export interface SearchResult {
  total: number;
  results: PublicationResult[];
}

/** Bill Text Result. */
export interface BillTextResult {
  packageId: string;
  title: string;
  dateIssued: string | null;
  pages: number | string | null;
  textSource: string | null;
  textLength: number;
  truncated: boolean;
  text: string;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** GovInfo collection codes. */
export const collections = {
  BILLS: "Congressional Bills",
  BILLSTATUS: "Congressional Bill Status",
  BILLSUM: "Congressional Bill Summaries",
  PLAW: "Public Laws",
  STATUTE: "Statutes at Large",
  CRPT: "Congressional Reports (committee reports)",
  CREC: "Congressional Record (daily edition)",
  CRECB: "Congressional Record (bound edition)",
  CDOC: "Congressional Documents",
  CHRG: "Congressional Hearings",
  FR: "Federal Register",
  CFR: "Code of Federal Regulations",
  CPD: "Compilation of Presidential Documents",
  BUDGET: "United States Budget",
  ECFR: "Electronic Code of Federal Regulations",
  GAOREPORTS: "GAO Reports and Comptroller General Decisions",
  GOVPUB: "Government Publications",
  HJOURNAL: "House Journal",
  SJOURNAL: "Senate Journal",
  USCODE: "United States Code",
  USCOURTS: "United States Courts Opinions",
} as const;

/** Package ID format for bills. */
export const billVersions = {
  enr: "Enrolled (signed by President)",
  eh: "Engrossed in House (passed House)",
  es: "Engrossed in Senate (passed Senate)",
  ih: "Introduced in House",
  is: "Introduced in Senate",
  rh: "Reported in House",
  rs: "Reported in Senate",
  pcs: "Placed on Calendar Senate",
  ats: "Agreed to Senate",
} as const;

// ─── Internal Helpers ────────────────────────────────────────────────

/** Fetch raw text/HTML content. Uses raw fetch (not the JSON client) since these return HTML/text. */
async function fetchRawText(url: string): Promise<string | null> {
  const key = process.env.DATA_GOV_API_KEY || "";
  const sep = url.includes("?") ? "&" : "?";
  try {
    const res = await fetch(`${url}${sep}api_key=${key}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Strip HTML tags and normalize whitespace. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Public API ──────────────────────────────────────────────────────

/** Search across all government publications. */
export async function searchPublications(params: {
  query: string;
  collection?: string;
  congress?: number;
  pageSize?: number;
}): Promise<SearchResult> {
  const body: Record<string, unknown> = {
    query: params.query,
    pageSize: params.pageSize ?? 10,
    offsetMark: "*",
  };
  if (params.collection) body.collection = params.collection;
  if (params.congress) body.congress = params.congress;

  const res = await api.post<{ count?: number; results?: Record<string, unknown>[] }>("/search", body);

  return {
    total: res.count ?? res.results?.length ?? 0,
    results: (res.results ?? []).map(r => ({
      title: (r.title as string) || "",
      packageId: (r.packageId as string) || "",
      dateIssued: (r.dateIssued as string) || "",
      collectionCode: (r.collectionCode as string) || "",
    })),
  };
}

/** Search for CBO cost estimates and committee reports. */
export async function searchCboReports(query: string, pageSize?: number): Promise<SearchResult> {
  return searchPublications({
    query: `${query} CBO`,
    collection: "CRPT",
    pageSize: pageSize ?? 10,
  });
}

/** Get a package summary (metadata). */
export async function getPackageSummary(packageId: string): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(`/packages/${packageId}/summary`);
}

/** Get sub-documents (granules) within a package. */
export async function getPackageGranules(packageId: string, pageSize = 5): Promise<Record<string, unknown>[]> {
  const res = await api.get<{ granules?: Record<string, unknown>[] }>(
    `/packages/${packageId}/granules`, { pageSize },
  );
  return res.granules ?? [];
}

/**
 * Get the full text of a bill or enacted law.
 * Multi-step: metadata → HTML link → text link → granules fallback → HTML stripping.
 */
export async function getBillText(opts: {
  congress: number;
  billType: string;
  billNumber: number;
  version?: string;
  maxLength?: number;
}): Promise<BillTextResult> {
  const ver = opts.version || "enr";
  const packageId = `BILLS-${opts.congress}${opts.billType.toLowerCase()}${opts.billNumber}${ver}`;

  // Step 1: get metadata
  const meta = await getPackageSummary(packageId);

  let text = "";
  let textSource = "";

  // Step 2: try HTML, then plain text
  if (meta.htmlLink) {
    const html = await fetchRawText(meta.htmlLink as string);
    if (html) { text = stripHtml(html); textSource = "HTML"; }
  }

  if (!text && meta.txtLink) {
    const txt = await fetchRawText(meta.txtLink as string);
    if (txt) { text = txt; textSource = "Plain text"; }
  }

  // Step 3: fallback to granules
  if (!text) {
    const granules = await getPackageGranules(packageId, 5);
    for (const g of granules) {
      if (g.htmlLink) {
        const html = await fetchRawText(g.htmlLink as string);
        if (html) { text = stripHtml(html); textSource = "Granule HTML"; break; }
      }
    }
  }

  const maxLen = opts.maxLength || 15000;
  const truncated = text.length > maxLen;

  return {
    packageId,
    title: (meta.title as string) || packageId,
    dateIssued: (meta.dateIssued as string) || null,
    pages: (meta.pages as number | string) || null,
    textSource: textSource || null,
    textLength: text.length,
    truncated,
    text: truncated ? text.substring(0, maxLen) : text,
  };
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
