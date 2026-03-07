/**
 * FEC SDK — typed API client for OpenFEC (Federal Election Commission).
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchCandidates, getCandidateFinancials } from "us-gov-open-data-mcp/sdk/fec";
 *
 * Requires DATA_GOV_API_KEY env var. Get one at https://api.data.gov/signup/
 * Docs: https://api.open.fec.gov/developers/
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.open.fec.gov/v1",
  name: "fec",
  auth: { type: "query", envParams: { api_key: "DATA_GOV_API_KEY" } },
  rateLimit: { perSecond: 3, burst: 10 }, // 1000 req/hour ≈ ~0.28/s, burst for interactive use
  cacheTtlMs: 30 * 60 * 1000, // 30 min
});

// ─── Types ───────────────────────────────────────────────────────────

/** Fec Pagination. */
export interface FecPagination {
  page: number;
  per_page: number;
  count: number;
  pages: number;
}

/** Fec Candidate. */
export interface FecCandidate {
  candidate_id: string;
  name: string;
  party: string;
  party_full?: string;
  office: string;
  office_full?: string;
  state?: string;
  district?: string;
  election_years?: number[];
  candidate_status?: string;
  incumbent_challenge?: string;
  incumbent_challenge_full?: string;
  has_raised_funds?: boolean;
  [key: string]: unknown;
}

/** Fec Committee. */
export interface FecCommittee {
  committee_id: string;
  name: string;
  committee_type: string;
  committee_type_full?: string;
  party?: string;
  party_full?: string;
  state?: string;
  designation?: string;
  designation_full?: string;
  filing_frequency?: string;
  [key: string]: unknown;
}

/** Fec Financial Totals. */
export interface FecFinancialTotals {
  cycle: number;
  receipts: number;
  disbursements: number;
  cash_on_hand_end_period?: number;
  last_cash_on_hand_end_period?: number;
  debts_owed_by_committee?: number;
  last_debts_owed_by_committee?: number;
  individual_contributions?: number;
  other_political_committee_contributions?: number;
  political_party_committee_contributions?: number;
  independent_expenditures?: number;
  coverage_start_date?: string;
  coverage_end_date?: string;
  committee_type?: string;
  committee_type_full?: string;
  [key: string]: unknown;
}

/** Fec Candidate Totals. */
export interface FecCandidateTotals {
  name: string;
  candidate_id?: string;
  party?: string;
  party_full?: string;
  state?: string;
  receipts: number;
  disbursements: number;
  cash_on_hand_end_period?: number;
  [key: string]: unknown;
}

/** Fec Search Result. */
export interface FecSearchResult<T> {
  pagination: FecPagination;
  results: T[];
}

/** Fec Disbursement. */
export interface FecDisbursement {
  committee_id: string;
  committee: { name: string; committee_id: string; party?: string } | null;
  recipient_name: string;
  recipient_committee_id: string | null;
  recipient_committee: { name: string; committee_id: string; party?: string; committee_type_full?: string } | null;
  disbursement_amount: number;
  disbursement_date: string;
  disbursement_description: string;
  recipient_state: string | null;
  line_number_label: string | null;
  memo_text: string | null;
  [key: string]: unknown;
}
// ─── Reference Data ──────────────────────────────────────────────────────

/** FEC candidate status codes. */
export const CANDIDATE_STATUS = {
  C: "Current candidate",
  F: "Future candidate",
  N: "Not yet a candidate",
  P: "Prior candidate",
} as const;

/** FEC committee type codes. */
export const COMMITTEE_TYPES = {
  P: "Presidential",
  H: "House",
  S: "Senate",
  N: "PAC - Nonqualified",
  Q: "PAC - Qualified",
  X: "Party - Nonqualified",
  Y: "Party - Qualified",
  I: "Independent Expenditor",
  O: "Super PAC",
} as const;

/** FEC office name codes. */
export const OFFICE_NAMES = {
  H: "House",
  S: "Senate",
  P: "President",
} as const;
// ─── Public API ──────────────────────────────────────────────────────

/** Search for federal election candidates by name, state, party, office, or election year. */
export async function searchCandidates(opts: {
  name?: string;
  state?: string;
  party?: string;
  office?: string;
  election_year?: number;
  page?: number;
  per_page?: number;
} = {}): Promise<FecSearchResult<FecCandidate>> {
  return api.get<FecSearchResult<FecCandidate>>("/candidates/search/", {
    q: opts.name,
    state: opts.state,
    party: opts.party,
    office: opts.office,
    election_year: opts.election_year,
    page: opts.page ?? 1,
    per_page: opts.per_page ?? 20,
    sort: "-first_file_date",
  });
}

/** Search for political committees (PACs, campaign committees, party committees). */
export async function searchCommittees(opts: {
  name?: string;
  state?: string;
  committee_type?: string;
  cycle?: number;
  page?: number;
  per_page?: number;
} = {}): Promise<FecSearchResult<FecCommittee>> {
  return api.get<FecSearchResult<FecCommittee>>("/committees/", {
    q: opts.name,
    state: opts.state,
    committee_type: opts.committee_type,
    cycle: opts.cycle,
    page: opts.page ?? 1,
    per_page: opts.per_page ?? 20,
  });
}

/** Get financial summary for a candidate. */
export async function getCandidateFinancials(
  candidateId: string,
  cycle?: number,
): Promise<FecFinancialTotals[]> {
  const params: Record<string, string | number | undefined> = {};
  if (cycle) params.cycle = cycle;
  const res = await api.get<FecSearchResult<FecFinancialTotals>>(
    `/candidate/${candidateId}/totals/`, params,
  );
  return res.results ?? [];
}

/** Get financial totals for a committee (PAC, campaign, party). */
export async function getCommitteeFinancials(
  committeeId: string,
  cycle?: number,
): Promise<FecFinancialTotals[]> {
  const params: Record<string, string | number | undefined> = {};
  if (cycle) params.cycle = cycle;
  const res = await api.get<FecSearchResult<FecFinancialTotals>>(
    `/committee/${committeeId}/totals/`, params,
  );
  return res.results ?? [];
}

/** Get top candidates ranked by total money raised for a given office and cycle. */
export async function getTopCandidates(opts: {
  office: string;
  election_year: number;
  state?: string;
  per_page?: number;
}): Promise<FecSearchResult<FecCandidateTotals>> {
  return api.get<FecSearchResult<FecCandidateTotals>>("/candidates/totals/", {
    office: opts.office,
    election_year: opts.election_year,
    state: opts.state,
    sort: "-receipts",
    sort_null_only: "false",
    per_page: opts.per_page ?? 20,
    page: 1,
    is_active_candidate: "true",
  });
}

/** Get itemized disbursements (Schedule B) for a committee — shows exactly who received money. */
export async function getCommitteeDisbursements(opts: {
  committee_id: string;
  cycle?: number;
  recipient_name?: string;
  per_page?: number;
  sort?: string;
}): Promise<FecSearchResult<FecDisbursement>> {
  const params: Record<string, string | number | undefined> = {
    committee_id: opts.committee_id,
    per_page: opts.per_page ?? 20,
    sort: opts.sort ?? "-disbursement_date",
    sort_null_only: "false",
  };
  if (opts.cycle) params.two_year_transaction_period = opts.cycle;
  if (opts.recipient_name) params.recipient_name = opts.recipient_name;

  return api.get<FecSearchResult<FecDisbursement>>("/schedules/schedule_b/", params);
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
