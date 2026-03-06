/**
 * usaspending module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "usaspending",
  displayName: "USAspending",
  category: "Spending",
  description: "Federal contracts, grants, loans, direct payments — who got the money and where",
  workflow: "search awards by keyword/agency/state → drill into recipients or trends",
  tips: "No API key required. Data updates nightly. Earliest data: FY2008 (2007-10-01).",
  reference: {
},
} satisfies ModuleMeta;
