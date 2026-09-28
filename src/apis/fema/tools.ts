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
  getNfipClaims,
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
      state: z.string().optional().describe("State: name, two-letter code or FIPS code (e.g. 'Texas', 'TX', '48')"),
      year: z.number().optional().describe("Filter by year of declaration"),
      incident_type: z.string().optional().describe("Incident type: Hurricane, Flood, Fire, Severe Storm(s), Tornado, Earthquake, Snow, Biological"),
      declaration_type: z.string().optional().describe("DR=Major Disaster, EM=Emergency, FM=Fire Management"),
      top: z.number().default(50).describe("Max results (default 50)"),
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
      state: z.string().optional().describe("State: name, two-letter code or FIPS code (e.g. 'Florida', 'FL', '12')"),
      county: z.string().optional().describe("County name"),
      top: z.number().default(50).describe("Max results (default 50)"),
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
      state: z.string().optional().describe("State: name, two-letter code or FIPS code (e.g. 'Florida', 'FL', '12')"),
      top: z.number().default(50).describe("Max results (default 50)"),
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
    name: "fema_nfip_claims",
    description:
      "National Flood Insurance Program (NFIP) claims: flood losses and insurance payouts by state, county, ZIP, year " +
      "and named flood event (e.g. 'Beryl', 'Harvey', 'Ian'). Each claim has damage, building/contents/ICC payments, " +
      "coverage, flood zone and water depth; the summary totals the payments shown. The count covers all matching claims.",
    annotations: { title: "FEMA: NFIP Flood Claims", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("State name, two-letter code or FIPS code: 'Texas', 'TX', '48'"),
      county: z.string().regex(/^\d{5}$/).optional().describe("5-digit county FIPS, e.g. '48201' (Harris County, TX)"),
      zip: z.string().regex(/^\d{5}$/).optional().describe("5-digit ZIP code"),
      year_from: z.number().int().min(1970).optional().describe("First year of loss"),
      year_to: z.number().int().min(1970).optional().describe("Last year of loss"),
      flood_event: z.string().optional().describe("Named event (matched as text): 'Hurricane Harvey', 'Beryl'"),
      sort_by: z.enum(["date", "paid"]).default("date").describe("'date' (newest first, default) or 'paid' (largest building payment first)"),
      limit: z.number().int().min(1).max(1000).default(50).describe("Claims to return (default 50, max 1000)"),
    }),
    execute: async (args) => {
      const { total, claims } = await getNfipClaims({
        state: args.state, county: args.county, zip: args.zip, yearFrom: args.year_from, yearTo: args.year_to,
        floodEvent: args.flood_event, sortBy: args.sort_by, limit: args.limit,
      });
      if (!claims.length) return emptyResponse("No NFIP claims match these filters.");
      const paid = claims.reduce((sum, c) => sum + c.totalPaid, 0);
      return tableResponse(
        `${total.toLocaleString("en-US")} NFIP claim(s) match; showing ${claims.length} (sorted by ${args.sort_by}), ` +
        `$${Math.round(paid).toLocaleString("en-US")} paid on those shown`,
        { rows: claims as unknown as Record<string, unknown>[], total, meta: { dataset: "NfipClaims", paidOnShown: Math.round(paid) } },
      );
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
      "General-purpose query against any OpenFEMA dataset, at its current version. Use this for NFIP flood insurance policies, hazard mitigation grants, mission assignments, IHP registrations, etc. Supports OData $filter syntax.",
    annotations: { title: "FEMA: Query", readOnlyHint: true },
    parameters: z.object({
      dataset: z
        .string()
        .describe(
          "Dataset key (disaster_declarations, housing_owners, housing_renters, public_assistance, nfip_claims, nfip_policies, hazard_mitigation, mission_assignments, fema_regions, registrations) or any OpenFEMA entity name (e.g. 'IpawsArchivedAlerts', optionally with a version: 'v1/IpawsArchivedAlerts')"
        ),
      filter: z.string().optional().describe("OData $filter expression (e.g. \"state eq 'TX' and yearOfLoss eq '2017'\")"),
      select: z.string().optional().describe("Comma-separated fields to return (OData $select)"),
      order_by: z.string().optional().describe("OData $orderby expression (e.g. 'dateOfLoss desc')"),
      top: z.number().default(50).describe("Max results (default 50)"),
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
