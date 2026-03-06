/**
 * bea module metadata.
 */

import { nipaTables, gdpIndustryTables, regionalTables } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "bea",
  displayName: "Bureau of Economic Analysis",
  category: "Economic",
  description:
    "U.S. economic statistics: GDP (national/state/industry), personal income, international transactions, fixed assets, multinational enterprises, input-output tables, and more. Covers NIPA, Regional, GDPbyIndustry, ITA, IIP, MNE, FixedAssets, IntlServTrade, InputOutput datasets.",
  auth: { envVar: "BEA_API_KEY", signup: "https://apps.bea.gov/API/signup/" },
  workflow:
    "Use bea_dataset_info to discover datasets/parameters/valid values → then call the appropriate dataset tool (bea_gdp_national, bea_gdp_by_state, etc.)",
  tips:
    "Key advantages: state-level GDP and income, GDP by NAICS industry, international transactions/investment positions, fixed assets, input-output tables. Rate limit: 100 req/min with 1-hour lockout if exceeded. Use 'LAST5' or specific years instead of 'ALL' to limit data volume.",
  reference: {
    nipaTables,
    gdpIndustryTables,
    regionalTables,
    docs: {
      "User Guide": "https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf",
      "Developer Page": "https://apps.bea.gov/developers/",
      "Sign Up": "https://apps.bea.gov/API/signup/",
    },
  },
} satisfies ModuleMeta;
