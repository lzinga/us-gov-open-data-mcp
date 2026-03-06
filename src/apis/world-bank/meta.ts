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
  reference: {
  popularIndicators: POPULAR_INDICATORS,
  docs: {
    "API Docs": "https://datahelpdesk.worldbank.org/knowledgebase/articles/889392",
    "Indicator List": "https://data.worldbank.org/indicator",
    "Country Codes": "https://datahelpdesk.worldbank.org/knowledgebase/articles/898590",
  },
},
} satisfies ModuleMeta;
