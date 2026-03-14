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
  domains: ["spending"],
  crossRef: [
    { question: "spending/budget", route: "usa_spending_by_agency, usa_spending_by_award, usa_spending_over_time" },
    { question: "state-level", route: "usa_spending_by_state" },
    { question: "legislation", route: "usa_spending_by_award (spending before/after legislation)" },
    { question: "housing", route: "usa_spending_by_agency (HUD spending)" },
    { question: "agriculture", route: "usa_spending_by_agency (USDA spending)" },
    { question: "education", route: "usa_spending_by_agency (Dept of Education spending)" },
    { question: "workplace safety", route: "usa_spending_by_agency (DOL spending)" },
    { question: "disasters", route: "usa_spending_by_agency (FEMA spending)" },
    { question: "transportation", route: "usa_spending_by_agency (DOT spending)" },
    { question: "patents", route: "usa_spending_by_award (R&D contract spending)" },
    { question: "procurement/contracting", route: "usa_spending_by_award, usa_spending_by_agency, usa_spending_by_recipient" },
    { question: "health", route: "usa_spending_by_agency (HHS/NIH/CDC spending), usa_spending_by_award (health-related contracts and grants)" },
    { question: "energy/climate", route: "usa_spending_by_agency (DOE spending)" },
    { question: "college", route: "usa_spending_by_agency (Dept of Education spending on higher education)" },
    { question: "banking", route: "usa_spending_by_award (FDIC/Treasury financial sector awards)" },
  ],
  reference: {
},
} satisfies ModuleMeta;
