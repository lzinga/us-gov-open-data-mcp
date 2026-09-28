/**
 * bea MCP tools.
 */

import { z } from "zod";
import { UserError, type Tool } from "fastmcp";
import {
  getNationalGdp,
  getGdpByState,
  getPersonalIncome,
  getGdpByIndustry,
  getDatasetList,
  getParameterList,
  getParameterValues,
  getParameterValuesFiltered,
  getNipaUnderlyingDetail,
  getFixedAssets,
  getInternationalTransactions,
  getInternationalInvestment,
  getIntlServTrade,
  getMultinationalEnterprises,
  getInputOutput,
  getUnderlyingGdpByIndustry,
} from "./sdk.js";
import { tableResponse, emptyResponse } from "../../shared/response.js";

const FILTERS_EXAMPLE = '{"TableName":"SAINC1"}';

/**
 * Parse bea_dataset_info's `filters`: a JSON object of BEA parameter names to
 * values. Numbers and booleans become strings and lists are comma-joined, as
 * the BEA API expects. Anything else is a UserError that says what's wrong.
 */
function parseFilters(filters: string | undefined): Record<string, string> {
  if (!filters?.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(filters);
  } catch (err) {
    throw new UserError(`filters must be a JSON object such as ${FILTERS_EXAMPLE}; it is not valid JSON (${(err as Error).message}).`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new UserError(`filters must be a JSON object such as ${FILTERS_EXAMPLE}, not ${Array.isArray(parsed) ? "an array" : String(parsed)}.`);
  }
  const scalar = (v: unknown) => typeof v === "string" || typeof v === "number" || typeof v === "boolean";
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (scalar(value)) out[key] = String(value);
    else if (Array.isArray(value) && value.every(scalar)) out[key] = value.join(",");
    else throw new UserError(`filters.${key} must be a string, a number, or a list of them, as in ${FILTERS_EXAMPLE}.`);
  }
  return out;
}

