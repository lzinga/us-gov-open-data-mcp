/**
 * fdic MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchInstitutions,
  getBankFailures,
  getFinancials,
  getSummary,
  getDeposits,
  getHistory,
  DATASETS,
  INSTITUTION_FIELDS,
  FILTER_EXAMPLES,
} from "./sdk.js";
import { tableResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "fdic_search_institutions",
    description:
      "Search FDIC-insured banks and savings institutions.\n" +
      "Filter by state, name, charter type, asset size, active status.\n" +
      "Filters: STALP:\"CA\", ACTIVE:1, ASSET:[1000000 TO *], INSTNAME:\"Wells Fargo\", CHARTER_CLASS:\"N\".\n" +
      "Assets and deposits are in thousands of dollars.",
    annotations: { title: "FDIC: Search Banks", readOnlyHint: true },
    parameters: z.object({
      filters: z.string().optional().describe("Lucene-style filter: 'STALP:\"CA\" AND ACTIVE:1', 'ASSET:[1000000 TO *]'"),
      search: z.string().optional().describe("Free-text search across institution names"),
      fields: z.string().optional().describe("Comma-separated fields to return: 'INSTNAME,STALP,ASSET,DEP,NETINC'"),
      sort_by: z.string().optional().describe("Sort field: 'ASSET', 'DEP', 'INSTNAME', 'NETINC'"),
      sort_order: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().int().max(100).default(25).describe("Max results (default 25, max 100)"),
      offset: z.number().int().optional().describe("Pagination offset"),
    }),
    execute: async (args) => {
      const data = await searchInstitutions(args);
      const total = data.meta?.total ?? 0;
      const records = data.data?.map(d => d.data) ?? [];
      if (!records.length) return emptyResponse("No institutions found matching the criteria.");
      return tableResponse(
        `FDIC institutions: ${total.toLocaleString()} total matches, showing ${Math.min(records.length, 50)}`,
        { rows: records, total },
      );
    },
  },

  {
    name: "fdic_failures",
    description:
      "Get FDIC-insured bank failures — all failures since 1934.\n" +
      "Includes failure date, estimated cost to FDIC, resolution type, and acquiring institution.\n" +
      "Filter by state: PSTALP:\"GA\", by year range, or combine filters.",
    annotations: { title: "FDIC: Bank Failures", readOnlyHint: true },
    parameters: z.object({
      filters: z.string().optional().describe("Lucene-style filter: 'PSTALP:\"GA\"', 'FAILDATE:[2008-01-01 TO 2010-12-31]'"),
      sort_by: z.string().optional().describe("Sort field: 'FAILDATE' (default), 'COST', 'QBFASSET'"),
      sort_order: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().int().max(100).default(25).describe("Max results (default 25, max 100)"),
      offset: z.number().int().optional().describe("Pagination offset"),
    }),
    execute: async (args) => {
      const data = await getBankFailures(args);
      const total = data.meta?.total ?? 0;
      const records = data.data?.map(d => d.data) ?? [];
      if (!records.length) return emptyResponse("No bank failures found matching the criteria.");
      return tableResponse(
        `FDIC bank failures: ${total.toLocaleString()} total matches, showing ${Math.min(records.length, 50)}`,
        { rows: records, total },
      );
    },
  },

  {
    name: "fdic_financials",
    description:
      "Get quarterly Call Report financial data for FDIC-insured banks.\n" +
      "Includes assets, deposits, net income, ROA, ROE, loan loss reserves.\n" +
      "Filter by CERT number (specific bank) or STALP (state). Dollar values in thousands.",
    annotations: { title: "FDIC: Bank Financials", readOnlyHint: true },
    parameters: z.object({
      filters: z.string().optional().describe("Filter: 'CERT:3511' (specific bank), 'STALP:\"CA\"', 'REPDTE:20240331' (quarter)"),
      fields: z.string().optional().describe("Fields: 'CERT,INSTNAME,REPDTE,ASSET,DEP,NETINC,ROA,ROE'"),
      sort_by: z.string().optional().describe("Sort field: 'REPDTE' (default), 'ASSET', 'NETINC'"),
      sort_order: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().int().max(100).default(25).describe("Max results (default 25)"),
      offset: z.number().int().optional().describe("Pagination offset"),
    }),
    execute: async (args) => {
      const data = await getFinancials(args);
      const total = data.meta?.total ?? 0;
      const records = data.data?.map(d => d.data) ?? [];
      if (!records.length) return emptyResponse("No financial data found matching the criteria.");
      return tableResponse(
        `FDIC financial records: ${total.toLocaleString()} total, showing ${Math.min(records.length, 50)}. Dollar values in thousands.`,
        { rows: records, total },
      );
    },
  },

  {
    name: "fdic_summary",
    description:
      "Get aggregate banking statistics — industry totals by state or charter type.\n" +
      "Useful for overview metrics: total banks, deposits, assets by state/year.",
    annotations: { title: "FDIC: Banking Summary", readOnlyHint: true },
    parameters: z.object({
      filters: z.string().optional().describe("Filter: 'STALP:\"TX\"', 'YEAR:2023'"),
      fields: z.string().optional().describe("Fields to return"),
      sort_by: z.string().optional().describe("Sort field"),
      sort_order: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().int().max(100).default(25).describe("Max results (default 25)"),
      offset: z.number().int().optional().describe("Pagination offset"),
    }),
    execute: async (args) => {
      const data = await getSummary(args);
      const total = data.meta?.total ?? 0;
      const records = data.data?.map(d => d.data) ?? [];
      if (!records.length) return emptyResponse("No summary data found matching the criteria.");
      return tableResponse(
        `FDIC banking summary: ${total.toLocaleString()} records, showing ${Math.min(records.length, 50)}`,
        { rows: records, total, meta: data.totals ? { totals: data.totals } : undefined },
      );
    },
  },

  {
    name: "fdic_deposits",
    description:
      "Get Summary of Deposits — branch-level deposit data from annual survey (June 30).\n" +
      "Shows deposit amounts at each bank branch. Filter by state or institution.\n" +
      "Useful for market share analysis and banking access by geography.",
    annotations: { title: "FDIC: Summary of Deposits", readOnlyHint: true },
    parameters: z.object({
      filters: z.string().optional().describe("Filter: 'STALP:\"NY\"', 'CERT:3511', 'CITY:\"New York\"'"),
      sort_by: z.string().optional().describe("Sort field: 'DEPSUMBR' (branch deposits), 'INSTNAME'"),
      sort_order: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().int().max(100).default(25).describe("Max results (default 25)"),
      offset: z.number().int().optional().describe("Pagination offset"),
    }),
    execute: async (args) => {
      const data = await getDeposits(args);
      const total = data.meta?.total ?? 0;
      const records = data.data?.map(d => d.data) ?? [];
      if (!records.length) return emptyResponse("No deposit data found matching the criteria.");
      return tableResponse(
        `FDIC branch deposits: ${total.toLocaleString()} total branches, showing ${Math.min(records.length, 50)}`,
        { rows: records, total },
      );
    },
  },

  {
    name: "fdic_history",
    description:
      "Get institution event history — mergers, acquisitions, name changes, charter conversions.\n" +
      "Filter by CERT number to trace a specific bank's history.",
    annotations: { title: "FDIC: Institution History", readOnlyHint: true },
    parameters: z.object({
      filters: z.string().optional().describe("Filter: 'CERT:3511', 'PSTALP:\"CA\"'"),
      sort_by: z.string().optional().describe("Sort field: 'EFFDATE' (effective date)"),
      sort_order: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().int().max(100).default(25).describe("Max results (default 25)"),
      offset: z.number().int().optional().describe("Pagination offset"),
    }),
    execute: async (args) => {
      const data = await getHistory(args);
      const total = data.meta?.total ?? 0;
      const records = data.data?.map(d => d.data) ?? [];
      if (!records.length) return emptyResponse("No history events found matching the criteria.");
      return tableResponse(
        `FDIC institution history: ${total.toLocaleString()} events, showing ${Math.min(records.length, 50)}`,
        { rows: records, total },
      );
    },
  },
];
