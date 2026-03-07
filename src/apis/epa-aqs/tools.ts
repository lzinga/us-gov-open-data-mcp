/**
 * EPA AQS MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import { getAirQuality, getDailyAirQuality, getAirMonitors, AQS_PARAMS, AQS_SERVICES } from "./sdk.js";
import { tableResponse, emptyResponse } from "../../shared/response.js";
import { describeEnum, describeKeys } from "../../shared/enum-utils.js";

export const tools: Tool<any, any>[] = [
  {
    name: "epa_air_quality",
    description:
      "Get air quality data from EPA's Air Quality System (AQS).\n" +
      "Returns annual summary data by state (county-level monitor readings for criteria pollutants).\n" +
      `Parameters: ${describeEnum(AQS_PARAMS as Record<string, string>)}.\n` +
      `Services: ${describeEnum(AQS_SERVICES as Record<string, string>)}.\n` +
      "States use 2-digit FIPS codes: '01'=AL, '06'=CA, '37'=NC, '48'=TX. " +
      "bdate/edate must be in same year (YYYYMMDD format).\n" +
      "Requires AQS_API_KEY and AQS_EMAIL. Signup: https://aqs.epa.gov/data/api/signup",
    annotations: { title: "EPA: Air Quality (AQS)", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("2-digit state FIPS code with leading zero: '06' (CA), '48' (TX), '37' (NC)"),
      param: z.string().describe(`AQS parameter code: ${describeEnum(AQS_PARAMS as Record<string, string>)}. Up to 5 comma-separated.`),
      bdate: z.string().describe("Begin date YYYYMMDD: '20240101'"),
      edate: z.string().describe("End date YYYYMMDD (must be same year as bdate): '20241231'"),
      county: z.string().optional().describe("3-digit county FIPS code within the state: '183' (Wake Co, NC), '037' (Los Angeles)"),
      service: z.string().optional().describe(`Data service: ${describeKeys(AQS_SERVICES)}. Default: annualData`),
    }),
    execute: async ({ state, param, bdate, edate, county, service }) => {
      const data = await getAirQuality({ state, param, bdate, edate, county, service });
      if (!data.length) return emptyResponse(`No AQS data found for state ${state}, param ${param}.`);
      return tableResponse(
        `EPA AQS: ${data.length} records (${service ?? "annualData"}, param ${param}, state ${state})`,
        { rows: data },
      );
    },
  },

  {
    name: "epa_aqs_daily",
    description:
      "Get daily air quality summary data from EPA AQS.\n" +
      "Returns daily mean, max, and observation count per monitor.\n" +
      `Parameters: ${describeEnum(AQS_PARAMS as Record<string, string>)}.\n` +
      "Useful for tracking day-to-day pollution levels. Cross-reference with CDC health data.\n" +
      "Requires AQS_API_KEY and AQS_EMAIL.",
    annotations: { title: "EPA: Daily Air Quality (AQS)", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("2-digit state FIPS code: '06' (CA), '48' (TX)"),
      param: z.string().describe(`AQS parameter code: ${describeEnum(AQS_PARAMS as Record<string, string>)}`),
      bdate: z.string().describe("Begin date YYYYMMDD"),
      edate: z.string().describe("End date YYYYMMDD (same year as bdate)"),
      county: z.string().optional().describe("3-digit county FIPS code"),
    }),
    execute: async ({ state, param, bdate, edate, county }) => {
      const data = await getDailyAirQuality({ state, param, bdate, edate, county });
      if (!data.length) return emptyResponse(`No daily AQS data found for state ${state}, param ${param}.`);
      return tableResponse(
        `EPA AQS daily: ${data.length} records (param ${param}, state ${state}, ${bdate}-${edate})`,
        { rows: data },
      );
    },
  },

  {
    name: "epa_aqs_monitors",
    description:
      "Find air quality monitoring stations from EPA AQS.\n" +
      "Returns monitor locations, operational dates, measurement types, and operating agencies.\n" +
      `Parameters: ${describeEnum(AQS_PARAMS as Record<string, string>)}.\n` +
      "Useful for finding what is being measured and where. Requires AQS_API_KEY and AQS_EMAIL.",
    annotations: { title: "EPA: Air Monitors (AQS)", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("2-digit state FIPS code: '06' (CA), '48' (TX)"),
      param: z.string().describe(`AQS parameter code: ${describeEnum(AQS_PARAMS as Record<string, string>)}`),
      bdate: z.string().describe("Begin date YYYYMMDD"),
      edate: z.string().describe("End date YYYYMMDD"),
      county: z.string().optional().describe("3-digit county FIPS code"),
    }),
    execute: async ({ state, param, bdate, edate, county }) => {
      const data = await getAirMonitors({ state, param, bdate, edate, county });
      if (!data.length) return emptyResponse(`No monitors found for state ${state}, param ${param}.`);
      return tableResponse(
        `EPA AQS monitors: ${data.length} monitors (param ${param}, state ${state})`,
        { rows: data },
      );
    },
  },
];
