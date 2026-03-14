/**
 * usda-fooddata module metadata.
 */

import { DATA_TYPES } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "usda-fooddata",
  displayName: "USDA FoodData Central",
  category: "Agriculture",
  description: "Nutritional data for 300K+ foods: calories, macros, vitamins, minerals. Covers branded products, standard reference foods, and survey foods.",
  auth: { envVar: "DATA_GOV_API_KEY", signup: "https://api.data.gov/signup/" },
  workflow: "fooddata_search to find foods → fooddata_detail for full nutrient breakdown",
  tips: "Data types: 'Foundation' (minimally processed), 'SR Legacy' (historical reference), 'Branded' (commercial products), 'Survey' (FNDDS dietary studies). Use Foundation or SR Legacy for generic foods, Branded for specific products.",
  domains: ["agriculture", "health"],
  crossRef: [
    { question: "food safety", route: "fooddata_search, fooddata_detail (nutritional/ingredient data for food products)" },
    { question: "agriculture", route: "fooddata_search, fooddata_detail (nutritional composition of agricultural products)" },
    { question: "health", route: "fooddata_search, fooddata_detail (nutritional data for diet/health analysis)" },
    { question: "substance/ingredient lookup", route: "fooddata_search, fooddata_detail (food ingredient and nutrient composition lookup)" },
  ],
  reference: {
  dataTypes: DATA_TYPES,
  docs: {
    "API Guide": "https://fdc.nal.usda.gov/api-guide",
    "FoodData Central": "https://fdc.nal.usda.gov/",
    "Data Documentation": "https://fdc.nal.usda.gov/data-documentation",
  },
},
} satisfies ModuleMeta;
