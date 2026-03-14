/**
 * naep module metadata.
 */

import { SUBJECTS, SUBSCALES, VARIABLES, STAT_TYPES, JURISDICTIONS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "naep",
  displayName: "NAEP (Nation's Report Card)",
  category: "Education",
  description: "National Assessment of Educational Progress: 10 subjects (reading, math, science, writing, civics, history, geography, economics, TEL, music) by state, grade, race, gender, poverty. Subscale breakdowns, achievement levels, significance testing across years/states/groups, district-level data for 30 urban districts.",
  workflow: "naep_scores for current data (supports subscales, crosstabs, district codes) → naep_achievement_levels for proficiency % → naep_compare_years for trends → naep_compare_states for state rankings → naep_compare_groups for achievement gaps",
  tips:
    "Subjects: 'reading', 'math', 'science', 'writing', 'civics', 'history', 'geography', 'economics', 'tel', 'music'. Aliases accepted: 'mathematics', 'ela', 'us history', 'social studies', 'econ', 'technology'. Grades: 4, 8, 12 (math: 4,8 only; economics/tel/music: 8 or 12 only). Jurisdictions: 'NP' (national), state codes (CA, TX), district codes (XN=NYC, XC=Chicago, XL=LA, XB=Boston). Variables: 'TOTAL', 'SDRACE' (race), 'GENDER', 'SLUNCH3' (poverty). Crosstab: 'SDRACE+GENDER'. Subscales: each subject has subscales (e.g. math: MRPS1=numbers, MRPS3=geometry). Years: '2022', 'Current', 'Prior', 'Base'. Append R2 for non-accommodated sample.",
  domains: ["education"],
  crossRef: [
    { question: "education", route: "naep_scores, naep_achievement_levels, naep_compare_years, naep_compare_states, naep_compare_groups" },
    { question: "college", route: "naep_scores, naep_compare_years (K-12 pipeline/readiness trends)" },
    { question: "state-level", route: "naep_compare_states (state-by-state K-12 achievement rankings and trends)" },
  ],
  reference: {
  subjects: SUBJECTS,
  subscales: SUBSCALES,
  variables: VARIABLES,
  statTypes: STAT_TYPES,
  jurisdictions: JURISDICTIONS,
  docs: {
    "NAEP Data Explorer": "https://www.nationsreportcard.gov/ndecore/landing",
    "API Documentation": "https://www.nationsreportcard.gov/api_documentation.aspx",
    "Assessment Schedule": "https://nces.ed.gov/nationsreportcard/about/assessmentsched.aspx",
  },
},
} satisfies ModuleMeta;
