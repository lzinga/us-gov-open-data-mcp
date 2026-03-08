/**
 * open-payments module metadata.
 */

import { PAYMENT_TYPES } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "open-payments",
  displayName: "Open Payments (Sunshine Act)",
  category: "Spending",
  description:
    "CMS Open Payments — tracks payments from pharmaceutical and medical device companies to doctors and teaching hospitals. 15M+ payment records per year. Search by company, doctor, state, or specialty. No API key required.",
  workflow:
    "Use open_payments_search to find payments by company/doctor/state → open_payments_top for highest payments → " +
    "open_payments_top_doctors for aggregate totals per doctor → cross-reference with fda_drug_events for the same company's drugs → " +
    "lobbying_search for the company's lobbying spend → clinical_trials_search for their clinical trials.",
  tips:
    "Company names: 'Pfizer', 'Novo Nordisk', 'Johnson & Johnson'. States: 'CA', 'TX', 'NY'. " +
    "Specialties: 'Cardiology', 'Orthopedic', 'Psychiatry'. Years: 2018-2024 available. " +
    "Dataset IDs are auto-discovered from the CMS metastore — new years are picked up automatically.",
  reference: {
    paymentTypes: PAYMENT_TYPES,
    apiEndpoints: {
      metastore: "/api/1/metastore/schemas/dataset/items?show-reference-ids — lists all datasets with distribution IDs",
      datastoreQuery: "/api/1/datastore/query/{distributionId} — GET/POST queries with conditions, sorts, aggregations",
      datastoreSql: "/api/1/datastore/sql?query=[SELECT...] — SQL-like queries for fast filtering and sorting",
      search: "/api/1/search — fulltext catalog search with facets (keyword, theme)",
    },
    docs: {
      "Open Payments": "https://openpaymentsdata.cms.gov/",
      "API Documentation": "https://openpaymentsdata.cms.gov/about/api",
      "OpenAPI Spec": "https://openpaymentsdata.cms.gov/api/1?authentication=false",
      "Dataset Catalog": "https://openpaymentsdata.cms.gov/api/1/metastore/schemas/dataset/items?show-reference-ids",
    },
  },
} satisfies ModuleMeta;
