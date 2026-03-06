/**
 * govinfo module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "govinfo",
  displayName: "GovInfo",
  category: "Legislative",
  description: "Full-text search across Congressional bills, laws, Federal Register, CFR, CBO reports, and more",
  auth: { envVar: "DATA_GOV_API_KEY", signup: "https://api.data.gov/signup/" },
  workflow: "govinfo_search to find publications → govinfo_bill_text for full legislative text",
  tips: "Package ID format for bills: BILLS-{congress}{type}{number}{version}. Example: BILLS-117hr5376enr (Inflation Reduction Act).",
  reference: {
},
} satisfies ModuleMeta;
