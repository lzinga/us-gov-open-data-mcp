/**
 * census MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  queryCensus,
  searchVariables,
  commonVariables,
  datasets,
} from "./sdk.js";
import { tableResponse, listResponse, emptyResponse } from "../../shared/response.js";

/** Convert a row array + headers into an object, coercing numeric values. */
function rowToObject(headers: string[], row: string[]): Record<string, unknown> {
  const geoKeys = new Set(["NAME", "state", "county", "place", "tract", "block group", "zip code tabulation area"]);
  const obj: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    const val = row[i];
    const num = Number(val);
    obj[h] = !geoKeys.has(h) && !isNaN(num) && val !== "" ? num : val;
  });
  return obj;
}

export const tools: Tool<any, any>[] = [
  {
    name: "census_query",
    description:
      "Query the U.S. Census Bureau Data API. Supports ACS, Decennial Census, Population Estimates, " +
      "Economic Census, and more. Returns data for specified variables and geography.\n\n" +
      "Common datasets: '2023/acs/acs1' (1yr), '2023/acs/acs5' (5yr), '2020/dec/pl' (Decennial), '2023/pep/population'\n" +
      "Common variables: NAME, B01001_001E (population), B19013_001E (median income), B25077_001E (home value), B01002_001E (median age)",
    annotations: { title: "Census: Query Data", readOnlyHint: true },
    parameters: z.object({
      dataset: z.string().describe("Census dataset path, e.g. '2023/acs/acs1', '2023/acs/acs5', '2020/dec/pl'"),
      variables: z.string().describe("Comma-separated variable names. Always include NAME. Example: 'NAME,B01001_001E,B19013_001E'"),
      for_geo: z.string().describe("Geography level and filter. Examples: 'state:*' (all states), 'state:06' (CA), 'county:*'"),
      in_geo: z.string().optional().describe("Parent geography for nested queries. Example: 'state:06' to get counties in CA"),
    }),
    execute: async ({ dataset, variables, for_geo, in_geo }) => {
      const data = await queryCensus(dataset, variables, for_geo, in_geo);
      const rows = data.rows.map(row => rowToObject(data.headers, row));
      return tableResponse(
        `Census ${dataset}: ${data.rows.length} records for get=${variables} for=${for_geo}${in_geo ? ` in=${in_geo}` : ""}`,
        {
          rows,
          columns: data.headers,
          total: data.rows.length,
          meta: { dataset, variables: variables.split(","), forGeo: for_geo, inGeo: in_geo || null },
        },
      );
    },
  },

  {
    name: "census_population",
    description:
      "Get population data for U.S. states using the American Community Survey. " +
      "Quick shortcut — for more flexibility use census_query directly.",
    annotations: { title: "Census: Population by State", readOnlyHint: true },
    parameters: z.object({
      year: z.number().int().optional().describe("ACS year (default: 2023). Range: 2005-2023."),
      state: z.string().optional().describe("Two-digit FIPS state code, e.g. '06' (CA), '48' (TX), '36' (NY). Omit or '*' for all."),
    }),
    execute: async ({ year, state }) => {
      const y = year || 2023;
      const stateCode = state || "*";
      const data = await queryCensus(
        `${y}/acs/acs1`,
        "NAME,B01001_001E,B19013_001E,B01002_001E",
        `state:${stateCode}`,
      );

      const nameIdx = data.headers.indexOf("NAME");
      const popIdx = data.headers.indexOf("B01001_001E");
      const incIdx = data.headers.indexOf("B19013_001E");
      const ageIdx = data.headers.indexOf("B01002_001E");

      const states = data.rows
        .sort((a, b) => Number(b[popIdx]) - Number(a[popIdx]))
        .map(row => ({
          name: row[nameIdx],
          population: Number(row[popIdx]),
          medianIncome: Number(row[incIdx]),
          medianAge: parseFloat(row[ageIdx]),
        }));

      return tableResponse(
        `U.S. Population (${y} ACS 1-Year): ${states.length} states/territories`,
        {
          rows: states,
          columns: ["name", "population", "medianIncome", "medianAge"],
          meta: { year: y, dataset: "ACS 1-Year" },
        },
      );
    },
  },

  {
    name: "census_search_variables",
    description:
      "Search for Census variable names/codes by keyword. Helps discover what data is available " +
      "in a given dataset. Returns variable IDs you can use with census_query.",
    annotations: { title: "Census: Search Variables", readOnlyHint: true },
    parameters: z.object({
      dataset: z.string().describe("Census dataset path, e.g. '2023/acs/acs1'"),
      keyword: z.string().describe("Keyword to search for, e.g. 'income', 'poverty', 'housing', 'education'"),
      max_results: z.number().int().positive().max(50).default(20).describe("Maximum results (default: 20)"),
    }),
    execute: async ({ dataset, keyword, max_results }) => {
      const matches = await searchVariables(dataset, keyword, max_results ?? 20);
      if (!matches.length) {
        return emptyResponse(`No variables matching "${keyword}" in ${dataset}.`);
      }
      return listResponse(
        `Census variables matching "${keyword}" in ${dataset}: ${matches.length} found`,
        { items: matches, meta: { dataset, keyword } },
      );
    },
  },
];
