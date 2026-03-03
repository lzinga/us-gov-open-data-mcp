# US Government Open Data MCP

An MCP server + TypeScript SDK for **38 U.S. government and international data APIs** — 206 tools covering economic, fiscal, health, education, energy, environment, lobbying, housing, patents, safety, banking, consumer protection, workplace safety, transportation, seismic, clinical trials, pharma payments, research funding, and legislative data.

Works with any MCP client (VS Code Copilot, Claude Desktop, Cursor) via **stdio or HTTP Stream**. Supports **selective module loading** and standalone **SDK imports** for use without MCP.

Built with [FastMCP](https://github.com/punkpeye/fastmcp). Disk-cached, rate-limited, retries with backoff.

I did collapse all older commits into a single commit hence the large initial commit. This was to consolidate as well as get rid of many old files that were no longer relevant to the project when I made it public.

## Data Sources

| API | What it covers | Auth |
|-----|---------------|------|
| **Treasury Fiscal Data** | 53 datasets, 181 endpoints: national debt, revenue, spending, interest rates, exchange rates, gold reserves | None |
| **FRED** | 800K+ economic time series: GDP, CPI, unemployment, interest rates, money supply, housing, S&P 500 | `FRED_API_KEY` |
| **BLS** | Employment by industry, wages, CPI by component, PPI, JOLTS, labor productivity | `BLS_API_KEY` (optional) |
| **BEA** | State GDP, GDP by industry, personal income by state, national accounts (NIPA) | `BEA_API_KEY` |
| **EIA** | Petroleum, electricity, natural gas prices; state energy profiles | `EIA_API_KEY` |
| **Census Bureau** | Population, demographics, income, housing from ACS and Decennial Census | `CENSUS_API_KEY` |
| **OpenFEC** | Campaign finance: candidates, committees, contributions, expenditures | `DATA_GOV_API_KEY` |
| **Congress.gov** | Bills, members, laws, amendments, House & Senate roll call votes (1990+) | `DATA_GOV_API_KEY` |
| **Federal Register** | Executive orders, presidential documents, rules, agency notices, document detail, 470+ agency directory | None |
| **USAspending** | Federal contracts, grants, loans — $6T+ annually by agency, recipient, state | None |
| **SEC EDGAR** | Company filings, XBRL financials, full-text search | `SEC_CONTACT_EMAIL` |
| **FBI Crime Data** | Crime statistics by state, national estimates, arrests | `DATA_GOV_API_KEY` |
| **GovInfo** | Full text of bills, laws, CBO reports, Federal Register | `DATA_GOV_API_KEY` |
| **NOAA Climate** | Weather observations, temperature, precipitation from U.S. stations | `NOAA_API_KEY` |
| **USDA NASS** | Crop production, livestock, farm prices, Census of Agriculture | `USDA_NASS_API_KEY` |
| **World Bank** | International indicators: GDP, population, health spending for 200+ countries | None |
| **CDC Health Data** | Leading causes of death, life expectancy, mortality rates, county/city health indicators (PLACES), drug overdose, obesity, disability, birth indicators, weekly death surveillance, COVID-19 — 13 tools across 12 datasets | None |
| **NAEP (Nation's Report Card)** | 10 subjects (reading, math, science, writing, civics, history, geography, economics, TEL, music) with subscale breakdowns, achievement levels, significance testing, 30 urban district scores, crosstab demographics | None |
| **College Scorecard** | College costs, graduation rates, post-graduation earnings, student debt, admission rates for every U.S. college | `DATA_GOV_API_KEY` |
| **NREL (Clean Energy)** | EV charging stations, alt fuel infrastructure, electricity rates, solar resource data | `DATA_GOV_API_KEY` |
| **FDA (OpenFDA)** | Drug adverse events (20M+ reports), drug recalls, FDA-approved drugs (Drugs@FDA), drug labels, food recalls, food adverse events (CAERS), medical device events, device recalls — 8 tools | None |
| **EPA** | Air quality data, facility compliance/violations, UV index forecasts | None |
| **Senate Lobbying Disclosures** | Lobbying filings, expenditures by issue, campaign contributions, individual lobbyist search — follow the money | None |
| **Regulations.gov** | Federal rulemaking: proposed rules, final rules, public comments, regulatory dockets | `DATA_GOV_API_KEY` |
| **USDA FoodData Central** | Nutritional data for 300K+ foods: calories, macros, vitamins, minerals for branded and reference foods | `DATA_GOV_API_KEY` |
| **FEMA** | Disaster declarations, housing assistance, public assistance, NFIP flood claims, hazard mitigation | None |
| **NHTSA** | Vehicle safety recalls, consumer complaints, NCAP 5-star safety ratings, VIN decoding, make/model lookup | None |
| **CMS Provider Data** | Hospital quality ratings, nursing home inspections, home health, hospice, dialysis facility data | None |
| **HUD** | Fair Market Rents by bedroom count, income limits by household size, county/metro area housing data | `HUD_USER_TOKEN` |
| **USPTO PatentsView** | U.S. patent search by keyword, assignee, inventor, CPC class; inventor and assignee lookup | None |
| **CFPB** | Consumer complaint database: 13M+ complaints against financial companies, searchable by company/product/state/issue with trend analysis | None |
| **FDIC** | Bank data: 5,000+ insured institutions, failures since 1934, quarterly financials, branch deposits, merger history | None |
| **DOL** | OSHA inspections/violations/accidents, WHD wage theft enforcement, weekly unemployment insurance claims (national + state) | `DOL_API_KEY` |
| **Open Payments** | CMS Sunshine Act data: 15M+ payments/year from pharma/device companies to doctors. Search by company, doctor, state, specialty | None |
| **USGS** | Earthquake events (magnitude, location, depth, tsunami risk), water resources monitoring (real-time and daily historical streamflow, water levels) from 13,000+ stations | None |
| **ClinicalTrials.gov** | 400K+ clinical trials: search by condition, drug, sponsor, phase, status, location. Track pharma drug pipelines | None |
| **BTS** | Bureau of Transportation Statistics: monthly transport stats (airline traffic, transit, rail, safety, fuel), border crossings at U.S. ports of entry | None |
| **NIH RePORTER** | NIH-funded research projects: search by disease, investigator, institution, state, funding amount. Spending by disease category (RCDC), institute breakdown, linked publications | None |

## Quick Start

```bash
npx us-gov-open-data-mcp
```

### VS Code / Copilot

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "us-gov-open-data": {
      "command": "npx",
      "args": ["-y", "us-gov-open-data-mcp"],
      "env": {
        "FRED_API_KEY": "your_key",
        "DATA_GOV_API_KEY": "your_key"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "us-gov-open-data": {
      "command": "npx",
      "args": ["-y", "us-gov-open-data-mcp"],
      "env": {
        "FRED_API_KEY": "your_key"
      }
    }
  }
}
```

### HTTP Stream (for web apps, remote access)

```bash
# Start on port 8080
node dist/server.js --transport httpStream --port 8080

# Or via npm script
npm run start:http
```

The HTTP Stream endpoint will be at `http://localhost:8080/mcp`. Works with any MCP client that supports HTTP transport.

### Selective Module Loading

Load only the modules you need for faster startup and smaller tool lists:

```bash
# Via CLI flag
node dist/server.js --modules fred,treasury,congress

# Via environment variable
MODULES=fred,bls,treasury node dist/server.js

# Combine with HTTP transport
node dist/server.js --modules fred,treasury --transport httpStream --port 8080
```

Available module names: `treasury`, `fred`, `bls`, `bea`, `eia`, `census`, `fec`, `congress`, `federal-register`, `usaspending`, `sec`, `fbi`, `govinfo`, `noaa`, `usda-nass`, `world-bank`, `cdc`, `naep`, `college-scorecard`, `nrel`, `fda`, `epa`, `senate-lobbying`, `regulations`, `usda-fooddata`, `fema`, `nhtsa`, `cms`, `hud`, `uspto`, `cfpb`, `fdic`, `dol`, `usgs`, `clinical-trials`, `bts`, `open-payments`, `nih`

## API Keys

20 APIs require **no key at all** (Treasury, Federal Register, USAspending, World Bank, CDC, FDA, EPA, NAEP, Senate Lobbying, FEMA, NHTSA, CMS, USPTO, CFPB, FDIC, USGS, ClinicalTrials.gov, BTS, Open Payments, NIH RePORTER). The rest need free keys — most take under a minute to get:

| Key | Where to get it | Used by |
|-----|----------------|---------|
| `DATA_GOV_API_KEY` | [api.data.gov/signup](https://api.data.gov/signup/) | Congress, FEC, FBI, GovInfo, College Scorecard, NREL, Regulations.gov, USDA FoodData |
| `FRED_API_KEY` | [fredaccount.stlouisfed.org/apikeys](https://fredaccount.stlouisfed.org/apikeys) | FRED |
| `CENSUS_API_KEY` | [api.census.gov/data/key_signup.html](https://api.census.gov/data/key_signup.html) | Census |
| `BLS_API_KEY` | [bls.gov/developers](https://www.bls.gov/developers/) | BLS (optional — works without, higher limits with) |
| `BEA_API_KEY` | [apps.bea.gov/API/signup](https://apps.bea.gov/API/signup/) | BEA |
| `EIA_API_KEY` | [eia.gov/opendata/register.php](https://www.eia.gov/opendata/register.php) | EIA |
| `NOAA_API_KEY` | [ncei.noaa.gov/cdo-web/token](https://www.ncei.noaa.gov/cdo-web/token) | NOAA |
| `USDA_NASS_API_KEY` | [quickstats.nass.usda.gov/api](https://quickstats.nass.usda.gov/api) | USDA NASS |
| `HUD_USER_TOKEN` | [huduser.gov/hudapi/public/register](https://www.huduser.gov/hudapi/public/register) | HUD |
| `SEC_CONTACT_EMAIL` | Any valid email | SEC EDGAR |
| `DOL_API_KEY` | [data.dol.gov/registration](https://data.dol.gov/registration) | DOL (OSHA, WHD, UI Claims) |

Set keys via environment variables or a `.env` file in the project root.

## Using as a TypeScript SDK

Every API is importable as a standalone typed client — no MCP server required:

```typescript
// Individual module imports
import { getObservations } from "us-gov-open-data-mcp/sdk/fred";
import { getIndicator } from "us-gov-open-data-mcp/sdk/world-bank";
import { getLeadingCausesOfDeath } from "us-gov-open-data-mcp/sdk/cdc";
import { searchBills } from "us-gov-open-data-mcp/sdk/congress";

// Or barrel import everything
import * as sdk from "us-gov-open-data-mcp/sdk";
const gdp = await sdk.fred.getObservations("GDP", { sort: "desc", limit: 5 });
```

```typescript
// FRED
const gdp = await getObservations("GDP", { sort: "desc", limit: 5 });
console.log(gdp.observations); // [{ date: "2025-10-01", value: "31490.07" }, ...]

// World Bank — compare U.S. to Germany
const health = await getIndicator("SH.XPD.CHEX.PC.CD", { country: "US;DE", dateRange: "2015:2023" });

// CDC
const deaths = await getLeadingCausesOfDeath({ state: "California", year: 2017 });
```

All SDK functions include disk-backed caching, retry with exponential backoff, and token-bucket rate limiting. See [docs/sdk.md](docs/sdk.md) for the full API reference.

## Architecture

```
src/
  client.ts              # createClient() factory — cache, retry, rate-limit
  server.ts              # FastMCP bootstrap — stdio + HTTP, selective loading
  instructions.ts        # Cross-referencing guide for MCP clients
  sdk/
    index.ts             # Barrel export for all SDK modules
    fred.ts, bls.ts, ... # Typed API clients (no MCP dependency)
  modules/
    fred.ts, bls.ts, ... # MCP tool definitions + metadata
```

Each API is 2 files:
- **`sdk/*.ts`** — typed async functions, usable anywhere (no MCP/Zod dependency)
- **`modules/*.ts`** — MCP tool definitions wrapping the SDK, with metadata for client instructions

Adding a new API: create `sdk/new-api.ts` + `modules/new-api.ts`, add 2 lines to `server.ts`. See [docs/adding-modules.md](docs/adding-modules.md).

## Documentation

- [SDK API Reference](docs/sdk.md) — all exported functions and types
- [Adding New Modules](docs/adding-modules.md) — how to add a new API
- [Architecture](docs/architecture.md) — how the system works

## Disclaimer

This project was built with the assistance of AI tools. All data is sourced from official U.S. government and international APIs — the server does not generate, modify, or editorialize any data. It returns raw results from federal databases exactly as provided.

**Important:**
- Data accuracy depends on the upstream government APIs. Numbers may lag days to years behind reality depending on the source.
- Correlation does not imply causation. Cross-referencing data sources (e.g., campaign finance + legislative votes) shows documented patterns, not proven cause-and-effect.
- This tool is for research and informational purposes. It is not legal, financial, medical, or policy advice.
- API rate limits and availability vary. Some endpoints may be temporarily unavailable or return incomplete data.
- The example analyses in the `examples/` folder demonstrate the server's capabilities and should not be treated as investigative conclusions.

## License

MIT
