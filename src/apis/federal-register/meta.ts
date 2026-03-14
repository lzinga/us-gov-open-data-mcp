/**
 * federal-register module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "federal-register",
  displayName: "Federal Register",
  category: "Legislative",
  description: "Executive orders, presidential documents, rules, agency notices",
  workflow: "fr_executive_orders or fr_search_rules → review results",
  tips:
    "Use president slugs: 'donald-trump', 'joe-biden', 'barack-obama', 'george-w-bush', 'william-j-clinton'. No API key required.",
  domains: ["legislation"],
  crossRef: [
    { question: "executive actions", route: "fr_executive_orders, fr_search_rules, fr_presidential_documents" },
    { question: "presidential comparison", route: "fr_executive_orders (EO count and topics by president)" },
    { question: "legislation", route: "fr_search_rules (final rules implementing legislation)" },
    { question: "energy/climate", route: "fr_executive_orders, fr_search_rules (energy/environmental executive orders and regulations)" },
    { question: "health", route: "fr_search_rules (HHS/FDA/CMS rulemaking)" },
  ],
  reference: {
  docs: {
    "API Docs": "https://www.federalregister.gov/developers/documentation/api/v1",
    "Developer Hub": "https://www.federalregister.gov/developers",
  },
},
} satisfies ModuleMeta;
