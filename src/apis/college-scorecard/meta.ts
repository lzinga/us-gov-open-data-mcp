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
  domains: ["education"],
  crossRef: [
    { question: "college", route: "scorecard_search, scorecard_compare, scorecard_top (costs, graduation rates, earnings, debt)" },
    { question: "state-level", route: "scorecard_search, scorecard_top (college costs and outcomes by state)" },
    { question: "education", route: "scorecard_search, scorecard_compare (post-secondary outcomes as education system metric)" },
  ],
  reference: {
  ownership: OWNERSHIP,
  degreeTypes: DEGREE_TYPES,
  docs: {
    "College Scorecard": "https://collegescorecard.ed.gov/",
    "API Documentation": "https://collegescorecard.ed.gov/data/documentation/",
    "Data Dictionary": "https://collegescorecard.ed.gov/assets/CollegeScorecardDataDictionary.xlsx",
    "Get API Key": "https://api.data.gov/signup/",
  },
},
} satisfies ModuleMeta;
