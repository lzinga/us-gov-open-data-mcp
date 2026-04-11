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
  domains: ["health", "finance"],
  crossRef: [
    { question: "health", route: "open_payments_search, open_payments_top (pharma/device payments to providers)" },
    { question: "drug investigation", route: "open_payments_search, open_payments_top_doctors, open_payments_research, open_payments_ownership" },
    { question: "pharma-doctor payments", route: "open_payments_search, open_payments_top_doctors, open_payments_by_company, open_payments_by_physician, open_payments_by_specialty, open_payments_ownership, open_payments_research" },
    { question: "state-level", route: "open_payments_search (pharma/device payments to providers by state)" },
    { question: "medical devices", route: "open_payments_search, open_payments_by_company (device company payments to providers)" },
    { question: "spending/budget", route: "open_payments_summary, open_payments_by_company (pharmaceutical industry spending patterns)" },
    { question: "elections/campaign finance", route: "open_payments_by_company (pharma company financial influence patterns, cross-ref with FEC)" },
  ],
  reference: {
    paymentTypes: PAYMENT_TYPES,
    docs: {
      "Open Payments": "https://openpaymentsdata.cms.gov/",
      "API Documentation": "https://openpaymentsdata.cms.gov/about/api",
      "OpenAPI Spec": "https://openpaymentsdata.cms.gov/api/1?authentication=false",
      "Dataset Catalog": "https://openpaymentsdata.cms.gov/api/1/metastore/schemas/dataset/items?show-reference-ids",
    },
  },
} satisfies ModuleMeta;
