/**
 * DOJ News SDK — typed API client for the Department of Justice News API.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchPressReleases, getPressRelease, searchBlogEntries } from "us-gov-open-data-mcp/sdk/doj-news";
 *
 *   const releases = await searchPressReleases({ sort: "date", direction: "DESC", pagesize: 10 });
 *   const detail = await getPressRelease("98baba74-8922-41de-95f1-73a82695a3d1");
 *   const blogs = await searchBlogEntries({ pagesize: 5 });
 *
 * No API key required. Rate limit: 4 requests/second.
 * Docs: https://www.justice.gov/developer/api-documentation/api_v1
 */

import { createClient } from "../../shared/client.js";
import { htmlToText } from "../../shared/html.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://www.justice.gov/api/v1",
  name: "doj-news",
  rateLimit: { perSecond: 4, burst: 8 },
  cacheTtlMs: 30 * 60 * 1000, // 30 minutes — press releases update frequently
});

// ─── Types ───────────────────────────────────────────────────────────

/** Doj Component. */
export interface DojComponent {
  uuid: string;
  name: string;
}

/** Doj Topic. */
export interface DojTopic {
  uuid: string;
  name: string;
}

/** Doj Press Release. */
export interface DojPressRelease {
  uuid?: string;
  title?: string;
  body?: string;
  teaser?: string;
  date?: string;
  created?: string;
  changed?: string;
  url?: string;
  component?: DojComponent[];
  topic?: DojTopic[];
  attachment?: string;
  image?: string;
  number?: string;
  [key: string]: unknown;
}

/** Doj Blog Entry. */
export interface DojBlogEntry {
  uuid?: string;
  title?: string;
  body?: string;
  teaser?: string;
  date?: string;
  created?: string;
  changed?: string;
  url?: string;
  component?: DojComponent[];
  topic?: string;
  image?: string;
  attachments?: string;
  [key: string]: unknown;
}

