/**
 * congress module metadata.
 */

import { BILL_TYPES, CHAMBERS, AMENDMENT_TYPES, LAW_TYPES, REPORT_TYPES, HOUSE_COMMUNICATION_TYPES, SENATE_COMMUNICATION_TYPES } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "congress",
  displayName: "Congress.gov",
  category: "Legislative",
  description: "Bills, votes, members, laws, amendments, committee data, hearings, reports, prints, meetings, " +
    "nominations, treaties, CRS reports, Congressional Record (daily & bound), and House/Senate communications from Congress.gov. " +
    "House votes use Congress.gov API (118th+) with clerk.house.gov fallback (1990+). Senate votes from senate.gov (101st/1989+).",
  auth: { envVar: "DATA_GOV_API_KEY", signup: "https://api.data.gov/signup/" },
  workflow: "congress_search_bills → congress_bill_details for sponsors/cosponsors/status → " +
    "congress_house_votes or congress_senate_votes for party-line breakdown → " +
    "congress_hearings or congress_committee_meetings for oversight activity → " +
    "congress_committee_reports for committee analysis → " +
    "cross-reference with FEC (donors), lobbying_search (who lobbied), and FRED (economic impact)",
  tips: "Congress numbers: 119th (2025-2026), 118th (2023-2024), 117th (2021-2022). " +
    "Bill types: hr, s, hjres, sjres, hconres, sconres, hres, sres. " +
    "House votes: use year param for historical (1990+). Senate votes: 101st Congress (1989) to present. " +
    "Report types: hrpt (House), srpt (Senate), erpt (Executive). " +
    "House communication types: ec, ml, pm, pt. Senate communication types: ec, pm, pom. " +
    "Always compare House and Senate votes on the same bill to reveal bicameral differences. " +
    "For accountability investigations: use congress_member_details to get committee assignments, " +
    "congress_hearings for oversight activity, congress_committee_reports for legislative record, " +
    "then cross-reference with FEC disbursements and lobbying spend.",
  domains: ["legislation", "spending"],
  crossRef: [
    { question: "debt/deficit", route: "congress_search_bills, congress_house_votes, congress_senate_votes (debt ceiling/fiscal bills)" },
    { question: "spending/budget", route: "congress_search_bills, congress_bill_votes (authorizing/appropriations legislation)" },
    { question: "legislation", route: "congress_bill_full_profile, congress_bill_details, congress_bill_votes" },
    { question: "elections/campaign finance", route: "congress_member_full_profile, congress_member_bills, congress_house_votes, congress_senate_votes" },
    { question: "executive actions", route: "congress_search_bills (related bills), congress_house_votes, congress_senate_votes" },
    { question: "presidential comparison", route: "congress_recent_laws, congress_house_votes, congress_senate_votes" },
    { question: "drug shortages", route: "congress_search_bills (drug pricing legislation)" },
    { question: "food safety", route: "congress_search_bills (food safety legislation)" },
    { question: "medical devices", route: "congress_search_bills (device regulation bills)" },
    { question: "animal/vet drugs", route: "congress_search_bills (animal welfare legislation)" },
    { question: "tobacco/vaping", route: "congress_search_bills (tobacco regulation legislation)" },
    { question: "energy/climate", route: "congress_search_bills, congress_bill_votes (energy legislation)" },
    { question: "banking", route: "congress_search_bills (banking/financial regulation bills)" },
    { question: "consumer complaints", route: "congress_search_bills (consumer protection legislation)" },
    { question: "workplace safety", route: "congress_search_bills, congress_bill_votes (OSHA/workplace bills)" },
    { question: "unemployment", route: "congress_search_bills (jobs/employment legislation)" },
    { question: "disasters", route: "congress_search_bills, congress_bill_votes (disaster relief bills)" },
    { question: "transportation", route: "congress_search_bills (infrastructure legislation)" },
    { question: "procurement/contracting", route: "congress_search_bills (procurement/acquisition reform bills)" },
    { question: "economy", route: "congress_search_bills, congress_bill_votes (economic policy legislation)" },
    { question: "health", route: "congress_search_bills (healthcare legislation)" },
    { question: "housing", route: "congress_search_bills (housing policy legislation)" },
    { question: "education", route: "congress_search_bills (education policy legislation)" },
    { question: "college", route: "congress_search_bills (higher education/student loan legislation)" },
    { question: "patents", route: "congress_search_bills (patent reform legislation)" },
    { question: "international", route: "congress_treaties, congress_treaty_details (international treaties and agreements)" },
  ],
  reference: {
    billTypes: BILL_TYPES,
    chambers: CHAMBERS,
    amendmentTypes: AMENDMENT_TYPES,
    lawTypes: LAW_TYPES,
    reportTypes: REPORT_TYPES,
    houseCommunicationTypes: HOUSE_COMMUNICATION_TYPES,
    senateCommunicationTypes: SENATE_COMMUNICATION_TYPES,
    congressNumbers: {
      119: "2025-2026", 118: "2023-2024", 117: "2021-2022",
      116: "2019-2020", 115: "2017-2018", 114: "2015-2016",
    } as Record<number, string>,
    docs: {
      "API Docs": "https://api.congress.gov/",
      "Interactive Docs": "https://api.congress.gov/#/",
      "Sign Up": "https://api.congress.gov/sign-up/",
      "GitHub": "https://github.com/LibraryOfCongress/api.congress.gov/",
    },
  },
} satisfies ModuleMeta;
