# Architecture

## How the Server Works

When an MCP client connects (VS Code, Claude Desktop, Cursor), the server does three things:

1. **Sends instructions** (~14K tokens) — a text blob the LLM reads to know which tools to combine for which questions
2. **Registers 300+ tools** — each with a name, description, and parameter schema the LLM can call
3. **Registers 36 prompts** — step-by-step analysis templates the user can invoke (e.g. `/follow_the_money`, `/drug_safety`)

The instructions and tools stay in the model's context for the entire session. Every question the user asks has access to them.

## File Structure

```
src/
  server.ts                 # Entry point — auto-discovers API modules
  server/
    instructions.ts         # Builds the instructions string from module metadata
    curated-guides.ts       # Code Mode guide + analysis rules (hand-authored)
    prompts.ts              # 36 cross-cutting analysis prompts (module-aware)
  shared/
    client.ts               # createClient() — HTTP client with cache, retry, rate-limit
    types.ts                # Domain, QuestionType, RouteHint, ModuleMeta, ApiModule
    response.ts             # Standardized JSON response helpers
    enum-utils.ts           # Zod enum helpers for tool parameters
  apis/
    fred/                   # One folder per API (41 total)
      sdk.ts                # Typed API client (no MCP dependency — usable standalone)
      meta.ts               # Identity, auth, domains, crossRef routing hints
      tools.ts              # MCP tool definitions (Zod schemas → SDK calls)
      prompts.ts            # Module-specific prompts (optional, 17 modules have these)
      index.ts              # Barrel: combines meta + tools + prompts + clearCache
    treasury/
      ...
```

## What Each File Does

### `apis/{name}/sdk.ts` — API Client

A standalone typed HTTP client for one government API. Uses `createClient()` which provides disk-backed caching, retry, rate limiting, and auth injection. Has **zero MCP or Zod dependencies** — you can import it in any TypeScript project without running the MCP server.

### `apis/{name}/meta.ts` — Module Metadata

Describes the module to the server. Key fields:

| Field | Purpose |
|-------|---------|
| `name`, `displayName` | Identity (e.g. `"fred"`, `"FRED (Federal Reserve Economic Data)"`) |
| `description` | One-line summary shown in the instructions |
| `workflow` | Tool call sequence guidance (e.g. `"fred_search → fred_series_data"`) |
| `tips` | Usage tips (rate limits, parameter gotchas, popular values) |
| `domains` | Topic areas this module serves (e.g. `["economy", "housing"]`) |
| `crossRef` | **Routing hints** — maps question types to specific tools/parameters |
| `auth?` | API key config — omit for keyless APIs |
| `reference?` | Lookup tables exposed as MCP resources |

### `apis/{name}/tools.ts` — MCP Tools

Exports an array of FastMCP tool definitions. Each tool has a Zod parameter schema, delegates to the SDK, and returns `JSON.stringify({ summary, ...data })`.

### `apis/{name}/prompts.ts` — Module Prompts (Optional)

17 modules export guided analysis prompts. These appear in the client's prompt picker (e.g. VS Code's `/` menu).

### `server.ts` — Auto-Discovery

Scans `apis/` at startup, imports each folder's `index.ts`, and:
1. Registers all tools
2. Registers all prompts (per-module + cross-cutting)
3. Builds the instructions string from module metadata
4. Validates API keys and logs which are missing

No manual wiring — drop a new folder in `apis/` and it's discovered automatically.

## The Instructions String

The instructions string is the most important part of the system. It's the only context the LLM is guaranteed to see, and it determines whether the model calls the right tools for a question.

### What's in it

```
┌─────────────────────────────────────────────────────────┐
│  Per-module blocks (41×)                     ~11K tokens │
│  ├─ == FRED (FEDERAL RESERVE ECONOMIC DATA) ==          │
│  ├─ 800K+ economic time series: GDP, CPI...            │
│  ├─ Tools: fred_search, fred_series_data, ...           │
│  ├─ Workflow: fred_search → fred_series_data            │
│  ├─ Popular: GDP, UNRATE, CPIAUCSL, ...                 │
│  └─ Requires FRED_API_KEY.                              │
│                                                         │
│  Cross-reference routing table (33 lines)    ~2K tokens │
│  ├─ DEBT/DEFICIT → FRED(...) + Treasury(...) + ...      │
│  ├─ DRUG INVESTIGATION → FDA(...) + NIH(...) + ...      │
│  └─ HOUSING → HUD(...) + FRED(...) + Census(...) + ...  │
│                                                         │
│  Code Mode guide                            ~500 tokens │
│  Analysis rules (8 standards)               ~400 tokens │
└─────────────────────────────────────────────────────────┘
                                        Total: ~14K tokens
```

### How the routing table works

Each module's `meta.ts` declares `crossRef` hints — "when someone asks about X, use these specific tools from me":

```typescript
// fred/meta.ts
crossRef: [
  { question: "debt/deficit", route: "fred_series_data with GDP, FYFSGDA188S (deficit as % of GDP)" },
  { question: "housing", route: "fred_series_data with MORTGAGE30US, CSUSHPINSA" },
]

// treasury/meta.ts
crossRef: [
  { question: "debt/deficit", route: "query_fiscal_data with debt_to_penny, avg_interest_rates" },
]
```

At startup, `buildRoutingTable()` collects all hints, groups by question type, and produces:

```
DEBT/DEFICIT → FRED(fred_series_data with GDP, FYFSGDA188S) + Treasury(query_fiscal_data with debt_to_penny) + World Bank(wb_indicator with GC.DOD.TOTL.GD.ZS)
```

The LLM reads this and knows exactly which tools + parameters to call. Adding a new module with `crossRef` hints automatically extends the routing table.

The `question` field is type-checked — a typo like `"defecit"` fails compilation.

### Selective loading

With `MODULES=fred,bls,treasury`, only those 3 modules are loaded. The instructions shrink to ~3K tokens because only their per-module blocks and routing entries are generated.

## Prompts

There are two kinds of prompts:

### Per-module prompts (17 modules)

Defined in `apis/{name}/prompts.ts`. These are specific to one API — e.g. FRED's `recession_check` prompt tells the LLM which FRED series indicate a recession.

### Cross-cutting prompts (36 templates)

Defined in `server/prompts.ts`. These span multiple modules — e.g. `follow_the_money` traces PAC money through FEC → Congress → FRED → SEC → Open Payments.

Cross-cutting prompts are **module-aware**: when modules are selectively loaded (`MODULES=fred,bls`), prompt steps that reference unloaded tools are silently removed. The prompt reads naturally with only the available tools.

## Key Design Decisions

| Decision | Why |
|----------|-----|
| **Co-located API folders** | Each API is self-contained — sdk, meta, tools, prompts in one folder |
| **Auto-discovery** | Adding an API = create a folder. No imports or wiring in server.ts |
| **SDK ≠ MCP** | API clients have zero MCP/Zod dependency — usable in any project |
| **Disk cache** | MCP servers restart constantly (VS Code reloads); in-memory cache is useless |
| **Auto-generated routing table** | Built from `crossRef` metadata. Adding a module updates routing automatically |
| **Instructions over resources** | MCP resources aren't auto-read by most clients. Everything critical goes in the instructions string |
| **JSON over markdown** | Tools return data; the client decides how to present it |
