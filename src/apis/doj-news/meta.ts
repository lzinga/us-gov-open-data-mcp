/**
 * doj-news module metadata.
 */

import { COMPONENTS, TOPICS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "doj-news",
  displayName: "DOJ News",
  category: "Justice",
  description:
    "Department of Justice press releases (262K+) and blog entries (3,200+). Search by title keyword, date, and DOJ component. Covers enforcement actions, indictments, settlements, policy announcements across all DOJ divisions including FBI, DEA, ATF, USAO, and Civil Rights.",
  workflow:
    "doj_press_releases to search/browse press releases → doj_press_release_detail for full text → doj_blog_entries to search blog posts → doj_blog_detail for full text.",
  tips:
    "Sort: 'date' or 'created'. Direction: 'DESC' (newest first), 'ASC' (oldest). Max 50 results per page. Filter by title keyword: title='cybercrime'. Date is a Unix timestamp in the response — the tool auto-converts to readable dates. Components include: FBI, DEA, ATF, Civil Rights Division, Antitrust Division, USAO (U.S. Attorneys). Topics include: Drug Trafficking, Cybercrime, National Security, Civil Rights, Financial Fraud, Public Corruption.",
  reference: {
  components: COMPONENTS,
  topics: TOPICS,
  docs: {
    "API Documentation": "https://www.justice.gov/developer/api-documentation/api_v1",
    "DOJ Newsroom": "https://www.justice.gov/news",
  },
},
} satisfies ModuleMeta;
