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
    "Use open_payments_search to find payments by company/doctor/state → cross-reference with fda_drug_events for the same company's drugs → lobbying_search for the company's lobbying spend → clinical_trials_search for their clinical trials.",
  tips:
    "Company names: 'Pfizer', 'Novo Nordisk', 'Johnson & Johnson'. States: 'CA', 'TX', 'NY'. Specialties: 'Cardiology', 'Orthopedic', 'Psychiatry'. Years: 2018-2024 available.",
  reference: {
  paymentTypes: PAYMENT_TYPES,
  docs: {
    "Open Payments": "https://openpaymentsdata.cms.gov/",
    "API Documentation": "https://openpaymentsdata.cms.gov/about/api",
  },
},
} satisfies ModuleMeta;