/** Doj API Response. */
export interface DojApiResponse<T> {
  metadata: {
    responseInfo: { status: number };
    resultset: { count: string; pagesize: string | number; page: number };
    executionTime: number;
  };
  results: T[];
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Common DOJ components (divisions/agencies). */
export const COMPONENTS = {
  "Office of the Attorney General": "AG",
  "Office of Public Affairs": "OPA",
  "Civil Rights Division": "CRT",
  "Civil Division": "CIV",
  "Criminal Division": "CRM",
  "National Security Division": "NSD",
  "Antitrust Division": "ATR",
  "Environment and Natural Resources Division": "ENRD",
  "Tax Division": "TAX",
  "Drug Enforcement Administration (DEA)": "DEA",
  "Federal Bureau of Investigation (FBI)": "FBI",
  "Bureau of Alcohol, Tobacco, Firearms and Explosives (ATF)": "ATF",
  "U.S. Marshals Service (USMS)": "USMS",
  "Bureau of Prisons (BOP)": "BOP",
  "Office of Justice Programs (OJP)": "OJP",
  "U.S. Attorneys (USAO)": "USAO",
} as const;

/** Common topics used in DOJ press releases. */
export const TOPICS = [
  "Antitrust",
  "Civil Rights",
  "Cybercrime",
  "Disability Rights",
  "Drug Trafficking",
  "Elder Justice",
  "Environment",
  "Firearms Offenses",
  "Financial Fraud",
  "Foreign Agents Registration Act",
  "Health Care Fraud",
  "Human Trafficking",
  "Identity Theft",
  "Immigration",
  "National Security",
  "Opioids",
  "Public Corruption",
  "Tax",
  "Terrorism",
  "Violent Crime",
  "Voting",
  "White Collar Crime",
] as const;

/** Available fields for press release API queries. */
export const PRESS_RELEASE_FIELDS = [
  "uuid", "title", "body", "teaser", "date", "created", "changed",
  "url", "component", "topic", "attachment", "image", "number",
] as const;

/** Available fields for blog entry API queries. */
export const BLOG_FIELDS = [
  "uuid", "title", "body", "teaser", "date", "created", "changed",
  "url", "component", "topic", "image", "attachments",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────

function parseDate(unixStr: string | undefined): string | undefined {
  if (!unixStr) return undefined;
  try {
    const ts = parseInt(unixStr, 10);
    if (Number.isNaN(ts)) return unixStr;
    return new Date(ts * 1000).toISOString().slice(0, 10);
  } catch {
    return unixStr;
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search DOJ press releases (262K+ records).
 *
 * Examples:
 *   const latest = await searchPressReleases({ sort: "date", direction: "DESC", pagesize: 10 });
 *   const filtered = await searchPressReleases({ title: "cybercrime", pagesize: 20 });
 */
export async function searchPressReleases(opts?: {
  title?: string;
  date?: string;
  fields?: string;
  page?: number;
  pagesize?: number;
  sort?: string;
  direction?: "ASC" | "DESC";
}): Promise<DojApiResponse<DojPressRelease>> {
  const params: Record<string, string | number | undefined> = {};

  if (opts?.title) params["parameters[title]"] = `"${opts.title}"`;
  if (opts?.date) params["parameters[date]"] = opts.date;
  if (opts?.fields) params.fields = opts.fields;
  if (opts?.page !== undefined) params.page = opts.page;
  params.pagesize = opts?.pagesize ?? 20;
  if (opts?.sort) params.sort = opts.sort;
  if (opts?.direction) params.direction = opts.direction;

  return api.get<DojApiResponse<DojPressRelease>>("/press_releases.json", params);
}

/**
 * Get a specific press release by UUID.
 *
 * Example:
 *   const pr = await getPressRelease("98baba74-8922-41de-95f1-73a82695a3d1");
 */
export async function getPressRelease(
  uuid: string,
  fields?: string,
): Promise<DojApiResponse<DojPressRelease>> {
  const params: Record<string, string | undefined> = {};
  if (fields) params.fields = fields;
  return api.get<DojApiResponse<DojPressRelease>>(`/press_releases/${uuid}.json`, params);
}

/**
 * Search DOJ blog entries (3,200+ records).
 *
 * Examples:
 *   const latest = await searchBlogEntries({ sort: "date", direction: "DESC", pagesize: 5 });
 */
export async function searchBlogEntries(opts?: {
  fields?: string;
  page?: number;
  pagesize?: number;
  sort?: string;
  direction?: "ASC" | "DESC";
}): Promise<DojApiResponse<DojBlogEntry>> {
  const params: Record<string, string | number | undefined> = {};

  if (opts?.fields) params.fields = opts.fields;
  if (opts?.page !== undefined) params.page = opts.page;
  params.pagesize = opts?.pagesize ?? 20;
  if (opts?.sort) params.sort = opts.sort;
  if (opts?.direction) params.direction = opts.direction;

  return api.get<DojApiResponse<DojBlogEntry>>("/blog_entries.json", params);
}

/**
 * Get a specific blog entry by UUID.
 *
 * Example:
 *   const blog = await getBlogEntry("52f344c4-1ab8-48b5-a130-711e6a6f311d");
 */
export async function getBlogEntry(
  uuid: string,
  fields?: string,
): Promise<DojApiResponse<DojBlogEntry>> {
  const params: Record<string, string | undefined> = {};
  if (fields) params.fields = fields;
  return api.get<DojApiResponse<DojBlogEntry>>(`/blog_entries/${uuid}.json`, params);
}

/** Parse a DOJ press release for display: extract date, clean HTML from body/teaser. */
export function summarizePressRelease(pr: DojPressRelease): string {
  const parts: string[] = [];
  parts.push(pr.title ?? "Untitled");
  const date = parseDate(pr.date);
  if (date) parts.push(`Date: ${date}`);
  const components = pr.component?.map(c => c.name).join(", ");
  if (components) parts.push(`Component: ${components}`);
  const topics = Array.isArray(pr.topic)
    ? pr.topic.map(t => t.name).join(", ")
    : typeof pr.topic === "string" ? pr.topic : undefined;
  if (topics) parts.push(`Topic: ${topics}`);
  if (pr.url) parts.push(`URL: ${pr.url}`);
  if (pr.teaser) {
    const cleanTeaser = htmlToText(pr.teaser).slice(0, 300);
    if (cleanTeaser) parts.push(`Summary: ${cleanTeaser}`);
  }
  return parts.join("\n");
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
