/**
 * geo MCP tools — address, coordinate, ZIP and county name to FIPS codes.
 *
 * Docs: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import { geocodeAddress, locatePoint, lookupZip, listCounties } from "./sdk.js";
import { listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

/** Repeated in every tool description: what the caller does with the result. */
const HANDOFF =
  "Pass county.fips (5 digits) to tools that ask for a county FIPS, " +
  "or state.fips plus the 3-digit county code to epa_air_quality and usgs_water_sites.";

export const tools: Tool<any, any>[] = [
  // ── Address ──────────────────────────────────────────────────────
  {
    name: "geo_locate",
    description:
      "Geocode a US street address to latitude/longitude and its Census FIPS codes " +
      "(state, county, tract, block, place, congressional district).\n" +
      "Needs a street number and street name — for a bare ZIP use geo_zip, " +
      "and for a county name use geo_counties.\n" +
      `${HANDOFF}\n\n` +
      "Example: address='1600 Pennsylvania Ave NW, Washington, DC'",
    annotations: { title: "Geo: Address to FIPS Codes", readOnlyHint: true },
    parameters: z.object({
      address: z.string().describe("One-line US address: '1600 Pennsylvania Ave NW, Washington, DC'"),
      limit: z.number().int().min(1).max(10).optional().describe("Most matches to return (default 5)"),
    }),
    execute: async ({ address, limit }) => {
      const matches = await geocodeAddress(address, { limit });
      if (!matches.length) {
        return emptyResponse(
          `No Census match for "${address}". Check the street number and spelling, ` +
          "or use geo_zip for a ZIP code and geo_counties for a county name.",
        );
      }
      if (matches.length === 1) {
        return recordResponse(`Located ${matches[0].matchedAddress}`, matches[0]);
      }
      return listResponse(`${matches.length} matches for "${address}"`, {
        total: matches.length,
        items: matches,
      });
    },
  },

  // ── Coordinate ───────────────────────────────────────────────────
  {
    name: "geo_point",
    description:
      "Look up the Census FIPS codes for a latitude/longitude " +
      "(state, county, tract, block, place, congressional district).\n" +
      "Use for coordinates that came from another tool, such as an earthquake epicentre " +
      "or a weather station.\n" +
      `${HANDOFF}\n\n` +
      "Example: latitude=47.61, longitude=-122.33 (Seattle)",
    annotations: { title: "Geo: Coordinate to FIPS Codes", readOnlyHint: true },
    parameters: z.object({
      latitude: z.number().min(-90).max(90).describe("Degrees north: 47.61"),
      longitude: z.number().min(-180).max(180).describe("Degrees east; negative in the US: -122.33"),
    }),
    execute: async ({ latitude, longitude }) => {
      const point = await locatePoint(latitude, longitude);
      if (!point.areas.state) {
        return emptyResponse(
          `No US Census geography covers ${latitude}, ${longitude}. ` +
          "Check the sign of the longitude — US longitudes are negative.",
        );
      }
      const county = point.areas.county?.name ?? point.areas.state.name;
      return recordResponse(`${latitude}, ${longitude} is in ${county}`, point);
    },
  },

  // ── ZIP ──────────────────────────────────────────────────────────
  {
    name: "geo_zip",
    description:
      "Look up a 5-digit ZIP code: its center coordinate, the county and tract there, " +
      "and the counties around it.\n" +
      "A ZIP can span several counties, so `areas.county` is the one at the ZIP's center and " +
      "`nearbyCounties` lists the counties overlapping its bounding box (which can include neighbours).\n" +
      "Based on Census ZIP Code Tabulation Areas, so PO-box-only ZIPs are not found.\n" +
      `${HANDOFF}\n\n` +
      "Example: zip='98101'",
    annotations: { title: "Geo: ZIP Code to FIPS Codes", readOnlyHint: true },
    parameters: z.object({
      zip: z.string().regex(/^\d{5}$/, "zip must be 5 digits").describe("5-digit ZIP code: '98101'"),
    }),
    execute: async ({ zip }) => {
      const location = await lookupZip(zip);
      if (!location) {
        return emptyResponse(
          `No Census ZIP area (ZCTA) for ${zip}. PO-box-only and newly assigned ZIPs have none; ` +
          "try geo_locate with a street address in that ZIP.",
        );
      }
      const county = location.areas.county?.name ?? "an unnamed county";
      return recordResponse(`ZIP ${zip} centers in ${county}`, location);
    },
  },

  // ── County lookup ────────────────────────────────────────────────
  {
    name: "geo_counties",
    description:
      "List the counties in a state with their FIPS codes, or find one by name.\n" +
      "Use when a question names a county ('Harris County') but the tool needs a code.\n" +
      `${HANDOFF}\n\n` +
      "Example: state='TX', name='Harris' → 48201",
    annotations: { title: "Geo: Counties and FIPS Codes by State", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("State name, two-letter code or FIPS code: 'Texas', 'TX' or '48'"),
      name: z.string().optional().describe("Keep only counties whose name contains this text: 'Harris'"),
    }),
    execute: async ({ state, name }) => {
      const counties = await listCounties(state, { name });
      if (!counties.length) {
        return emptyResponse(
          name
            ? `No county in ${state} has a name containing "${name}". Call geo_counties without name to list them all.`
            : `No counties found for state "${state}".`,
        );
      }
      const scope = name ? `matching "${name}" in ${state}` : `in ${state}`;
      return listResponse(`${counties.length} counties ${scope}`, {
        total: counties.length,
        items: counties,
      });
    },
  },
];
