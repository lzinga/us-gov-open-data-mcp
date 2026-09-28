/**
 * Senate Lobbying Disclosure Act (LDA) SDK — lobbying filings, contributions, registrants, and clients.
 *
 * API docs: https://lda.gov/api/v1/ (Django REST framework, self-documenting)
 * API key optional: anonymous access is limited to 15 requests/minute; set
 * LDA_API_KEY (register at https://lda.gov/api/register/) for 120/minute.
 * Returns paginated JSON (max 25 results per page).
 *
 * Usage:
 *   import { searchFilings, searchContributions } from "us-gov-open-data-mcp/sdk/senate-lobbying";
 *   const filings = await searchFilings({ registrant_name: "Pfizer", filing_year: 2025 });
 */

import { createClient, qp } from "../../shared/client.js";
import { stateAs } from "../../shared/geo.js";

const HAS_KEY = !!process.env.LDA_API_KEY?.trim();

const api = createClient({
  baseUrl: "https://lda.gov/api/v1",
  name: "senate-lobbying",
  auth: { type: "header", envParams: { Authorization: "LDA_API_KEY" }, prefix: "Token " },
  // lda.gov allows 15 req/min anonymously and 120 req/min with a key.
  rateLimit: HAS_KEY ? { perSecond: 1.9, burst: 4 } : { perSecond: 0.2, burst: 3 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
  timeoutMs: 30_000,
});

/** lda.gov caps page_size at 25. */
export const LDA_MAX_PAGE_SIZE = 25;

/**
 * Most filings scanned when filtering by issue code. The LDA API has no
 * issue-code filter, so matching happens client-side over the filings that
 * match the server-side filters.
 */
export const ISSUE_SCAN_MAX_FILINGS = 200;

// ─── Types ───────────────────────────────────────────────────────────

/** Lda Paginated. */
export interface LdaPaginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Lda Filing. */
export interface LdaFiling {
  filing_uuid: string;
  filing_type: string;
  filing_type_display: string;
  filing_year: number;
  filing_period_display: string;
  filing_document_url: string;
  income: string | null;
  expenses: string | null;
  registrant: { id: number; name: string; description: string | null } | null;
  client: { id: number; name: string; general_description: string | null } | null;
  lobbying_activities: LdaActivity[];
  posted_by_name: string;
  dt_posted: string;
  [key: string]: unknown;
}

/** Lda Activity. */
export interface LdaActivity {
  general_issue_code: string;
  general_issue_code_display: string;
  description: string;
  lobbyists: { lobbyist_full_display_name: string | null }[];
}

/** Lda Contribution Item. */
export interface LdaContributionItem {
  contribution_type: string;
  contribution_type_display: string;
  contributor_name: string;
  payee_name: string;
  honoree_name: string;
  amount: string;
  date: string;
}

/** Lda Contribution. */
export interface LdaContribution {
  filing_uuid: string;
  filing_type_display: string;
  filing_year: number;
  filing_period_display: string;
  filer_type_display: string;
  registrant: { name: string } | null;
  lobbyist: { first_name: string; last_name: string; prefix_display: string } | null;
  no_contributions: boolean;
  contribution_items: LdaContributionItem[];
  [key: string]: unknown;
}

/** Lda Registrant. */
export interface LdaRegistrant {
  id: number;
  name: string;
  description: string | null;
  address_1: string;
  city: string;
  state: string;
  contact_name: string;
  contact_telephone: string;
  [key: string]: unknown;
}

/** Lda Client. */
export interface LdaClient {
  id: number;
  client_id: number;
  name: string;
  general_description: string | null;
  state: string;
  country_display: string;
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Filing type codes */
export const FILING_TYPES = {
  Q1: "1st Quarter Report",
  Q2: "2nd Quarter Report",
  Q3: "3rd Quarter Report",
  Q4: "4th Quarter Report",
  MM: "Mid-Year Report",
  MY: "Year-End Report",
  RN: "Registration (New)",
  RA: "Registration Amendment",
  RR: "Registration Renewal",
  TE: "Termination",
} as const;

/** General issue area codes (most common) */
export const ISSUE_CODES = {
  HCR: "Health Issues",
  MMM: "Medicare/Medicaid",
  TAX: "Taxation/Internal Revenue Code",
  BUD: "Budget/Appropriations",
  DEF: "Defense",
  ENV: "Environment/Superfund",
  ENG: "Energy/Nuclear",
  TRD: "Trade (Domestic/Foreign)",
  FIN: "Financial Institutions/Investments/Securities",
  TEC: "Science/Technology",
  EDU: "Education",
  IMM: "Immigration",
  LBR: "Labor Issues/Antitrust/Workplace",
  TRA: "Transportation",
  AGR: "Agriculture",
  HOM: "Housing",
  CPT: "Consumer Issues/Safety/Products",
  DIS: "Disaster Planning/Emergencies",
  GOV: "Government Issues",
  LAW: "Law Enforcement/Crime/Criminal Justice",
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/** Server-side filing filters (lda.gov/api/redoc/v1). Text fields support LDA's advanced text search. */
export interface FilingFilters {
  filing_year?: number;
  filing_type?: string;
  /** "first_quarter", "second_quarter", "third_quarter", "fourth_quarter", "mid_year", "year_end". */
  filing_period?: string;
  registrant_name?: string;
  client_name?: string;
  /** Two-letter state of the client. */
  client_state?: string;
  lobbyist_name?: string;
  /** Former government position of a listed lobbyist, e.g. "Chief of Staff" or "Senator". */
  lobbyist_covered_position?: string;
  /** Text of the specific lobbying issues, e.g. "semiconductor". */
  filing_specific_lobbying_issues?: string;
  foreign_entity_name?: string;
  /** Two-letter country code of a foreign entity, e.g. "CN". */
  foreign_entity_country?: string;
  filing_amount_reported_min?: number;
  filing_amount_reported_max?: number;
  /** Posted on or after, YYYY-MM-DD. */
  filing_dt_posted_after?: string;
  /** Posted on or before, YYYY-MM-DD. */
  filing_dt_posted_before?: string;
}

const FILTER_KEYS: (keyof FilingFilters)[] = [
  "filing_year", "filing_type", "filing_period", "registrant_name", "client_name", "client_state", "lobbyist_name",
  "lobbyist_covered_position", "filing_specific_lobbying_issues", "foreign_entity_name", "foreign_entity_country",
  "filing_amount_reported_min", "filing_amount_reported_max", "filing_dt_posted_after", "filing_dt_posted_before",
];

/** Search lobbying filings — the core data showing who lobbied, for whom, on what, and how much. */
export async function searchFilings(opts: FilingFilters & {
  page_size?: number;
  page?: number;
}): Promise<LdaPaginated<LdaFiling>> {
  const filters: Record<string, string | number | undefined> = {};
  for (const k of FILTER_KEYS) filters[k] = opts[k];
  if (opts.client_state) filters.client_state = stateAs(opts.client_state, "usps").toUpperCase();
  if (opts.foreign_entity_country) filters.foreign_entity_country = opts.foreign_entity_country.toUpperCase();
  const params = qp({
    page_size: Math.min(opts.page_size || 20, LDA_MAX_PAGE_SIZE),
    ...filters,
    page: opts.page,
  });

  return api.get<LdaPaginated<LdaFiling>>("/filings/", params);
}

/** Result of a client-side issue-code scan. */
export interface IssueScanResult {
  /** Matching filings (at most `limit`). */
  filings: LdaFiling[];
  /** Filings examined. */
  scanned: number;
  /** Matches found among the scanned filings (may exceed `filings.length`). */
  matched: number;
  /** Filings matching the server-side filters (before the issue-code filter). */
  baseTotal: number;
  /** True when the scan stopped before examining every base filing. */
  truncated: boolean;
}

/**
 * Filings that lobbied on a general issue code (e.g. "TAX", "HCR").
 *
 * The LDA API has no issue-code filter (unknown query parameters are silently
 * ignored), so this pages through filings matching the server-side filters and
 * keeps those whose lobbying activities include the code. Requires a
 * registrant or client name to keep the scan small; examines at most
 * ISSUE_SCAN_MAX_FILINGS filings. The total number of matches is unknown
 * unless `truncated` is false.
 */
export async function searchFilingsByIssue(opts: FilingFilters & {
  issue_code: string;
  limit?: number;
}): Promise<IssueScanResult> {
  if (!opts.registrant_name && !opts.client_name) {
    throw new Error(
      "issue_code filtering needs registrant_name or client_name: the LDA API has no issue-code filter, " +
      "so matching filings are found by scanning a registrant's or client's filings.",
    );
  }
  const code = opts.issue_code.toUpperCase();
  const limit = opts.limit ?? 20;
  const matches: LdaFiling[] = [];
  let scanned = 0;
  let baseTotal = 0;
  let exhausted = false;

  for (let page = 1; scanned < ISSUE_SCAN_MAX_FILINGS; page++) {
    const { issue_code: _code, limit: _limit, ...filters } = opts;
    const res = await searchFilings({
      ...filters,
      page_size: LDA_MAX_PAGE_SIZE,
      page,
    });
    baseTotal = res.count;
    for (const filing of res.results ?? []) {
      scanned++;
      if (filing.lobbying_activities?.some(a => a.general_issue_code?.toUpperCase() === code)) {
        matches.push(filing);
      }
    }
    if (!res.next || !res.results?.length) {
      exhausted = true;
      break;
    }
    if (matches.length >= limit) break;
  }

  return {
    filings: matches.slice(0, limit),
    scanned,
    matched: matches.length,
    baseTotal,
    truncated: !exhausted,
  };
}

/** Get a specific filing by UUID — includes full lobbying activity detail. */
export async function getFilingDetail(uuid: string): Promise<LdaFiling> {
  return api.get<LdaFiling>(`/filings/${uuid}/`);
}

/** Search lobbying contributions (campaign donations by lobbyists). */
export async function searchContributions(opts: {
  filing_year?: number;
  registrant_name?: string;
  lobbyist_name?: string;
  page_size?: number;
}): Promise<LdaPaginated<LdaContribution>> {
  const params = qp({
    page_size: opts.page_size || 20,
    filing_year: opts.filing_year,
    registrant_name: opts.registrant_name,
    lobbyist_name: opts.lobbyist_name,
  });

  return api.get<LdaPaginated<LdaContribution>>("/contributions/", params);
}

/** Search lobbying registrants (lobbying firms and organizations). */
export async function searchRegistrants(opts: {
  registrant_name?: string;
  page_size?: number;
}): Promise<LdaPaginated<LdaRegistrant>> {
  const params = qp({
    page_size: opts.page_size || 20,
    registrant_name: opts.registrant_name,
  });

  return api.get<LdaPaginated<LdaRegistrant>>("/registrants/", params);
}

/** Search lobbying clients (who hired lobbyists). */
export async function searchClients(opts: {
  client_name?: string;
  page_size?: number;
}): Promise<LdaPaginated<LdaClient>> {
  const params = qp({
    page_size: opts.page_size || 20,
    client_name: opts.client_name,
  });

  return api.get<LdaPaginated<LdaClient>>("/clients/", params);
}

/** Search individual lobbyists by name. */
export async function searchLobbyists(opts: {
  lobbyist_name?: string;
  registrant_name?: string;
  page_size?: number;
  page?: number;
}): Promise<LdaPaginated<{ id: number; prefix?: string; first_name?: string; last_name?: string; suffix?: string; registrant?: { name: string }; [key: string]: unknown }>> {
  const params = qp({
    page_size: opts.page_size || 20,
    lobbyist_name: opts.lobbyist_name,
    registrant_name: opts.registrant_name,
    page: opts.page,
  });

  return api.get("/lobbyists/", params);
}

/**
 * Clear Cache.
 */
export function clearCache(): void { api.clearCache(); }
