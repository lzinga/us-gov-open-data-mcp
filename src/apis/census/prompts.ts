/**
 * census MCP prompts.
 */

import type { InputPrompt } from "fastmcp";

export const prompts: InputPrompt<any, any>[] = [
  {
    name: "state_profile",
    description: "Complete demographic and economic profile of a U.S. state.",
    arguments: [
      { name: "state", description: "State name or abbreviation", required: true },
    ],
    load: async (args: any) => { const state = args?.state ?? ""; return (
      `Build a comprehensive profile for ${state}:\n\n` +
      "1. census_population — total population and recent growth\n" +
      `2. census_query with 2023/acs/acs1 for variables B19013_001E (median income), B25077_001E (home value), B01002_001E (median age) for state ${state}\n` +
      `3. bea_gdp_by_state for ${state} — GDP and growth rate\n` +
      `4. bea_personal_income for ${state} — per capita income\n` +
      `5. usa_spending_by_state for ${state} — federal dollars received\n` +
      `6. cdc_places_health for ${state} (2-letter code) — county-level health indicators such as obesity, diabetes, and smoking\n\n` +
      "Present as a state fact sheet with demographics, economy, federal funding, and health."
    ); },
  },
];

// ─── Re-export cache control from SDK ────────────────────────────────

export { clearCache } from "./sdk.js";
