/**
 * bts MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  getTransportStats,
  getBorderCrossings,
  TRANSPORT_FIELDS,
  BORDER_MEASURES,
  DATASETS,
  clearCache as sdkClearCache,
  type TransportStatsRecord,
} from "./sdk.js";
import { tableResponse, emptyResponse } from "../../shared/response.js";
import { keysEnum, describeEnum } from "../../shared/enum-utils.js";

export const tools: Tool<any, any>[] = [
  {
    name: "bts_transport_stats",
    description:
      "Get Monthly Transportation Statistics — 50+ national indicators including:\n" +
      "• Airline passenger traffic and on-time performance %\n" +
      "• Transit ridership, highway vehicle miles\n" +
      "• Rail freight, Amtrak ridership and on-time %\n" +
      "• Truck tonnage, fuel prices, vehicle sales\n" +
      "• Transportation Services Index (freight, passenger, combined)\n" +
      "• Border crossing summaries (trucks, persons)\n" +
      "• Safety fatalities (air, rail)\n" +
      "Monthly data going back to 1947 for some series.",
    annotations: { title: "BTS: Transport Statistics", readOnlyHint: true },
    parameters: z.object({
      start_date: z.string().optional().describe("Start date: '2020-01-01'"),
      end_date: z.string().optional().describe("End date: '2024-12-31'"),
      limit: z.number().int().max(120).default(24).describe("Months of data (default 24 = 2 years)"),
    }),
    execute: async (args) => {
      const data = await getTransportStats({
        startDate: args.start_date,
        endDate: args.end_date,
        limit: args.limit,
      });
      if (!data.length) return emptyResponse("No transportation statistics found for the given criteria.");
      return tableResponse(`${data.length} month(s) of transportation data`, { rows: data as Record<string, unknown>[], total: data.length });
    },
  },

  {
    name: "bts_border_crossings",
    description:
      "Get border crossing data at U.S. ports of entry: trucks, personal vehicles, pedestrians, train passengers, containers.\n" +
      "Covers U.S.-Mexico and U.S.-Canada borders. Monthly data by port, state, and measure type.",
    annotations: { title: "BTS: Border Crossings", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("State full name: 'Texas', 'California', 'New York'"),
      border: z.enum(["US-Mexico Border", "US-Canada Border"]).optional().describe("Border"),
      port_name: z.string().optional().describe("Port of entry name: 'El Paso', 'San Ysidro', 'Detroit'"),
      measure: z.enum(keysEnum(BORDER_MEASURES)).optional().describe(`Measure type: ${describeEnum(BORDER_MEASURES)}`),
      limit: z.number().int().max(100).default(20).describe("Max results (default 20)"),
    }),
    execute: async (args) => {
      const data = await getBorderCrossings({
        state: args.state,
        border: args.border,
        portName: args.port_name,
        measure: args.measure,
        limit: args.limit,
      });
      if (!data.length) return emptyResponse("No border crossing data found.");
      return tableResponse(`${data.length} border crossing record(s)`, { rows: data as Record<string, unknown>[], total: data.length });
    },
  },
];
