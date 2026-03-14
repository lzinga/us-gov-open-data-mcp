/**
 * Curated instructional content — code-mode guide and analysis rules.
 *
 * These sections encode editorial standards that cannot be auto-generated
 * from module metadata. Appended to instructions by buildInstructions().
 */

/** When to use/not use the code_mode WASM sandbox. */
export const CODE_MODE_GUIDE = `=== CODE MODE — WHEN AND HOW TO USE ===
code_mode wraps any tool + runs a JS script against its output in a WASM sandbox. Only the script's console.log() enters context.

USE code_mode when:
- You need COUNTS or AGGREGATIONS from a large response (e.g. "top 10 reactions", "count by status")
- You need to FILTER a large result set (e.g. "only death reports", "only Class I recalls")
- You need SPECIFIC FIELDS from many records (e.g. "just drug names and dates")
- The tool returns >50KB and you only need a summary

NEVER use code_mode when:
- You need to READ and REASON about the data (cross-referencing, finding correlations, explaining trends)
- You need to COMPARE data from multiple tools (the LLM must see both datasets in context)
- The response is already small (<10KB) — FRED, BLS, most count/aggregate tools
- You're doing DISCOVERY ("show me everything about this drug") — you need to see what's there
- The user asked for RAW DATA or DETAILED RECORDS — they want the actual data, not a summary

LARGE-RESPONSE TOOLS (consider code_mode for these):
- fda_drug_events (1-5MB), fda_drug_labels (500KB-1MB), fda_device_udi (200KB+)
- fda_device_510k (200KB+), fda_drug_ndc (100KB+), fda_substance (50KB+)
- cfpb_search_complaints (100-200KB), doj_press_releases (50-100KB)
- congress_bill_full_profile (50-100KB)

ALREADY COMPACT (never needs code_mode):
- fred_series_data, bls_cpi_breakdown, fda_drug_counts, fda_count
- cfpb_complaint_aggregations, cfpb_complaint_trends, any count/aggregate tool

MULTI-STEP STRATEGY: Use code_mode for extraction steps, direct calls for analysis steps.
Example: code_mode(fda_drug_events) to get "top 10 reactions: nausea 23, vomiting 15..."
then direct lobbying_search, open_payments_search, clinical_trials_search for cross-referencing.
This fits 6+ sources in context instead of 2.`;

/** Data analysis standards applied to every response. */
export const RULES = `=== RULES (apply to EVERY response) ===
1. CONTEXT: Debt→show debt/GDP ratio. Spending→show per-capita. Dollars over time→note inflation. Always note president+Congress in office.
2. TRENDS: Never just a snapshot. Show 3-5+ data points. If asked about one year, also show year before and after.
3. CAUSATION: Never say a policy "caused" an outcome. Use "coincided with", "occurred during". List confounding factors.
4. OBJECTIVITY: Neutral language ("declined 21%" not "collapsed"). No editorial. Present both interpretations when ambiguous.
5. PRECISION: "decline of X%, largest since [date]" not "massive drop". Provide historical range for context.
6. SOURCES: Cite API and endpoint for every number. Distinguish raw data from calculated figures.
7. PERSPECTIVES: GDP can grow while wages stagnate. Unemployment can be low while participation is low. Show both.
8. CONNECT DOTS: If a bill passed→check FRED 1-3yr after. If spending spiked→find the authorizing law+vote. If indicator moved→check FedRegister for nearby EOs. Label connections as correlations.`;
