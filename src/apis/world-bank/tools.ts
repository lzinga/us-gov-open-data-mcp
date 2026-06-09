/**
 * world-bank MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import { getIndicator, compareCountries, searchIndicators, listCountries, listTopics, getTopicIndicators, listSources, getSourceIndicators, listRegions, listIncomeLevels, listLendingTypes, POPULAR_INDICATORS } from "./sdk.js";
import { timeseriesResponse, tableResponse, listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "wb_indicator",
    description: "Get a World Bank indicator for a country.\nPopular: NY.GDP.MKTP.CD (GDP), SP.DYN.LE00.IN (life expectancy), SH.XPD.CHEX.PC.CD (health spend/capita), SL.UEM.TOTL.ZS (unemployment)",
    annotations: { title: "World Bank: Get Indicator", readOnlyHint: true },
    parameters: z.object({
      indicator: z.string().describe("Indicator code, e.g. 'NY.GDP.MKTP.CD'"),
      country: z.string().optional().describe("ISO2 code: US, GB, DE, JP, CN. Default: US"),
      date_range: z.string().optional().describe("Year range: '2015:2024' or single year '2024'. Default: last 10 years"),
    }),
    execute: async ({ indicator, country, date_range }) => {
      const now = new Date().getFullYear();
      const result = await getIndicator(indicator, {
        country: country ?? "US",
        dateRange: date_range ?? `${now - 10}:${now}`,
      });
      if (!result.data.length) return emptyResponse(`No data for indicator ${indicator} in ${country ?? "US"}.`);
      const valid = result.data.filter(d => d.value !== null);
      return timeseriesResponse(
        `${result.data[0]?.indicator?.value ?? indicator}: ${valid.length} data points for ${result.data[0]?.country?.value ?? country}`,
        {
          rows: valid.map(d => ({ year: d.date, value: d.value })),
          dateKey: "year",
          valueKey: "value",
          total: result.total,
          meta: { indicator: result.data[0]?.indicator, country: result.data[0]?.country },
        },
      );
    },
  },

  {
    name: "wb_compare",
    description: "Compare a World Bank indicator across multiple countries.\nGreat for 'How does US compare to...' questions.",
    annotations: { title: "World Bank: Compare Countries", readOnlyHint: true },
    parameters: z.object({
      indicator: z.string().describe("Indicator code"),
      countries: z.string().describe("Semicolon-separated ISO2 codes: 'US;GB;DE;JP;CN'"),
      date_range: z.string().optional().describe("Year range: '2015:2024'. Default: last 5 years"),
    }),
    execute: async ({ indicator, countries, date_range }) => {
      const now = new Date().getFullYear();
      const countryList = countries.split(/[;,]/).map((c: string) => c.trim()).filter(Boolean);
      const result = await compareCountries(indicator, countryList, {
        dateRange: date_range ?? `${now - 5}:${now}`,
      });
      if (!result.data.length) return emptyResponse(`No data for ${indicator} across ${countries}.`);

      // Group by country
      const byCountry: Record<string, { year: string; value: number | null }[]> = {};
      for (const d of result.data) {
        const key = d.countryiso3code || d.country?.value || "?";
        if (!byCountry[key]) byCountry[key] = [];
        byCountry[key].push({ year: d.date, value: d.value });
      }

      return recordResponse(
        `${result.data[0]?.indicator?.value ?? indicator} comparison across ${Object.keys(byCountry).length} countries`,
        { indicator: result.data[0]?.indicator, countries: byCountry },
      );
    },
  },

  {
    name: "wb_search",
    description: "Search World Bank indicators by keyword across the full ~29,000-indicator catalog.\nExamples: 'GDP', 'health expenditure', 'life expectancy', 'CO2 emissions'.",
    annotations: { title: "World Bank: Search Indicators", readOnlyHint: true },
    parameters: z.object({
      query: z.string().describe("Keywords to search for"),
      limit: z.number().int().min(1).max(100).default(30).describe("Max indicators to return"),
    }),
    execute: async ({ query, limit }) => {
      const results = await searchIndicators(query, { limit });
      if (!results.length) return emptyResponse(`No indicators found for "${query}".`);
      return listResponse(
        `${results.length} indicators matching "${query}"`,
        { items: results.map(i => ({ id: i.id, name: i.name, source: i.source?.value })) },
      );
    },
  },

  {
    name: "wb_countries",
    description: "List World Bank countries with region, income level, and capital city.",
    annotations: { title: "World Bank: List Countries", readOnlyHint: true },
    parameters: z.object({}),
    execute: async () => {
      const countries = await listCountries();
      return tableResponse(
        `${countries.length} countries`,
        {
          rows: countries.map(c => ({
            code: c.iso2Code, name: c.name, region: c.region?.value,
            income: c.incomeLevel?.value, capital: c.capitalCity,
          })),
        },
      );
    },
  },

  {
    name: "wb_topics",
    description:
      "Browse World Bank indicators by theme. With no topic_id, lists all 21 topics (Agriculture, Health, Climate Change, Education, etc.). " +
      "With a topic_id, lists every indicator under that topic — the best way to discover indicators for a subject without keyword guessing.",
    annotations: { title: "World Bank: Topics", readOnlyHint: true },
    parameters: z.object({
      topic_id: z.string().optional().describe("Topic ID to list its indicators (e.g. '8' = Health). Omit to list all topics."),
    }),
    execute: async ({ topic_id }) => {
      if (topic_id) {
        const indicators = await getTopicIndicators(topic_id);
        if (!indicators.length) return emptyResponse(`No indicators found for topic ${topic_id}.`);
        return listResponse(
          `${indicators.length} indicators in topic ${topic_id}`,
          { items: indicators.map(i => ({ id: i.id, name: i.name, source: i.source?.value })) },
        );
      }
      const topics = await listTopics();
      return listResponse(
        `${topics.length} World Bank topics`,
        { items: topics.map(t => ({ id: t.id, topic: t.value })) },
      );
    },
  },

  {
    name: "wb_sources",
    description:
      "Browse World Bank data source databases. With no source_id, lists all ~70 sources (World Development Indicators, Doing Business, " +
      "International Debt Statistics, etc.). With a source_id, lists every indicator in that database.",
    annotations: { title: "World Bank: Sources", readOnlyHint: true },
    parameters: z.object({
      source_id: z.string().optional().describe("Source ID to list its indicators (e.g. '2' = World Development Indicators). Omit to list all sources."),
    }),
    execute: async ({ source_id }) => {
      if (source_id) {
        const indicators = await getSourceIndicators(source_id);
        if (!indicators.length) return emptyResponse(`No indicators found for source ${source_id}.`);
        return listResponse(
          `${indicators.length} indicators in source ${source_id}`,
          { items: indicators.map(i => ({ id: i.id, name: i.name, source: i.source?.value })) },
        );
      }
      const sources = await listSources();
      return listResponse(
        `${sources.length} World Bank data sources`,
        { items: sources.map(s => ({ id: s.id, source: s.name, lastUpdated: s.lastupdated })) },
      );
    },
  },

  {
    name: "wb_reference",
    description:
      "Get World Bank classification lookup tables: regions, income levels, or lending types. " +
      "Use the resulting codes to filter wb_countries-style queries (e.g. income level 'LIC' = low income).",
    annotations: { title: "World Bank: Reference Lookups", readOnlyHint: true },
    parameters: z.object({
      type: z.enum(["region", "income_level", "lending_type"]).describe("Which classification to list"),
    }),
    execute: async ({ type }) => {
      if (type === "region") {
        const regions = await listRegions();
        return listResponse(`${regions.length} World Bank regions`, {
          items: regions.map(r => ({ code: r.code, id: r.id, name: r.name })),
        });
      }
      if (type === "income_level") {
        const levels = await listIncomeLevels();
        return listResponse(`${levels.length} income-level classifications`, {
          items: levels.map(l => ({ id: l.id, name: l.value })),
        });
      }
      const types = await listLendingTypes();
      return listResponse(`${types.length} lending-type classifications`, {
        items: types.map(l => ({ id: l.id, name: l.value })),
      });
    },
  },
];
