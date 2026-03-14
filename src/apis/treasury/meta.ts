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
  domains: ["economy", "spending", "finance"],
  crossRef: [
    { question: "debt/deficit", route: "query_fiscal_data with debt_to_penny, avg_interest_rates" },
    { question: "spending/budget", route: "query_fiscal_data with mts_table_1 (Monthly Treasury Statement: receipts, outlays, deficit)" },
    { question: "presidential comparison", route: "query_fiscal_data with debt_to_penny, debt_outstanding (debt levels by administration)" },
    { question: "international", route: "query_fiscal_data (U.S. fiscal position: debt, rates_of_exchange)" },
    { question: "economy", route: "query_fiscal_data with avg_interest_rates, rates_of_exchange (Treasury rates as economic indicators)" },
    { question: "banking", route: "query_fiscal_data with avg_interest_rates (Treasury rates that set benchmark for bank lending)" },
  ],
  reference: {
  docs: {
    "API Documentation": "https://fiscaldata.treasury.gov/api-documentation/",
    "Endpoint List": "https://fiscaldata.treasury.gov/api-documentation/#list-of-endpoints",
  },
},
} satisfies ModuleMeta;
