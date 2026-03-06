/**
 * congress module metadata.
 */

import { BILL_TYPES, CHAMBERS, AMENDMENT_TYPES, LAW_TYPES, REPORT_TYPES } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "congress",
  displayName: "Congress.gov",
  category: "Legislative",
  description: "Bills, votes, members, laws, amendments, and committee data from Congress.gov. House votes use Congress.gov API (118th+) with clerk.house.gov fallback (1990+). Senate votes from senate.gov (101st/1989+).",
  auth: { envVar: "DATA_GOV_API_KEY", signup: "https://api.data.gov/signup/" },
  workflow: "congress_search_bills → congress_bill_details for sponsors/cosponsors/status → congress_house_votes or congress_senate_votes for party-line breakdown → cross-reference with FEC (donors), lobbying_search (who lobbied), and FRED (economic impact)",
  tips: "Congress numbers: 119th (2025-2026), 118th (2023-2024), 117th (2021-2022). Bill types: hr, s, hjres, sjres, hconres, sconres, hres, sres. House votes: use year param for historical (1990+). Senate votes: 101st Congress (1989) to present. Always compare House and Senate votes on the same bill to reveal bicameral differences. For accountability investigations: use congress_member_details to get committee assignments (e.g. Banking Committee chair), then congress_senate_votes/congress_house_votes for party-line breakdown, then cross-reference with FEC disbursements and lobbying spend.",
  reference: {
  billTypes: BILL_TYPES,
  chambers: CHAMBERS,
  amendmentTypes: AMENDMENT_TYPES,
  lawTypes: LAW_TYPES,
  reportTypes: REPORT_TYPES,
  congressNumbers: {
    119: "2025-2026", 118: "2023-2024", 117: "2021-2022",
    116: "2019-2020", 115: "2017-2018", 114: "2015-2016",
  } as Record<number, string>,
  docs: {
    "API Docs": "https://api.congress.gov/",
    "Interactive Docs": "https://api.congress.gov/#/",
    "Sign Up": "https://api.congress.gov/sign-up/",
  },
},
} satisfies ModuleMeta;
