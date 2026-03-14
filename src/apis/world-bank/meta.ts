/**
 * world-bank module metadata.
 */

import { POPULAR_INDICATORS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "world-bank",
  displayName: "World Bank",
  category: "International",
  description: "International economic indicators for 200+ countries: GDP, population, health spending, life expectancy, trade, inequality",
  workflow: "wb_indicator for a single country, wb_compare to compare countries, wb_search to find indicator IDs",
  tips: "Countries: US, GB, DE, JP, CN, IN, BR. Indicators: NY.GDP.MKTP.CD (GDP), SP.POP.TOTL (population), SP.DYN.LE00.IN (life expectancy)",
  domains: ["international", "economy"],
  crossRef: [
    { question: "debt/deficit", route: "wb_indicator with GC.DOD.TOTL.GD.ZS (central govt debt % GDP)" },
    { question: "economy", route: "wb_compare (international GDP, unemployment, inflation peers)" },
    { question: "health", route: "wb_indicator with SH.XPD.CHEX.GD.ZS (health expenditure % GDP)" },
    { question: "drug investigation", route: "wb_indicator (international drug pricing/health spending comparison)" },
    { question: "drug shortages", route: "wb_indicator with SH.XPD.CHEX.GD.ZS (health spend for international context)" },
    { question: "energy/climate", route: "wb_indicator with EN.ATM.CO2E.PC (CO2 emissions per capita)" },
    { question: "education", route: "wb_indicator with SE.XPD.TOTL.GD.ZS (education expenditure % GDP)" },
    { question: "patents", route: "wb_indicator with GB.XPD.RSDV.GD.ZS (R&D expenditure % GDP)" },
    { question: "international", route: "wb_compare, wb_indicator (200+ countries, 1600+ indicators)" },
    { question: "college", route: "wb_indicator with SE.TER.ENRR (tertiary enrollment rate), SE.XPD.TERT.ZS (tertiary education spending)" },
    { question: "housing", route: "wb_indicator with FP.CPI.TOTL.ZG (inflation context for international housing cost comparison)" },
  ],
  reference: {
  popularIndicators: POPULAR_INDICATORS,
  docs: {
    "API Docs": "https://datahelpdesk.worldbank.org/knowledgebase/articles/889392",
    "Indicator List": "https://data.worldbank.org/indicator",
    "Country Codes": "https://datahelpdesk.worldbank.org/knowledgebase/articles/898590",
  },
},
} satisfies ModuleMeta;
