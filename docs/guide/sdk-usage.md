# SDK Usage

Use the SDK directly in your TypeScript/JavaScript code without running the MCP server.

### Installation

```bash
npm install us-gov-open-data-mcp
```

### Basic Pattern

Every SDK module follows the same pattern — import the function, call it, get typed results:

```typescript
import { getObservations } from "us-gov-open-data-mcp/sdk/fred";

const gdp = await getObservations("GDP", { sort: "desc", limit: 5 });

for (const obs of gdp.observations) {
  console.log(`${obs.date}: $${obs.value}B`);
}
```

All functions include disk-backed caching, retry with exponential backoff, and rate limiting — no extra setup.

Every module is also available as a namespace from the package root (the same as `us-gov-open-data-mcp/sdk`).
Importing the package never starts the MCP server; use the `us-gov-open-data-mcp` command, or import
`us-gov-open-data-mcp/server`, for that.

```typescript
import { fred } from "us-gov-open-data-mcp";

const gdp = await fred.getObservations("GDP", { sort: "desc", limit: 1 });
```

### Economic Data

### Get GDP, Unemployment, Inflation from FRED

```typescript
import { getObservations, searchSeries } from "us-gov-open-data-mcp/sdk/fred";

// Latest GDP
const gdp = await getObservations("GDP", { sort: "desc", limit: 1 });
console.log(`GDP: $${gdp.observations[0].value}B`);

// Unemployment rate
const unemp = await getObservations("UNRATE", { sort: "desc", limit: 12 });

// Search for series you don't know the ID of
const results = await searchSeries("consumer price index");
console.log(results.seriess.map(s => `${s.id}: ${s.title}`));
```

