/**
 * uspto module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "uspto",
  displayName: "USPTO PatentsView",
  category: "Research",
  description:
    "U.S. Patent & Trademark Office patent data via PatentsView — search patents by keyword, assignee, inventor, date, or CPC class. Look up inventors and patent-holding organizations. Covers all U.S. utility, design, plant, and reissue patents.",
  workflow:
    "Use uspto_search_patents to find patents by keyword, company, or inventor → uspto_patent_details for full details on a specific patent → uspto_search_assignees to find companies with the most patents in an area.",
  tips:
    "Patent types: 'utility' (most common), 'design', 'plant', 'reissue'. CPC sections: A (Human Necessities), B (Operations/Transport), C (Chemistry), D (Textiles), E (Construction), F (Mechanical Engineering), G (Physics), H (Electricity). Use yearFrom/yearTo to filter by grant date. Patent numbers don't have commas (e.g. '11234567' not '11,234,567').",
} satisfies ModuleMeta;
