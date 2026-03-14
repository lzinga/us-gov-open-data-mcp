/**
 * bls module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "bls",
  displayName: "Bureau of Labor Statistics",
  category: "Economic",
  description: "Employment, wages, CPI components, PPI, JOLTS, labor productivity",
  auth: { envVar: "BLS_API_KEY", signup: "https://www.bls.gov/developers/home.htm" },
  workflow: "bls_search_series to find series IDs → bls_series_data to fetch values",
  tips: "Key advantage over FRED: granular breakdowns (CPI by food/shelter/gas/medical, employment by industry, wages by sector). API key optional but recommended (25 req/day without, 500 with).",
  domains: ["economy"],
  crossRef: [
    { question: "economy", route: "bls_cpi_breakdown (inflation by component), bls_employment_by_industry (jobs by NAICS sector)" },
    { question: "health", route: "bls_cpi_breakdown (medical care CPI component)" },
    { question: "drug shortages", route: "bls_cpi_breakdown (medical care CPI component)" },
    { question: "food safety", route: "bls_cpi_breakdown (food CPI component)" },
    { question: "energy/climate", route: "bls_cpi_breakdown (energy CPI component)" },
    { question: "agriculture", route: "bls_cpi_breakdown (food CPI component)" },
    { question: "housing", route: "bls_cpi_breakdown (shelter CPI component)" },
    { question: "college", route: "bls_employment_by_industry (employment by education level)" },
    { question: "workplace safety", route: "bls_employment_by_industry (workforce size context)" },
    { question: "unemployment", route: "bls_employment_by_industry (employment levels and changes by sector)" },
    { question: "transportation", route: "bls_cpi_breakdown (transportation CPI component)" },
    { question: "state-level", route: "bls_employment_by_industry (state/metro employment data via SM/LA series)" },
  ],
  reference: {
  docs: {
    "API v2": "https://www.bls.gov/developers/api_signature_v2.htm",
    "Series Formats": "https://www.bls.gov/help/hlpforma.htm",
    "Registration": "https://www.bls.gov/developers/home.htm",
  },
},
} satisfies ModuleMeta;
