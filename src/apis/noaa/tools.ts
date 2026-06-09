/**
 * noaa MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import { listDatasets, searchStations, getClimateData, searchLocations } from "./sdk.js";
import { timeseriesResponse, listResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "noaa_datasets",
    description: "List available NOAA climate datasets (GHCND daily, GSOM monthly, GSOY annual, normals, etc.)",
    annotations: { title: "NOAA: List Datasets", readOnlyHint: true },
    parameters: z.object({}),
    execute: async () => {
      const datasets = await listDatasets();
      return listResponse(
        `${datasets.length} NOAA climate datasets available`,
        { items: datasets },
      );
    },
  },

  {
    name: "noaa_stations",
    description: "Search for NOAA weather stations by location or dataset.\nUse location IDs like FIPS:36 (New York), FIPS:06 (California), CITY:US360019 (NYC).",
    annotations: { title: "NOAA: Search Stations", readOnlyHint: true },
    parameters: z.object({
      dataset_id: z.string().optional().describe("e.g. 'GHCND', 'GSOM'"),
      location_id: z.string().optional().describe("e.g. 'FIPS:36' (NY), 'FIPS:06' (CA)"),
      limit: z.number().int().max(1000).default(25).describe("Max results (default 25)"),
    }),
    execute: async ({ dataset_id, location_id, limit }) => {
      const stations = await searchStations({
        datasetId: dataset_id, locationId: location_id, limit,
      });
      if (!stations.length) return emptyResponse("No stations found.");
      return listResponse(
        `${stations.length} stations found`,
        { items: stations },
      );
    },
  },

  {
    name: "noaa_climate_data",
    description: "Get climate observations (temperature, precipitation, snow, wind) from NOAA.\nRequires dataset ID + date range. Optionally filter by station or location.",
    annotations: { title: "NOAA: Climate Data", readOnlyHint: true },
    parameters: z.object({
      dataset_id: z.enum(["GHCND", "GSOM", "GSOY"]).describe("Dataset: GHCND=daily, GSOM=monthly, GSOY=annual"),
      start_date: z.string().describe("Start date YYYY-MM-DD"),
      end_date: z.string().describe("End date YYYY-MM-DD"),
      station_id: z.string().optional().describe("Station ID, e.g. 'GHCND:USW00094728' (Central Park, NYC)"),
      location_id: z.string().optional().describe("Location ID, e.g. 'FIPS:36' (NY state)"),
      datatype_id: z.string().optional().describe("Data type: TMAX, TMIN, TAVG, PRCP, SNOW, SNWD, AWND"),
      limit: z.number().int().max(1000).default(1000).describe("Max observations (default 1000)"),
    }),
    execute: async ({ dataset_id, start_date, end_date, station_id, location_id, datatype_id, limit }) => {
      const result = await getClimateData({
        datasetId: dataset_id, startDate: start_date, endDate: end_date,
        stationId: station_id, locationId: location_id, datatypeId: datatype_id, limit,
      });
      if (!result.data.length) return emptyResponse(`No climate observations found for ${start_date} to ${end_date}.`);
      return timeseriesResponse(
        `${result.count} observations, ${start_date} to ${end_date}`,
        {
          rows: result.data,
          dateKey: "date",
          valueKey: "value",
          total: result.count,
        },
      );
    },
  },

  {
    name: "noaa_locations",
    description: "Search NOAA location IDs (states, cities, countries) for use with other NOAA tools.",
    annotations: { title: "NOAA: Search Locations", readOnlyHint: true },
    parameters: z.object({
      category: z.enum(["ST", "CITY", "CNTRY", "CLIM_REG"]).optional().describe("Location category: ST=states, CITY, CNTRY=countries, CLIM_REG=climate regions"),
      dataset_id: z.string().optional().describe("Filter by dataset, e.g. 'GHCND'"),
      limit: z.number().int().max(1000).default(50).describe("Max results (default 50)"),
    }),
    execute: async ({ category, dataset_id, limit }) => {
      const locations = await searchLocations({ categoryId: category, datasetId: dataset_id, limit });
      if (!locations.length) return emptyResponse("No locations found.");
      return listResponse(
        `${locations.length} locations found`,
        { items: locations },
      );
    },
  },
];
