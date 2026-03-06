/**
 * fec module metadata.
 */

import { CANDIDATE_STATUS, COMMITTEE_TYPES, OFFICE_NAMES } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "fec",
  displayName: "OpenFEC (Federal Election Commission)",
  category: "Financial",
  description: "Campaign finance: candidates, committees, contributions, expenditures",
  auth: { envVar: "DATA_GOV_API_KEY", signup: "https://api.data.gov/signup/" },
  workflow: "fec_search_candidates → fec_candidate_financials for PAC totals → fec_search_committees(committee_type='Q', name='Company Name') to find industry PACs → fec_committee_disbursements(committee_id, recipient_name='Politician Last Name') for direct money trail",
  tips: "Office codes: 'H' (House), 'S' (Senate), 'P' (President). Party: 'DEM', 'REP', 'LIB', 'GRE'. To trace industry money to politicians: (1) search committees by company name with type Q to find PAC IDs, (2) query disbursements with recipient_name filter. Try multiple cycles. Common banking PACs: C00004275 (ABA), C00034595 (Wells Fargo), C00008474 (Citigroup), C00350744 (Goldman Sachs), C00364778 (Bank of America). Common pharma PACs: C00016683 (Pfizer), C00097485 (Merck).",
  reference: {
  candidateStatus: CANDIDATE_STATUS,
  committeeTypes: COMMITTEE_TYPES,
  officeNames: OFFICE_NAMES,
  docs: {
    "Swagger": "https://api.open.fec.gov/swagger/",
    "Developers": "https://api.open.fec.gov/developers/",
    "Get Key": "https://api.open.fec.gov/developers/",
  },
},
} satisfies ModuleMeta;
