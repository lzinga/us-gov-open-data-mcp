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

Requires Node.js 22 or later.

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

Endpoint: `http://localhost:8080/mcp`. By default the server only listens on `127.0.0.1`.

To accept connections from other machines, set a token (at least 16 characters). Clients then send
`Authorization: Bearer <token>`:

```bash
export MCP_AUTH_TOKEN=$(openssl rand -hex 32)
MCP_HOST=0.0.0.0 node dist/server.js --transport httpStream --port 8080
```

Without `MCP_AUTH_TOKEN`, the server refuses to listen on a non-loopback address, since anyone who can reach
the port could use it and your API keys. If a reverse proxy in front of the server already authenticates
requests, set `MCP_ALLOW_INSECURE_HTTP=1` instead. `/health` stays open for health checks.

The server speaks plain HTTP. For HTTPS, put it behind a reverse proxy (Caddy, nginx, a cloud load balancer)
that terminates TLS and forwards to the server.

### Docker

```bash
docker build -t us-gov-open-data-mcp .
TOKEN=$(openssl rand -hex 32) && echo "$TOKEN"
docker run -d -p 8080:8080 -e MCP_AUTH_TOKEN="$TOKEN" -e FRED_API_KEY=your_key us-gov-open-data-mcp
```

The image serves HTTP Stream on `0.0.0.0:8080`, so it needs `MCP_AUTH_TOKEN`. It runs as the unprivileged
`node` user and has a `HEALTHCHECK` on `/health`.

### Selective Module Loading

Load only the modules you need — reduces startup time and context window usage:

```bash
# CLI flag
node dist/server.js --modules fred,treasury,congress

# Environment variable
MODULES=fred,bls,treasury node dist/server.js

# Every module in one or more domains (unioned with --modules)
node dist/server.js --domains economy,health
DOMAINS=economy node dist/server.js

# Skip modules whose required API key isn't set (optional-key modules stay)
node dist/server.js --hide-unconfigured
HIDE_UNCONFIGURED=1 node dist/server.js

# Combine with HTTP
node dist/server.js --modules fred,treasury --transport httpStream --port 8080
```

Unknown module or domain names stop the server with the list of valid names, so a typo can't silently load a
different set of tools. Prompts only mention tools that are loaded.

### Discovery Mode

With every module loaded, the tool list a client reads at startup is about 350 tools and 87K tokens of
schemas. Discovery mode lists four tools instead (about 1K tokens):

```bash
node dist/server.js --tool-mode discovery
# or
TOOL_MODE=discovery npx us-gov-open-data-mcp
```

- `find_tools` searches the data tools by keyword and returns their names, descriptions and input schemas.
- `call_tool({ name, arguments })` runs one, with the same validation and defaults as a direct call.
- `code_mode` and `clear_cache` work as usual.

It suits clients that struggle with long tool lists; with a few modules loaded, the default full mode is simpler.

### Response Size

Tool results over 150 KB are shortened before they reach the client, so one call can't flood the model's context:
the largest arrays (table rows, list items) are cut to what fits, then long strings are clipped. The result stays
valid JSON and carries a `truncatedToFit` note saying what was cut. `code_mode` still processes the full result.
Set `MAX_RESPONSE_BYTES` to change the limit, or `0` to turn it off.

### Sources

Every tool result lists the upstream requests behind it in `meta.sources`: the URL (API keys are never included),
when the data was fetched, and `cached: true` when it came from the local cache. Composite tools list up to 10.

With all 42 modules, the server sends about 16K tokens of instructions to the LLM. With 3 modules, this drops to about 2K. Use selective loading when you only need a few data sources and want to minimize context overhead.

To see all available module names without starting the server:

```bash
npx us-gov-open-data-mcp --list-modules
# or shorter:
npx us-gov-open-data-mcp --list
```

Modules are grouped by domain, with tool count and env var name for modules that require an API key:

```
Economy
  bea                Bureau of Economic Analysis                   13 tools  [BEA_API_KEY]  https://apps.bea.gov/API/signup/
  bls                Bureau of Labor Statistics                    4 tools   [BLS_API_KEY (optional)]  https://www.bls.gov/developers/home.htm
  fred               FRED (Federal Reserve Economic Data)          5 tools   [FRED_API_KEY]  https://fredaccount.stlouisfed.org/apikeys
  ...

Health
  cdc                CDC Health Data                               13 tools
  cms                CMS                                           4 tools
  ...

42 modules total.
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
