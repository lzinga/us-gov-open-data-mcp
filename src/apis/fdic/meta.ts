/**
 * fdic module metadata.
 */

import { DATASETS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "fdic",
  displayName: "FDIC (Federal Deposit Insurance Corporation)",
  category: "Financial",
  description:
    "Bank data for 5,000+ FDIC-insured institutions — search banks, failures since 1934, quarterly financials, branch-level deposits, merger/charter history. Filter by state, assets, charter type.",
  workflow:
    "fdic_search_institutions to find banks → fdic_financials for Call Report data → fdic_failures for failed banks → fdic_deposits for branch deposits",
  tips:
    "Filter syntax: STALP:\"CA\" (state), ACTIVE:1 (active), ASSET:[1000000 TO *] (assets > $1B in thousands), INSTNAME:\"Wells Fargo\" (name). Combine with AND: STALP:\"TX\" AND ACTIVE:1. Assets/deposits are in thousands of dollars. Sort by ASSET DESC for largest banks.",
  domains: ["finance"],
  crossRef: [
    { question: "state-level", route: "fdic_search_institutions (state bank data)" },
    { question: "banking", route: "fdic_search_institutions, fdic_failures, fdic_financials" },
    { question: "consumer complaints", route: "fdic_search_institutions (bank identification context)" },
  ],
  reference: {
  datasets: DATASETS,
  docs: {
    "BankFind Suite API": "https://banks.data.fdic.gov/docs/",
    "FDIC Bank Data": "https://www.fdic.gov/bank/statistical/",
  },
},
} satisfies ModuleMeta;
