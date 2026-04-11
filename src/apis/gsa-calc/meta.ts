/**
 * GSA CALC+ Ceiling Rates module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "gsa-calc",
  displayName: "GSA CALC+ Ceiling Rates",
  category: "Procurement",
  description:
    "GSA CALC+ (Contract-Awarded Labor Category) ceiling rates - awarded hourly rates on GSA MAS professional services contracts. Covers 10,000+ contracts with labor category, vendor, price, education, experience, worksite, business size, security clearance, and SIN data. Useful for market research, IGCEs, and competitive pricing analysis.",
  workflow:
    "Use calc_search_rates to find rates by keyword, labor category, vendor, or filters -> calc_suggest for autocomplete on labor categories, vendors, or contract numbers -> calc_contract_rates to see all rates under a specific contract.",
  tips:
    "Search modes: 'keyword' for wildcard (2 char min), 'search' for exact field match (field:value). Filters: education_level (HS/AA/BA/MA/PHD, pipe for multiple), experience_range (min,max), price_range (min,max), worksite (Contractor/Customer/Both), business_size (S=small/O=other), security_clearance (yes/no), sin, category, subcategory. Ordering: current_price (default), labor_category, vendor_name, education_level, min_years_experience. Data refreshed daily.",
  domains: ["spending"],
  crossRef: [
    { question: "procurement/contracting", route: "calc_search_rates, calc_contract_rates (GSA MAS ceiling rates for market research/IGCEs)" },
    { question: "spending/budget", route: "calc_search_rates (federal professional services pricing data)" },
  ],
  reference: {
    docs: {
      "API docs": "https://open.gsa.gov/api/dx-calc-api/",
      "CALC+ app": "https://buy.gsa.gov/pricing/",
    },
  },
} satisfies ModuleMeta;
