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

/** Itemized individual contribution (Schedule A). */
export interface FecContribution {
  committee_id: string;
  committee_name: string | null;
  committee?: { name?: string; committee_id?: string } | null;
  contributor_name: string | null;
  contributor_employer: string | null;
  contributor_occupation: string | null;
  contributor_city: string | null;
  contributor_state: string | null;
  contributor_zip: string | null;
  contribution_receipt_amount: number | null;
  contribution_receipt_date: string | null;
  receipt_type_full: string | null;
  is_individual: boolean | null;
  candidate_id: string | null;
  candidate_name: string | null;
  memo_text: string | null;
  [key: string]: unknown;
}

/** Itemized independent expenditure line item (Schedule E). */
export interface FecIndependentExpenditure {
  committee_id: string;
  committee_name: string | null;
  committee?: { name?: string; committee_id?: string } | null;
  payee_name: string | null;
  expenditure_amount: number | null;
  expenditure_date: string | null;
  support_oppose_indicator: string | null; // "S" = support, "O" = oppose
  candidate_id: string | null;
  candidate_name: string | null;
  candidate_office_full: string | null;
  expenditure_description: string | null;
  category_code_full: string | null;
  election_type: string | null;
  [key: string]: unknown;
}

/** Independent expenditure totals for a candidate, split by support/oppose (Schedule E totals/by_candidate). */
export interface FecIETotalsByCandidate {
  candidate_id: string;
  cycle: number;
  support_oppose_indicator: string | null;
  total: number;
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

/**
 * Get itemized individual contributions (Schedule A) — who donated, their
 * employer/occupation, amount, and date. Filter by recipient committee and/or
 * contributor attributes. The full dataset is ~123M records, so a filter
 * (committee_id or contributor_name) is strongly recommended.
 */
export async function getIndividualContributions(opts: {
  committee_id?: string;
  contributor_name?: string;
  contributor_employer?: string;
  contributor_occupation?: string;
  contributor_state?: string;
  cycle?: number;          // two_year_transaction_period, e.g. 2024
  min_amount?: number;
  max_amount?: number;
  per_page?: number;
  sort?: string;
}): Promise<FecSearchResult<FecContribution>> {
  const params: Record<string, string | number | undefined> = {
    committee_id: opts.committee_id,
    contributor_name: opts.contributor_name,
    contributor_employer: opts.contributor_employer,
    contributor_occupation: opts.contributor_occupation,
    contributor_state: opts.contributor_state,
    min_amount: opts.min_amount,
    max_amount: opts.max_amount,
    per_page: opts.per_page ?? 20,
    sort: opts.sort ?? "-contribution_receipt_date",
    sort_null_only: "false",
  };
  if (opts.cycle) params.two_year_transaction_period = opts.cycle;
  return api.get<FecSearchResult<FecContribution>>("/schedules/schedule_a/", params);
}

/**
 * Get itemized independent expenditures (Schedule E) — outside spending (Super
 * PACs, etc.) for or against a candidate. Filter by candidate, spending
 * committee, and/or support/oppose indicator.
 */
export async function getIndependentExpenditures(opts: {
  candidate_id?: string;
  committee_id?: string;
  support_oppose?: string; // "S" = support, "O" = oppose
  cycle?: number;
  per_page?: number;
  sort?: string;
}): Promise<FecSearchResult<FecIndependentExpenditure>> {
  return api.get<FecSearchResult<FecIndependentExpenditure>>("/schedules/schedule_e/", {
    candidate_id: opts.candidate_id,
    committee_id: opts.committee_id,
    support_oppose_indicator: opts.support_oppose,
    cycle: opts.cycle,
    per_page: opts.per_page ?? 20,
    sort: opts.sort ?? "-expenditure_date",
    sort_null_only: "false",
  });
}

/**
 * Get total independent expenditures for a candidate, split into supporting vs.
 * opposing (Schedule E totals/by_candidate). Returns exact aggregate totals
 * (2-3 rows: S, O, and occasionally an unspecified row) — no pagination needed.
 */
export async function getOutsideSpendingTotals(opts: {
  candidate_id: string;
  cycle?: number;
  election_full?: boolean; // aggregate across the full election period (default true)
}): Promise<FecIETotalsByCandidate[]> {
  const res = await api.get<FecSearchResult<FecIETotalsByCandidate>>(
    "/schedules/schedule_e/totals/by_candidate/",
    {
      candidate_id: opts.candidate_id,
      cycle: opts.cycle,
      election_full: String(opts.election_full ?? true),
    },
  );
  return res.results ?? [];
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