::: tip
Set `FRED_API_KEY` env var. Get one free at [fredaccount.stlouisfed.org/apikeys](https://fredaccount.stlouisfed.org/apikeys).
:::

### Query Treasury Fiscal Data

```typescript
import { queryFiscalData, searchEndpoints } from "us-gov-open-data-mcp/sdk/treasury";

// Find the right endpoint
const endpoints = searchEndpoints("debt");
console.log(endpoints.map(e => `${e.endpoint}: ${e.description}`));

// Get the latest national debt
const debt = await queryFiscalData(
  "/v2/accounting/od/debt_to_penny",
  { sort: "-record_date", pageSize: 1 }
);
console.log(debt.data[0]);
```

No API key required.

### Compare Countries via World Bank

```typescript
import { compareCountries } from "us-gov-open-data-mcp/sdk/world-bank";

// Compare health spending per capita: US, Germany, Canada, UK
const health = await compareCountries(
  "SH.XPD.CHEX.PC.CD",
  ["US", "DE", "CA", "GB"],
  { dateRange: "2018:2023" }
);

for (const d of health.data) {
  if (d.value) console.log(`${d.country.value} (${d.date}): $${d.value}`);
}
```

No API key required.

### Legislative Data

### Search Bills and Get Vote Details

```typescript
import {
  searchBills,
  getBillDetails,
  getSenateVotes,
} from "us-gov-open-data-mcp/sdk/congress";

// Search for bills about AI
const bills = await searchBills({ query: "artificial intelligence", congress: 118 });
for (const b of bills) {
  console.log(`${b.type}${b.number}: ${b.title}`);
}

// Get full details on a specific bill
const details = await getBillDetails(118, "hr", 2882);
console.log(details);

// Get a Senate roll call vote with party breakdown
const vote = await getSenateVotes({ congress: 118, session: 1, rollCallNumber: 325 });
console.log(vote);
```

### Search Executive Orders

```typescript
import { searchExecutiveOrders } from "us-gov-open-data-mcp/sdk/federal-register";

const eos = await searchExecutiveOrders({
  president: "donald-trump",
  perPage: 10,
});

for (const eo of eos.results) {
  console.log(`${eo.executive_order_number}: ${eo.title}`);
}
```

No API key required.

### Campaign Finance & Lobbying

### Trace PAC Money to a Candidate

```typescript
import {
  searchCandidates,
  getCandidateFinancials,
  searchCommittees,
  getCommitteeDisbursements,
} from "us-gov-open-data-mcp/sdk/fec";

// Find a candidate
const candidates = await searchCandidates({ name: "Mike Crapo", state: "ID" });
const candidate = candidates.results[0];
console.log(`${candidate.name} — ${candidate.candidate_id}`);

// Get their financial totals across cycles
const financials = await getCandidateFinancials(candidate.candidate_id);
for (const f of financials) {
  console.log(`Cycle ${f.cycle}: raised $${f.receipts}, PAC $${f.other_political_committee_contributions}`);
}

// Find a specific industry PAC
const pacs = await searchCommittees({ name: "Goldman Sachs", committee_type: "Q" });
const pac = pacs.results[0];

// Get disbursements from that PAC to the candidate
const disbursements = await getCommitteeDisbursements({
  committee_id: pac.committee_id,
  recipient_name: "Crapo",
  cycle: 2018,
});
for (const d of disbursements.results) {
  console.log(`${d.disbursement_date}: $${d.disbursement_amount} — ${d.disbursement_description}`);
}
```

### Search Lobbying Filings

```typescript
import { searchFilings, getFilingDetail } from "us-gov-open-data-mcp/sdk/senate-lobbying";

// Find lobbying by a company
const filings = await searchFilings({
  client_name: "Pfizer",
  filing_year: 2024,
});

// Get the full detail with specific issues and bills lobbied on
const detail = await getFilingDetail(filings.results[0].filing_uuid);
console.log(detail.lobbying_activities);
```

No API key required.

### Health Data

### Leading Causes of Death by State

```typescript
import { getLeadingCausesOfDeath, getMortalityRates } from "us-gov-open-data-mcp/sdk/cdc";

// By state
const deaths = await getLeadingCausesOfDeath({
  state: "California",
  year: 2017,
});

// Recent provisional mortality rates
const rates = await getMortalityRates({
  state: "New York",
  cause: "All causes",
});
```

No API key required.

### Search Clinical Trials

```typescript
import { searchTrials } from "us-gov-open-data-mcp/sdk/clinical-trials";

const trials = await searchTrials({
  condition: "diabetes",
  intervention: "semaglutide",
  status: "RECRUITING",
  pageSize: 10,
});

for (const t of trials.studies) {
  console.log(`${t.protocolSection?.identificationModule?.nctId}: ${t.protocolSection?.identificationModule?.briefTitle}`);
}
```

No API key required.

### Federal Spending

### Who Gets the Money

```typescript
import { spendingByAgency, searchAwards, spendingByState } from "us-gov-open-data-mcp/sdk/usaspending";

// Top agencies by spending
const agencies = await spendingByAgency({ fiscalYear: 2025, limit: 10 });
for (const a of agencies) {
  console.log(`${a.name}: $${(a.amount / 1e9).toFixed(1)}B`);
}

// Search specific awards
const awards = await searchAwards({
  keyword: "artificial intelligence",
  awardType: "contracts",
  limit: 5,
});

// Spending by state
const state = await spendingByState({ state: "CA", fiscalYear: 2025 });
console.log(state);
```

No API key required.

### Cross-Referencing Data

The real power is combining modules. Here's an example that cross-references:

```typescript
import { getObservations } from "us-gov-open-data-mcp/sdk/fred";
import { queryFiscalData } from "us-gov-open-data-mcp/sdk/treasury";
import { compareCountries } from "us-gov-open-data-mcp/sdk/world-bank";

// Get U.S. GDP
const gdp = await getObservations("GDP", { sort: "desc", limit: 1 });
const gdpValue = parseFloat(gdp.observations[0].value);

// Get national debt
const debt = await queryFiscalData(
  "/v2/accounting/od/debt_to_penny",
  { sort: "-record_date", pageSize: 1 }
);
const debtValue = parseFloat(debt.data[0].tot_pub_debt_out_amt) / 1e6; // convert to millions

// Calculate debt-to-GDP ratio
const ratio = ((debtValue / gdpValue) * 100).toFixed(1);
console.log(`Debt-to-GDP: ${ratio}%`);

// Compare internationally
const intl = await compareCountries(
  "GC.DOD.TOTL.GD.ZS", // Central govt debt as % of GDP
  ["US", "JP", "DE", "GB", "CA"],
  { dateRange: "2020:2023" }
);
```

All SDK functions can be composed freely since they're just async functions returning typed data.
