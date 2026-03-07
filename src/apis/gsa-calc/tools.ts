/**
 * GSA CALC+ Ceiling Rates MCP tools.
 *
 * CALC+ API: https://api.gsa.gov/acquisition/calc/v3/api/ceilingrates/
 * Docs: https://open.gsa.gov/api/dx-calc-api/
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchCeilingRates,
  suggestValues,
  getRatesByContract,
  educationLevels,
  businessSizes,
  worksiteTypes,
  orderableFields,
} from "./sdk.js";
import type { CeilingRate } from "./sdk.js";
import { listResponse, recordResponse, emptyResponse } from "../../shared/response.js";
import { describeEnum, describeKeys } from "../../shared/enum-utils.js";

function rateToRecord(r: CeilingRate): Record<string, unknown> {
  const rec: Record<string, unknown> = {
    laborCategory: r.laborCategory,
    vendor: r.vendorName,
    contract: r.contractNumber,
    price: `$${r.currentPrice.toFixed(2)}/hr`,
  };
  if (r.educationLevel) rec.education = r.educationLevel;
  if (r.minYearsExperience != null) rec.minExperience = `${r.minYearsExperience} yrs`;
  if (r.worksite) rec.worksite = r.worksite;
  if (r.businessSize) rec.businessSize = r.businessSize === "S" ? "Small" : "Other";
  if (r.securityClearance) rec.clearance = r.securityClearance;
  if (r.category) rec.category = r.category;
  if (r.sin) rec.sin = r.sin;
  if (r.contractEnd) rec.contractEnd = r.contractEnd;
  return rec;
}

export const tools: Tool<any, any>[] = [
  {
    name: "calc_search_rates",
    description:
      "Search GSA CALC+ ceiling rates for federal labor categories. Find awarded hourly rates on GSA MAS professional services contracts. Search by keyword (wildcard across labor category, vendor, contract), exact field match, or browse with filters. Useful for market research, IGCEs, and competitive pricing. Data refreshed daily.",
    annotations: { title: "GSA CALC: Search Rates", readOnlyHint: true },
    parameters: z.object({
      keyword: z.string().optional().describe("Wildcard keyword search across labor category, vendor name, and contract number (2 char min) - e.g. 'software engineer', 'Booz', 'GS10F'"),
      search: z.string().optional().describe("Exact field match as 'field:value' - e.g. 'labor_category:Engineer II', 'vendor_name:Deloitte', 'idv_piid:GS10F0303V'"),
      education_level: z.string().optional().describe(`Education filter: ${describeKeys(educationLevels)}. Use pipe for multiple: 'BA|MA'`),
      experience_range: z.string().optional().describe("Experience range as 'min,max' years - e.g. '3,10' or '5,20'"),
      min_years_experience: z.string().optional().describe("Exact minimum years - e.g. '5'"),
      price_range: z.string().optional().describe("Hourly rate range as 'min,max' dollars - e.g. '50,150'"),
      worksite: z.string().optional().describe(`Worksite: ${describeKeys(worksiteTypes)}`),
      business_size: z.string().optional().describe(`Business size: ${describeEnum(businessSizes as Record<string, string>)}`),
      security_clearance: z.string().optional().describe("Security clearance required: 'yes' or 'no'"),
      sin: z.string().optional().describe("GSA SIN (Special Item Number) - e.g. '541330ENG', '541620'"),
      category: z.string().optional().describe("Service category - e.g. 'Professional Services', 'Facilities'"),
      subcategory: z.string().optional().describe("Service subcategory - e.g. 'IT Services', 'Engineering'"),
      ordering: z.string().optional().describe(`Sort field: ${describeKeys(orderableFields)}. Default: current_price`),
      sort: z.enum(["asc", "desc"]).optional().describe("Sort direction (default: asc)"),
      page: z.number().optional().describe("Page number (default 1)"),
      page_size: z.number().optional().describe("Results per page (default 20)"),
    }),
    execute: async (args) => {
      const result = await searchCeilingRates({
        keyword: args.keyword,
        search: args.search,
        educationLevel: args.education_level,
        experienceRange: args.experience_range,
        minYearsExperience: args.min_years_experience,
        priceRange: args.price_range,
        worksite: args.worksite,
        businessSize: args.business_size,
        securityClearance: args.security_clearance,
        sin: args.sin,
        category: args.category,
        subcategory: args.subcategory,
        ordering: args.ordering,
        sort: args.sort,
        page: args.page,
        pageSize: args.page_size,
      });

      if (!result.hits.length) {
        return emptyResponse("No ceiling rates found matching the criteria.");
      }

      const items = result.hits.map(rateToRecord);

      // Build summary with wage stats if available
      let summary = `Found ${result.total.toLocaleString()} rate(s), showing ${result.hits.length}`;
      if (result.wageStats) {
        const ws = result.wageStats;
        summary += ` | Price range: $${ws.min.toFixed(2)}-$${ws.max.toFixed(2)}/hr, avg: $${ws.avg.toFixed(2)}/hr`;
        if (ws.median != null) summary += `, median: $${ws.median.toFixed(2)}/hr`;
      }

      return listResponse(summary, { items, total: result.total });
    },
  },
  {
    name: "calc_suggest",
    description:
      "Autocomplete/suggest values for labor categories, vendor names, or contract numbers in GSA CALC+ data. Useful for finding exact values to use in calc_search_rates. Uses 'contains' matching (2 char min).",
    annotations: { title: "GSA CALC: Suggest", readOnlyHint: true },
    parameters: z.object({
      field: z.enum(["labor_category", "vendor_name", "idv_piid"]).describe("Field to suggest values for"),
      prefix: z.string().describe("Search prefix (2 character minimum) - e.g. 'soft' for software categories, 'Booz' for Booz Allen"),
    }),
    execute: async (args) => {
      const result = await suggestValues(args.field, args.prefix);

      if (!result.values.length) {
        return emptyResponse(`No suggestions found for ${args.field} matching '${args.prefix}'.`);
      }

      return recordResponse(
        `Found ${result.values.length} suggestion(s) for ${args.field}`,
        { field: result.field, suggestions: result.values },
      );
    },
  },
  {
    name: "calc_contract_rates",
    description:
      "Get all ceiling rates for a specific GSA MAS contract by its contract number (IDV PIID). Shows all labor categories and rates awarded under that contract.",
    annotations: { title: "GSA CALC: Contract Rates", readOnlyHint: true },
    parameters: z.object({
      contract_number: z.string().describe("GSA contract number (IDV PIID) - e.g. 'GS10F0303V', 'GS35F0581X'"),
      page_size: z.number().optional().describe("Max results (default 100)"),
    }),
    execute: async (args) => {
      const result = await getRatesByContract(args.contract_number, args.page_size);

      if (!result.hits.length) {
        return emptyResponse(`No rates found for contract ${args.contract_number}.`);
      }

      const items = result.hits.map(rateToRecord);

      let summary = `Contract ${args.contract_number}: ${result.total} rate(s), showing ${result.hits.length}`;
      if (result.wageStats) {
        const ws = result.wageStats;
        summary += ` | $${ws.min.toFixed(2)}-$${ws.max.toFixed(2)}/hr, avg: $${ws.avg.toFixed(2)}/hr`;
      }

      return listResponse(summary, { items, total: result.total });
    },
  },
];
