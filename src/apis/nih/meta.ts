/**
 * nih module metadata.
 */

import { NIH_AGENCIES, SPENDING_CATEGORIES, ACTIVITY_CODES, FUNDING_MECHANISMS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "nih",
  displayName: "NIH RePORTER",
  category: "Health",
  description:
    "Search NIH-funded research projects by disease, investigator, institution, state, and funding amount. Track research spending by disease category (RCDC), institute, and grant type. Cross-reference with CDC (health outcomes), FDA (drug approvals), ClinicalTrials.gov (trials), and Open Payments (pharma influence). No API key required.",
  workflow:
    "Use nih_search_projects to find grants by topic/PI/org → nih_spending_by_category for disease funding trends → nih_projects_by_agency for institute breakdown → nih_search_publications for linked publications.",
  tips:
    "Agencies: NCI (cancer), NHLBI (heart/lung), NIDDK (diabetes/kidney), NIA (aging/Alzheimer's), NIAID (infectious diseases), NIMH (mental health), NIDA (drug abuse). Spending categories: 27=Cancer, 7=Alzheimer's, 41=Diabetes, 60=HIV/AIDS, 93=Opioids, 30=Cardiovascular, 85=Mental Health, 38=COVID-19. Use fiscal_years to track funding trends over time.",
  domains: ["health"],
  crossRef: [
    { question: "health", route: "nih_search_projects, nih_spending_by_category (disease research funding)" },
    { question: "drug investigation", route: "nih_search_projects, nih_spending_by_category (research funding for drug/condition)" },
    { question: "drug shortages", route: "nih_search_projects (research activity for shortage drugs)" },
    { question: "substance/ingredient lookup", route: "nih_search_projects (funded research by substance)" },
    { question: "education", route: "nih_search_projects (child development research)" },
    { question: "state-level", route: "nih_search_projects (NIH-funded research by state/institution)" },
    { question: "medical devices", route: "nih_search_projects (device-related research grants)" },
  ],
  reference: {
  agencies: NIH_AGENCIES,
  spendingCategories: SPENDING_CATEGORIES,
  activityCodes: ACTIVITY_CODES,
  fundingMechanisms: FUNDING_MECHANISMS,
  docs: {
    "NIH RePORTER API": "https://api.reporter.nih.gov/",
    "NIH RePORTER": "https://reporter.nih.gov/",
    "RCDC Spending Categories": "https://report.nih.gov/funding/categorical-spending",
  },
},
} satisfies ModuleMeta;
