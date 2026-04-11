/**
 * cfpb module metadata.
 */

import { PRODUCTS, AGG_FIELDS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "cfpb",
  displayName: "CFPB (Consumer Financial Protection Bureau)",
  category: "Financial",
  description:
    "Consumer complaint database with 13M+ complaints against financial companies. Search by company, product, state, issue, date. Track complaint trends and company response patterns.",
  workflow:
    "cfpb_suggest_company to find exact name → cfpb_search_complaints for individual complaints → cfpb_complaint_aggregations for counts by field → cfpb_complaint_trends (with lens: overview/product/issue/tags) for time series → cfpb_state_complaints for geographic breakdown → cfpb_complaint_detail for a specific complaint by ID",
  tips:
    "Products: 'Mortgage', 'Credit reporting...', 'Debt collection', 'Credit card or prepaid card', 'Checking or savings account', 'Student loan', 'Vehicle loan or lease'. States: two-letter codes (CA, TX, NY). Sort: 'created_date_desc' (newest), 'created_date_asc', 'relevance_desc', 'relevance_asc'. Date format: YYYY-MM-DD. Use has_narrative=true for complaints with consumer stories. Trends: lens='overview' for totals, 'product'/'issue'/'tags' for breakdowns. sub_lens for drill-down. Filters: submitted_via (Web/Phone/Postal mail), timely (Yes/No), zip_code. Company names auto-retry with fuzzy search if exact match fails.",
  domains: ["finance"],
  crossRef: [
    { question: "banking", route: "cfpb_search_complaints, cfpb_complaint_trends, cfpb_complaint_aggregations" },
    { question: "consumer complaints", route: "cfpb_search_complaints, cfpb_complaint_aggregations, cfpb_complaint_trends, cfpb_state_complaints" },
    { question: "state-level", route: "cfpb_state_complaints (complaint counts and trends by state)" },
    { question: "housing", route: "cfpb_search_complaints (product='Mortgage' — mortgage complaint data)" },
    { question: "college", route: "cfpb_search_complaints (product='Student loan' — student loan complaint data)" },
    { question: "vehicle safety", route: "cfpb_search_complaints (product='Vehicle loan or lease' — auto lending complaints)" },
    { question: "debt/deficit", route: "cfpb_search_complaints (product='Debt collection' — consumer debt complaint trends)" },
  ],
  reference: {
  products: PRODUCTS,
  aggregationFields: AGG_FIELDS,
  docs: {
    "API Documentation": "https://cfpb.github.io/api/ccdb/",
    "Complaint Database": "https://www.consumerfinance.gov/data-research/consumer-complaints/",
  },
},
} satisfies ModuleMeta;
