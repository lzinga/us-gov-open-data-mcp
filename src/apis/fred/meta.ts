/**
 * FRED module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "fred",
  displayName: "FRED (Federal Reserve Economic Data)",
  category: "Economic",
  description: "800K+ economic time series: GDP, CPI, unemployment, interest rates, money supply, housing",
  auth: { envVar: "FRED_API_KEY", signup: "https://fredaccount.stlouisfed.org/apikeys" },
  workflow: "fred_search → fred_series_data to get values",
  tips: "Popular: GDP, UNRATE, CPIAUCSL, FEDFUNDS, DGS10, MORTGAGE30US, M2SL, SP500",
  domains: ["economy", "finance", "housing"],
  crossRef: [
    { question: "debt/deficit", route: "fred_series_data with GDP, FYFSGDA188S (deficit as % of GDP)" },
    { question: "economy", route: "fred_series_data with GDP, UNRATE, CPIAUCSL, FEDFUNDS, PAYEMS" },
    { question: "legislation", route: "fred_series_data (economic indicators before/after legislation)" },
    { question: "elections/campaign finance", route: "fred_series_data (economic conditions: GDP, UNRATE, CPIAUCSL)" },
    { question: "executive actions", route: "fred_series_data (economic indicators before/after executive orders)" },
    { question: "presidential comparison", route: "fred_series_data with GDP, UNRATE, CPIAUCSL, FEDFUNDS, PAYEMS, SP500" },
    { question: "housing", route: "fred_series_data with MORTGAGE30US, CSUSHPINSA, USSTHPI" },
    { question: "college", route: "fred_series_data with SLOAS (student loans outstanding)" },
    { question: "banking", route: "fred_series_data with FEDFUNDS, DGS10, MORTGAGE30US" },
    { question: "unemployment", route: "fred_series_data with UNRATE, PAYEMS" },
    { question: "international", route: "fred_series_data (US baseline: GDP, UNRATE, CPI for peer comparison)" },
    { question: "spending/budget", route: "fred_series_data with FYFSGDA188S (federal surplus/deficit as % GDP), FGEXPND (federal expenditures)" },
  ],
  reference: {
    docs: {
      "v1 API": "https://fred.stlouisfed.org/docs/api/fred/",
      "v2 API": "https://research.stlouisfed.org/docs/api/fred/v2/",
      "Get Key": "https://fredaccount.stlouisfed.org/apikeys",
    },
  },
} satisfies ModuleMeta;
