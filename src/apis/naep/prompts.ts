/**
 * naep MCP prompts.
 */

import type { InputPrompt } from "fastmcp";

export const prompts: InputPrompt<any, any>[] = [
  {
    name: "nations_report_card",
    description: "Comprehensive U.S. education snapshot: NAEP scores, achievement levels, trends, and demographic gaps.",
    load: async () =>
      "Build a comprehensive education report card:\n\n" +
      "1. Use naep_scores for 4th grade reading (NP, TOTAL, 2022) — current national average\n" +
      "2. Use naep_achievement_levels for 4th grade reading — what % are below basic, proficient, etc.\n" +
      "3. Use naep_compare_years for 4th grade reading years 2022,2019,2017 — track COVID impact\n" +
      "4. Use naep_compare_groups for 4th grade reading by SDRACE — racial achievement gap\n" +
      "5. Use naep_compare_groups for 4th grade reading by SLUNCH3 — poverty achievement gap\n" +
      "6. Repeat steps 1-2 for 4th grade math\n" +
      "7. Use naep_compare_states for reading grade 4: NP,MA,MS,CA,TX — highest vs lowest states\n\n" +
      "Cross-reference with Census poverty data and CDC PLACES health data to show how poverty, food insecurity, and health correlate with test scores.",
  },
];

export { clearCache } from "./sdk.js";
