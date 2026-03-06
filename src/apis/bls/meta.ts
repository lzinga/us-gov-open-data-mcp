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
  reference: {
  seriesPrefixes: {
    CES: "Current Employment Statistics (jobs by industry)",
    LNS: "Labor Force Statistics, seasonally adjusted",
    CU: "Consumer Price Index (CPI-U, urban consumers)",
    WP: "Producer Price Index (PPI)",
    OE: "Occupational Employment and Wages",
    JT: "Job Openings and Labor Turnover (JOLTS)",
    LA: "Local Area Unemployment Statistics",
    SM: "State and Metro Employment",
    PR: "Productivity and Costs",
  } as Record<string, string>,
  popularSeries: {
    CES0000000001: "Total nonfarm employment (thousands)",
    LNS14000000: "Unemployment rate",
    "CUUR0000SA0": "CPI-U All Items",
    CES0500000003: "Average hourly earnings",
    JTS000000000000000JOR: "Job openings rate (JOLTS)",
    PRS85006092: "Nonfarm business labor productivity",
  } as Record<string, string>,
  docs: {
    "API v2": "https://www.bls.gov/developers/api_signature_v2.htm",
    "Series Formats": "https://www.bls.gov/help/hlpforma.htm",
    "Registration": "https://www.bls.gov/developers/home.htm",
  },
},
} satisfies ModuleMeta;
