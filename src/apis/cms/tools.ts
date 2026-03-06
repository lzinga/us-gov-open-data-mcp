/**
 * cms MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchDatasets,
  queryDataset,
  queryByKey,
  clearCache as sdkClearCache,
  DATASETS,
} from "./sdk.js";
import { tableResponse, listResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "cms_search",
    description:
      "Search for CMS provider data datasets by keyword. Returns dataset IDs, titles, and descriptions. Use the ID with cms_query to fetch data.",
    annotations: { title: "CMS: Dataset Search", readOnlyHint: true },
    parameters: z.object({
      keyword: z.string().describe("Search keyword (e.g. 'hospital', 'nursing home', 'dialysis', 'hospice', 'readmission', 'infection')"),
    }),
    execute: async (args) => {
      const results = await searchDatasets(args.keyword);
      if (!results.length) return emptyResponse("No datasets found.");
      return listResponse(`${results.length} CMS dataset(s) found`, { items: results.map(r => ({ ...r })), total: results.length });
    },
  },
  {
    name: "cms_hospitals",
    description:
      "Query CMS hospital data: general info, quality ratings, mortality, readmissions, infections, patient surveys, Medicare spending. Filter by state or city.",
    annotations: { title: "CMS: Hospital Data", readOnlyHint: true },
    parameters: z.object({
      dataset: z
        .enum([
          "hospital_info",
          "hospital_mortality",
          "hospital_readmissions",
          "hospital_infections",
          "hospital_timely_care",
          "hospital_spending",
          "hospital_patient_survey",
        ])
        .default("hospital_info")
        .describe("Hospital dataset to query"),
      state: z.string().max(2).optional().describe("Two-letter state code (e.g. CA, TX, NY)"),
      city: z.string().optional().describe("City name"),
      limit: z.number().optional().describe("Max results (default 50)"),
    }),
    execute: async (args) => {
      const conditions: Array<{ property: string; value: string }> = [];
      if (args.state) conditions.push({ property: "state", value: args.state.toUpperCase() });
      if (args.city) conditions.push({ property: "city", value: args.city.toUpperCase() });

      const result = await queryByKey(args.dataset, conditions, args.limit);
      if (!result.results.length) return emptyResponse("No hospital records found.");
      return tableResponse(
        `CMS hospital data: ${(result.count ?? result.results.length).toLocaleString()} record(s)`,
        { rows: result.results, total: result.count },
      );
    },
  },
  {
    name: "cms_nursing_homes",
    description:
      "Query CMS nursing home data: provider info with five-star ratings, quality measures, health deficiencies/citations. Filter by state.",
    annotations: { title: "CMS: Nursing Home Data", readOnlyHint: true },
    parameters: z.object({
      dataset: z
        .enum(["nursing_home_info", "nursing_home_health_citations", "nursing_home_quality"])
        .default("nursing_home_info")
        .describe("Nursing home dataset to query"),
      state: z.string().max(2).optional().describe("Two-letter state code"),
      limit: z.number().optional().describe("Max results (default 50)"),
    }),
    execute: async (args) => {
      const conditions: Array<{ property: string; value: string }> = [];
      if (args.state) conditions.push({ property: "state", value: args.state.toUpperCase() });

      const result = await queryByKey(args.dataset, conditions, args.limit);
      if (!result.results.length) return emptyResponse("No nursing home records found.");
      return tableResponse(
        `CMS nursing home data: ${(result.count ?? result.results.length).toLocaleString()} record(s)`,
        { rows: result.results, total: result.count },
      );
    },
  },
  {
    name: "cms_query",
    description:
      "General-purpose query against any CMS provider dataset by dataset identifier. Use cms_search to find available datasets and their IDs. Supports filtering by any field.",
    annotations: { title: "CMS: Query", readOnlyHint: true },
    parameters: z.object({
      dataset_id: z
        .string()
        .describe("CMS dataset identifier (e.g. 'xubh-q36u' for hospitals, '4pq5-n9py' for nursing homes) or catalog key"),
      filter_field: z.string().optional().describe("Field name to filter on (e.g. 'state', 'city', 'provider_name')"),
      filter_value: z.string().optional().describe("Value to filter for"),
      limit: z.number().optional().describe("Max results (default 50)"),
      offset: z.number().optional().describe("Offset for pagination"),
    }),
    execute: async (args) => {
      // Check if dataset_id is a catalog key
      const catalogEntry = (DATASETS as Record<string, (typeof DATASETS)[keyof typeof DATASETS]>)[args.dataset_id];
      const datasetId = catalogEntry?.id ?? args.dataset_id;

      const conditions: Array<{ property: string; value: string }> = [];
      if (args.filter_field && args.filter_value) {
        conditions.push({ property: args.filter_field, value: args.filter_value });
      }

      const result = await queryDataset({
        datasetId,
        conditions: conditions.length ? conditions : undefined,
        limit: args.limit,
        offset: args.offset,
      });
      if (!result.results.length) return emptyResponse("No records found.");
      return tableResponse(
        `CMS query: ${(result.count ?? result.results.length).toLocaleString()} record(s)`,
        { rows: result.results, total: result.count },
      );
    },
  },
];
