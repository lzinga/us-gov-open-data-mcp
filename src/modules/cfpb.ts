/**
 * CFPB MCP module — Consumer Financial Protection Bureau complaint database.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchComplaints,
  getComplaintAggregations,
  getComplaintTrends,
  suggestCompany,
  PRODUCTS,
  AGG_FIELDS,
} from "../sdk/cfpb.js";

export const name = "cfpb";
export const displayName = "CFPB (Consumer Financial Protection Bureau)";
export const description =
  "Consumer complaint database with 13M+ complaints against financial companies. " +
  "Search by company, product, state, issue, date. Track complaint trends and company response patterns.";
export const workflow =
  "cfpb_search_complaints to find complaints → cfpb_complaint_aggregations for counts by field → cfpb_complaint_trends for time series";
export const tips =
  "Products: 'Mortgage', 'Credit reporting...', 'Debt collection', 'Credit card or prepaid card', 'Checking or savings account', " +
  "'Student loan', 'Vehicle loan or lease'. States: two-letter codes (CA, TX, NY). " +
  "Sort options: 'created_date_desc' (newest), 'created_date_asc' (oldest), 'relevance_desc'. " +
  "Date format: YYYY-MM-DD. Use has_narrative=true to find complaints with consumer stories.";

export const reference = {
  products: PRODUCTS,
  aggregationFields: AGG_FIELDS,
  docs: {
    "API Documentation": "https://cfpb.github.io/api/ccdb/",
    "Complaint Database": "https://www.consumerfinance.gov/data-research/consumer-complaints/",
  },
};

export const tools: Tool<any, any>[] = [
  {
    name: "cfpb_search_complaints",
    description:
      "Search the CFPB consumer complaint database (13M+ records).\n" +
      "Find complaints by company, product, state, issue, date, or keyword.\n" +
      "Returns individual complaints with company responses.\n" +
      "Company names auto-retry with fuzzy search if exact match fails (e.g. 'Wells Fargo' will find 'WELLS FARGO & COMPANY').\n" +
      "Products: 'Mortgage', 'Debt collection', 'Credit card or prepaid card', 'Checking or savings account', " +
      "'Student loan', 'Vehicle loan or lease', 'Credit reporting, credit repair services, or other personal consumer reports'.",
    annotations: { title: "CFPB: Search Complaints", readOnlyHint: true },
    parameters: z.object({
      search_term: z.string().optional().describe("Free-text search across complaint narratives"),
      product: z.string().optional().describe("Financial product: 'Mortgage', 'Debt collection', 'Credit card or prepaid card', etc."),
      company: z.string().optional().describe("Company name: 'Wells Fargo', 'Bank of America', 'Equifax', etc."),
      state: z.string().optional().describe("Two-letter state code: 'CA', 'TX', 'NY'"),
      issue: z.string().optional().describe("Issue type: 'Incorrect information on your report', 'Loan modification', etc."),
      date_received_min: z.string().optional().describe("Start date (YYYY-MM-DD): '2020-01-01'"),
      date_received_max: z.string().optional().describe("End date (YYYY-MM-DD): '2024-12-31'"),
      has_narrative: z.boolean().optional().describe("Only complaints with consumer narrative text (true/false)"),
      tags: z.string().optional().describe("Filter by tags: 'Older American', 'Servicemember'"),
      size: z.number().int().max(100).optional().describe("Results per page (default 10, max 100)"),
      sort: z.string().optional().describe("Sort: 'created_date_desc' (newest), 'created_date_asc', 'relevance_desc'"),
    }),
    execute: async (args) => {
      const data = await searchComplaints({ ...args, no_aggs: true });
      const total = typeof data.hits?.total === "object" ? data.hits.total.value : data.hits?.total ?? 0;
      const complaints = data.hits?.hits?.map(h => h._source) ?? [];
      if (!complaints.length) return "No complaints found matching the search criteria.";
      return JSON.stringify({
        summary: `CFPB complaints: ${total.toLocaleString()} total matches, showing ${complaints.length}`,
        meta: data._meta,
        total,
        complaints: complaints.slice(0, 50),
      });
    },
  },

  {
    name: "cfpb_complaint_aggregations",
    description:
      "Get complaint counts grouped by a field (product, company, state, issue, etc.).\n" +
      "Useful for ranking companies by complaint volume, identifying top issues, or comparing states.\n" +
      "Aggregation fields: 'product', 'company', 'state', 'issue', 'company_response', 'timely', 'submitted_via', 'tags'.",
    annotations: { title: "CFPB: Complaint Aggregations", readOnlyHint: true },
    parameters: z.object({
      field: z.string().describe("Field to group by: 'product', 'company', 'state', 'issue', 'company_response', 'timely', 'tags'"),
      product: z.string().optional().describe("Filter by product: 'Mortgage', 'Debt collection', etc."),
      company: z.string().optional().describe("Filter by company: 'Wells Fargo', 'Bank of America', etc."),
      state: z.string().optional().describe("Filter by state: 'CA', 'TX', 'NY'"),
      issue: z.string().optional().describe("Filter by issue type"),
      date_received_min: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      date_received_max: z.string().optional().describe("End date (YYYY-MM-DD)"),
    }),
    execute: async (args) => {
      const data = await getComplaintAggregations(args);
      const total = typeof data.hits?.total === "object" ? data.hits.total.value : data.hits?.total ?? 0;
      // Extract aggregation buckets — the key varies by field
      const aggs = (data as any).aggregations ?? (data as any).aggs ?? {};
      return JSON.stringify({
        summary: `CFPB aggregation by '${args.field}': ${total.toLocaleString()} total complaints`,
        total,
        aggregations: aggs,
        meta: data._meta,
      });
    },
  },

  {
    name: "cfpb_complaint_trends",
    description:
      "Get complaint trends over time by month, week, or year.\n" +
      "Track how complaint volume changes for specific companies, products, or states.",
    annotations: { title: "CFPB: Complaint Trends", readOnlyHint: true },
    parameters: z.object({
      product: z.string().optional().describe("Financial product: 'Mortgage', 'Debt collection', etc."),
      company: z.string().optional().describe("Company name: 'Wells Fargo', 'Equifax', etc."),
      state: z.string().optional().describe("Two-letter state code: 'CA', 'TX', 'NY'"),
      issue: z.string().optional().describe("Issue type filter"),
      date_received_min: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      date_received_max: z.string().optional().describe("End date (YYYY-MM-DD)"),
      trend_interval: z.string().optional().describe("Interval: 'month' (default), 'week', 'year'"),
    }),
    execute: async (args) => {
      const data = await getComplaintTrends(args);
      const total = typeof data.hits?.total === "object" ? data.hits.total.value : data.hits?.total ?? 0;
      const aggs = (data as any).aggregations ?? (data as any).aggs ?? {};
      return JSON.stringify({
        summary: `CFPB complaint trends: ${total.toLocaleString()} total, interval=${args.trend_interval ?? "month"}`,
        total,
        aggregations: aggs,
        meta: data._meta,
      });
    },
  },

  {
    name: "cfpb_suggest_company",
    description:
      "Autocomplete/suggest company names from the CFPB complaint database.\n" +
      "Useful for finding the exact company name before searching complaints.",
    annotations: { title: "CFPB: Suggest Company", readOnlyHint: true },
    parameters: z.object({
      text: z.string().describe("Partial company name to search: 'wells', 'bank of', 'equi'"),
      size: z.number().int().max(20).optional().describe("Max suggestions (default 10)"),
    }),
    execute: async ({ text, size }) => {
      const data = await suggestCompany(text, size);
      const suggestions = data.suggest?.[0]?.options?.map(o => o.text) ?? [];
      if (!suggestions.length) return `No company name suggestions for "${text}".`;
      return JSON.stringify({
        summary: `Company suggestions for "${text}": ${suggestions.length} matches`,
        suggestions,
      });
    },
  },
];

export { clearCache } from "../sdk/cfpb.js";
