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
  domains: ["economy", "international"],
  crossRef: [
    { question: "economy", route: "bea_gdp_by_industry (GDP by NAICS industry)" },
    { question: "state-level", route: "bea_gdp_by_state, bea_personal_income (state GDP and income)" },
    { question: "housing", route: "bea_personal_income (income context for housing affordability)" },
    { question: "unemployment", route: "bea_personal_income (income trends during unemployment)" },
    { question: "international", route: "bea_international_transactions, bea_international_investment, bea_intl_services_trade, bea_multinational_enterprises (U.S. international economic position)" },
    { question: "spending/budget", route: "bea_gdp_national (GDP context for spending as % of GDP)" },
    { question: "presidential comparison", route: "bea_gdp_national (GDP growth across administrations)" },
  ],
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
