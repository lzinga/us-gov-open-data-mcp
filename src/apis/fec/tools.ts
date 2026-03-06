/**
 * fec MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchCandidates,
  searchCommittees,
  getCandidateFinancials,
  getCommitteeFinancials,
  getTopCandidates,
  getCommitteeDisbursements,
  CANDIDATE_STATUS,
  type FecCandidate,
  type FecCommittee,
  type FecFinancialTotals,
} from "./sdk.js";
import { listResponse, tableResponse, emptyResponse } from "../../shared/response.js";

const STATUS_MAP = CANDIDATE_STATUS as Record<string, string>;

function summarizeCandidate(c: FecCandidate) {
  return {
    candidateId: c.candidate_id,
    name: c.name,
    party: c.party_full ?? c.party ?? null,
    office: c.office_full ?? c.office,
    state: c.state ?? null,
    district: c.district ?? null,
    electionYears: c.election_years ?? [],
    status: STATUS_MAP[c.candidate_status as string] ?? c.candidate_status ?? null,
    incumbency: c.incumbent_challenge_full ?? c.incumbent_challenge ?? null,
    hasRaisedFunds: c.has_raised_funds ?? null,
  };
}

function summarizeCommittee(c: FecCommittee) {
  return {
    committeeId: c.committee_id,
    name: c.name,
    type: c.committee_type_full ?? c.committee_type,
    party: c.party_full ?? c.party ?? null,
    state: c.state ?? null,
    designation: c.designation_full ?? c.designation ?? null,
    filingFrequency: c.filing_frequency ?? null,
  };
}

function summarizeFinancials(t: FecFinancialTotals) {
  return {
    cycle: t.cycle,
    receipts: t.receipts ?? 0,
    disbursements: t.disbursements ?? 0,
    cashOnHand: t.cash_on_hand_end_period ?? t.last_cash_on_hand_end_period ?? 0,
    debtOwed: t.debts_owed_by_committee ?? t.last_debts_owed_by_committee ?? 0,
    individualContributions: t.individual_contributions ?? 0,
    pacContributions: t.other_political_committee_contributions ?? 0,
    partyContributions: t.political_party_committee_contributions ?? 0,
    independentExpenditures: t.independent_expenditures ?? 0,
    coverageStart: t.coverage_start_date ?? null,
    coverageEnd: t.coverage_end_date ?? null,
  };
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString()}`;
}

export const tools: Tool<any, any>[] = [
  {
    name: "fec_search_candidates",
    description:
      "Search for federal election candidates by name, state, party, office, or election year. " +
      "Data from the Federal Election Commission (FEC).",
    annotations: { title: "FEC: Search Candidates", readOnlyHint: true },
    parameters: z.object({
      name: z.string().optional().describe("Candidate name to search for"),
      state: z.string().optional().describe("Two-letter state code, e.g. 'CA', 'TX', 'NY'"),
      party: z.string().optional().describe("Three-letter party code: 'DEM', 'REP', 'LIB', 'GRE', etc."),
      office: z.enum(["H", "S", "P"]).optional().describe("Office: H=House, S=Senate, P=President"),
      election_year: z.number().optional().describe("Election year, e.g. 2024"),
      page: z.number().int().positive().optional().describe("Page number (default: 1)"),
      per_page: z.number().int().positive().max(100).optional().describe("Results per page (default: 20, max: 100)"),
    }),
    execute: async ({ name: candidateName, state, party, office, election_year, page, per_page }) => {
      const data = await searchCandidates({
        name: candidateName, state, party, office, election_year, page, per_page,
      });
      const results = data.results ?? [];
      const pag = data.pagination ?? { page: 1, pages: 0, count: 0, per_page: 20 };
      if (!results.length) return emptyResponse("No candidates found.");
      return listResponse(
        `Candidate search: page ${pag.page} of ${pag.pages} (${pag.count} total)`,
        { items: results.map(summarizeCandidate), total: pag.count, meta: { pagination: pag } },
      );
    },
  },

  {
    name: "fec_search_committees",
    description:
      "Search for political committees (PACs, campaign committees, party committees) by name, state, or type.\n" +
      "CRITICAL for investigations: Use committee_type='Q' (Qualified PAC) + name='Company Name' to find corporate PAC IDs.\n" +
      "Example: name='Wells Fargo', committee_type='Q' returns C00034595 (Wells Fargo Employee PAC).\n" +
      "Then use fec_committee_disbursements with the committee_id to trace money to specific politicians.",
    annotations: { title: "FEC: Search Committees", readOnlyHint: true },
    parameters: z.object({
      name: z.string().optional().describe("Committee name to search for"),
      state: z.string().optional().describe("Two-letter state code"),
      committee_type: z.string().optional().describe(
        "Committee type: 'P' (Presidential), 'H' (House), 'S' (Senate), " +
        "'N' (PAC - Nonqualified), 'Q' (PAC - Qualified), 'X' (Party - Nonqualified), " +
        "'Y' (Party - Qualified), 'I' (Independent Expenditor), 'O' (Super PAC)"
      ),
      cycle: z.number().optional().describe("Two-year election cycle, e.g. 2024"),
      page: z.number().int().positive().optional().describe("Page number (default: 1)"),
      per_page: z.number().int().positive().max(100).optional().describe("Results per page (default: 20)"),
    }),
    execute: async ({ name: committeeName, state, committee_type, cycle, page, per_page }) => {
      const data = await searchCommittees({
        name: committeeName, state, committee_type, cycle, page, per_page,
      });
      const results = data.results ?? [];
      const pag = data.pagination ?? { page: 1, pages: 0, count: 0, per_page: 20 };
      if (!results.length) return emptyResponse("No committees found.");
      return listResponse(
        `Committee search: page ${pag.page} of ${pag.pages} (${pag.count} total)`,
        { items: results.map(summarizeCommittee), total: pag.count, meta: { pagination: pag } },
      );
    },
  },

  {
    name: "fec_candidate_financials",
    description:
      "Get financial summary for a candidate — total raised, spent, cash on hand, debt. " +
      "Requires a candidate_id (use fec_search_candidates to find one).",
    annotations: { title: "FEC: Candidate Financials", readOnlyHint: true },
    parameters: z.object({
      candidate_id: z.string().describe("FEC candidate ID, e.g. 'P80001571' (Trump), 'P80000722' (Harris)"),
      cycle: z.number().optional().describe("Two-year election cycle, e.g. 2024"),
    }),
    execute: async ({ candidate_id, cycle }) => {
      const results = await getCandidateFinancials(candidate_id, cycle);
      if (!results.length) return emptyResponse(`No financial data for candidate ${candidate_id}.`);
      const latest = results[0];
      return tableResponse(
        `${candidate_id}: ${results.length} cycle(s), latest receipts ${fmtUsd(latest.receipts ?? 0)}`,
        { rows: results.map(summarizeFinancials), meta: { candidateId: candidate_id } },
      );
    },
  },

  {
    name: "fec_committee_financials",
    description:
      "Get financial totals for a committee (PAC, campaign, party). " +
      "Requires a committee_id (use fec_search_committees to find one).",
    annotations: { title: "FEC: Committee Financials", readOnlyHint: true },
    parameters: z.object({
      committee_id: z.string().describe("FEC committee ID, e.g. 'C00703975'"),
      cycle: z.number().optional().describe("Two-year election cycle, e.g. 2024"),
    }),
    execute: async ({ committee_id, cycle }) => {
      const results = await getCommitteeFinancials(committee_id, cycle);
      if (!results.length) return emptyResponse(`No financial data for committee ${committee_id}.`);
      const latest = results[0];
      return tableResponse(
        `${committee_id}: ${results.length} cycle(s), latest receipts ${fmtUsd(latest.receipts ?? 0)}`,
        { rows: results.map(summarizeFinancials), meta: { committeeId: committee_id } },
      );
    },
  },

  {
    name: "fec_top_candidates",
    description:
      "Get top candidates ranked by total money raised for a given office and election cycle.",
    annotations: { title: "FEC: Top Candidates by Fundraising", readOnlyHint: true },
    parameters: z.object({
      office: z.enum(["H", "S", "P"]).describe("Office: H=House, S=Senate, P=President"),
      election_year: z.number().describe("Election year, e.g. 2024"),
      state: z.string().optional().describe("Two-letter state code to filter by"),
      per_page: z.number().int().positive().max(50).optional().describe("Number of results (default: 20)"),
    }),
    execute: async ({ office, election_year, state, per_page }) => {
      const officeNames: Record<string, string> = { H: "House", S: "Senate", P: "President" };
      const data = await getTopCandidates({ office, election_year, state, per_page });
      const results = data.results ?? [];
      if (!results.length) return emptyResponse(`No results found for ${officeNames[office] ?? office} ${election_year}.`);
      return tableResponse(
        `Top ${officeNames[office] ?? office} candidates by fundraising (${election_year}): ${results.length} results${state ? `, state: ${state}` : ""}`,
        {
          rows: results.map(c => ({
            name: c.name ?? null,
            candidateId: c.candidate_id ?? null,
            party: c.party_full ?? c.party ?? null,
            state: c.state ?? null,
            receipts: c.receipts ?? 0,
            disbursements: c.disbursements ?? 0,
            cashOnHand: c.cash_on_hand_end_period ?? 0,
          })),
          meta: { office: officeNames[office] ?? office, electionYear: election_year },
        },
      );
    },
  },

  {
    name: "fec_committee_disbursements",
    description:
      "Get itemized disbursements from a PAC or committee — shows exactly which candidates and committees received money, how much, and when.\n" +
      "This is the KEY tool for conflict-of-interest investigations: trace direct money from named industry PACs to named politicians.\n" +
      "Example: fec_committee_disbursements(committee_id='C00004275', cycle=2018, recipient_name='Crapo') shows ABA BankPAC donations to Sen. Crapo.\n" +
      "WORKFLOW: (1) fec_search_committees(name='Company', committee_type='Q') to find PAC ID, (2) this tool with recipient_name filter.\n" +
      "Try multiple cycles (election year ± 1 cycle) since PACs often give early.\n" +
      "Common PAC IDs: ABA BankPAC=C00004275, Wells Fargo=C00034595, Citigroup=C00008474, Goldman Sachs=C00350744, Pfizer=C00016683, Merck=C00097485.",
    annotations: { title: "FEC: Committee Disbursements", readOnlyHint: true },
    parameters: z.object({
      committee_id: z.string().describe("FEC committee ID (e.g. 'C00016683' for Pfizer PAC). Get from fec_search_committees."),
      cycle: z.number().int().optional().describe("Election cycle year (e.g. 2024, 2026). Must be even year."),
      recipient_name: z.string().optional().describe("Filter to specific recipient: 'Pelosi', 'McConnell', 'NRCC', 'DSCC'"),
      per_page: z.number().int().max(100).optional().describe("Results per page (default 20)"),
    }),
    execute: async ({ committee_id, cycle, recipient_name, per_page }) => {
      const data = await getCommitteeDisbursements({ committee_id, cycle, recipient_name, per_page });
      const results = data.results ?? [];
      if (!results.length) return emptyResponse(`No disbursements found for committee ${committee_id}.`);

      return tableResponse(
        `Disbursements from ${results[0]?.committee?.name ?? committee_id}: ${data.pagination.count} total, showing ${results.length}`,
        {
          rows: results.map(d => ({
            recipient: d.recipient_name,
            recipientCommittee: d.recipient_committee?.name ?? null,
            recipientParty: d.recipient_committee?.party ?? null,
            amount: d.disbursement_amount,
            date: d.disbursement_date,
            description: d.disbursement_description,
            recipientState: d.recipient_state,
            memo: d.memo_text,
          })),
          total: data.pagination.count,
          meta: { committeeId: committee_id, committeeName: results[0]?.committee?.name ?? null },
        },
      );
    },
  },
];
