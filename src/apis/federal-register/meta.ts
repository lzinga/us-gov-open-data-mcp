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
  reference: {
  presidentSlugs: {
    trump: "donald-trump",
    biden: "joe-biden",
    obama: "barack-obama",
    bush: "george-w-bush",
    clinton: "william-j-clinton",
  } as Record<string, string>,
  documentTypes: {
    RULE: "Rule — final rule published in CFR",
    PRORULE: "Proposed Rule — notice of proposed rulemaking",
    NOTICE: "Notice — agency announcement",
    PRESDOCU: "Presidential Document — EOs, memoranda, proclamations",
  } as Record<string, string>,
  presidentialDocTypes: {
    executive_order: "Executive Order",
    determination: "Presidential Determination",
    executive_memorandum: "Presidential Memorandum",
    proclamation: "Proclamation",
    notice: "Notice",
  } as Record<string, string>,
  docs: {
    "API Docs": "https://www.federalregister.gov/developers/documentation/api/v1",
    "Developer Hub": "https://www.federalregister.gov/developers",
  },
},
} satisfies ModuleMeta;
