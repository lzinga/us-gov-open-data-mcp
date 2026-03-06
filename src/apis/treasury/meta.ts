/**
 * treasury module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "treasury",
  displayName: "U.S. Treasury Fiscal Data",
  category: "Economic",
  description: "National debt, revenue, spending, interest rates, exchange rates, savings bonds, auctions, trust funds — 53 datasets, 181 endpoints",
  workflow: "search_datasets → get_endpoint_fields → query_fiscal_data",
  tips: "No API key required. Use search_datasets to find endpoints by keyword. Use get_endpoint_fields to discover field names before querying. Sort by -record_date for latest data. Use page_size=1 for most recent record. Filter syntax: field:operator:value.",
  reference: {
  popularEndpoints: {
    "/v2/accounting/od/debt_to_penny": "Total public debt outstanding (daily)",
    "/v2/accounting/od/avg_interest_rates": "Average interest rates on Treasury securities",
    "/v1/accounting/od/rates_of_exchange": "Treasury reporting exchange rates",
    "/v2/accounting/od/gold_reserve": "U.S. Treasury-owned gold reserves",
    "/v1/accounting/mts/mts_table_1": "Monthly Treasury Statement: receipts, outlays, deficit",
    "/v1/accounting/od/auctions_query": "Treasury securities auction data",
    "/v2/accounting/od/debt_outstanding": "Historical debt outstanding (since 1790)",
    "/v2/accounting/od/interest_expense": "Interest expense on public debt",
  } as Record<string, string>,
  filterOperators: {
    eq: "equal",
    gt: "greater than",
    gte: "greater than or equal",
    lt: "less than",
    lte: "less than or equal",
    in: "in list (comma-separated in parens)",
  } as Record<string, string>,
  docs: {
    "API Documentation": "https://fiscaldata.treasury.gov/api-documentation/",
    "Endpoint List": "https://fiscaldata.treasury.gov/api-documentation/#list-of-endpoints",
  },
},
} satisfies ModuleMeta;
