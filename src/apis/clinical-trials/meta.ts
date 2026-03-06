/**
 * clinical-trials module metadata.
 */

import { TRIAL_STATUSES, TRIAL_PHASES, STUDY_TYPES } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "clinical-trials",
  displayName: "ClinicalTrials.gov",
  category: "Health",
  description:
    "Search 400K+ clinical trials: conditions, drugs, sponsors, phases, recruitment status, locations. Cross-reference with FDA (drug approvals), CDC (health outcomes), and lobbying data. No API key required.",
  workflow:
    "Use clinical_trials_search to find trials by condition/drug/sponsor → clinical_trials_detail for full protocol → clinical_trials_stats for enrollment by status.",
  tips:
    "Statuses: RECRUITING, COMPLETED, ACTIVE_NOT_RECRUITING, TERMINATED. Phases: PHASE1, PHASE2, PHASE3, PHASE4. Search by sponsor name (e.g. 'Pfizer', 'NIH') to track industry vs. government research.",
  reference: {
  statuses: TRIAL_STATUSES,
  phases: TRIAL_PHASES,
  studyTypes: STUDY_TYPES,
  docs: {
    "API v2 Documentation": "https://clinicaltrials.gov/data-api/api",
    "ClinicalTrials.gov": "https://clinicaltrials.gov/",
  },
},
} satisfies ModuleMeta;
