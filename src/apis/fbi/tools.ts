/**
 * fbi MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  getAgenciesByState,
  getSummarizedCrime,
  getArrestData,
  getExpandedHomicide,
  getExpandedProperty,
  getHateCrime,
  getLawEnforcementEmployees,
  getLesdcData,
  getNibrsData,
  getUseOfForceFederal,
  getUseOfForceNational,
  SUMMARIZED_OFFENSES,
  ARREST_OFFENSES,
  NIBRS_OFFENSES,
  SUPPLEMENTAL_OFFENSES,
  HATE_CRIME_BIAS_CODES,
  LESDC_CHART_TYPES,
} from "./sdk.js";
import { tableResponse, recordResponse, emptyResponse } from "../../shared/response.js";
import { keysEnum, describeEnum } from "../../shared/enum-utils.js";

const summarizedEnum = keysEnum(SUMMARIZED_OFFENSES);
const arrestEnum = keysEnum(ARREST_OFFENSES);
const nibrsEnum = keysEnum(NIBRS_OFFENSES);
const biasEnum = keysEnum(HATE_CRIME_BIAS_CODES);
const lesdcEnum = [...LESDC_CHART_TYPES] as [string, ...string[]];

export const tools: Tool<any, any>[] = [
  // ── 1. Agency Lookup ─────────────────────────────────────────────
  {
    name: "fbi_agencies",
    description:
      "List law enforcement agencies in a U.S. state from the FBI CDE. " +
      "Returns agencies grouped by county with ORI codes, coordinates, and NIBRS participation dates. " +
      "Use ORI codes from this tool to query agency-level data in other FBI tools.",
    annotations: { title: "FBI: Agencies by State", readOnlyHint: true },
    parameters: z.object({
      state: z.string().describe("Two-letter state abbreviation (e.g., 'CA', 'TX', 'WA')"),
    }),
    execute: async ({ state }) => {
      const data = await getAgenciesByState(state);
      if (!data || (Array.isArray(data) && !data.length)) return emptyResponse(`No FBI agencies found for state '${state}'.`);
      // API returns { county: [agencies...] } — flatten to a table of agencies
      if (!Array.isArray(data) && typeof data === "object") {
        const agencies: Record<string, unknown>[] = [];
        for (const [county, list] of Object.entries(data)) {
          if (!Array.isArray(list)) continue;
          for (const agency of list) {
            agencies.push({
              county,
              agency_name: (agency as any).agency_name ?? null,
              ori: (agency as any).ori ?? null,
              agency_type_name: (agency as any).agency_type_name ?? null,
              nibrs_start_date: (agency as any).nibrs_start_date ?? null,
              latitude: (agency as any).latitude ?? null,
              longitude: (agency as any).longitude ?? null,
            });
          }
        }
        if (agencies.length) return tableResponse(`FBI agencies in ${state}: ${agencies.length} agencies across ${Object.keys(data).length} counties`, { rows: agencies });
        return emptyResponse(`No FBI agencies found for state '${state}'.`);
      }
      if (Array.isArray(data)) return tableResponse(`FBI agencies in ${state}: ${data.length} agencies`, { rows: data as Record<string, unknown>[] });
      return recordResponse(`FBI agencies in ${state}`, data as Record<string, unknown>);
    },
  },

  // ── 2. Summarized Crime ──────────────────────────────────────────
  {
    name: "fbi_crime_summarized",
    description:
      "Get summarized UCR crime data from the FBI at national, state, or agency level. " +
      "Covers 10 offense categories: V (violent crime), P (property crime), " +
      "HOM (homicide), RPE (rape), ROB (robbery), ASS (aggravated assault), " +
      "BUR (burglary), LAR (larceny/theft), MVT (motor vehicle theft), ARS (arson). " +
      "Returns year-by-year data with counts and rates.",
    annotations: { title: "FBI: Summarized Crime (UCR)", readOnlyHint: true },
    parameters: z.object({
      offense: z.enum(summarizedEnum).describe(
        `UCR offense code: ${describeEnum(SUMMARIZED_OFFENSES)}`
      ),
      state: z.string().optional().describe("Two-letter state abbreviation for state-level data"),
      ori: z.string().optional().describe("Agency ORI code for agency-level data (e.g., 'WASPD0000')"),
      from_year: z.number().int().optional().describe("Start year (default: 5 years ago)"),
      to_year: z.number().int().optional().describe("End year (default: current year)"),
    }),
    execute: async ({ offense, state, ori, from_year, to_year }) => {
      const level = ori ? "agency" : state ? "state" : "national";
      const data = await getSummarizedCrime({
        level, offense: offense.toUpperCase(), state, ori,
        fromYear: from_year, toYear: to_year,
      });
      if (!data || (Array.isArray(data) && !data.length)) return emptyResponse(`No summarized crime data found for offense '${offense}' at ${level} level.`);
      if (Array.isArray(data)) return tableResponse(`FBI summarized crime (${offense}) at ${level} level: ${data.length} records`, { rows: data as Record<string, unknown>[] });
      return recordResponse(`FBI summarized crime (${offense}) at ${level} level`, data as Record<string, unknown>);
    },
  },

  // ── 3. Arrest Data ───────────────────────────────────────────────
  {
    name: "fbi_arrest_data",
    description:
      "Get arrest statistics from the FBI at national, state, or agency level. " +
      "Offense codes are numeric: 'all' (all offenses), '11' (murder), '20' (rape), " +
      "'30' (robbery), '50' (aggravated assault), '150' (drug abuse), and 40+ more. " +
      "Returns counts or totals broken down by year, age, sex, race, ethnicity.",
    annotations: { title: "FBI: Arrest Data", readOnlyHint: true },
    parameters: z.object({
      offense: z.enum(arrestEnum).describe(
        `Arrest offense code: ${describeEnum(ARREST_OFFENSES, 6)}`
      ),
      state: z.string().optional().describe("Two-letter state abbreviation for state-level data"),
      ori: z.string().optional().describe("Agency ORI code for agency-level data"),
      type: z.enum(["counts", "totals"]).optional().describe("Data type: 'counts' (default) or 'totals'"),
      from_year: z.number().int().optional().describe("Start year (default: 5 years ago)"),
      to_year: z.number().int().optional().describe("End year (default: current year)"),
    }),
    execute: async ({ offense, state, ori, type, from_year, to_year }) => {
      const level = ori ? "agency" : state ? "state" : "national";
      const data = await getArrestData({
        level, offense, state, ori, type,
        fromYear: from_year, toYear: to_year,
      });
      if (!data || (Array.isArray(data) && !data.length)) return emptyResponse(`No arrest data found for offense '${offense}' at ${level} level.`);
      if (Array.isArray(data)) return tableResponse(`FBI arrest data (${offense}) at ${level} level: ${data.length} records`, { rows: data as Record<string, unknown>[] });
      return recordResponse(`FBI arrest data (${offense}) at ${level} level`, data as Record<string, unknown>);
    },
  },

  // ── 4. Expanded Homicide ─────────────────────────────────────────
  {
    name: "fbi_expanded_homicide",
    description:
      "Get expanded homicide (Supplementary Homicide Report) data from the FBI. " +
      "Includes victim/offender demographics, weapons used, and circumstances. " +
      "Available at national, state, or agency level.",
    annotations: { title: "FBI: Expanded Homicide (SHR)", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Two-letter state abbreviation for state-level data"),
      ori: z.string().optional().describe("Agency ORI code for agency-level data"),
      type: z.enum(["counts", "totals"]).optional().describe("Data type (default: counts)"),
      from_year: z.number().int().optional().describe("Start year"),
      to_year: z.number().int().optional().describe("End year"),
    }),
    execute: async ({ state, ori, type, from_year, to_year }) => {
      const level = ori ? "agency" : state ? "state" : "national";
      const data = await getExpandedHomicide({
        level, state, ori, type, fromYear: from_year, toYear: to_year,
      });
      if (!data || (Array.isArray(data) && !data.length)) return emptyResponse(`No expanded homicide data found at ${level} level.`);
      if (Array.isArray(data)) return tableResponse(`FBI expanded homicide data at ${level} level: ${data.length} records`, { rows: data as Record<string, unknown>[] });
      return recordResponse(`FBI expanded homicide data at ${level} level`, data as Record<string, unknown>);
    },
  },

  // ── 5. Hate Crime ────────────────────────────────────────────────
  {
    name: "fbi_hate_crime",
    description:
      "Get hate crime data from the FBI at national, state, or agency level. " +
      "Returns incidents broken down by bias category (race, religion, sexual orientation, etc.), " +
      "offense type, victim type, offender demographics, and location type. " +
      "Optionally filter by bias code (e.g., '12'=Anti-Black, '14'=Anti-Jewish, '22'=Anti-Islamic, '41'=Anti-Gay).",
    annotations: { title: "FBI: Hate Crime Data", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Two-letter state abbreviation for state-level data"),
      ori: z.string().optional().describe("Agency ORI code for agency-level data"),
      bias: z.enum(biasEnum).optional().describe(
        `Bias code filter: ${describeEnum(HATE_CRIME_BIAS_CODES, 6)}`
      ),
      type: z.enum(["counts", "totals"]).optional().describe("Data type"),
      from_year: z.number().int().optional().describe("Start year"),
      to_year: z.number().int().optional().describe("End year"),
    }),
    execute: async ({ state, ori, bias, type, from_year, to_year }) => {
      const level = ori ? "agency" : state ? "state" : "national";
      const data = await getHateCrime({
        level, state, ori, bias, type,
        fromYear: from_year, toYear: to_year,
      });
      if (!data || (Array.isArray(data) && !data.length)) return emptyResponse(`No hate crime data found at ${level} level.`);
      if (Array.isArray(data)) return tableResponse(`FBI hate crime data at ${level} level: ${data.length} records`, { rows: data as Record<string, unknown>[] });
      return recordResponse(`FBI hate crime data at ${level} level`, data as Record<string, unknown>);
    },
  },

  // ── 6. Law Enforcement Employees ─────────────────────────────────
  {
    name: "fbi_law_enforcement_employees",
    description:
      "Get law enforcement employee data (sworn officers, civilian employees) " +
      "at national, state, or agency level. Shows staffing levels over time.",
    annotations: { title: "FBI: Law Enforcement Employees", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Two-letter state abbreviation for state-level data"),
      ori: z.string().optional().describe("Agency ORI code (requires state param too)"),
      from_year: z.number().int().optional().describe("Start year (default: 5 years ago)"),
      to_year: z.number().int().optional().describe("End year (default: current year)"),
    }),
    execute: async ({ state, ori, from_year, to_year }) => {
      const data = await getLawEnforcementEmployees({
        state, ori, fromYear: from_year, toYear: to_year,
      });
      const label = state ? `${state}${ori ? ` (${ori})` : ""}` : "national";
      if (!data || (Array.isArray(data) && !data.length)) return emptyResponse(`No law enforcement employee data found for ${label}.`);
      if (Array.isArray(data)) return tableResponse(`FBI law enforcement employees (${label}): ${data.length} records`, { rows: data as Record<string, unknown>[] });
      return recordResponse(`FBI law enforcement employees (${label})`, data as Record<string, unknown>);
    },
  },

  // ── 7. LESDC ─────────────────────────────────────────────────────
  {
    name: "fbi_lesdc",
    description:
      "Get Law Enforcement Suicide Data Collection (LESDC) statistics. " +
      "Chart types: race, demographics, manner, location, employment, occupation, " +
      "military, totals, duty, exp, experience, suffered, prior, investigation, wellness.",
    annotations: { title: "FBI: Law Enforcement Suicide Data", readOnlyHint: true },
    parameters: z.object({
      chart_type: z.enum(lesdcEnum).describe(
        "LESDC chart type"
      ),
      year: z.number().int().describe("Year to query"),
    }),
    execute: async ({ chart_type, year }) => {
      const data = await getLesdcData({ chartType: chart_type, year });
      if (!data || (Array.isArray(data) && !data.length)) return emptyResponse(`No LESDC data found for '${chart_type}' in ${year}.`);
      if (Array.isArray(data)) return tableResponse(`FBI LESDC (${chart_type}) for ${year}: ${data.length} records`, { rows: data as Record<string, unknown>[] });
      return recordResponse(`FBI LESDC (${chart_type}) for ${year}`, data as Record<string, unknown>);
    },
  },

  // ── 8. Use of Force ──────────────────────────────────────────────
  {
    name: "fbi_use_of_force",
    description:
      "Get Use of Force data from the FBI. Covers incidents where law enforcement use of force " +
      "resulted in death, serious injury, or firearm discharge. " +
      "Available at federal (all federal agencies) or national (all participating agencies) level. " +
      "Use scope='federal' for federal agencies, 'national' for all agencies participation data.",
    annotations: { title: "FBI: Use of Force", readOnlyHint: true },
    parameters: z.object({
      scope: z.enum(["federal", "national"]).describe(
        "'federal' = federal UoF by year, 'national' = national UoF participation by year"
      ),
      year: z.number().int().describe("Year to query (2019-present)"),
      quarter: z.number().int().optional().describe("Quarter (default: 4 = full year cumulative)"),
    }),
    execute: async ({ scope, year, quarter }) => {
      const data = scope === "federal"
        ? await getUseOfForceFederal({ year, quarter })
        : await getUseOfForceNational({ year, quarter });
      if (!data || (Array.isArray(data) && !data.length)) return emptyResponse(`No use of force data found (${scope}) for ${year}.`);
      if (Array.isArray(data)) return tableResponse(`FBI use of force (${scope}) for ${year}: ${data.length} records`, { rows: data as Record<string, unknown>[] });
      return recordResponse(`FBI use of force (${scope}) for ${year}`, data as Record<string, unknown>);
    },
  },

  // ── 9. NIBRS (Incident-Based) ────────────────────────────────────
  {
    name: "fbi_nibrs",
    description:
      "Get NIBRS (National Incident-Based Reporting System) data from the FBI. " +
      "More detailed than summarized UCR data — includes victim/offender demographics, " +
      "relationships, weapons, location, and time of day for 71 offense types. " +
      "Offense codes use NIBRS format: '13A' (aggravated assault), '09A' (murder), " +
      "'23H' (all other larceny), '35A' (drug violations), '220' (burglary), etc.",
    annotations: { title: "FBI: NIBRS Incident Data", readOnlyHint: true },
    parameters: z.object({
      offense: z.enum(nibrsEnum).describe(
        `NIBRS offense code: ${describeEnum(NIBRS_OFFENSES, 6)}`
      ),
      state: z.string().optional().describe("Two-letter state abbreviation for state-level data"),
      ori: z.string().optional().describe("Agency ORI code for agency-level data"),
      type: z.enum(["counts", "totals"]).optional().describe("Data type (default: counts)"),
      from_year: z.number().int().optional().describe("Start year"),
      to_year: z.number().int().optional().describe("End year"),
    }),
    execute: async ({ offense, state, ori, type, from_year, to_year }) => {
      const level = ori ? "agency" : state ? "state" : "national";
      const data = await getNibrsData({
        level, offense, state, ori, type,
        fromYear: from_year, toYear: to_year,
      });
      if (!data || (Array.isArray(data) && !data.length)) return emptyResponse(`No NIBRS data found for offense '${offense}' at ${level} level.`);
      if (Array.isArray(data)) return tableResponse(`FBI NIBRS data (${offense}) at ${level} level: ${data.length} records`, { rows: data as Record<string, unknown>[] });
      return recordResponse(`FBI NIBRS data (${offense}) at ${level} level`, data as Record<string, unknown>);
    },
  },

  // ── 10. Expanded Property (Supplemental) ─────────────────────────
  {
    name: "fbi_expanded_property",
    description:
      "Get expanded property crime details from the FBI (Supplemental Return / Return A data). " +
      "Provides additional breakdowns beyond summarized counts: value of stolen/recovered property, " +
      "type of property, premises involved. Available for burglary (NB), larceny (NL), " +
      "motor vehicle theft (NMVT), and robbery (NROB).",
    annotations: { title: "FBI: Expanded Property Data", readOnlyHint: true },
    parameters: z.object({
      offense: z.enum(keysEnum(SUPPLEMENTAL_OFFENSES)).describe(
        `Offense code: ${describeEnum(SUPPLEMENTAL_OFFENSES)}`
      ),
      state: z.string().optional().describe("Two-letter state abbreviation for state-level data"),
      ori: z.string().optional().describe("Agency ORI code for agency-level data"),
      type: z.enum(["counts", "totals"]).optional().describe("Data type (default: counts)"),
      from_year: z.number().int().optional().describe("Start year"),
      to_year: z.number().int().optional().describe("End year"),
    }),
    execute: async ({ offense, state, ori, type, from_year, to_year }) => {
      const level = ori ? "agency" : state ? "state" : "national";
      const data = await getExpandedProperty({
        level, offense, state, ori, type,
        fromYear: from_year, toYear: to_year,
      });
      if (!data || (Array.isArray(data) && !data.length)) return emptyResponse(`No expanded property data found for offense '${offense}' at ${level} level.`);
      if (Array.isArray(data)) return tableResponse(`FBI expanded property (${offense}) at ${level} level: ${data.length} records`, { rows: data as Record<string, unknown>[] });
      return recordResponse(`FBI expanded property (${offense}) at ${level} level`, data as Record<string, unknown>);
    },
  },
];
