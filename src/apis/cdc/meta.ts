/**
 * cdc module metadata.
 */

import { DATASETS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "cdc",
  displayName: "CDC Health Data",
  category: "Health",
  description: "U.S. health statistics: leading causes of death, life expectancy, mortality rates, county/city health indicators, weekly death surveillance, disability, COVID-19",
  workflow: "cdc_causes_of_death for mortality, cdc_life_expectancy for longevity, cdc_places_health for county health indicators, cdc_mortality_rates for recent death rates",
  tips: "States use full names ('New York') for causes of death; abbreviations ('NY') for PLACES/COVID. Life expectancy data through 2018; use cdc_mortality_rates for 2020+.",
  domains: ["health"],
  crossRef: [
    { question: "health", route: "cdc_causes_of_death, cdc_mortality_rates, cdc_life_expectancy, cdc_weekly_deaths, cdc_places_health, cdc_drug_overdose" },
    { question: "state-level", route: "cdc_places_health (county/city health indicators)" },
    { question: "tobacco/vaping", route: "cdc_drug_overdose, cdc_causes_of_death (tobacco-related mortality)" },
    { question: "education", route: "cdc_nutrition_obesity (child food insecurity/health indicators)" },
    { question: "earthquakes/water", route: "cdc_places_health (health impact indicators for affected areas)" },
    { question: "drug investigation", route: "cdc_drug_overdose, cdc_causes_of_death (health outcome data for drugs under investigation)" },
    { question: "international", route: "cdc_life_expectancy, cdc_mortality_rates (U.S. baseline for international health comparisons)" },
  ],
  reference: {
  datasets: Object.fromEntries(
    Object.entries(DATASETS).map(([k, v]) => [v.id, `${v.name}: ${v.description}`])
  ),
  docs: {
    "CDC Open Data": "https://data.cdc.gov/",
    "SODA API Docs": "https://dev.socrata.com/",
    "Leading Causes of Death": "https://data.cdc.gov/d/bi63-dtpu",
    "Life Expectancy": "https://data.cdc.gov/d/w9j2-ggv5",
    "PLACES County Data": "https://data.cdc.gov/d/swc5-untb",
    "PLACES City Data": "https://data.cdc.gov/d/dxpw-cm5u",
  },
},
} satisfies ModuleMeta;
