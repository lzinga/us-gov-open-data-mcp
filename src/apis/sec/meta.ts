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
  reference: {
  xbrlConcepts: xbrlConcepts as Record<string, string>,
  commonCiks: {
    "0000320193": "Apple",
    "0000789019": "Microsoft",
    "0001018724": "Amazon",
    "0000936468": "Lockheed Martin",
    "0000101829": "Raytheon (RTX)",
    "0000012927": "Boeing",
    "0000040533": "General Dynamics",
    "0001133421": "Northrop Grumman",
  } as Record<string, string>,
  docs: {
    "Developer Resources": "https://www.sec.gov/about/developer-resources",
    "EDGAR APIs": "https://www.sec.gov/page/edgar-application-programming-interfaces-old",
    "Full-Text Search": "https://efts.sec.gov/LATEST/",
    "Fair Access Policy": "https://www.sec.gov/privacy.htm#security",
  },
},
} satisfies ModuleMeta;
