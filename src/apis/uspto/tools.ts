/**
 * uspto MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchPatents,
  getPatent,
  searchInventors,
  searchAssignees,
  clearCache as sdkClearCache,
} from "./sdk.js";
import { listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

function patentToRecord(p: {
  patentNumber: string;
  patentTitle: string;
  patentDate: string;
  patentAbstract: string | null;
  patentType: string | null;
  numClaims: number | null;
  assigneeOrganization: string | null;
  inventorNames: string[];
  cpcGroup: string | null;
}): Record<string, unknown> {
  const record: Record<string, unknown> = {
    patentNumber: p.patentNumber,
    title: p.patentTitle,
    date: p.patentDate,
    type: p.patentType ?? null,
    claims: p.numClaims ?? null,
  };
  if (p.assigneeOrganization) record.assignee = p.assigneeOrganization;
  if (p.inventorNames.length) record.inventors = p.inventorNames;
  if (p.cpcGroup) record.cpc = p.cpcGroup;
  if (p.patentAbstract) record.abstract = p.patentAbstract;
  return record;
}

export const tools: Tool<any, any>[] = [
  {
    name: "uspto_search_patents",
    description:
      "Search U.S. patents by keyword, assignee (company), inventor name, date range, patent type, or CPC technology class. Returns patent number, title, date, assignee, inventors, and abstract.",
    annotations: { title: "USPTO: Search Patents", readOnlyHint: true },
    parameters: z.object({
      query: z.string().optional().describe("Search text — matches against title and abstract"),
      assignee: z.string().optional().describe("Assignee organization name (e.g. 'Google', 'IBM', 'MIT')"),
      inventor: z.string().optional().describe("Inventor name to search"),
      year_from: z.number().optional().describe("Start year for patent grant date (e.g. 2020)"),
      year_to: z.number().optional().describe("End year for patent grant date (e.g. 2024)"),
      patent_type: z.enum(["utility", "design", "plant", "reissue"]).optional().describe("Patent type filter"),
      cpc_section: z.string().optional().describe("CPC section letter: A-H (e.g. 'G' for Physics, 'H' for Electricity)"),
      page: z.number().optional().describe("Page number (default 1)"),
      per_page: z.number().max(50).optional().describe("Results per page (max 50, default 25)"),
    }),
    execute: async (args) => {
      const result = await searchPatents({
        query: args.query,
        assignee: args.assignee,
        inventor: args.inventor,
        yearFrom: args.year_from,
        yearTo: args.year_to,
        patentType: args.patent_type,
        cpcSection: args.cpc_section,
        page: args.page,
        perPage: args.per_page,
      });

      if (!result.patents.length) {
        return emptyResponse("No patents found matching the criteria.");
      }

      const items = result.patents.map(patentToRecord);
      return listResponse(
        `Found ${result.total.toLocaleString()} patent(s), showing ${result.patents.length}`,
        { items, total: result.total },
      );
    },
  },
  {
    name: "uspto_patent_details",
    description:
      "Get details for a specific U.S. patent by patent number. Returns title, date, abstract, assignee, inventors, claims count, and CPC classification.",
    annotations: { title: "USPTO: Patent Details", readOnlyHint: true },
    parameters: z.object({
      patent_number: z.string().describe("Patent number (e.g. '11234567' — no commas)"),
    }),
    execute: async (args) => {
      const patent = await getPatent(args.patent_number);
      if (!patent) {
        return emptyResponse(`Patent ${args.patent_number} not found.`);
      }
      return recordResponse(`Patent ${patent.patentNumber}: ${patent.patentTitle}`, patentToRecord(patent));
    },
  },
  {
    name: "uspto_search_inventors",
    description:
      "Search for patent inventors by name, state, or country. Shows inventor details and patent counts.",
    annotations: { title: "USPTO: Search Inventors", readOnlyHint: true },
    parameters: z.object({
      name: z.string().optional().describe("Inventor name to search (first or last)"),
      first_name: z.string().optional().describe("Inventor first name"),
      last_name: z.string().optional().describe("Inventor last name"),
      state: z.string().optional().describe("U.S. state abbreviation (e.g. CA, TX)"),
      country: z.string().optional().describe("Country code (e.g. US, CN, JP, DE)"),
      page: z.number().optional().describe("Page number (default 1)"),
    }),
    execute: async (args) => {
      const result = await searchInventors({
        name: args.name,
        firstName: args.first_name,
        lastName: args.last_name,
        state: args.state,
        country: args.country,
        page: args.page,
      });

      if (!result.inventors.length) {
        return emptyResponse("No inventors found matching the criteria.");
      }

      const items = result.inventors.map((inv) => ({
        firstName: inv.inventorFirstName,
        lastName: inv.inventorLastName,
        city: inv.inventorCity ?? null,
        state: inv.inventorState ?? null,
        country: inv.inventorCountry ?? null,
        patentCount: inv.patentCount,
      }));

      return listResponse(
        `Found ${result.total.toLocaleString()} inventor(s), showing ${result.inventors.length}`,
        { items, total: result.total },
      );
    },
  },
  {
    name: "uspto_search_assignees",
    description:
      "Search for patent assignees (companies, universities, government agencies) by name, state, or country. Shows organization details and patent counts.",
    annotations: { title: "USPTO: Search Assignees", readOnlyHint: true },
    parameters: z.object({
      organization: z.string().optional().describe("Organization name (e.g. 'Apple', 'Stanford University')"),
      state: z.string().optional().describe("U.S. state abbreviation (e.g. CA, TX)"),
      country: z.string().optional().describe("Country code (e.g. US, CN, JP, DE)"),
      type: z.string().optional().describe("Assignee type: 2=US company, 3=foreign company, 4=US individual, 5=foreign individual, 6=US government, 7=foreign government, 8=country govt, 9=state govt"),
      page: z.number().optional().describe("Page number (default 1)"),
    }),
    execute: async (args) => {
      const result = await searchAssignees({
        organization: args.organization,
        state: args.state,
        country: args.country,
        type: args.type,
        page: args.page,
      });

      if (!result.assignees.length) {
        return emptyResponse("No assignees found matching the criteria.");
      }

      const items = result.assignees.map((a) => ({
        organization: a.assigneeOrganization || null,
        city: a.assigneeCity ?? null,
        state: a.assigneeState ?? null,
        country: a.assigneeCountry ?? null,
        patentCount: a.patentCount,
      }));

      return listResponse(
        `Found ${result.total.toLocaleString()} assignee(s), showing ${result.assignees.length}`,
        { items, total: result.total },
      );
    },
  },
];
