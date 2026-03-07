/**
 * USPTO Open Data Portal module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "uspto",
  displayName: "USPTO Open Data Portal",
  category: "Research",
  description:
    "U.S. Patent & Trademark Office Open Data Portal (ODP) -- search patent applications, get prosecution history, assignments, continuity, documents, PTAB trial proceedings/decisions, petition decisions, and bulk datasets. Covers all U.S. patent application data via api.uspto.gov.",
  auth: { envVar: "USPTO_API_KEY", signup: "https://data.uspto.gov/apis/getting-started" },
  workflow:
    "Use uspto_search_applications to find applications by keyword, type, or date -> uspto_application_details for full data on a specific application -> uspto_application_continuity for parent/child chains -> uspto_application_transactions for prosecution history -> uspto_ptab_proceedings for PTAB trials -> uspto_ptab_decisions for trial decisions.",
  tips:
    "Query syntax: boolean operators (AND, OR, NOT), wildcards (*), exact phrases, field:value (e.g. applicationNumberText:14412875), range [2021-01-01 TO 2021-12-31], comparison (>600). Application type codes: UTL=Utility, DES=Design. Rate limit: burst=1 (sequential only), 4-15 req/sec, 5M metadata calls/week, weekly reset Sunday midnight UTC. On HTTP 429 wait 5+ seconds. PTAB trial types: IPR (Inter Partes Review), PGR (Post Grant Review), CBM (Covered Business Method).",
  reference: {
    docs: {
      "API docs": "https://data.uspto.gov/apis/getting-started",
      "Swagger": "https://data.uspto.gov/swagger/swagger.yaml",
      "Rate limits": "https://data.uspto.gov/apis/api-rate-limits",
    },
  },
} satisfies ModuleMeta;