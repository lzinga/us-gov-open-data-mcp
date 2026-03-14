# MCP Usage

With the MCP server running, you can ask AI assistants natural language questions. The server provides ~14K tokens of instructions that teach the LLM how to route questions to the right tools across 40+ APIs.

## How It Works

When the MCP server connects to a client (VS Code, Claude Desktop, Cursor), it sends:

1. **Instructions** (~14K tokens) — module descriptions, a cross-reference routing table, and analysis rules. This stays in the model's context for the entire session.
2. **300+ tool definitions** — each with name, description, and parameter schema.

The routing table tells the LLM which specific tools + parameters to combine for each question type. For example, when you ask about the deficit, the model reads:

```
DEBT/DEFICIT → FRED(fred_series_data with GDP, FYFSGDA188S) + Treasury(query_fiscal_data with debt_to_penny, avg_interest_rates) + World Bank(wb_indicator with GC.DOD.TOTL.GD.ZS)
```

...and knows to call those 3 tools with those specific parameters, then cross-reference the results.

## Example Prompts

## Economic

> "What's the current state of the U.S. economy? Show me GDP, unemployment, inflation, and interest rates."

Tools: `fred_series_data` (GDP, UNRATE, CPIAUCSL, FEDFUNDS)

> "Compare Biden and Trump's economic performance using the same metrics."

Tools: `fred_series_data`, `treasury_query` (debt), `fr_executive_orders`

> "Give me a complete economic and health profile for Texas."

Tools: `bea_gdp_by_state`, `census_query`, `cdc_places_health`, `usaspending_by_state`, `hud_fair_market_rents`

## Legislative

> "What happened with the Inflation Reduction Act? Who sponsored it, how did the vote break down by party?"

Tools: `congress_bill_details`, `congress_senate_votes`, `congress_bill_actions`, `fred_series_data` (before/after), `lobbying_search`

> "Who's lobbying on AI regulation and how much are they spending?"

Tools: `lobbying_search`, `lobbying_detail`, `congress_search_bills`

## Health

> "Show me the adverse event profile for Ozempic including clinical trials, FDA reports, and pharma payments to doctors."

Tools: `fda_drug_events`, `fda_drug_counts`, `fda_drug_labels`, `fda_approved_drugs`, `fda_drug_shortages`, `clinical_trials_search`, `open_payments_search`, `nih_search_projects`

## Financial

> "Show me which banking PACs gave money to members of the Senate Banking Committee, and how those members voted on banking deregulation."

Tools: `congress_search_members`, `fec_search_committees`, `fec_committee_disbursements`, `congress_senate_votes`, `lobbying_search`

> "Which banks have the most consumer complaints?"

Tools: `cfpb_search_complaints`, `cfpb_complaint_aggregations`, `cfpb_complaint_trends`

## Tips for Better Prompts

1. **Be specific about time ranges** — "GDP since 2020" beats "GDP trends"
2. **Ask for cross-references** — "...and compare internationally" triggers World Bank data
3. **Name the data source** — "Using FRED data, show me..." helps pick the right tool
4. **Ask for context** — "What was the debt-to-GDP ratio?" pulls GDP alongside debt