export const tools: Tool<any, any>[] = [
  {
    name: "bea_gdp_national",
    description:
      "Get U.S. national GDP data from the NIPA tables. Shows GDP, GDP growth, " +
      "components (consumption, investment, government, net exports), and deflators.\n\n" +
      "Common table names:\n" +
      "- T10101: GDP and major components (real)\n" +
      "- T10106: GDP and major components (nominal)\n" +
      "- T10111: GDP percent change\n" +
      "- T20100: Personal income and its disposition\n" +
      "- T30100: Government receipts and expenditures",
    annotations: { title: "BEA: National GDP", readOnlyHint: true },
    parameters: z.object({
      table_name: z.string().optional().describe(
        "NIPA table name (default: T10101 — Real GDP). Other: T10106 (nominal GDP), T10111 (% change), T20100 (personal income)",
      ),
      frequency: z.enum(["Q", "A", "M"]).optional().describe("Frequency: Q=quarterly (default), A=annual, M=monthly"),
      year: z.string().optional().describe("Year(s) to fetch. Use 'X' for all, 'LAST5' for last 5, or specific year. Default: LAST5"),
    }),
    execute: async ({ table_name, frequency, year }) => {
      const data = await getNationalGdp({ tableName: table_name, frequency, year });
      if (!data.series.length) return emptyResponse("No GDP data returned.");
      return tableResponse(
        `BEA National GDP — Table ${data.table} (${data.frequency}): ${data.dataRows} rows, ${data.series.length} series`,
        { rows: data.series, meta: { table: data.table, frequency: data.frequency, dataRows: data.dataRows } },
      );
    },
  },

  {
    name: "bea_gdp_by_state",
    description:
      "Get gross domestic product for U.S. states from BEA Regional dataset.\n\n" +
      "Table options:\n" +
      "- SAGDP1: State annual GDP summary (default)\n" +
      "- SAGDP9: Real GDP by state\n" +
      "- SQGDP1: State quarterly GDP summary\n\n" +
      "GeoFips: 'STATE' for all states, or 5-digit FIPS (e.g. '06000' for CA)",
    annotations: { title: "BEA: GDP by State", readOnlyHint: true },
    parameters: z.object({
      table_name: z.string().optional().describe(
        "Regional table: 'SAGDP1' (annual GDP summary, default), 'SAGDP9' (real GDP), 'SQGDP1' (quarterly GDP summary)",
      ),
      geo_fips: z.string().optional().describe(
        "Geography: 'STATE' (all states, default), or state FIPS + '000' (e.g. '06000' for CA, '48000' for TX)",
      ),
      line_code: z.string().optional().describe(
        "Line code: '1' (all industry, default), '2' (private), '3' (government)",
      ),
      year: z.string().optional().describe("Year(s): 'LAST5' (default), 'LAST10', 'ALL', or comma-separated years"),
    }),
    execute: async ({ table_name, geo_fips, line_code, year }) => {
      const data = await getGdpByState({ tableName: table_name, geoFips: geo_fips, lineCode: line_code, year });
      if (data.states && !data.states.length) return emptyResponse("No state GDP data returned.");
      if (data.states) {
        return tableResponse(
          `GDP by state (${data.year}): ${data.states.length} states, values in ${data.unit}`,
          { rows: data.states, meta: { year: data.year, unit: data.unit } },
        );
      }
      return tableResponse(
        `BEA State GDP for ${data.geoFips}: ${data.series?.length ?? 0} series, values in ${data.unit}`,
        { rows: data.series ?? [], meta: { geoFips: data.geoFips, unit: data.unit } },
      );
    },
  },

  {
    name: "bea_personal_income",
    description:
      "Get personal income data by state from BEA Regional dataset.\n\n" +
      "Table options:\n" +
      "- SAINC1: Personal income summary (income, population, per capita) — default\n" +
      "- SAINC3: Per capita personal income only\n" +
      "- SAINC4: Personal income by major component (wages, dividends, transfers)\n\n" +
      "LineCode for SAINC1: 1=personal income, 2=population, 3=per capita income (default)\n" +
      "LineCode for SAINC4: 1=total, 50=wages, 45=dividends/interest/rent, 47=transfer receipts",
    annotations: { title: "BEA: Personal Income by State", readOnlyHint: true },
    parameters: z.object({
      table_name: z.string().optional().describe(
        "'SAINC1' (personal income summary, default), 'SAINC3' (per capita only), 'SAINC4' (by component)",
      ),
      geo_fips: z.string().optional().describe(
        "'STATE' (all states, default), or state FIPS + '000'. 'COUNTY' for all counties, 'MSA' for all metro areas.",
      ),
      line_code: z.string().optional().describe(
        "SAINC1: '3' (per capita, default), '1' (personal income), '2' (population). SAINC4: '50' (wages), '45' (property income), '47' (transfers)",
      ),
      year: z.string().optional().describe("Year(s): 'LAST5' (default), 'ALL', or comma-separated years"),
    }),
    execute: async ({ table_name, geo_fips, line_code, year }) => {
      const data = await getPersonalIncome({ tableName: table_name, geoFips: geo_fips, lineCode: line_code, year });
      if (!data.states.length) return emptyResponse("No personal income data returned.");
      return tableResponse(
        `BEA Personal Income — ${data.table} (${data.year}): ${data.states.length} areas, values ${data.unit}`,
        { rows: data.states, meta: { table: data.table, year: data.year, unit: data.unit } },
      );
    },
  },

  {
    name: "bea_gdp_by_industry",
    description:
      "Get GDP contribution by industry sector nationally from BEA GDPbyIndustry dataset.\n\n" +
      "TableID options:\n" +
      "- 1: Value added by industry (default)\n" +
      "- 5: Contributions to percent change in real GDP\n" +
      "- 6: Value added percent shares\n" +
      "- 25: Real value added by industry\n\n" +
      "Industry='ALL' returns all sectors.",
    annotations: { title: "BEA: GDP by Industry", readOnlyHint: true },
    parameters: z.object({
      table_id: z.string().optional().describe(
        "Table ID: '1' (value added, default), '5' (contributions to GDP growth), '6' (% shares), '25' (real value added)",
      ),
      frequency: z.enum(["Q", "A"]).optional().describe("Frequency: A=annual (default), Q=quarterly (not all tables)"),
      year: z.string().optional().describe("Year(s): comma-separated or 'ALL'. Default: last 3 complete years"),
      industry: z.string().optional().describe(
        "'ALL' (default), or specific NAICS codes: '11' (agriculture), '21' (mining), '23' (construction), " +
        "'31-33' (manufacturing), '42' (wholesale), '44-45' (retail), '51' (information), '52' (finance)",
      ),
    }),
    execute: async ({ table_id, frequency, year, industry }) => {
      const data = await getGdpByIndustry({ tableId: table_id, frequency, year, industry });
      if (!data.industries.length) return emptyResponse("No industry GDP data returned.");
      return tableResponse(
        `BEA GDP by Industry — Table ${data.tableId}: ${data.industries.length} industries`,
        { rows: data.industries, meta: { tableId: data.tableId } },
      );
    },
  },

  // ─── Meta-data Discovery ────────────────────────────────────────────

  {
    name: "bea_dataset_info",
    description:
      "Discover BEA datasets, parameters, and valid parameter values. Essential for exploring " +
      "the BEA API before making data requests.\n\n" +
      "Actions:\n" +
      "- list_datasets: List all available BEA datasets\n" +
      "- list_parameters: List parameters for a dataset (requires dataset_name)\n" +
      "- get_values: Get valid values for a parameter (requires dataset_name + parameter_name)\n" +
      "- get_filtered_values: Get values filtered by other params (requires dataset_name + target_parameter + filters)\n\n" +
      "Datasets: NIPA, NIUnderlyingDetail, FixedAssets, MNE, GDPbyIndustry, Regional, " +
      "ITA, IIP, InputOutput, UnderlyingGDPbyIndustry, IntlServTrade",
    annotations: { title: "BEA: Dataset Explorer", readOnlyHint: true },
    parameters: z.object({
      action: z.enum(["list_datasets", "list_parameters", "get_values", "get_filtered_values"]).describe(
        "What to retrieve: 'list_datasets', 'list_parameters', 'get_values', or 'get_filtered_values'",
      ),
      dataset_name: z.string().optional().describe(
        "Dataset name (required except for list_datasets). " +
        "E.g. 'Regional', 'NIPA', 'GDPbyIndustry', 'ITA', 'IIP', 'MNE', 'FixedAssets', 'IntlServTrade', 'InputOutput'",
      ),
      parameter_name: z.string().optional().describe(
        "Parameter name (required for get_values). E.g. 'TableName', 'Year', 'GeoFips', 'LineCode', 'Frequency', 'Indicator'",
      ),
      target_parameter: z.string().optional().describe(
        "Target parameter for filtered values (required for get_filtered_values). " +
        "E.g. 'LineCode' to discover line codes for a given TableName",
      ),
      filters: z.string().optional().describe(
        "JSON object of filter params for get_filtered_values. " +
        "E.g. '{\"TableName\":\"SAINC1\"}' to get LineCode values for table SAINC1",
      ),
    }),
    execute: async ({ action, dataset_name, parameter_name, target_parameter, filters }) => {
      switch (action) {
        case "list_datasets": {
          const datasets = await getDatasetList();
          if (!datasets.length) return emptyResponse("No datasets returned.");
          return tableResponse(
            `BEA Datasets: ${datasets.length} available`,
            { rows: datasets },
          );
        }
        case "list_parameters": {
          if (!dataset_name) return emptyResponse("dataset_name is required for list_parameters.");
          const params = await getParameterList(dataset_name);
          if (!params.length) return emptyResponse(`No parameters found for dataset '${dataset_name}'.`);
          return tableResponse(
            `BEA Parameters for ${dataset_name}: ${params.length} parameters`,
            { rows: params },
          );
        }
        case "get_values": {
          if (!dataset_name || !parameter_name) return emptyResponse("dataset_name and parameter_name are required for get_values.");
          const values = await getParameterValues(dataset_name, parameter_name);
          if (!values.length) return emptyResponse(`No values found for ${dataset_name}.${parameter_name}.`);
          return tableResponse(
            `BEA Values for ${dataset_name}.${parameter_name}: ${values.length} values`,
            { rows: values },
          );
        }
        case "get_filtered_values": {
          if (!dataset_name || !target_parameter) return emptyResponse("dataset_name and target_parameter are required.");
          const filterObj = parseFilters(filters);
          const values = await getParameterValuesFiltered(dataset_name, target_parameter, filterObj);
          if (!values.length) return emptyResponse("No filtered values found.");
          return tableResponse(
            `BEA Filtered Values for ${dataset_name}.${target_parameter}: ${values.length} values`,
            { rows: values },
          );
        }
      }
    },
  },

  // ─── NIPA Underlying Detail ─────────────────────────────────────────

  {
    name: "bea_nipa_underlying_detail",
    description:
      "Get NIPA underlying detail data — more granular national account breakdowns.\n\n" +
      "BEA caution: these detailed estimates are lower quality than published aggregates.\n\n" +
      "Common tables: U20305 (PCE current $), U70205S (auto sales/production monthly), " +
      "U001A (GDP), U20304 (PCE by type). Use bea_dataset_info to discover all tables.",
    annotations: { title: "BEA: NIPA Underlying Detail", readOnlyHint: true },
    parameters: z.object({
      table_name: z.string().optional().describe(
        "NIUnderlyingDetail table (default: 'U20305'). Use bea_dataset_info to discover tables.",
      ),
      frequency: z.enum(["A", "Q", "M"]).optional().describe("A=annual (default), Q=quarterly, M=monthly"),
      year: z.string().optional().describe("Year(s): 'LAST5' (default), 'ALL', 'X', or comma-separated years"),
    }),
    execute: async ({ table_name, frequency, year }) => {
      const data = await getNipaUnderlyingDetail({ tableName: table_name, frequency, year });
      if (!data.series.length) return emptyResponse("No NIPA underlying detail data returned.");
      return tableResponse(
        `NIPA Underlying Detail — ${data.table} (${data.frequency}): ${data.dataRows} rows`,
        { rows: data.series, meta: { table: data.table, frequency: data.frequency } },
      );
    },
  },

  // ─── Fixed Assets ───────────────────────────────────────────────────

  {
    name: "bea_fixed_assets",
    description:
      "Get Fixed Assets data — net stock, depreciation, and investment tables.\n\n" +
      "Covers private/government fixed assets, equipment, structures, and IP products.\n" +
      "Annual data only, updated once per year (late August – early October).\n\n" +
      "Common tables: FAAt101 (current-cost net stock by type), FAAt201 (private equipment), " +
      "FAAt401 (private nonresidential by industry), FAAt801 (current-cost depreciation).\n" +
      "Use bea_dataset_info to discover all table names.",
    annotations: { title: "BEA: Fixed Assets", readOnlyHint: true },
    parameters: z.object({
      table_name: z.string().optional().describe(
        "FixedAssets table name (default: 'FAAt101'). Use bea_dataset_info to discover.",
      ),
      year: z.string().optional().describe("Year(s): 'LAST5' (default), 'ALL', 'X', or comma-separated years"),
    }),
    execute: async ({ table_name, year }) => {
      const data = await getFixedAssets({ tableName: table_name, year });
      if (!data.series.length) return emptyResponse("No fixed assets data returned.");
      return tableResponse(
        `Fixed Assets — ${data.table}: ${data.dataRows} rows`,
        { rows: data.series, meta: { table: data.table } },
      );
    },
  },

  // ─── International Transactions (ITA) ───────────────────────────────

  {
    name: "bea_international_transactions",
    description:
      "Get U.S. international transactions (balance of payments) data.\n\n" +
      "Tracks all transactions between U.S. and foreign residents: goods/services trade, " +
      "current account, financial account, capital transfers.\n\n" +
      "Indicator examples:\n" +
      "- BalGds: Balance on goods (default)\n" +
      "- BalServ: Balance on services\n" +
      "- BalCurAcct: Current account balance\n" +
      "- ExpGds/ImpGds: Exports/Imports of goods\n" +
      "- PfInvAssets: Portfolio investment assets\n\n" +
      "Frequency: A=annual, QSA=quarterly seasonally adjusted, QNSA=not adjusted",
    annotations: { title: "BEA: International Transactions", readOnlyHint: true },
    parameters: z.object({
      indicator: z.string().optional().describe(
        "Transaction type: 'BalGds' (default), 'BalServ', 'BalCurAcct', 'ExpGds', 'ImpGds'. " +
        "Use bea_dataset_info for full list.",
      ),
      area_or_country: z.string().optional().describe(
        "'AllCountries' (default total), or specific: 'China', 'Canada', 'Mexico', 'Japan', 'Germany'. " +
        "'All' for all area/country breakdowns.",
      ),
      frequency: z.string().optional().describe("'A' (annual, default), 'QSA' (quarterly SA), 'QNSA' (quarterly NSA)"),
      year: z.string().optional().describe("Year(s): 'ALL' (default), or comma-separated years"),
    }),
    execute: async ({ indicator, area_or_country, frequency, year }) => {
      const data = await getInternationalTransactions({
        indicator, areaOrCountry: area_or_country, frequency, year,
      });
      if (!data.series.length) return emptyResponse("No international transactions data returned.");
      return tableResponse(
        `BEA International Transactions: ${data.dataRows} rows, ${data.series.length} series`,
        { rows: data.series },
      );
    },
  },

  // ─── International Investment Position (IIP) ────────────────────────

  {
    name: "bea_international_investment",
    description:
      "Get U.S. international investment position (IIP) data.\n\n" +
      "Shows end-of-period accumulated stocks of U.S. financial assets and liabilities.\n\n" +
      "TypeOfInvestment examples:\n" +
      "- FinAssetsExclFinDeriv: U.S. assets excl derivatives (default)\n" +
      "- FinLiabsExclFinDeriv: U.S. liabilities excl derivatives\n" +
      "- DirInvAssets: Direct investment assets\n" +
      "- FinLiabsFoa: Liabilities to foreign official agencies\n\n" +
      "Component: 'Pos' (position), 'ChgPosTrans' (change from transactions), " +
      "'ChgPosPrice' (from price changes), 'ChgPosXRate' (from exchange rates)",
    annotations: { title: "BEA: International Investment Position", readOnlyHint: true },
    parameters: z.object({
      type_of_investment: z.string().optional().describe(
        "'FinAssetsExclFinDeriv' (default). Use bea_dataset_info for full list.",
      ),
      component: z.string().optional().describe(
        "'Pos' (position, default), 'ChgPosTrans', 'ChgPosPrice', 'ChgPosXRate', or 'All'",
      ),
      frequency: z.string().optional().describe("'A' (annual, default), 'QNSA' (quarterly not seasonally adjusted)"),
      year: z.string().optional().describe("Year(s): 'ALL' (default), or comma-separated years"),
    }),
    execute: async ({ type_of_investment, component, frequency, year }) => {
      const data = await getInternationalInvestment({
        typeOfInvestment: type_of_investment, component, frequency, year,
      });
      if (!data.series.length) return emptyResponse("No international investment data returned.");
      return tableResponse(
        `BEA International Investment Position: ${data.dataRows} rows, ${data.series.length} series`,
        { rows: data.series },
      );
    },
  },

  // ─── International Services Trade ───────────────────────────────────

  {
    name: "bea_intl_services_trade",
    description:
      "Get U.S. international trade in services data (annual).\n\n" +
      "IMPORTANT: BEA requires either a specific TypeOfService or a specific AreaOrCountry.\n" +
      "You cannot use 'All' for both simultaneously.\n\n" +
      "TypeOfService: 'All' (default), or specific: 'Telecom', 'Travel', 'Transport', " +
      "'Insurance', 'Financial', 'Comp', 'ChargesForTheUseOfIpNie', etc.\n" +
      "Use bea_dataset_info to discover all values.\n\n" +
      "TradeDirection: 'All' (default), 'Exports', 'Imports', 'Balance', 'SupplementalIns'\n\n" +
      "Affiliation: 'All' (default), 'AllAffiliations', 'Affiliated', 'Unaffiliated', 'UsParents', 'UsAffiliates'",
    annotations: { title: "BEA: International Services Trade", readOnlyHint: true },
    parameters: z.object({
      type_of_service: z.string().optional().describe(
        "'All' (default — all types). Or specific: 'Telecom', 'Travel', 'Transport', etc. Use bea_dataset_info.",
      ),
      trade_direction: z.string().optional().describe(
        "'All' (default), 'Exports', 'Imports', 'Balance', 'SupplementalIns'",
      ),
      affiliation: z.string().optional().describe(
        "'All' (default), 'AllAffiliations', 'Affiliated', 'Unaffiliated', 'UsParents', 'UsAffiliates'",
      ),
      area_or_country: z.string().optional().describe(
        "'AllCountries' (default total), specific country name, or 'All' for all breakdowns.",
      ),
      year: z.string().optional().describe("Year(s): 'All' (default for all years), or comma-separated years"),
    }),
    execute: async ({ type_of_service, trade_direction, affiliation, area_or_country, year }) => {
      const data = await getIntlServTrade({
        typeOfService: type_of_service, tradeDirection: trade_direction,
        affiliation, areaOrCountry: area_or_country, year,
      });
      if (!data.series.length) return emptyResponse("No international services trade data returned.");
      return tableResponse(
        `BEA International Services Trade: ${data.dataRows} rows, ${data.series.length} series`,
        { rows: data.series },
      );
    },
  },

  // ─── Multinational Enterprises (MNE) ────────────────────────────────

  {
    name: "bea_multinational_enterprises",
    description:
      "Get data on Direct Investment (DI) and Activities of Multinational Enterprises (AMNE).\n\n" +
      "DirectionOfInvestment (required):\n" +
      "- 'Outward': U.S. investment abroad / foreign affiliates\n" +
      "- 'Inward': Foreign investment in U.S. / U.S. affiliates\n" +
      "- 'State': U.S. affiliates at state level (AMNE only)\n" +
      "- 'Parent': U.S. parent enterprises (AMNE only)\n\n" +
      "Classification (required): 'Country', 'Industry', 'CountryByIndustry'\n\n" +
      "For AMNE stats, also set ownership_level ('0'=majority-owned, '1'=all) " +
      "and non_bank_affiliates_only ('0'=both, '1'=nonbank only).",
    annotations: { title: "BEA: Multinational Enterprises", readOnlyHint: true },
    parameters: z.object({
      direction_of_investment: z.string().describe(
        "'Outward', 'Inward', 'State', or 'Parent'",
      ),
      classification: z.string().describe(
        "'Country', 'Industry', or 'CountryByIndustry'",
      ),
      year: z.string().describe("Year(s): comma-separated or 'ALL'"),
      ownership_level: z.string().optional().describe(
        "'0' (majority-owned only), '1' (all affiliates). Required for AMNE stats.",
      ),
      non_bank_affiliates_only: z.string().optional().describe(
        "'0' (bank and nonbank), '1' (nonbank only). Required for AMNE stats.",
      ),
      series_id: z.string().optional().describe(
        "Series IDs (comma-separated) or '0' for all. Use bea_dataset_info for list.",
      ),
      country: z.string().optional().describe(
        "3-digit country code(s) or 'all'. '000' for total of all countries.",
      ),
      industry: z.string().optional().describe(
        "4-digit NAICS industry code(s) or 'all'. '0000' for all-industries total.",
      ),
      state: z.string().optional().describe(
        "2-digit state FIPS or 'all'. Only for Direction='State'.",
      ),
    }),
    execute: async ({ direction_of_investment, classification, year, ownership_level,
      non_bank_affiliates_only, series_id, country, industry, state }) => {
      const data = await getMultinationalEnterprises({
        directionOfInvestment: direction_of_investment, classification, year,
        ownershipLevel: ownership_level, nonBankAffiliatesOnly: non_bank_affiliates_only,
        seriesId: series_id, country, industry, state,
      });
      if (!data.data.length) return emptyResponse("No multinational enterprise data returned.");
      return tableResponse(
        `BEA MNE (${data.params.direction}, ${data.params.classification}): ${data.dataRows} rows`,
        { rows: data.data, meta: data.params },
      );
    },
  },

  // ─── Input-Output Statistics ────────────────────────────────────────

  {
    name: "bea_input_output",
    description:
      "Get Input-Output statistics — Make Tables, Use Tables, and Requirements tables.\n\n" +
      "Shows interrelationships between U.S. producers and users.\n\n" +
      "Use bea_dataset_info (action='get_values', dataset_name='InputOutput', parameter_name='TableID') " +
      "to discover available table IDs.",
    annotations: { title: "BEA: Input-Output", readOnlyHint: true },
    parameters: z.object({
      table_id: z.string().describe(
        "Table ID (required). Use bea_dataset_info to discover available tables.",
      ),
      year: z.string().describe(
        "Year(s): comma-separated or 'ALL'",
      ),
    }),
    execute: async ({ table_id, year }) => {
      const data = await getInputOutput({ tableId: table_id, year });
      if (!data.data.length) return emptyResponse("No input-output data returned.");
      return tableResponse(
        `BEA Input-Output (Table ${data.params.tableId}): ${data.dataRows} rows`,
        { rows: data.data, meta: data.params },
      );
    },
  },

  // ─── Underlying GDP by Industry ─────────────────────────────────────

  {
    name: "bea_underlying_gdp_by_industry",
    description:
      "Get Underlying GDP by Industry — more industry detail than the main GDPbyIndustry dataset.\n\n" +
      "Annual data only, starting from 1997.\n" +
      "BEA caution: quality of these detailed estimates is lower than published aggregates.\n\n" +
      "Use bea_dataset_info to discover valid TableIDs and Industry codes.",
    annotations: { title: "BEA: Underlying GDP by Industry", readOnlyHint: true },
    parameters: z.object({
      table_id: z.string().optional().describe(
        "Table ID (default: '210' for value added). Use bea_dataset_info to discover.",
      ),
      year: z.string().optional().describe("Year(s): comma-separated, 'ALL', or default last 3 years"),
      industry: z.string().optional().describe("'ALL' (default) or specific NAICS industry codes"),
    }),
    execute: async ({ table_id, year, industry }) => {
      const data = await getUnderlyingGdpByIndustry({ tableId: table_id, year, industry });
      if (!data.industries.length) return emptyResponse("No underlying GDP by industry data returned.");
      return tableResponse(
        `BEA Underlying GDP by Industry — Table ${data.tableId}: ${data.industries.length} industries`,
        { rows: data.industries, meta: { tableId: data.tableId } },
      );
    },
  },
];
