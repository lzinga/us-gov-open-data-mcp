/**
 * hud module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "hud",
  displayName: "HUD",
  category: "Demographics",
  description:
    "Department of Housing and Urban Development — Fair Market Rents (FMR) by bedroom count, " +
    "Income Limits by household size for counties and metro areas. Essential for affordable housing, " +
    "Section 8 vouchers, and housing cost analysis.",
  auth: { envVar: "HUD_USER_TOKEN", signup: "https://www.huduser.gov/hudapi/public/register" },
  workflow:
    "Use hud_list_states to get state codes → hud_list_counties to find county FIPS codes → " +
    "hud_fair_market_rents for rental data → hud_income_limits for income thresholds.",
  tips:
    "Entity IDs are county FIPS codes (e.g. '0600000001' for a CA county). Use hud_list_counties to find them. " +
    "State-level tools accept two-letter codes (CA, TX). FMR data shows HUD-determined fair rents used for " +
    "Section 8 voucher amounts. Income Limits show Very Low, Extremely Low, and Low income thresholds by " +
    "household size (1-8 persons).",
  domains: ["housing"],
  crossRef: [
    { question: "state-level", route: "hud_fair_market_rents (rental costs by county)" },
    { question: "housing", route: "hud_fair_market_rents, hud_income_limits (FMR and Section 8 thresholds)" },
  ],
} satisfies ModuleMeta;
