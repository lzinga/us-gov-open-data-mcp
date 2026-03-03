---
layout: default
title: US Government Open Data MCP
---

# US Government Open Data MCP

An MCP server + TypeScript SDK for **38 U.S. government and international data APIs** — 206 tools covering economic, fiscal, health, education, energy, environment, lobbying, housing, patents, safety, banking, consumer protection, workplace safety, transportation, seismic, clinical trials, pharma payments, research funding, and legislative data.

## Quick Start

```bash
npx us-gov-open-data-mcp
```

## What It Does

This server gives AI assistants (VS Code Copilot, Claude Desktop, Cursor) direct access to live data from 38 federal APIs. It cross-references data automatically — asking about a drug pulls FDA adverse events, clinical trials, NIH research grants, lobbying spend, and congressional activity in one query.

**20 APIs require no key at all.** The rest use free keys that take under a minute to get.

## Example Analyses

These were generated entirely from live government API data — no manual data entry:

| Analysis | What it shows |
|---|---|
| [**Worst-Case Impact**](examples/worse-case-analysis) | PAC money → committee vote → law signed → measurable public cost (one case per party) |
| [**Best-Case Impact**](examples/best-case-analysis) | Senators defying industry pressure to pass legislation with positive outcomes |
| [**Presidential Economic Scorecard**](examples/presidential-economic-scorecard) | Clinton through Trump II — identical metrics, side-by-side, with context |
| [**Deficit Reduction Comparison**](examples/deficit-reduction-comparison) | Best Democratic plan vs. best Republican plan, graded on realism |

## Documentation

| Doc | What it covers |
|---|---|
| [**SDK API Reference**](docs/sdk) | All 36 modules — every function, parameter, and return type |
| [**Architecture**](docs/architecture) | How the system works — client factory, caching, rate limiting, module wiring |
| [**Adding New Modules**](docs/adding-modules) | Step-by-step guide to adding a new government API |

## Data Sources

| Category | APIs |
|---|---|
| **Economic** | Treasury, FRED, BLS, BEA, EIA |
| **Legislative** | Congress.gov, Federal Register, GovInfo, Regulations.gov |
| **Financial** | FEC, Senate Lobbying, SEC, FDIC, CFPB |
| **Health** | CDC, FDA, CMS, ClinicalTrials.gov, Open Payments |
| **Other** | Census, USDA, World Bank, EPA, NOAA, FEMA, USGS, NHTSA, HUD, USPTO, NAEP, College Scorecard, NREL, DOL, BTS |

## Install

```bash
# Run without installing
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
        "FRED_API_KEY": "your_key_here",
        "DATA_GOV_API_KEY": "your_key_here"
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
        "FRED_API_KEY": "your_key_here",
        "DATA_GOV_API_KEY": "your_key_here"
      }
    }
  }
}
```

### API Keys

20 APIs work with **no key at all**. For the rest, you have two options:

**Option 1 — `.env` file** (recommended for local development):

Create a `.env` file in your project root:

```bash
DATA_GOV_API_KEY=your_key_here
FRED_API_KEY=your_key_here
```

**Option 2 — `env` block in MCP config** (recommended for VS Code / Claude Desktop):

Add keys directly in the config as shown above.

Both methods work. The `.env` file is easier to manage if you have many keys. The `env` block is simpler for quick setup.

| Key | Free signup | Used by |
|-----|------------|---------|
| `DATA_GOV_API_KEY` | [api.data.gov/signup](https://api.data.gov/signup/) | Congress, FEC, FBI, GovInfo, College Scorecard, NREL, Regulations.gov, USDA FoodData |
| `FRED_API_KEY` | [fredaccount.stlouisfed.org/apikeys](https://fredaccount.stlouisfed.org/apikeys) | FRED |
| `CENSUS_API_KEY` | [api.census.gov/data/key_signup.html](https://api.census.gov/data/key_signup.html) | Census |
| `BEA_API_KEY` | [apps.bea.gov/API/signup](https://apps.bea.gov/API/signup/) | BEA |
| `EIA_API_KEY` | [eia.gov/opendata/register.php](https://www.eia.gov/opendata/register.php) | EIA |
| `BLS_API_KEY` | [bls.gov/developers](https://www.bls.gov/developers/) | BLS (optional) |
| `NOAA_API_KEY` | [ncei.noaa.gov/cdo-web/token](https://www.ncei.noaa.gov/cdo-web/token) | NOAA |
| `USDA_NASS_API_KEY` | [quickstats.nass.usda.gov/api](https://quickstats.nass.usda.gov/api) | USDA NASS |
| `HUD_USER_TOKEN` | [huduser.gov/hudapi/public/register](https://www.huduser.gov/hudapi/public/register) | HUD |
| `SEC_CONTACT_EMAIL` | Any valid email | SEC EDGAR |
| `DOL_API_KEY` | [data.dol.gov/registration](https://data.dol.gov/registration) | DOL |

## Links

- [GitHub Repository](https://github.com/lzinga/us-gov-open-data-mcp)
- [npm Package](https://www.npmjs.com/package/us-gov-open-data-mcp)
- [Full README](https://github.com/lzinga/us-gov-open-data-mcp#readme)

---

[Example Analyses](examples/) \| [Documentation](docs/) \| [GitHub](https://github.com/lzinga/us-gov-open-data-mcp)
