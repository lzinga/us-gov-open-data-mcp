/**
 * usda-nass MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import { queryStats, getCropProduction, getLivestockData, getPriceReceived, } from "./sdk.js";
import { tableResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "usda_crop_data",
    description: "Get crop production data — area planted, harvested, production, yield.\nCommodities: CORN, SOYBEANS, WHEAT, COTTON, RICE, SORGHUM",
    annotations: { title: "USDA: Crop Data", readOnlyHint: true },
    parameters: z.object({
      commodity: z.string().describe("Crop name: CORN, SOYBEANS, WHEAT, COTTON, RICE"),
      state: z.string().optional().describe("State code: IA, IL, CA, TX. Omit for national"),
      year: z.number().int().optional().describe("Year (omit for all recent years)"),
      category: z.string().optional().describe("PRODUCTION (default), AREA PLANTED, AREA HARVESTED, YIELD"),
    }),
    execute: async ({ commodity, state, year, category }) => {
      const data = await getCropProduction(commodity, { state, year, category });
      if (!data.length) return emptyResponse(`No crop data found for ${commodity}${state ? ` in ${state}` : ""}.`);
      return tableResponse(
        `${commodity.toUpperCase()} ${category ?? "PRODUCTION"}: ${data.length} records${state ? ` for ${state}` : " (national)"}`,
        {
          rows: data.map(r => ({
            year: r.year, state: r.state_alpha, value: r.Value, unit: r.unit_desc,
            description: r.short_desc, period: r.reference_period_desc,
          })),
          total: data.length,
        },
      );
    },
  },

  {
    name: "usda_livestock",
    description: "Get livestock data — inventory, slaughter, production.\nCommodities: CATTLE, HOGS, CHICKENS, MILK, EGGS",
    annotations: { title: "USDA: Livestock", readOnlyHint: true },
    parameters: z.object({
      commodity: z.string().describe("CATTLE, HOGS, CHICKENS, MILK, EGGS"),
      state: z.string().optional().describe("State code. Omit for national"),
      year: z.number().int().optional().describe("Year"),
      category: z.string().optional().describe("INVENTORY, PRODUCTION, SALES"),
    }),
    execute: async ({ commodity, state, year, category }) => {
      const data = await getLivestockData(commodity, { state, year, category });
      if (!data.length) return emptyResponse(`No livestock data for ${commodity}${state ? ` in ${state}` : ""}.`);
      return tableResponse(
        `${commodity.toUpperCase()}: ${data.length} records${state ? ` for ${state}` : " (national)"}`,
        {
          rows: data.map(r => ({
            year: r.year, state: r.state_alpha, value: r.Value, unit: r.unit_desc,
            description: r.short_desc, period: r.reference_period_desc,
          })),
          total: data.length,
        },
      );
    },
  },

  {
    name: "usda_prices",
    description: "Get prices received by farmers for agricultural commodities.\nWorks for any commodity: CORN, WHEAT, SOYBEANS, CATTLE, MILK, etc.",
    annotations: { title: "USDA: Prices Received", readOnlyHint: true },
    parameters: z.object({
      commodity: z.string().describe("Any commodity: CORN, WHEAT, SOYBEANS, CATTLE, HOGS, MILK"),
      state: z.string().optional().describe("State code. Omit for national average"),
      year: z.number().int().optional().describe("Year"),
    }),
    execute: async ({ commodity, state, year }) => {
      const data = await getPriceReceived(commodity, { state, year });
      if (!data.length) return emptyResponse(`No price data for ${commodity}${state ? ` in ${state}` : ""}.`);
      return tableResponse(
        `${commodity.toUpperCase()} prices: ${data.length} records${state ? ` for ${state}` : " (national)"}`,
        {
          rows: data.map(r => ({
            year: r.year, state: r.state_alpha, value: r.Value, unit: r.unit_desc,
            description: r.short_desc, period: r.reference_period_desc,
          })),
          total: data.length,
        },
      );
    },
  },

  {
    name: "usda_ag_query",
    description: "Custom query to USDA NASS QuickStats — any combination of filters.\nMax 50,000 records per query; for large queries narrow with year, state_alpha, agg_level_desc, or statisticcat_desc.",
    annotations: { title: "USDA: Custom Query", readOnlyHint: true },
    parameters: z.object({
      commodity_desc: z.string().optional().describe("Commodity: CORN, WHEAT, CATTLE, etc."),
      source_desc: z.string().optional().describe("SURVEY or CENSUS"),
      sector_desc: z.string().optional().describe("CROPS, ANIMALS & PRODUCTS, ECONOMICS, ENVIRONMENTAL"),
      statisticcat_desc: z.string().optional().describe("AREA PLANTED, PRODUCTION, YIELD, PRICE RECEIVED, INVENTORY"),
      state_alpha: z.string().optional().describe("State code: IA, IL, CA or US for national"),
      year: z.number().int().optional().describe("Year"),
      agg_level_desc: z.string().optional().describe("NATIONAL, STATE, COUNTY"),
      freq_desc: z.string().optional().describe("ANNUAL, MONTHLY, WEEKLY"),
    }),
    execute: async (params) => {
      const data = await queryStats(params);
      if (!data.length) return emptyResponse("No records found for this query.");
      return tableResponse(
        `${data.length} records returned`,
        {
          rows: data.map(r => ({
            year: r.year, state: r.state_alpha, commodity: r.commodity_desc,
            category: r.statisticcat_desc, value: r.Value, unit: r.unit_desc,
            description: r.short_desc,
          })),
          total: data.length,
        },
      );
    },
  },
];
