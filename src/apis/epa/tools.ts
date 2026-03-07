/**
 * EPA MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchFacilities, getFacilityDetail, getUVIndex,
  getToxicReleases, getGreenhouseGasEmissions, getDrinkingWaterSystems,
  searchEnforcementCases, getSuperfundSites, searchRCRAFacilities,
  MEDIA_TYPES, TRI_SECTORS, WATER_SYSTEM_TYPES, CASE_TYPES, NPL_STATUSES,
} from "./sdk.js";
import { tableResponse, listResponse, recordResponse, emptyResponse } from "../../shared/response.js";
import { describeEnum, describeKeys } from "../../shared/enum-utils.js";

export const tools: Tool<any, any>[] = [
  {
    name: "epa_facilities",
    description:
      "Search EPA-regulated facilities for environmental compliance and violations via ECHO.\n" +
      "Find facilities with air or water permit violations, inspections, and enforcement actions.\n" +
      `Media types: ${describeEnum(MEDIA_TYPES as Record<string, string>)}.`,
    annotations: { title: "EPA: Facility Compliance", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("Two-letter state code: 'CA', 'TX', 'NY'"),
      media_type: z.string().optional().describe(`Media type: ${describeEnum(MEDIA_TYPES as Record<string, string>)}. Default: air`),
      major_only: z.boolean().optional().describe("Only show major facilities (true/false, default true)"),
      active_only: z.boolean().optional().describe("Only show active facilities (true/false, default true)"),
      limit: z.number().int().max(1000).optional().describe("Max results (default 20)"),
    }),
    execute: async ({ state, media_type, major_only, active_only, limit }) => {
      const data = await searchFacilities({
        state, mediaType: media_type as "air" | "water" | undefined,
        majorOnly: major_only !== false,
        activeOnly: active_only !== false,
        responseset: limit,
      });
      const results = data?.Results?.Facilities;
      if (!Array.isArray(results) || !results.length) return emptyResponse(`No facilities found in ${state}.`);
      return tableResponse(
        `EPA facilities in ${state}: ${results.length} records (${media_type || "air"}, ${data?.Results?.QueryRows || "?"} total)`,
        { rows: results },
      );
    },
  },

  {
    name: "epa_facility_detail",
    description:
      "Get a detailed facility report from ECHO by registry ID.\n" +
      "Returns permits, enforcement actions, compliance summaries, NAICS/SIC codes, and inspection history.\n" +
      "Use epa_facilities first to find a RegistryID, then pass it here for the full report.",
    annotations: { title: "EPA: Facility Detail (DFR)", readOnlyHint: true },
    parameters: z.object({
      registry_id: z.string().describe("ECHO Registry ID from epa_facilities results (e.g. '110071141730')"),
    }),
    execute: async ({ registry_id }) => {
      const data = await getFacilityDetail(registry_id);
      if (!data?.Results || data.Results.Error) return emptyResponse(`No detail found for registry ID ${registry_id}.`);
      return recordResponse(
        `EPA DFR: facility ${registry_id}`,
        data.Results,
      );
    },
  },

  {
    name: "epa_uv_index",
    description:
      "Get UV index forecast for a U.S. location (ZIP code or city/state).\n" +
      "UV Scale: 0-2 Low, 3-5 Moderate, 6-7 High, 8-10 Very High, 11+ Extreme.\n" +
      "Useful for health recommendations -- high UV correlates with skin cancer risk.",
    annotations: { title: "EPA: UV Index Forecast", readOnlyHint: true },
    parameters: z.object({
      zip: z.string().optional().describe("5-digit ZIP code: '10001', '90210'. Use this OR city+state."),
      city: z.string().optional().describe("City name: 'Los Angeles', 'Chicago'. Must be used with state."),
      state: z.string().optional().describe("Two-letter state code: 'CA', 'IL'. Must be used with city."),
    }),
    execute: async ({ zip, city, state }) => {
      const data = await getUVIndex({ zip, city, state });
      if (!Array.isArray(data) || !data.length) return emptyResponse("No UV forecast data found.");
      const label = city && state ? `${city}, ${state}` : `ZIP ${zip || "20001"}`;
      return listResponse(
        `UV index forecast for ${label}: ${data.length} forecasts`,
        { items: data, maxItems: 10 },
      );
    },
  },

  {
    name: "epa_toxic_releases",
    description:
      "Get Toxics Release Inventory (TRI) data by state.\n" +
      "TRI tracks chemical releases from industrial facilities reported under EPCRA Section 313.\n" +
      `Common sectors: ${describeKeys(TRI_SECTORS)}.\n` +
      "Cross-reference with epa_facilities for compliance status and epa_greenhouse_gas for emissions.",
    annotations: { title: "EPA: Toxic Releases (TRI)", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("Two-letter state code: 'CA', 'TX', 'NY'"),
      county: z.string().optional().describe("County name to filter by: 'LOS ANGELES', 'HARRIS'"),
      rows: z.number().int().max(1000).optional().describe("Max results (default 100)"),
    }),
    execute: async ({ state, county, rows }) => {
      const data = await getToxicReleases({ state, county, rows });
      if (!Array.isArray(data) || !data.length) return emptyResponse(`No TRI data found for ${state}.`);
      return tableResponse(
        `EPA TRI: ${data.length} facility records for ${state}`,
        { rows: data },
      );
    },
  },

  {
    name: "epa_greenhouse_gas",
    description:
      "Get Greenhouse Gas (GHG) emissions data by state.\n" +
      "Returns large emitters reporting under EPA's Greenhouse Gas Reporting Program (GHGRP).\n" +
      "Includes CO2-equivalent emissions, facility name, sector, and location.\n" +
      "Cross-reference with EIA energy data and BLS CPI energy component.",
    annotations: { title: "EPA: Greenhouse Gas Emissions", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("Two-letter state code: 'CA', 'TX', 'NY'"),
      rows: z.number().int().max(1000).optional().describe("Max results (default 100)"),
    }),
    execute: async ({ state, rows }) => {
      const data = await getGreenhouseGasEmissions({ state, rows });
      if (!Array.isArray(data) || !data.length) return emptyResponse(`No GHG data found for ${state}.`);
      return tableResponse(
        `EPA GHG: ${data.length} emitter records for ${state}`,
        { rows: data },
      );
    },
  },

  {
    name: "epa_drinking_water",
    description:
      "Get Safe Drinking Water Information System (SDWIS) data by state.\n" +
      "Returns public water systems with population served, source type, and system type.\n" +
      `System types: ${describeEnum(WATER_SYSTEM_TYPES as Record<string, string>)}.\n` +
      "Cross-reference with CDC health data and Census population for per-capita analysis.",
    annotations: { title: "EPA: Drinking Water Systems", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("Two-letter state code: 'CA', 'TX', 'NY'"),
      rows: z.number().int().max(1000).optional().describe("Max results (default 100)"),
    }),
    execute: async ({ state, rows }) => {
      const data = await getDrinkingWaterSystems({ state, rows });
      if (!Array.isArray(data) || !data.length) return emptyResponse(`No SDWIS data found for ${state}.`);
      return tableResponse(
        `EPA SDWIS: ${data.length} water systems for ${state}`,
        { rows: data },
      );
    },
  },

  {
    name: "epa_enforcement",
    description:
      "Search EPA enforcement cases -- civil and criminal actions with penalties, settlements, and outcomes.\n" +
      `Case types: ${describeEnum(CASE_TYPES as Record<string, string>)}.\n` +
      "Returns case name, primary law violated, penalties, settlement dates, and outcomes.\n" +
      "Cross-reference with DOJ press releases, SEC financials, lobbying data, and FEC contributions.",
    annotations: { title: "EPA: Enforcement Cases", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("Two-letter state code: 'CA', 'TX', 'NY'"),
      law: z.string().optional().describe("Filter by primary law: 'CAA' (Clean Air), 'CWA' (Clean Water), 'RCRA', 'CERCLA', 'TSCA', 'SDWA'"),
      limit: z.number().int().max(1000).optional().describe("Max results (default 20)"),
    }),
    execute: async ({ state, law, limit }) => {
      const data = await searchEnforcementCases({ state, law, responseset: limit });
      const cases = data?.Results?.Cases;
      if (!Array.isArray(cases) || !cases.length) return emptyResponse(`No enforcement cases found for ${state}.`);
      return tableResponse(
        `EPA enforcement: ${cases.length} cases for ${state} (${data?.Results?.QueryRows || "?"} total)`,
        { rows: cases },
      );
    },
  },

  {
    name: "epa_superfund",
    description:
      "Get Superfund (CERCLA) contaminated sites by state.\n" +
      "Returns site name, location, NPL status, and cleanup progress.\n" +
      `NPL statuses: ${describeEnum(NPL_STATUSES as Record<string, string>)}.\n` +
      "Cross-reference with Census demographics, CDC health data, HUD housing values, and USAspending cleanup funding.",
    annotations: { title: "EPA: Superfund Sites", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("Two-letter state code: 'NJ', 'CA', 'TX'"),
      rows: z.number().int().max(1000).optional().describe("Max results (default 100)"),
    }),
    execute: async ({ state, rows }) => {
      const data = await getSuperfundSites({ state, rows });
      if (!Array.isArray(data) || !data.length) return emptyResponse(`No Superfund sites found for ${state}.`);
      return tableResponse(
        `EPA Superfund: ${data.length} sites for ${state}`,
        { rows: data },
      );
    },
  },

  {
    name: "epa_rcra",
    description:
      "Search RCRA hazardous waste facilities by state via ECHO.\n" +
      "Returns generators, transporters, and treatment/storage/disposal (TSD) facilities regulated under RCRA Subtitle C.\n" +
      "Cross-reference with epa_toxic_releases (TRI) and epa_greenhouse_gas for multi-program facility analysis.",
    annotations: { title: "EPA: RCRA Hazardous Waste", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("Two-letter state code: 'CA', 'TX', 'NY'"),
      limit: z.number().int().max(1000).optional().describe("Max results (default 20)"),
    }),
    execute: async ({ state, limit }) => {
      const data = await searchRCRAFacilities({ state, responseset: limit });
      const facs = data?.Results?.Facilities;
      if (!Array.isArray(facs) || !facs.length) return emptyResponse(`No RCRA facilities found in ${state}.`);
      return tableResponse(
        `EPA RCRA: ${facs.length} hazardous waste facilities in ${state} (${data?.Results?.QueryRows || "?"} total)`,
        { rows: facs },
      );
    },
  },
];
