/**
 * dol module metadata.
 */

import { INSPECTION_TYPES, VIOLATION_TYPES, DATASETS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "dol",
  displayName: "DOL (Department of Labor)",
  category: "Safety",
  description:
    "OSHA workplace safety inspections, violations, and accident investigations. " +
    "WHD wage theft enforcement (back wages, penalties, FLSA/FMLA violations). " +
    "Unemployment Insurance weekly claims (national and state).",
  auth: { envVar: "DOL_API_KEY", signup: "https://data.dol.gov/registration" },
  workflow:
    "dol_osha_inspections to find inspections → dol_osha_violations for violations found → " +
    "dol_osha_accidents for accident investigations → dol_whd_enforcement for wage theft cases → " +
    "dol_ui_claims_national for unemployment trends",
  tips:
    "OSHA inspection types: A=Accident, B=Complaint, C=Referral, H=Planned, L=Programmed high-hazard. " +
    "Violation types: S=Serious, W=Willful, R=Repeat, O=Other. " +
    "States use two-letter codes (CA, TX, NY). " +
    "WHD covers FLSA (minimum wage/overtime), FMLA (family leave), Davis-Bacon (prevailing wage), SCA (service contracts). " +
    "Sort uses sort_by (field name) + sort_order ('asc' or 'desc').",
  reference: {
    inspectionTypes: INSPECTION_TYPES,
    violationTypes: VIOLATION_TYPES,
    datasets: DATASETS,
    docs: {
      "DOL Open Data Portal": "https://data.dol.gov/",
      "DOL API User Guide": "https://data.dol.gov/user-guide",
      "OSHA Data": "https://www.osha.gov/data",
      "WHD Data": "https://www.dol.gov/agencies/whd/data",
    },
  },
} satisfies ModuleMeta;
