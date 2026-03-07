/**
 * USPTO Open Data Portal MCP tools.
 *
 * ODP API: https://api.uspto.gov
 * Docs: https://data.uspto.gov/apis/getting-started
 * Query syntax: https://data.uspto.gov/apis/search-guide
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchApplications,
  getApplication,
  getApplicationContinuity,
  getApplicationAssignment,
  getApplicationTransactions,
  getApplicationDocuments,
  searchPtabProceedings,
  getPtabProceeding,
  searchPtabDecisions,
  searchPetitionDecisions,
} from "./sdk.js";
import type { OdpFilter, OdpRangeFilter, OdpSort } from "./sdk.js";
import { listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

// â”€â”€â”€ Helpers for building structured POST params from tool inputs â”€â”€â”€â”€

/** Parse "field value1,value2" into an OdpFilter. */
function parseFilter(s: string): OdpFilter | null {
  const idx = s.indexOf(" ");
  if (idx <= 0) return null;
  const name = s.substring(0, idx);
  const vals = s.substring(idx + 1).split(",").map((v) => v.trim()).filter(Boolean);
  return vals.length ? { name, value: vals } : null;
}

/** Parse "field from:to" into an OdpRangeFilter. */
function parseRangeFilter(s: string): OdpRangeFilter | null {
  const idx = s.indexOf(" ");
  if (idx <= 0) return null;
  const field = s.substring(0, idx);
  const range = s.substring(idx + 1);
  const colonIdx = range.indexOf(":");
  if (colonIdx <= 0) return null;
  return { field, valueFrom: range.substring(0, colonIdx), valueTo: range.substring(colonIdx + 1) };
}

/** Parse "field order" into an OdpSort. */
function parseSort(s: string): OdpSort | null {
  const parts = s.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const order = parts[parts.length - 1].toLowerCase();
  if (order !== "asc" && order !== "desc") return null;
  return { field: parts.slice(0, -1).join(" "), order };
}

function parseFilters(arr?: string[]): OdpFilter[] | undefined {
  if (!arr?.length) return undefined;
  const result: OdpFilter[] = [];
  for (const s of arr) { const f = parseFilter(s); if (f) result.push(f); }
  return result.length ? result : undefined;
}

function parseRangeFilters(arr?: string[]): OdpRangeFilter[] | undefined {
  if (!arr?.length) return undefined;
  const result: OdpRangeFilter[] = [];
  for (const s of arr) { const r = parseRangeFilter(s); if (r) result.push(r); }
  return result.length ? result : undefined;
}

function parseSorts(s?: string): OdpSort[] | undefined {
  if (!s) return undefined;
  const parsed = parseSort(s);
  return parsed ? [parsed] : undefined;
}

