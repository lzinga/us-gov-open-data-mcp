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
  reference: {
  documentTypes: {
    "Proposed Rule": "Notice of proposed rulemaking (NPRM)",
    "Rule": "Final rule",
    "Supporting & Related Material": "Supporting documents, analyses, studies",
    "Other": "Other documents",
  } as Record<string, string>,
  docketTypes: {
    "Rulemaking": "Rulemaking docket",
    "Nonrulemaking": "Nonrulemaking docket",
  } as Record<string, string>,
  docs: {
    "API Docs": "https://open.gsa.gov/api/regulationsgov/",
    "Regulations.gov": "https://www.regulations.gov/",
  },
},
} satisfies ModuleMeta;
