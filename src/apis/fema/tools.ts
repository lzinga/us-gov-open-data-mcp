/**
 * fema MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  getDisasterDeclarations,
  getHousingAssistance,
  getPublicAssistance,
  getFemaRegions,
  queryDataset,
  clearCache as sdkClearCache,
  DATASETS,
  type DisasterDeclaration,
  type HousingAssistanceRecord,
  type PublicAssistanceRecord,
} from "./sdk.js";
import { tableResponse, listResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "fema_disaster_declarations",
    description:
      "Search FEMA disaster declarations (since 1953). Filter by state, year, incident type, or declaration type. Returns disaster name, type, affected area, programs declared.",
    annotations: { title: "FEMA: Disaster Declarations", readOnlyHint: true },
    parameters: z.object({
      state: z.string().max(2).optional().describe("Two-letter state code (e.g. TX, FL, CA)"),
      year: z.number().optional().describe("Filter by year of declaration"),
      incident_type: z.string().optional().describe("Incident type: Hurricane, Flood, Fire, Severe Storm(s), Tornado, Earthquake, Snow, Biological"),
      declaration_type: z.string().optional().describe("DR=Major Disaster, EM=Emergency, FM=Fire Management"),
      top: z.number().optional().describe("Max results (default 50)"),
      skip: z.number().optional().describe("Number of records to skip for pagination"),
    }),
    execute: async (args) => {
      const data = await getDisasterDeclarations({
        state: args.state,
        year: args.year,
        incidentType: args.incident_type,
        declarationType: args.declaration_type,
        top: args.top,
        skip: args.skip,
      });
      if (!data.length) return emptyResponse("No disaster declarations found.");
      return tableResponse(`${data.length} disaster declaration(s)`, { rows: data as Record<string, unknown>[], total: data.length });
    },
  },
  {
    name: "fema_housing_assistance",
    description:
      "Get FEMA Individual Housing Program (IHP) assistance data for homeowners. Shows approved assistance amounts, inspections, and damage by county/zip for a disaster.",
    annotations: { title: "FEMA: Housing Assistance", readOnlyHint: true },
    parameters: z.object({
      disaster_number: z.number().optional().describe("FEMA disaster number (from disaster declarations)"),
      state: z.string().max(2).optional().describe("Two-letter state code"),
      county: z.string().optional().describe("County name"),
      top: z.number().optional().describe("Max results (default 50)"),
      skip: z.number().optional().describe("Number of records to skip"),
    }),
    execute: async (args) => {
      const data = await getHousingAssistance({
        disasterNumber: args.disaster_number,
        state: args.state,
        county: args.county,
        top: args.top,
        skip: args.skip,
      });
      if (!data.length) return emptyResponse("No housing assistance records found.");
      return tableResponse(`${data.length} housing assistance record(s)`, { rows: data as Record<string, unknown>[], total: data.length });
    },
  },
  {
    name: "fema_public_assistance",
    description:
      "Get FEMA Public Assistance (PA) grant awards. Shows project-level grants to state/local/tribal governments and nonprofits for debris removal, emergency work, and permanent repair.",
    annotations: { title: "FEMA: Public Assistance", readOnlyHint: true },
    parameters: z.object({
      disaster_number: z.number().optional().describe("FEMA disaster number"),
      state: z.string().max(2).optional().describe("Two-letter state code"),
      top: z.number().optional().describe("Max results (default 50)"),
      skip: z.number().optional().describe("Number of records to skip"),
    }),
    execute: async (args) => {
      const data = await getPublicAssistance({
        disasterNumber: args.disaster_number,
        state: args.state,
        top: args.top,
        skip: args.skip,
      });
      if (!data.length) return emptyResponse("No public assistance records found.");
      return tableResponse(`${data.length} public assistance record(s)`, { rows: data as Record<string, unknown>[], total: data.length });
    },
  },
  {
    name: "fema_regions",
    description: "Get FEMA region boundaries and associated states. 10 FEMA regions cover all U.S. states and territories.",
    annotations: { title: "FEMA: Regions", readOnlyHint: true },
    parameters: z.object({}),
    execute: async () => {
      const data = await getFemaRegions();
      if (!data.length) return emptyResponse("No FEMA region data found.");
      return listResponse(`${data.length} FEMA region(s)`, { items: data as Record<string, unknown>[], total: data.length });
    },
  },
  {
    name: "fema_query",
    description:
      "General-purpose query against any OpenFEMA v2 dataset. Use this for NFIP flood insurance claims/policies, hazard mitigation grants, mission assignments, IHP registrations, etc. Supports OData $filter syntax.",
    annotations: { title: "FEMA: Query", readOnlyHint: true },
    parameters: z.object({
      dataset: z
        .string()
        .describe(
          "Dataset key (disaster_declarations, housing_owners, housing_renters, public_assistance, nfip_claims, nfip_policies, hazard_mitigation, mission_assignments, fema_regions, registrations) or raw endpoint name"
        ),
      filter: z.string().optional().describe("OData $filter expression (e.g. \"state eq 'TX' and yearOfLoss eq '2017'\")"),
      select: z.string().optional().describe("Comma-separated fields to return (OData $select)"),
      order_by: z.string().optional().describe("OData $orderby expression (e.g. 'dateOfLoss desc')"),
      top: z.number().optional().describe("Max results (default 50)"),
      skip: z.number().optional().describe("Offset for pagination"),
    }),
    execute: async (args) => {
      const data = await queryDataset({
        dataset: args.dataset,
        filter: args.filter,
        select: args.select,
        orderBy: args.order_by,
        top: args.top,
        skip: args.skip,
      });
      if (!data.length) return emptyResponse("No records found for the given query.");
      return tableResponse(`${data.length} FEMA record(s)`, { rows: data as Record<string, unknown>[], total: data.length });
    },
  },
];