export const tools: Tool<any, any>[] = [
  {
    name: "uspto_search_applications",
    description:
      "Search USPTO patent applications using ODP query syntax (POST). The q param supports opensearch DSL: boolean (AND/OR/NOT), wildcards (* ?), exact phrases (\"\"), field:value, ranges ([from TO to]), comparisons (>=600). Filters narrow results by field value. Range filters narrow by date/number range. All params are optional -- an empty search returns recent applications.",
    annotations: { title: "USPTO: Search Applications", readOnlyHint: true },
    parameters: z.object({
      q: z.string().optional().describe("Search query - e.g. 'applicationMetaData.applicationTypeLabelName:Utility', 'applicationNumberText:14412875', free text 'machine learning', or 'applicationMetaData.filingDate:[2024-01-01 TO 2024-12-31]'"),
      filters: z.array(z.string()).optional().describe("Array of filters as 'field value1,value2' strings - e.g. ['applicationMetaData.applicationTypeCode UTL,DES', 'applicationMetaData.entityStatusData.businessEntityStatusCategory Small']. Each entry adds an AND-combined filter; multiple values within a filter act as OR."),
      range_filters: z.array(z.string()).optional().describe("Array of range filters as 'field from:to' strings - e.g. ['applicationMetaData.grantDate 2020-01-01:2024-12-31', 'applicationMetaData.applicationStatusCode 150:200']. Valid for date and number fields only."),
      sort: z.string().optional().describe("Sort as 'field order' - e.g. 'applicationMetaData.filingDate desc'. Default: filingDate desc. Text fields cannot be sorted."),
      fields: z.array(z.string()).optional().describe("Fields to include in response - e.g. ['applicationNumberText', 'applicationMetaData.patentNumber', 'applicationMetaData.filingDate']. Omit for all fields. Supports wildcards like '*Date*'."),
      offset: z.number().optional().describe("Starting position (default 0)"),
      limit: z.number().optional().describe("Results per page (default 25)"),
      facets: z.array(z.string()).optional().describe("Fields to aggregate - e.g. ['applicationMetaData.applicationTypeLabelName', 'applicationMetaData.applicationStatusCode']. Text fields not supported."),
    }),
    execute: async (args) => {
      const filters = parseFilters(args.filters);
      const rangeFilters = parseRangeFilters(args.range_filters);
      const sort = parseSorts(args.sort);

      const result = await searchApplications({
        q: args.q,
        filters,
        rangeFilters,
        sort,
        fields: args.fields,
        offset: args.offset,
        limit: args.limit,
        facets: args.facets,
      });

      if (!result.results.length) {
        return emptyResponse("No patent applications found matching the criteria.");
      }

      const response = listResponse(
        `Found ${result.count.toLocaleString()} application(s), showing ${result.results.length}`,
        { items: result.results, total: result.count },
      );
      if (result.facets) {
        (response as any).facets = result.facets;
      }
      return response;
    },
  },
  {
    name: "uspto_application_details",
    description:
      "Get full patent application data by application number. Returns all metadata including filing date, grant date, status, inventors, applicant, patent number, type, and prosecution details.",
    annotations: { title: "USPTO: Application Details", readOnlyHint: true },
    parameters: z.object({
      application_number: z.string().describe("Application number (e.g. '14412875'). For PCT, use encoded format (e.g. 'PCTUS0719317')"),
    }),
    execute: async (args) => {
      const result = await getApplication(args.application_number);
      if (!result) {
        return emptyResponse(`Application ${args.application_number} not found.`);
      }
      return recordResponse(`Application ${args.application_number}`, result);
    },
  },
  {
    name: "uspto_application_continuity",
    description:
      "Get continuity (parent/child application chain) data for a patent application. Shows parent applications (continuations, divisionals, CIPs) and child applications.",
    annotations: { title: "USPTO: Application Continuity", readOnlyHint: true },
    parameters: z.object({
      application_number: z.string().describe("Application number"),
    }),
    execute: async (args) => {
      const result = await getApplicationContinuity(args.application_number);
      if (!result) {
        return emptyResponse(`No continuity data found for application ${args.application_number}.`);
      }
      return recordResponse(`Continuity for ${args.application_number}`, result);
    },
  },
  {
    name: "uspto_application_assignments",
    description:
      "Get assignment (ownership transfer) records for a patent application. Shows conveyance type, assignor, assignee, and dates.",
    annotations: { title: "USPTO: Application Assignments", readOnlyHint: true },
    parameters: z.object({
      application_number: z.string().describe("Application number"),
    }),
    execute: async (args) => {
      const result = await getApplicationAssignment(args.application_number);
      if (!result) {
        return emptyResponse(`No assignment data found for application ${args.application_number}.`);
      }
      return recordResponse(`Assignments for ${args.application_number}`, result);
    },
  },
  {
    name: "uspto_application_transactions",
    description:
      "Get transaction (prosecution history) events for a patent application. Shows office actions, responses, examiner actions, and status changes with dates.",
    annotations: { title: "USPTO: Application Transactions", readOnlyHint: true },
    parameters: z.object({
      application_number: z.string().describe("Application number"),
    }),
    execute: async (args) => {
      const result = await getApplicationTransactions(args.application_number);
      if (!result) {
        return emptyResponse(`No transaction data found for application ${args.application_number}.`);
      }
      return recordResponse(`Transactions for ${args.application_number}`, result);
    },
  },
  {
    name: "uspto_application_documents",
    description:
      "List documents filed in a patent application (office actions, amendments, drawings, etc.). Filter by document code or date range.",
    annotations: { title: "USPTO: Application Documents", readOnlyHint: true },
    parameters: z.object({
      application_number: z.string().describe("Application number"),
      document_codes: z.string().optional().describe("Comma-separated document codes  e.g. 'WFEE' (fee worksheet), 'SRFW,SRNT' (search forward/notice)"),
      date_from: z.string().optional().describe("Official date from (yyyy-MM-dd)"),
      date_to: z.string().optional().describe("Official date to (yyyy-MM-dd)"),
    }),
    execute: async (args) => {
      const result = await getApplicationDocuments({
        applicationNumber: args.application_number,
        documentCodes: args.document_codes,
        officialDateFrom: args.date_from,
        officialDateTo: args.date_to,
      });
      return recordResponse(`Documents for ${args.application_number}`, result);
    },
  },
  {
    name: "uspto_ptab_proceedings",
    description:
      "Search PTAB (Patent Trial and Appeal Board) trial proceedings - IPR, PGR, CBM, and derivation proceedings. Search by trial number, patent owner, petitioner, technology center, status, or date range.",
    annotations: { title: "USPTO: PTAB Proceedings", readOnlyHint: true },
    parameters: z.object({
      q: z.string().optional().describe("Search query - e.g. 'trialMetaData.trialTypeCode:IPR', 'patentOwnerData.patentOwnerName:Apple'"),
      filters: z.array(z.string()).optional().describe("Array of filters as 'field value' - e.g. ['trialMetaData.trialTypeCode IPR', 'patentOwnerData.technologyCenterNumber 3700']"),
      range_filters: z.array(z.string()).optional().describe("Array of range filters as 'field from:to' - e.g. ['trialMetaData.petitionFilingDate 2023-01-01:2024-12-31']"),
      sort: z.string().optional().describe("Sort as 'field order' - e.g. 'patentOwnerData.technologyCenterNumber desc'"),
      fields: z.array(z.string()).optional().describe("Fields to include in response"),
      offset: z.number().optional().describe("Starting position (default 0)"),
      limit: z.number().optional().describe("Results per page (default 25)"),
    }),
    execute: async (args) => {
      const filters = parseFilters(args.filters);
      const rangeFilters = parseRangeFilters(args.range_filters);
      const sort = parseSorts(args.sort);

      const result = await searchPtabProceedings({
        q: args.q,
        filters,
        rangeFilters,
        sort,
        fields: args.fields,
        offset: args.offset,
        limit: args.limit,
      });

      if (!result.results.length) {
        return emptyResponse("No PTAB proceedings found matching the criteria.");
      }

      return listResponse(
        `Found ${result.count.toLocaleString()} proceeding(s), showing ${result.results.length}`,
        { items: result.results, total: result.count },
      );
    },
  },
  {
    name: "uspto_ptab_proceeding_details",
    description:
      "Get details for a specific PTAB trial proceeding by trial number (e.g. 'IPR2025-01319').",
    annotations: { title: "USPTO: PTAB Proceeding Details", readOnlyHint: true },
    parameters: z.object({
      trial_number: z.string().describe("Trial number (e.g. 'IPR2025-01319')"),
    }),
    execute: async (args) => {
      const result = await getPtabProceeding(args.trial_number);
      if (!result) {
        return emptyResponse(`PTAB proceeding ${args.trial_number} not found.`);
      }
      return recordResponse(`PTAB Proceeding ${args.trial_number}`, result);
    },
  },
  {
    name: "uspto_ptab_decisions",
    description:
      "Search PTAB trial decisions. Find institution decisions, final written decisions, and other PTAB rulings. Search by trial type, outcome, patent owner, grant date range.",
    annotations: { title: "USPTO: PTAB Decisions", readOnlyHint: true },
    parameters: z.object({
      q: z.string().optional().describe("Search query - e.g. 'trialMetaData.trialTypeCode:IPR AND patentOwnerData.groupArtUnitNumber:2884'"),
      filters: z.array(z.string()).optional().describe("Array of filters as 'field value' - e.g. ['trialMetaData.trialTypeCode IPR']"),
      range_filters: z.array(z.string()).optional().describe("Array of range filters as 'field from:to' - e.g. ['respondentData.grantDate 2023-01-01:2024-12-31']"),
      sort: z.string().optional().describe("Sort as 'field order'"),
      fields: z.array(z.string()).optional().describe("Fields to include in response"),
      offset: z.number().optional().describe("Starting position (default 0)"),
      limit: z.number().optional().describe("Results per page (default 25)"),
    }),
    execute: async (args) => {
      const filters = parseFilters(args.filters);
      const rangeFilters = parseRangeFilters(args.range_filters);
      const sort = parseSorts(args.sort);

      const result = await searchPtabDecisions({
        q: args.q,
        filters,
        rangeFilters,
        sort,
        fields: args.fields,
        offset: args.offset,
        limit: args.limit,
      });

      if (!result.results.length) {
        return emptyResponse("No PTAB decisions found matching the criteria.");
      }

      return listResponse(
        `Found ${result.count.toLocaleString()} decision(s), showing ${result.results.length}`,
        { items: result.results, total: result.count },
      );
    },
  },
  {
    name: "uspto_petition_decisions",
    description:
      "Search USPTO petition decisions - petitions for extension of time, revival, suspension, etc. Search by applicant name, decision type, technology center, date range.",
    annotations: { title: "USPTO: Petition Decisions", readOnlyHint: true },
    parameters: z.object({
      q: z.string().optional().describe("Search query - e.g. 'firstApplicantName:BRANT*', 'decisionTypeCodeDescriptionText:Denied'"),
      filters: z.array(z.string()).optional().describe("Array of filters as 'field value' - e.g. ['technologyCenter 3600', 'businessEntityStatusCategory Small']"),
      range_filters: z.array(z.string()).optional().describe("Array of range filters as 'field from:to' - e.g. ['petitionMailDate 2021-01-01:2025-01-01']"),
      sort: z.string().optional().describe("Sort as 'field order' - e.g. 'petitionMailDate desc'"),
      fields: z.array(z.string()).optional().describe("Fields to include in response"),
      offset: z.number().optional().describe("Starting position (default 0)"),
      limit: z.number().optional().describe("Results per page (default 25)"),
    }),
    execute: async (args) => {
      const filters = parseFilters(args.filters);
      const rangeFilters = parseRangeFilters(args.range_filters);
      const sort = parseSorts(args.sort);

      const result = await searchPetitionDecisions({
        q: args.q,
        filters,
        rangeFilters,
        sort,
        fields: args.fields,
        offset: args.offset,
        limit: args.limit,
      });

      if (!result.results.length) {
        return emptyResponse("No petition decisions found matching the criteria.");
      }

      return listResponse(
        `Found ${result.count.toLocaleString()} petition decision(s), showing ${result.results.length}`,
        { items: result.results, total: result.count },
      );
    },
  },
];