/**
 * regulations module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "regulations",
  displayName: "Regulations.gov",
  category: "Legislative",
  description: "Federal rulemaking: proposed rules, final rules, public comments, and regulatory dockets from all federal agencies",
  auth: { envVar: "DATA_GOV_API_KEY", signup: "https://api.data.gov/signup/" },
  workflow: "regulations_search_documents to find rules → regulations_document_detail for full info → regulations_search_comments for public feedback",
  tips: "Document types: 'Proposed Rule', 'Rule', 'Supporting & Related Material', 'Other'. Sort by '-postedDate' for newest first. Agency IDs: EPA, FDA, DOL, HHS, DOT, etc.",
  domains: ["legislation"],
  crossRef: [
    { question: "legislation", route: "regulations_search_documents, regulations_search_comments (rulemaking implementation of legislation)" },
    { question: "executive actions", route: "regulations_search_documents, regulations_search_comments (proposed/final rules and public feedback)" },
    { question: "energy/climate", route: "regulations_search_documents (agency=EPA — environmental rulemaking and public comments)" },
    { question: "health", route: "regulations_search_documents (agency=FDA,HHS — health/drug/device rulemaking)" },
    { question: "workplace safety", route: "regulations_search_documents (agency=DOL — OSHA rulemaking and public comments)" },
  ],
  reference: {
  docs: {
    "API Docs": "https://open.gsa.gov/api/regulationsgov/",
    "Regulations.gov": "https://www.regulations.gov/",
  },
},
} satisfies ModuleMeta;
