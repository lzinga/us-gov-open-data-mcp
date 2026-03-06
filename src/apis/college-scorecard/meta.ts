/**
 * college-scorecard module metadata.
 */

import { OWNERSHIP, DEGREE_TYPES } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "college-scorecard",
  displayName: "College Scorecard",
  category: "Education",
  description: "College costs, graduation rates, post-graduation earnings, student debt, admission rates for every U.S. college and university",
  auth: { envVar: "DATA_GOV_API_KEY", signup: "https://api.data.gov/signup/" },
  workflow: "scorecard_search to find schools → scorecard_compare for side-by-side → scorecard_top for rankings",
  tips:
    "Ownership: 1=Public, 2=Private nonprofit, 3=Private for-profit. Degree types: 1=Certificate, 2=Associate, 3=Bachelor's, 4=Graduate. Use state abbreviations for filtering: 'CA', 'NY', 'TX'. Sort by cost, earnings, or graduation rate to find best/worst schools.",
  reference: {
  ownership: OWNERSHIP,
  degreeTypes: DEGREE_TYPES,
  popularFields: {
    "latest.cost.tuition.in_state": "In-state tuition ($)",
    "latest.cost.tuition.out_of_state": "Out-of-state tuition ($)",
    "latest.cost.avg_net_price.overall": "Average net price after aid ($)",
    "latest.admissions.admission_rate.overall": "Admission rate (0-1)",
    "latest.completion.rate_suppressed.overall": "Graduation rate (0-1)",
    "latest.earnings.10_yrs_after_entry.median": "Median earnings 10 years after entry ($)",
    "latest.earnings.6_yrs_after_entry.median": "Median earnings 6 years after entry ($)",
    "latest.aid.median_debt.completers.overall": "Median debt at graduation ($)",
    "latest.aid.pell_grant_rate": "Pell grant rate (proxy for low-income students)",
    "latest.student.size": "Undergraduate enrollment",
  },
  docs: {
    "College Scorecard": "https://collegescorecard.ed.gov/",
    "API Documentation": "https://collegescorecard.ed.gov/data/documentation/",
    "Data Dictionary": "https://collegescorecard.ed.gov/assets/CollegeScorecardDataDictionary.xlsx",
    "Get API Key": "https://api.data.gov/signup/",
  },
},
} satisfies ModuleMeta;
