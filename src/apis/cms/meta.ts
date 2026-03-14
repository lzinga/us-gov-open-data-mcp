/**
 * cms module metadata.
 */

import { DATASETS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "cms",
  displayName: "CMS",
  category: "Health",
  description:
    "Centers for Medicare & Medicaid Services — hospital compare, nursing home ratings, home health agencies, hospice, dialysis, Medicare spending, HCAHPS patient surveys, quality measures. No API key required.",
  workflow:
    "Use cms_search to find datasets by keyword → cms_hospitals for hospital quality data → cms_nursing_homes for nursing home ratings → cms_query for any CMS provider dataset.",
  tips:
    "CMS has 100+ provider datasets. Use cms_search to discover them. Common dataset keys: hospital_info, nursing_home_info, hospital_mortality, hospital_readmissions, hospital_infections, hospital_timely_care, hospital_spending, hospital_patient_survey, nursing_home_health_citations. Filter by state using conditions like property='state' value='CA'.",
  domains: ["health"],
  crossRef: [
    { question: "health", route: "cms_hospitals (hospital quality/mortality/readmissions), cms_nursing_homes (nursing home ratings)" },
    { question: "medical devices", route: "cms_hospitals (hospital quality measures for device outcomes)" },
    { question: "state-level", route: "cms_hospitals, cms_nursing_homes (provider quality ratings by state)" },
  ],
  reference: { datasets: DATASETS },
} satisfies ModuleMeta;
