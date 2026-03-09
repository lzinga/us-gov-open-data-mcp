<div align="center">

# US Government Open Data MCP

**MCP Server + TypeScript SDK for 40+ U.S. Government APIs**

[![npm version](https://img.shields.io/npm/v/us-gov-open-data-mcp)](https://www.npmjs.com/package/us-gov-open-data-mcp)
[![npm downloads](https://img.shields.io/npm/dm/us-gov-open-data-mcp)](https://www.npmjs.com/package/us-gov-open-data-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<a href="https://glama.ai/mcp/servers/lzinga/us-gov-open-data-mcp"><img width="380" height="200" src="https://glama.ai/mcp/servers/lzinga/us-gov-open-data-mcp/badge" alt="US Government Open Data MCP server" /></a>

250+ tools covering economic, fiscal, health, education, energy, environment, lobbying, housing, patents, safety, banking, consumer protection, workplace safety, transportation, seismic, clinical trials, pharma payments, research funding, procurement, and legislative data.

**22 APIs require no key** · The rest use free keys that take under a minute to get

[Getting Started](https://lzinga.github.io/us-gov-open-data-mcp/guide/getting-started) · [API Reference](https://lzinga.github.io/us-gov-open-data-mcp/api/) · [Documentation](https://lzinga.github.io/us-gov-open-data-mcp/)

</div>

---

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

This project integrates **30+ government APIs**, many of which have large, complex, or inconsistently documented schemas. AI is used as a tool throughout this project to help parse API documentation, generate type definitions, and scaffold tool implementations — making it possible to cover this much surface area and get people access to government data faster than would otherwise be feasible. While every effort has been made to ensure accuracy, some endpoints may return unexpected results, have incomplete parameter coverage, or behave differently than documented.

This is a community-driven effort — if you find something that's broken or could be improved, **please open an issue or submit a PR**. Contributions that fix edge cases, improve schema accuracy, or expand coverage are especially welcome. The goal is to make U.S. government data as accessible and reliable as possible, together.

All data is sourced from official U.S. government and international APIs — the server does not generate, modify, or editorialize any data.

## License

MIT
