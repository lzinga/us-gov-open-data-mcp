/**
 * senate-lobbying module metadata.
 */

import { FILING_TYPES, ISSUE_CODES } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "senate-lobbying",
  displayName: "Senate Lobbying Disclosures",
  category: "Financial",
  description: "Lobbying filings, expenditures, activities, and campaign contributions — who is lobbying Congress, on what issues, and how much they're spending",
  workflow: "lobbying_search to find filings by company/issue → lobbying_detail for specific bills lobbied → lobbying_contributions for campaign donations by lobbyists. For conflict-of-interest investigations: search by trade group AND individual companies to get total industry lobbying spend across 3+ years around a vote.",
  tips:
    "Search by registrant_name (lobbying firm or self-filer like 'Pfizer'), client_name (who hired the lobbyist), or issue_code (TAX, HCR, DEF, etc.). Filing types: Q1-Q4 (quarterly), RN (new registration). Expenses are in dollars. No API key required. KEY TRADE GROUPS: 'American Bankers Association' (banking), 'PhRMA' or 'Pharmaceutical Research' (pharma), 'American Petroleum Institute' (oil/gas), 'National Association of Realtors' (real estate). Always search BOTH the trade group AND individual companies for a complete lobbying picture.",
  domains: ["legislation", "finance"],
  crossRef: [
    { question: "spending/budget", route: "lobbying_search (lobbying around appropriations)" },
    { question: "legislation", route: "lobbying_search, lobbying_detail (who lobbied on specific bills)" },
    { question: "elections/campaign finance", route: "lobbying_contributions (campaign donations by lobbyists)" },
    { question: "executive actions", route: "lobbying_search (lobbying around regulatory actions)" },
    { question: "drug investigation", route: "lobbying_search (registrant_name='PhRMA' or client_name=pharma companies)" },
    { question: "drug shortages", route: "lobbying_search (registrant_name='PhRMA', issue_code='HCR')" },
    { question: "pharma-doctor payments", route: "lobbying_search (pharma company lobbying spend)" },
    { question: "food safety", route: "lobbying_search (food industry lobbying)" },
    { question: "medical devices", route: "lobbying_search (device manufacturer lobbying)" },
    { question: "tobacco/vaping", route: "lobbying_search (tobacco industry lobbying)" },
    { question: "energy/climate", route: "lobbying_search (energy/oil industry lobbying, issue_code='ENV'/'FUE')" },
    { question: "banking", route: "lobbying_search (registrant_name='American Bankers Association' + bank companies)" },
    { question: "consumer complaints", route: "lobbying_search (financial industry lobbying on consumer protection)" },
    { question: "workplace safety", route: "lobbying_search (industry lobbying on OSHA regulations)" },
    { question: "procurement/contracting", route: "lobbying_search (contractor lobbying spend)" },
  ],
  reference: {
  filingTypes: FILING_TYPES,
  issueCodes: ISSUE_CODES,
  docs: {
    "LDA API": "https://lda.gov/api/v1/",
    "LDA Search": "https://lda.gov/filings/public/filing/search/",
    "Lobbying Disclosure Act": "https://lobbyingdisclosure.house.gov/",
  },
},
} satisfies ModuleMeta;
