/**
 * usaspending MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchAwards,
  spendingByAgency,
  spendingByState,
  topRecipients,
  spendingOverTime,
  agencyOverview,
  currentFiscalYear,
  awardTypes,
  agencyCodes,
} from "./sdk.js";
import { tableResponse, timeseriesResponse, listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "usa_spending_by_award",
    description:
      "Search federal spending awards (contracts, grants, loans, direct payments). " +
      "Filter by keyword, agency, recipient, date range, award type, and amount.\n\n" +
      "Award type groups: 'contracts', 'grants', 'loans', 'direct_payments'. " +
      "Or use codes: 'A,B,C,D' (contracts), '02,03,04,05' (grants), '07,08' (loans), '06,10' (direct payments)",
    annotations: { title: "USAspending: Search Awards", readOnlyHint: true },
    parameters: z.object({
      keyword: z.string().optional().describe("Keyword to search across award descriptions and recipient names"),
      award_type: z.enum(["contracts", "grants", "loans", "direct_payments"]).optional().describe("Award type filter"),
      agency: z.string().optional().describe("Awarding agency name, e.g. 'Department of Defense'"),
      recipient: z.string().optional().describe("Recipient/company name to search for"),
      state: z.string().optional().describe("Two-letter state code, e.g. 'CA', 'TX'"),
      start_date: z.string().optional().describe("Start date YYYY-MM-DD (default: current FY). Earliest: 2007-10-01"),
      end_date: z.string().optional().describe("End date YYYY-MM-DD (default: today)"),
      min_amount: z.number().optional().describe("Minimum award amount in dollars"),
      max_amount: z.number().optional().describe("Maximum award amount in dollars"),
      limit: z.number().int().positive().max(100).default(25).describe("Results per page (default: 25)"),
      page: z.number().int().positive().optional().describe("Page number (default: 1)"),
      sort_field: z.string().optional().describe("Sort by: 'Award Amount' (default), 'Recipient Name', 'Start Date', 'End Date'"),
    }),
    execute: async ({ keyword, award_type, agency, recipient, state, start_date, end_date, min_amount, max_amount, limit, page, sort_field }) => {
      const data = await searchAwards({
        keyword, awardType: award_type, agency, recipient, state,
        startDate: start_date, endDate: end_date,
        minAmount: min_amount, maxAmount: max_amount,
        limit, page, sortField: sort_field,
      });
      if (!data.awards.length) return emptyResponse("No awards found matching the criteria.");
      return listResponse(
        `USAspending award search: ${data.total} total results, showing ${data.awards.length}`,
        { items: data.awards, total: data.total },
      );
    },
  },

  {
    name: "usa_spending_by_agency",
    description:
      "Get total federal spending broken down by awarding agency. " +
      "Shows which agencies are spending the most.",
    annotations: { title: "USAspending: Spending by Agency", readOnlyHint: true },
    parameters: z.object({
      fiscal_year: z.number().int().optional().describe("Fiscal year (default: current)"),
      state: z.string().optional().describe("Two-letter state code, e.g. 'CA', 'TX'"),
      keyword: z.string().optional().describe("Keyword to filter spending"),
      award_type: z.enum(["contracts", "grants", "loans", "direct_payments"]).optional().describe("Award type filter"),
      limit: z.number().int().positive().max(100).default(20).describe("Number of agencies (default: 20)"),
    }),
    execute: async ({ fiscal_year, state, keyword, award_type, limit }) => {
      const fy = fiscal_year || currentFiscalYear();
      const agencies = await spendingByAgency({ fiscalYear: fy, state, keyword, awardType: award_type, limit });
      if (!agencies.length) return emptyResponse(`No spending data found for FY ${fy}.`);
      return tableResponse(
        `Federal spending by agency FY ${fy}: ${agencies.length} agencies`,
        { rows: agencies, meta: { fiscalYear: fy } },
      );
    },
  },

  {
    name: "usa_spending_by_state",
    description:
      "Get federal spending by state or territory. Shows total awards and per-capita spending.",
    annotations: { title: "USAspending: Spending by State", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Two-letter state code (e.g. 'CA'). Omit for all states."),
      fiscal_year: z.number().int().optional().describe("Fiscal year (default: most recent)"),
    }),
    execute: async ({ state, fiscal_year }) => {
      const result = await spendingByState({ state, fiscalYear: fiscal_year });

      if ("detail" in result) {
        const d = result.detail;
        return recordResponse(
          `Federal spending: ${d.name || state} — $${d.totalAwards.toLocaleString()} total, $${d.perCapita.toLocaleString()} per capita`,
          d,
        );
      }

      const fy = fiscal_year || currentFiscalYear();
      return tableResponse(
        `Federal spending by state FY ${fy}: ${result.states.length} states`,
        { rows: result.states, meta: { fiscalYear: fy } },
      );
    },
  },

  {
    name: "usa_spending_by_recipient",
    description:
      "Get the top recipients (companies, organizations) of federal spending. " +
      "Use state and agency filters to narrow results.",
    annotations: { title: "USAspending: Top Recipients", readOnlyHint: true },
    parameters: z.object({
      fiscal_year: z.number().int().optional().describe("Fiscal year (default: current)"),
      award_type: z.enum(["contracts", "grants", "loans", "direct_payments"]).optional().describe("Award type filter"),
      state: z.string().optional().describe("Two-letter state code, e.g. 'CA', 'TX'"),
      agency: z.string().optional().describe("Awarding agency name, e.g. 'Department of Energy'"),
      limit: z.number().int().positive().max(100).default(25).describe("Number of recipients (default: 25)"),
    }),
    execute: async ({ fiscal_year, award_type, state, agency, limit }) => {
      const fy = fiscal_year || currentFiscalYear();
      const recipients = await topRecipients({ fiscalYear: fy, awardType: award_type, state, agency, limit });
      const typeLabel = award_type ? ` (${award_type})` : "";
      if (!recipients.length) return emptyResponse(`No recipient data for FY ${fy}${typeLabel}.`);
      return tableResponse(
        `Top federal spending recipients${typeLabel} FY ${fy}: ${recipients.length} recipients`,
        { rows: recipients, meta: { fiscalYear: fy, awardType: award_type || null } },
      );
    },
  },

  {
    name: "usa_spending_over_time",
    description:
      "Get federal spending aggregated by time period (monthly, quarterly, or fiscal year). " +
      "Useful for identifying trends.",
    annotations: { title: "USAspending: Spending Over Time", readOnlyHint: true },
    parameters: z.object({
      group: z.enum(["month", "quarter", "fiscal_year"]).optional().describe("Time grouping (default: month)"),
      start_date: z.string().optional().describe("Start date YYYY-MM-DD (default: 3 years ago)"),
      end_date: z.string().optional().describe("End date YYYY-MM-DD (default: today)"),
      agency: z.string().optional().describe("Filter to specific agency name"),
      award_type: z.enum(["contracts", "grants", "loans", "direct_payments"]).optional().describe("Award type filter"),
      state: z.string().optional().describe("Two-letter state code, e.g. 'CA', 'TX'"),
      keyword: z.string().optional().describe("Keyword to filter spending"),
    }),
    execute: async ({ group, start_date, end_date, agency, award_type, state, keyword }) => {
      const periods = await spendingOverTime({
        group, startDate: start_date, endDate: end_date,
        agency, awardType: award_type, state, keyword,
      });
      if (!periods.length) return emptyResponse("No spending data found for the given period.");
      return timeseriesResponse(
        `Federal spending over time: ${periods.length} periods, grouped by ${group || "month"}`,
        { rows: periods, dateKey: "time_period", valueKey: "aggregated_amount", meta: { group: group || "month" } },
      );
    },
  },

  {
    name: "usa_agency_overview",
    description:
      "Get an overview of a federal agency's spending, including budgetary resources and obligations.\n\n" +
      "Common codes: '097' (DOD), '075' (HHS), '069' (Treasury), '089' (DOE), " +
      "'012' (USDA), '015' (Justice), '036' (VA), '070' (DHS), '080' (NASA)",
    annotations: { title: "USAspending: Agency Overview", readOnlyHint: true },
    parameters: z.object({
      agency_code: z.string().describe(
        "Toptier agency code. Common: '097' (DOD), '075' (HHS), '069' (Treasury), " +
        "'089' (DOE), '036' (VA), '070' (DHS), '080' (NASA), '091' (Education), '016' (Labor)",
      ),
      fiscal_year: z.number().int().optional().describe("Fiscal year (default: current)"),
    }),
    execute: async ({ agency_code, fiscal_year }) => {
      const data = await agencyOverview(agency_code, fiscal_year);
      return recordResponse(
        `Agency: ${data.name || agency_code} — FY ${data.fiscalYear}`,
        data,
      );
    },
  },
];
