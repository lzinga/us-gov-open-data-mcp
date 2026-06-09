/**
 * cdc MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import { getLeadingCausesOfDeath, getLifeExpectancy, getMortalityRates, getPlacesHealth, getPlacesCityHealth, getCovidData, getWeeklyDeaths, getDisabilityData, getDrugOverdoseData, getNutritionObesityData, getHistoricalDeathRates, getBirthIndicators, queryDataset, DATASETS } from "./sdk.js";
import { tableResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "cdc_causes_of_death",
    description: "Get leading causes of death in the U.S. by state and year.\nData from 1999–2017. Causes include heart disease, cancer, kidney disease, etc.",
    annotations: { title: "CDC: Causes of Death", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Full state name: 'New York', 'California', 'Texas'. Omit for all states"),
      year: z.number().int().optional().describe("Year (1999–2017). Omit for all years"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ state, year, limit }) => {
      const data = await getLeadingCausesOfDeath({ state, year, limit });
      if (!data.length) return emptyResponse(`No death data found${state ? ` for ${state}` : ""}${year ? ` in ${year}` : ""}.`);
      return tableResponse(
        `Leading causes of death: ${data.length} records${state ? ` for ${state}` : ""}${year ? ` (${year})` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_life_expectancy",
    description: "Get U.S. life expectancy at birth by race and sex (1900–2018).\nRaces: 'All Races', 'Black', 'White'. Sex: 'Both Sexes', 'Male', 'Female'.\nNote: Data goes through 2018. For more recent mortality trends, use cdc_mortality_rates.",
    annotations: { title: "CDC: Life Expectancy", readOnlyHint: true },
    parameters: z.object({
      year: z.number().int().optional().describe("Year (1900–2018)"),
      race: z.enum(["All Races", "Black", "White"]).optional().describe("Race filter"),
      sex: z.enum(["Both Sexes", "Male", "Female"]).optional().describe("Sex filter"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ year, race, sex, limit }) => {
      const data = await getLifeExpectancy({ year, race, sex, limit });
      if (!data.length) return emptyResponse("No life expectancy data found.");
      return tableResponse(
        `Life expectancy: ${data.length} records${year ? ` (${year})` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_mortality_rates",
    description: "Get provisional age-adjusted death rates by cause, sex, and state (quarterly, 2020–present).\nCauses: 'All causes', 'Heart disease', 'Cancer', 'COVID-19', 'Drug overdose', 'Suicide', etc.\nReturns rate_overall, rate_sex_female, rate_sex_male, and per-state rates.",
    annotations: { title: "CDC: Mortality Rates", readOnlyHint: true },
    parameters: z.object({
      quarter: z.string().optional().describe("Quarter: '2024 Q4', '2025 Q1'. Omit for all."),
      cause: z.string().optional().describe("'All causes', 'Heart disease', 'Cancer', 'COVID-19', 'Drug overdose', 'Suicide', 'Diabetes', 'Alzheimer disease'"),
      rate_type: z.enum(["Age-adjusted", "Crude"]).optional().describe("Rate type (default: Age-adjusted)"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ quarter, cause, rate_type, limit }) => {
      const data = await getMortalityRates({ quarter, cause, rateType: rate_type, limit });
      if (!data.length) return emptyResponse("No mortality rate data found.");
      return tableResponse(
        `Mortality rates: ${data.length} records${quarter ? ` (${quarter})` : ""}${cause ? ` for ${cause}` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_places_health",
    description: "Get county-level health indicators from CDC PLACES (BRFSS-based estimates).\n" +
      "Measures: OBESITY, DIABETES, CSMOKING (smoking), BINGE (binge drinking), BPHIGH (high BP), " +
      "DEPRESSION, SLEEP (short sleep), CHD (heart disease), COPD, CANCER, STROKE, ARTHRITIS, " +
      "CASTHMA (asthma), MHLTH (mental distress), PHLTH (physical distress), LPA (physical inactivity), " +
      "ACCESS2 (no health insurance), DENTAL, CHECKUP, KIDNEY, HIGHCHOL, TEETHLOST, " +
      "FOODINSECU (food insecurity), LONELINESS, HOUSINSECU (housing insecurity)\n" +
      "Returns crude prevalence (%) by county.",
    annotations: { title: "CDC: County Health Indicators", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Two-letter state code: 'NY', 'CA', 'TX'. Omit for all."),
      measure: z.string().optional().describe("Measure ID: 'OBESITY', 'DIABETES', 'CSMOKING', 'DEPRESSION', 'BINGE', 'SLEEP', 'BPHIGH', 'LPA', 'ACCESS2', 'FOODINSECU', 'LONELINESS', 'HOUSINSECU'"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ state, measure, limit }) => {
      const data = await getPlacesHealth({ state, measure, limit });
      if (!data.length) return emptyResponse(`No PLACES health data found${state ? ` for ${state}` : ""}.`);
      return tableResponse(
        `PLACES county health: ${data.length} records${state ? ` for ${state}` : ""}${measure ? ` (${measure})` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_places_city",
    description: "Get city-level health indicators from CDC PLACES — obesity, diabetes, smoking, depression, sleep, " +
      "blood pressure, mental health, and 30+ more measures for every U.S. city with population > 50,000.\n" +
      "Each row contains ALL measures for a city as separate columns (e.g. obesity_crudeprev, diabetes_crudeprev).",
    annotations: { title: "CDC: City Health Indicators", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Two-letter state code: 'NY', 'CA', 'TX'"),
      city: z.string().optional().describe("City name (partial match): 'Los Angeles', 'Chicago'"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ state, city, limit }) => {
      const data = await getPlacesCityHealth({ state, city, limit });
      if (!data.length) return emptyResponse(`No PLACES city health data found${city ? ` for ${city}` : ""}.`);
      return tableResponse(
        `PLACES city health: ${data.length} cities${state ? ` in ${state}` : ""}${city ? ` matching '${city}'` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_weekly_deaths",
    description: "Get weekly provisional death counts by state — COVID-19, pneumonia, influenza, and total deaths.\n" +
      "THIS IS THE MOST CURRENT CDC MORTALITY DATA — updated weekly, covers 2020–present.\n" +
      "Includes percent_of_expected_deaths to detect excess mortality.",
    annotations: { title: "CDC: Weekly Death Surveillance", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Full state name: 'New York', 'California'. Omit for all."),
      year: z.number().int().optional().describe("Year (2020–present). Omit for all."),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ state, year, limit }) => {
      const data = await getWeeklyDeaths({ state, year, limit });
      if (!data.length) return emptyResponse(`No weekly death data found${state ? ` for ${state}` : ""}.`);
      return tableResponse(
        `Weekly death surveillance: ${data.length} records${state ? ` for ${state}` : ""}${year ? ` (${year})` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_disability",
    description: "Get disability prevalence by state and type from BRFSS survey.\n" +
      "Types: 'Any Disability', 'Mobility Disability', 'Cognitive Disability', 'Hearing Disability', " +
      "'Vision Disability', 'Self-care Disability', 'Independent Living Disability', 'No Disability'",
    annotations: { title: "CDC: Disability Prevalence", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Two-letter state code: 'NY', 'CA'. Omit for all."),
      disability_type: z.string().optional().describe("'Any Disability', 'Mobility Disability', 'Cognitive Disability', 'Hearing Disability', 'Vision Disability', 'Self-care Disability', 'Independent Living Disability'"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ state, disability_type, limit }) => {
      const data = await getDisabilityData({ state, disabilityType: disability_type, limit });
      if (!data.length) return emptyResponse(`No disability data found${state ? ` for ${state}` : ""}.`);
      return tableResponse(
        `Disability prevalence: ${data.length} records${state ? ` for ${state}` : ""}${disability_type ? ` (${disability_type})` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_drug_overdose",
    description: "Get drug poisoning/overdose mortality by state (1999\u20132016).\\n" +
      "Includes death rates by state, sex, race, and age group. Critical for opioid crisis analysis.",
    annotations: { title: "CDC: Drug Overdose Mortality", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Full state name: 'West Virginia', 'Ohio', 'New Hampshire'. Omit for all."),
      year: z.number().int().optional().describe("Year (1999\u20132016)"),
      sex: z.enum(["Both Sexes", "Male", "Female"]).optional().describe("Sex filter"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ state, year, sex, limit }) => {
      const data = await getDrugOverdoseData({ state, year, sex, limit });
      if (!data.length) return emptyResponse(`No drug overdose data found${state ? ` for ${state}` : ""}.`);
      return tableResponse(
        `Drug overdose mortality: ${data.length} records${state ? ` for ${state}` : ""}${year ? ` (${year})` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_nutrition_obesity",
    description: "Get adult obesity, physical inactivity, and fruit/vegetable consumption by state from BRFSS.\\n" +
      "Topics: 'Obesity', 'Physical Activity', 'Fruits and Vegetables'. Data by state, race, age, income, education.",
    annotations: { title: "CDC: Nutrition & Obesity", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Two-letter state code: 'NY', 'CA', 'TX'. Omit for all."),
      topic: z.string().optional().describe("'Obesity', 'Physical Activity', 'Fruits and Vegetables'"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ state, topic, limit }) => {
      const data = await getNutritionObesityData({ state, topic, limit });
      if (!data.length) return emptyResponse(`No nutrition/obesity data found${state ? ` for ${state}` : ""}.`);
      return tableResponse(
        `Nutrition & obesity: ${data.length} records${state ? ` for ${state}` : ""}${topic ? ` (${topic})` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_death_rates_historical",
    description: "Get age-adjusted death rates for major causes since 1900.\\n" +
      "Causes: 'Heart Disease', 'Cancer', 'Stroke', 'Unintentional injuries', 'CLRD' (chronic lower respiratory diseases).\\n" +
      "Great for long-term trend analysis \u2014 120+ years of data.",
    annotations: { title: "CDC: Historical Death Rates", readOnlyHint: true },
    parameters: z.object({
      cause: z.enum(["Heart Disease", "Cancer", "Stroke", "Unintentional injuries", "CLRD"]).optional().describe("Cause of death. Omit for all causes."),
      start_year: z.number().int().optional().describe("Start year (earliest: 1900)"),
      end_year: z.number().int().optional().describe("End year (latest: ~2017)"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ cause, start_year, end_year, limit }) => {
      const data = await getHistoricalDeathRates({ cause, startYear: start_year, endYear: end_year, limit });
      if (!data.length) return emptyResponse("No historical death rate data found.");
      return tableResponse(
        `Historical death rates: ${data.length} records${cause ? ` for ${cause}` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_birth_indicators",
    description: "Get quarterly provisional birth indicators: fertility rates, teen birth rates, \\n" +
      "preterm birth rates, cesarean delivery rates, low birthweight \u2014 by race/ethnicity.\\n" +
      "Topics: 'General Fertility', 'Teen Birth', 'Preterm', 'Cesarean', 'Low Birthweight', 'NICU', 'Medicaid'",
    annotations: { title: "CDC: Birth Indicators", readOnlyHint: true },
    parameters: z.object({
      topic: z.string().optional().describe("'General Fertility', 'Teen Birth', 'Preterm', 'Cesarean', 'Low Birthweight', 'NICU', 'Medicaid'"),
      race_ethnicity: z.string().optional().describe("'All races and origins', 'Hispanic', 'Non-Hispanic Black', 'Non-Hispanic White', 'Non-Hispanic Asian'"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ topic, race_ethnicity, limit }) => {
      const data = await getBirthIndicators({ topic, raceEthnicity: race_ethnicity, limit });
      if (!data.length) return emptyResponse("No birth indicator data found.");
      return tableResponse(
        `Birth indicators: ${data.length} records${topic ? ` (${topic})` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_covid",
    description: "Get COVID-19 weekly case and death counts by state (data through early 2023).\nStates use two-letter abbreviations: 'NY', 'CA', 'TX'.",
    annotations: { title: "CDC: COVID-19 Data", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Two-letter state abbreviation: 'NY', 'CA', 'TX'"),
      limit: z.number().int().max(1000).default(200).describe("Max records (default 200)"),
    }),
    execute: async ({ state, limit }) => {
      const data = await getCovidData({ state, limit });
      if (!data.length) return emptyResponse(`No COVID data found${state ? ` for ${state}` : ""}.`);
      return tableResponse(
        `COVID-19 data: ${data.length} records${state ? ` for ${state}` : ""}`,
        { rows: data },
      );
    },
  },

  {
    name: "cdc_query",
    description: "Custom query against any CDC dataset using SODA syntax.\nDatasets: bi63-dtpu (death 1999–2017), w9j2-ggv5 (life expectancy), 489q-934x (mortality rates), swc5-untb (PLACES county), dxpw-cm5u (PLACES city), pwn4-m3yp (COVID), r8kw-7aab (weekly deaths), s2qv-b27b (disability), xbxb-epbu (drug overdose), hn4x-zwk7 (nutrition/obesity), 6rkc-nb2q (historical death rates), 76vv-a7x8 (birth indicators)",
    annotations: { title: "CDC: Custom Query", readOnlyHint: true },
    parameters: z.object({
      dataset_id: z.string().describe("Dataset ID, e.g. 'bi63-dtpu'"),
      where: z.string().optional().describe("SODA $where clause: \"year = '2021' AND state = 'New York'\""),
      select: z.string().optional().describe("SODA $select: 'year, state, deaths'"),
      order: z.string().optional().describe("SODA $order: 'year DESC'"),
      group: z.string().optional().describe("SODA $group: 'year'"),
      limit: z.number().int().max(1000).default(1000).describe("Max rows (default 1000)"),
    }),
    execute: async ({ dataset_id, where, select, order, group, limit }) => {
      const data = await queryDataset(dataset_id, { where, select, order, group, limit });
      if (!data.length) return emptyResponse("No records found.");
      return tableResponse(
        `${data.length} records from dataset ${dataset_id}`,
        { rows: data },
      );
    },
  },
];
