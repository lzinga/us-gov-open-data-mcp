/**
 * treasury MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  listDatasets,
  searchEndpoints,
  getEndpointFields,
  queryFiscalData,
  ENDPOINTS,
} from "./sdk.js";
import { tableResponse, listResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "treasury_list_datasets",
    description:
      "List all 53 U.S. Treasury Fiscal Data API datasets and their 181 endpoints. " +
      "Returns dataset name, data table name, API endpoint path, and description.",
    annotations: { title: "Treasury: List Datasets", readOnlyHint: true },
    parameters: z.object({}),
    execute: async () => {
      const grouped = listDatasets();
      const datasets = Object.entries(grouped).map(([name, tables]) => ({
        dataset: name,
        datasetUrl: `https://fiscaldata.treasury.gov/datasets${tables[0].slug}`,
        tables: tables.map(t => ({
          dataTable: t.dataTable,
          endpoint: t.endpoint,
          description: t.description,
        })),
      }));

      return listResponse(
        `U.S. Treasury Fiscal Data: ${Object.keys(grouped).length} datasets, ${ENDPOINTS.length} total endpoints`,
        { items: datasets },
      );
    },
  },

  {
    name: "treasury_search_datasets",
    description:
      "Search for Treasury Fiscal Data datasets and endpoints by keyword. " +
      "Searches across all 53 datasets (181 endpoints) by name, table name, endpoint path, and description.",
    annotations: { title: "Treasury: Search Datasets", readOnlyHint: true },
    parameters: z.object({
      query: z.string().describe(
        "The keyword or phrase to search for (case-insensitive). Examples: 'debt', 'exchange rate', 'gold', 'auction'",
      ),
    }),
    execute: async ({ query }) => {
      const matches = searchEndpoints(query);

      if (!matches.length) {
        return emptyResponse(`No datasets found matching "${query}". Try a broader search term.`);
      }

      const results = matches.map(ep => ({
        dataset: ep.dataset,
        dataTable: ep.dataTable,
        endpoint: ep.endpoint,
        description: ep.description,
      }));

      return listResponse(
        `Found ${matches.length} endpoint(s) matching "${query}"`,
        { items: results },
      );
    },
  },

  {
    name: "treasury_get_endpoint_fields",
    description:
      "Get field names, data types, and formats for a specific Treasury Fiscal Data API endpoint. " +
      "This helps you discover what fields are available before querying data.",
    annotations: { title: "Treasury: Get Endpoint Fields", readOnlyHint: true },
    parameters: z.object({
      endpoint: z.string().describe(
        "The API endpoint path, e.g. '/v2/accounting/od/debt_to_penny' or '/v1/accounting/dts/operating_cash_balance'",
      ),
    }),
    execute: async ({ endpoint }) => {
      const res = await getEndpointFields(endpoint);
      const fields = Object.keys(res.meta.labels);

      const fieldDetails = fields.map(f => ({
        name: f,
        label: res.meta.labels[f],
        type: res.meta.dataTypes[f] || "unknown",
        format: res.meta.dataFormats?.[f] || "unknown",
      }));

      return listResponse(
        `Endpoint ${endpoint}: ${fields.length} fields, ${res.meta["total-count"]} total records`,
        { items: fieldDetails, meta: { endpoint, totalRecords: res.meta["total-count"] } },
      );
    },
  },

  {
    name: "treasury_query_fiscal_data",
    description:
      "Query the U.S. Treasury Fiscal Data API. Supports field selection, filtering, sorting, and pagination.\n\n" +
      "Filter operators: eq (equal), gt, gte, lt, lte, in.\n" +
      "Example filter: 'record_date:gte:2024-01-01'\n" +
      "Example sort: '-record_date' (descending)\n" +
      "Multiple filters: 'country_currency_desc:in:(Canada-Dollar,Mexico-Peso),record_date:gte:2024-01-01'",
    annotations: { title: "Treasury: Query Fiscal Data", readOnlyHint: true },
    parameters: z.object({
      endpoint: z.string().describe("The API endpoint path, e.g. '/v2/accounting/od/debt_to_penny'"),
      fields: z.string().optional().describe(
        "Comma-separated list of field names to return. If omitted, all fields are returned. Example: 'record_date,tot_pub_debt_out_amt'",
      ),
      filter: z.string().optional().describe(
        "Filter expression. Format: field:operator:value. Multiple: field1:op1:val1,field2:op2:val2. " +
        "Example: 'record_date:gte:2024-01-01,security_type_desc:eq:Treasury Bills'",
      ),
      sort: z.string().optional().describe("Comma-separated list of fields to sort by. Prefix with '-' for descending. Example: '-record_date'"),
      page_number: z.number().int().positive().optional().describe("Page number (1-indexed). Default: 1"),
      page_size: z.number().int().positive().max(10000).optional().describe("Number of records per page (1-10000). Default: 100"),
    }),
    execute: async ({ endpoint, fields, filter, sort, page_number, page_size }) => {
      const res = await queryFiscalData(endpoint, {
        fields,
        filter,
        sort,
        pageNumber: page_number,
        pageSize: page_size,
      });

      return tableResponse(
        `Query ${endpoint}: ${res.meta.count} returned, ${res.meta["total-count"]} total, page ${page_number || 1} of ${res.meta["total-pages"]}`,
        {
          rows: res.data,
          total: res.meta["total-count"],
          meta: {
            endpoint,
            recordsReturned: res.meta.count,
            totalPages: res.meta["total-pages"],
          },
        },
      );
    },
  },
];
