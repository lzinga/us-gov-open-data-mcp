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
  reference: {
    popularSeries: {
      GDP: "Gross Domestic Product (quarterly, $B)", UNRATE: "Unemployment Rate (monthly, %)",
      CPIAUCSL: "CPI All Urban Consumers (monthly)", FEDFUNDS: "Fed Funds Rate (monthly, %)",
      DGS10: "10-Year Treasury (daily, %)", MORTGAGE30US: "30-Year Mortgage (weekly, %)",
      M2SL: "M2 Money Stock (monthly, $B)", SP500: "S&P 500 (daily)",
      PAYEMS: "Nonfarm Payrolls (monthly, K)", CIVPART: "Labor Participation (monthly, %)",
      MSPUS: "Median Home Price (quarterly, $)", MEHOINUSA672N: "Median Household Income (annual)",
    },
    docs: {
      "v1 API": "https://fred.stlouisfed.org/docs/api/fred/",
      "v2 API": "https://research.stlouisfed.org/docs/api/fred/v2/",
      "Get Key": "https://fredaccount.stlouisfed.org/apikeys",
    },
  },
} satisfies ModuleMeta;
