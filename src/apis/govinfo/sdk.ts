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
import { htmlToText } from "../../shared/html.js";

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

/** Fetch raw text/HTML content. Uses raw fetch (not the JSON client) since these return HTML/text. Throws on failure. */
async function fetchRawText(url: string): Promise<string> {
  const key = process.env.DATA_GOV_API_KEY || "";
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}api_key=${key}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${new URL(url).pathname}`);
  return await res.text();
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Build a GovInfo search query. GovInfo only filters by collection, congress,
 * or bill type through `field:value` terms inside the query string; the same
 * names sent as separate body fields are silently ignored.
 */
export function buildSearchQuery(params: {
  query: string;
  collection?: string;
  congress?: number;
  billType?: string;
}): string {
  const terms: string[] = [];
  if (params.collection) terms.push(`collection:${params.collection.toUpperCase()}`);
  if (params.congress) terms.push(`congress:${params.congress}`);
  if (params.billType) terms.push(`billtype:${params.billType.toLowerCase()}`);
  if (!terms.length) return params.query;
  return [...terms, `(${params.query})`].join(" AND ");
}

/** Search across all government publications. */
export async function searchPublications(params: {
  query: string;
  collection?: string;
  congress?: number;
  billType?: string;
  pageSize?: number;
}): Promise<SearchResult> {
  const body: Record<string, unknown> = {
    query: buildSearchQuery(params),
    pageSize: params.pageSize ?? 10,
    offsetMark: "*",
  };

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
 *
 * GovInfo serves bill text as pre-formatted plain text wrapped in minimal HTML
 * (`<html><body><pre>`). Download links live under `meta.download`, not at the
 * top-level metadata. We try the htm link first (pre-formatted text), then
 * fall back to granules for older/uncommon packages.
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

  const meta = await getPackageSummary(packageId);
  const download = (meta.download ?? {}) as Record<string, unknown>;

  let text = "";
  let textSource = "";
  const errors: string[] = [];

  // Primary: the htm link is pre-formatted text inside <pre> tags
  const htmLink = download.txtLink ?? download.htmlLink ?? meta.htmlLink ?? meta.txtLink;
  if (htmLink) {
    try {
      const raw = await fetchRawText(htmLink as string);
      if (raw) { text = htmlToText(raw); textSource = "GovInfo text"; }
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  // Fallback: try granule-level text for packages without a top-level download
  if (!text) {
    const granules = await getPackageGranules(packageId, 5);
    for (const g of granules) {
      const gLink = (g as Record<string, unknown>).htmlLink ?? (g as Record<string, unknown>).txtLink;
      if (!gLink) continue;
      try {
        const raw = await fetchRawText(gLink as string);
        if (raw) { text = htmlToText(raw); textSource = "GovInfo granule"; break; }
      } catch (err) {
        errors.push((err as Error).message);
      }
    }
  }

  // A download link existed but every fetch failed: report it rather than
  // returning an empty text that looks like "this bill has no text".
  if (!text && errors.length) {
    throw new Error(`govinfo: could not load text for ${packageId} (${errors.join("; ")})`);
  }

  const maxLen = opts.maxLength === 0 ? Infinity : (opts.maxLength || 100_000);
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
