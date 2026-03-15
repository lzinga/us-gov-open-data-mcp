# Getting Started

## Features

- **300+ tools** across 40+ government APIs — economic, health, legislative, financial, environmental, and more
- **Cross-referencing** — built-in instructions guide the LLM to combine data from multiple agencies
- **[Code mode](/guide/code-mode)** — WASM-sandboxed JavaScript execution reduces context usage by 98-100% for large responses
- **Selective loading** — load only the modules you need: `--modules fred,treasury,congress`
- **Dual transport** — stdio for desktop clients, HTTP Stream for web/remote
- **TypeScript SDK** — every API is importable as a standalone typed client, no MCP required
- **Disk-backed caching** — responses cached to disk, survives restarts
- **Rate limiting + retry** — token-bucket rate limiter with exponential backoff

## MCP Server

### Quick Start

```bash
npx us-gov-open-data-mcp
```

That's it — the server starts on stdio and works with any MCP client.

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
        "FRED_API_KEY": "your_key_here"
      }
    }
  }
}
```

### HTTP Stream

For web apps or remote access:

```bash
node dist/server.js --transport httpStream --port 8080
```

Endpoint: `http://localhost:8080/mcp`

### Selective Module Loading

Load only the modules you need — reduces startup time and context window usage:

```bash
# CLI flag
node dist/server.js --modules fred,treasury,congress

# Environment variable
MODULES=fred,bls,treasury node dist/server.js

# Combine with HTTP
node dist/server.js --modules fred,treasury --transport httpStream --port 8080
```

With all 41 modules, the server sends ~14K tokens of instructions to the LLM. With 3 modules, this drops to ~3K. Use selective loading when you only need a few data sources and want to minimize context overhead.

To see all available module names without starting the server:

```bash
npx us-gov-open-data-mcp --list-modules
# or shorter:
npx us-gov-open-data-mcp --list
```

Modules are grouped by domain, with tool count and env var name for modules that require an API key:

```
Economy
  bea    Bureau of Economic Analysis           13 tools  [BEA_API_KEY]  https://apps.bea.gov/API/signup/
  bls    Bureau of Labor Statistics             4 tools  [BLS_API_KEY]  https://www.bls.gov/developers/home.htm
  fred   Federal Reserve Economic Data          4 tools  [FRED_API_KEY]  https://fredaccount.stlouisfed.org/apikeys
  ...

Health
  cdc    CDC Health Data                       13 tools
  cms    Centers for Medicare & Medicaid        4 tools
  ...

41 modules total.
```

For scripting or tooling, add `--json` to get structured output:

```bash
npx us-gov-open-data-mcp --list-modules --json
```

```json
[
  {
    "name": "bea",
    "displayName": "Bureau of Economic Analysis",
    "toolCount": 13,
    "requiresApiKey": true,
    "envVars": ["BEA_API_KEY"],
    "signupUrl": "https://apps.bea.gov/API/signup/",
    "domains": ["economy", "international"]
  },
  ...
]
```

See full descriptions in the [Data Sources](/guide/data-sources) page.

---

## TypeScript SDK

Use the APIs directly in your code — no MCP server required.

### Install

```bash
npm install us-gov-open-data-mcp
```

### Usage

```typescript
// Import individual modules
import { getObservations } from "us-gov-open-data-mcp/sdk/fred";
import { searchBills } from "us-gov-open-data-mcp/sdk/congress";
import { getLeadingCausesOfDeath } from "us-gov-open-data-mcp/sdk/cdc";

// Or import everything
import * as sdk from "us-gov-open-data-mcp/sdk";
const gdp = await sdk.fred.getObservations("GDP", { sort: "desc", limit: 5 });
```

All functions include disk-backed caching, retry with exponential backoff, and rate limiting — no extra setup.

See the [SDK Usage Examples](/guide/sdk-usage) for more, or browse the [API Reference](/api/) for every function and type.

---

## Next Steps

- **[API Keys](/guide/api-keys)** — Which APIs need keys and where to get them
- **[Data Sources](/guide/data-sources)** — All 40+ APIs at a glance
- **[Examples](/guide/sdk-usage)** — Code examples, MCP prompts, and analysis showcases
