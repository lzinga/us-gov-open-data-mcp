/**
 * sec module metadata.
 */

import { xbrlConcepts } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "sec",
  displayName: "SEC EDGAR",
  category: "Financial",
  description: "Company filings, financial data (XBRL), and full-text search across SEC EDGAR",
  workflow: "sec_filing_search to find companies/CIKs → sec_company_search for details → sec_company_financials for XBRL data",
  tips: "No API key required. Rate limit: 10 req/sec. CIK numbers must be looked up first — use sec_filing_search to find them by company name.",
  domains: ["finance"],
  crossRef: [
    { question: "drug investigation", route: "sec_company_financials (pharma company financials via XBRL)" },
    { question: "pharma-doctor payments", route: "sec_company_financials (company revenue context)" },
    { question: "banking", route: "sec_company_financials (bank holding company financials)" },
    { question: "consumer complaints", route: "sec_company_financials (company financial health context)" },
    { question: "patents", route: "sec_company_financials (patent holder financials)" },
    { question: "procurement/contracting", route: "sec_company_financials (contractor financial data)" },
    { question: "elections/campaign finance", route: "sec_company_financials (public company financial context for PAC/donor analysis)" },
    { question: "energy/climate", route: "sec_company_financials (energy company revenue, ESG disclosures)" },
  ],
  reference: {
  xbrlConcepts: xbrlConcepts as Record<string, string>,
  docs: {
    "Developer Resources": "https://www.sec.gov/about/developer-resources",
    "EDGAR APIs": "https://www.sec.gov/page/edgar-application-programming-interfaces-old",
    "Full-Text Search": "https://efts.sec.gov/LATEST/",
    "Fair Access Policy": "https://www.sec.gov/privacy.htm#security",
  },
},
} satisfies ModuleMeta;
