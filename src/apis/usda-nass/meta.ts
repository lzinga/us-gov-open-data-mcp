/**
 * usda-nass module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "usda-nass",
  displayName: "USDA NASS QuickStats",
  category: "Agriculture",
  description: "Agricultural production, crop prices, farm income, livestock, Census of Agriculture data",
  auth: { envVar: "USDA_NASS_API_KEY", signup: "https://quickstats.nass.usda.gov/api" },
  workflow: "usda_crop_data or usda_livestock for specific commodities, usda_prices for price trends, usda_ag_query for custom queries",
  tips: "Commodities: CORN, SOYBEANS, WHEAT, COTTON, CATTLE, HOGS, MILK. States: IA, IL, TX, CA, NE",
  domains: ["agriculture"],
  crossRef: [
    { question: "food safety", route: "usda_crop_data, usda_prices (crop production and price context)" },
    { question: "agriculture", route: "usda_crop_data, usda_livestock, usda_prices, usda_ag_query" },
    { question: "animal/vet drugs", route: "usda_livestock (livestock inventory and production data)" },
    { question: "state-level", route: "usda_crop_data, usda_livestock (agricultural production and inventory by state)" },
    { question: "economy", route: "usda_prices (commodity prices as economic/inflation indicator)" },
  ],
  reference: {
  docs: {
    "API Docs": "https://quickstats.nass.usda.gov/api",
    "Get Key": "https://quickstats.nass.usda.gov/api#param_define",
    "QuickStats UI": "https://quickstats.nass.usda.gov/",
  },
},
} satisfies ModuleMeta;
