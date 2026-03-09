<div align="center">

# US Government Open Data MCP

**MCP Server + TypeScript SDK for 40+ U.S. Government APIs**

[![npm version](https://img.shields.io/npm/v/us-gov-open-data-mcp)](https://www.npmjs.com/package/us-gov-open-data-mcp)
[![npm downloads](https://img.shields.io/npm/dm/us-gov-open-data-mcp)](https://www.npmjs.com/package/us-gov-open-data-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

300+ tools covering economic, fiscal, health, education, energy, environment, lobbying, housing, patents, safety, banking, consumer protection, workplace safety, transportation, seismic, clinical trials, pharma payments, research funding, procurement, and legislative data.

**20+ APIs require no key** · The rest use free keys that take under a minute to get

[Getting Started](https://lzinga.github.io/us-gov-open-data-mcp/guide/getting-started) · [API Reference](https://lzinga.github.io/us-gov-open-data-mcp/api/) · [Documentation](https://lzinga.github.io/us-gov-open-data-mcp/)

</div>

---

## Features

- **300+ tools** across 40+ government APIs — economic, health, legislative, financial, environmental, and more
- **Cross-referencing** — built-in instructions guide the LLM to combine data from multiple agencies (e.g., FDA adverse events + lobbying spend + campaign contributions)
- **Code mode** — WASM-sandboxed JavaScript execution reduces context window usage by 98-100% for large responses
- **Selective loading** — load only the modules you need: `--modules fred,treasury,congress`
- **Dual transport** — stdio for desktop clients, HTTP Stream for web/remote
- **TypeScript SDK** — every API is importable as a standalone typed client, no MCP required
- **Disk-backed caching** — responses cached to disk, survives restarts
- **Rate limiting + retry** — token-bucket rate limiter with exponential backoff on 429/503

## Quick Start

### MCP Server

```bash
npx us-gov-open-data-mcp
```

Add to `.vscode/mcp.json` for VS Code / Copilot:

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

Add to `claude_desktop_config.json` for Claude Desktop:

```json
{
  "mcpServers": {
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

## Example Prompts

Once connected, ask your AI assistant natural language questions:

> **Economic:** "What's the current state of the U.S. economy? Show me GDP, unemployment, inflation, and interest rates."

> **Health:** "Show me the adverse event profile for Ozempic including clinical trials, FDA reports, and pharma payments to doctors."

> **Legislative:** "What happened with the Inflation Reduction Act? Who sponsored it, how did the vote break down by party?"

> **Follow the money:** "Which banking PACs gave money to members of the Senate Banking Committee, and how did those members vote on banking deregulation?"

> **Cross-reference:** "How has federal spending on healthcare changed over the last 5 years, and what health outcomes has it produced?"

### TypeScript SDK

```bash
npm install us-gov-open-data-mcp
```

```typescript
import { getObservations } from "us-gov-open-data-mcp/sdk/fred";
import { searchBills } from "us-gov-open-data-mcp/sdk/congress";

const gdp = await getObservations("GDP", { sort: "desc", limit: 5 });
```

No MCP server required. All functions include caching, retry, and rate limiting.

## Documentation

Full documentation at **[lzinga.github.io/us-gov-open-data-mcp](https://lzinga.github.io/us-gov-open-data-mcp/)**

| | |
|---|---|
| [Getting Started](https://lzinga.github.io/us-gov-open-data-mcp/guide/getting-started) | MCP setup, SDK install, client configs |
| [API Keys](https://lzinga.github.io/us-gov-open-data-mcp/guide/api-keys) | Which APIs need keys, where to get them |
| [Data Sources](https://lzinga.github.io/us-gov-open-data-mcp/guide/data-sources) | All 40+ APIs grouped by category |
| [API Reference](https://lzinga.github.io/us-gov-open-data-mcp/api/) | Auto-generated from TypeScript — every function and type |
| [Examples](https://lzinga.github.io/us-gov-open-data-mcp/guide/sdk-usage) | SDK code, MCP prompts, analysis showcases |
| [Architecture](https://lzinga.github.io/us-gov-open-data-mcp/guide/architecture) | How the system works |
| [Adding Modules](https://lzinga.github.io/us-gov-open-data-mcp/guide/adding-modules) | Add a new API — just create a folder |

## Data Sources

| Category | APIs |
|----------|------|
| **Economic** | Treasury, FRED, BLS, BEA, EIA |
| **Legislative** | Congress.gov, Federal Register, GovInfo, Regulations.gov |
| **Financial** | FEC, Senate Lobbying, SEC, FDIC, CFPB |
| **Spending** | USAspending, Open Payments |
| **Health & Safety** | CDC, FDA, CMS, ClinicalTrials.gov, NIH, NHTSA, DOL |
| **Environment** | EPA, NOAA, NREL, USGS |
| **Justice** | FBI Crime Data, DOJ News |
| **Education** | NAEP, College Scorecard, USPTO |
| **Demographics** | Census, HUD, FEMA |
| **Other** | BTS, USDA NASS, USDA FoodData, World Bank |

## Disclaimer

This project integrates **a significant number of government APIs**, many of which have large, complex, or inconsistently documented schemas. AI is used as a tool throughout this project to help parse API documentation, generate type definitions, and scaffold tool implementations — making it possible to cover this much surface area and get people access to government data faster than would otherwise be feasible. While every effort has been made to ensure accuracy, some endpoints may return unexpected results, have incomplete parameter coverage, or behave differently than documented.

This is a community-driven effort — if you find something that's broken or could be improved, **please open an issue or submit a PR**. Contributions that fix edge cases, improve schema accuracy, or expand coverage are especially welcome. The goal is to make U.S. government data as accessible and reliable as possible, together.

All data is sourced from official U.S. government and international APIs — the server does not generate, modify, or editorialize any data.

## License

MIT
