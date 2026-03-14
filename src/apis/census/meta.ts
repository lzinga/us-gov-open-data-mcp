/**
 * census module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "census",
  displayName: "Census Bureau",
  category: "Demographics",
  description: "Population, demographics, income, housing, business data from ACS, Decennial Census",
  auth: { envVar: "CENSUS_API_KEY", signup: "https://api.census.gov/data/key_signup.html" },
  workflow: "census_search_variables to find variable codes → census_query with dataset, variables, geography",
  tips: "Common variables: NAME, B01001_001E (population), B19013_001E (median income), B25077_001E (home value). Datasets: 2023/acs/acs1 (1yr), 2023/acs/acs5 (5yr), 2020/dec/pl (Decennial).",
  domains: ["economy", "housing", "education"],
  crossRef: [
    { question: "spending/budget", route: "census_population (population for per-capita spending)" },
    { question: "state-level", route: "census_query with B01001_001E (population), B19013_001E (median income)" },
    { question: "housing", route: "census_query with B25077_001E (home value), B25064_001E (median rent)" },
    { question: "education", route: "census_query (poverty rates for education context)" },
    { question: "college", route: "census_query (educational attainment variables)" },
    { question: "workplace safety", route: "census_population (per-capita context)" },
    { question: "disasters", route: "census_population (per-capita impact calculations)" },
    { question: "economy", route: "census_query with B19013_001E (median household income), B01001_001E (population for per-capita calculations)" },
    { question: "international", route: "census_population (U.S. population for per-capita international comparisons)" },
  ],
  reference: {
},
} satisfies ModuleMeta;
