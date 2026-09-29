/**
 * treasury MCP prompts.
 */

import type { InputPrompt } from "fastmcp";

export const prompts: InputPrompt<any, any>[] = [
  {
    name: "quick_fiscal_snapshot",
    description: "Get a comprehensive snapshot of current U.S. fiscal data including national debt, interest rates, and recent revenue/spending.",
    load: async () =>
      "Please give me a comprehensive fiscal snapshot of the United States using the Treasury Fiscal Data API. Include:\n\n" +
      "1. **Current national debt** — query /v2/accounting/od/debt_to_penny with sort=-record_date, page_size=1, fields=record_date,tot_pub_debt_out_amt,debt_held_public_amt,intragov_hold_amt\n" +
      "2. **Latest average interest rates** — query /v2/accounting/od/avg_interest_rates with sort=-record_date, page_size=10, fields=record_date,security_type_desc,avg_interest_rate_amt\n" +
      "3. **Latest monthly receipts & outlays** — query /v1/accounting/mts/mts_table_1 with sort=-record_date, page_size=5\n" +
      "4. **Gold reserves** — query /v2/accounting/od/gold_reserve with sort=-record_date, page_size=5\n\n" +
      "Format the results in a clear summary with dollar amounts and dates.",
  },
  {
    name: "debt_analysis",
    description: "Analyze the national debt trend with legislative context and vote breakdowns.",
    arguments: [
      { name: "start_date", description: "Start date in YYYY-MM-DD format (default: 1 year ago)", required: false },
    ],
    load: async (args: any) => {
      const defaultDate = new Date();
      defaultDate.setFullYear(defaultDate.getFullYear() - 1);
      const startStr = args.start_date || defaultDate.toISOString().split("T")[0];
      return (
        `Analyze the U.S. national debt trend since ${startStr}.\n\n` +
        `== DEBT DATA ==\n` +
        `1. Query /v2/accounting/od/debt_to_penny with filter=record_date:gte:${startStr}, sort=-record_date, page_size=50, fields=record_date,tot_pub_debt_out_amt,debt_held_public_amt,intragov_hold_amt\n` +
        `2. Calculate the change from the earliest to latest record\n` +
        `3. Show the trend — is debt increasing or decreasing?\n` +
        `4. Break down by debt held by public vs intragovernmental holdings\n\n` +
        `== LEGISLATIVE CONTEXT ==\n` +
        `5. Use congress_search_bills for 'debt ceiling' or 'appropriations' to find relevant legislation\n` +
        `6. Use congress_house_votes and congress_senate_votes to show how each party voted on debt-related bills\n` +
        `7. Use FRED GDP series to calculate debt-to-GDP ratio for context\n\n` +
        `Present the analysis with clear numbers, percentage changes, and note which congress/president was in office.`
      );
    },
  },
  {
    name: "exchange_rates",
    description: "Look up Treasury exchange rates for a specific currency.",
    arguments: [
      { name: "currency", description: "Currency to look up, e.g. 'Euro Zone-Euro', 'Canada-Dollar', 'Japan-Yen'", required: true },
    ],
    load: async (args: any) =>
      `Get the Treasury reporting exchange rates for "${args.currency}".\n\n` +
      `Query /v1/accounting/od/rates_of_exchange with:\n` +
      `- fields: record_date,country_currency_desc,exchange_rate\n` +
      `- filter: country_currency_desc:eq:${args.currency}\n` +
      `- sort: -record_date\n- page_size: 20\n\nShow the exchange rate history and note any trends.`,
  },
  {
    name: "auction_results",
    description: "Get recent Treasury securities auction results.",
    arguments: [
      { name: "security_type", description: "Type of security: 'Bill', 'Note', 'Bond', 'TIPS', 'FRN'", required: false },
    ],
    load: async (args: any) => {
      const filterPart = args.security_type ? `\n- filter: security_type_desc:eq:${args.security_type}` : "";
      return (
        `Get the latest Treasury securities auction results.\n\n` +
        `Query /v1/accounting/od/auctions_query with:\n- sort: -auction_date\n- page_size: 15${filterPart}\n\n` +
        `Summarize the results showing auction dates, security types, amounts, and interest rates.`
      );
    },
  },
  {
    name: "interest_rate_comparison",
    description: "Compare current interest rates across all Treasury security types.",
    load: async () =>
      "Compare current average interest rates across all Treasury security types.\n\n" +
      "1. First use treasury_get_endpoint_fields on /v2/accounting/od/avg_interest_rates to see available fields\n" +
      "2. Query /v2/accounting/od/avg_interest_rates with sort=-record_date, page_size=50, fields=record_date,security_type_desc,security_desc,avg_interest_rate_amt\n" +
      "3. Group the latest rates by security type\n" +
      "4. Show which security types have the highest and lowest rates\n\n" +
      "Present as a comparison table.",
  },
];

// ─── Re-export cache control from SDK ────────────────────────────────

export { clearCache } from "./sdk.js";
