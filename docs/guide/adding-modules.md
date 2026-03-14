# Adding New Modules

This guide shows how to add a new government data API to the server.

## Overview

Each API is a self-contained folder in `src/apis/`. Create one and the server auto-discovers it — no wiring needed.

```
src/apis/example/
  sdk.ts          # Typed API client (no MCP dependency)
  meta.ts         # Name, description, auth, workflow, tips
  tools.ts        # MCP tool definitions
  prompts.ts      # MCP prompts (optional)
  index.ts        # Barrel re-export
```

## Step 1: Create the SDK

Create `src/apis/{name}/sdk.ts`:

```typescript
import { createClient } from "../../shared/client.js";

const api = createClient({
  baseUrl: "https://api.example.gov/v1",
  name: "example",
  auth: {
    type: "query",
    envParams: { api_key: "EXAMPLE_API_KEY" },
  },
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
  checkError: (data) => {
    const d = data as any;
    return d?.error ? d.error.message : null;
  },
});

// Types
export interface ExampleRecord {
  id: string;
  value: number;
  date: string;
}

// Public API
export async function getData(
  id: string,
  year?: number
): Promise<ExampleRecord[]> {
  return api.get<ExampleRecord[]>("/data", { id, year });
}

export function clearCache(): void {
  api.clearCache();
}
```

### Auth Options

| Pattern | Config | Used by |
|---------|--------|---------|
| Query param | `{ type: "query", envParams: { api_key: "KEY" } }` | FRED, BEA, EIA, Census, FEC, Congress |
| Header | `{ type: "header", envParams: { token: "KEY" } }` | NOAA |
| Header with prefix | `{ type: "header", envParams: { Authorization: "KEY" }, prefix: "Bearer " }` | HUD |
| POST body | `{ type: "body", envParams: { registrationkey: "KEY" } }` | BLS |
| Multi-credential | `{ type: "query", envParams: { key: "KEY", email: "EMAIL" } }` | AQS (EPA) |
| None | omit `auth` entirely | Treasury, USAspending, Federal Register, World Bank, CDC, FEMA, NHTSA, CMS |

### Param Types

`createClient` supports `Record<string, string | number | string[] | undefined>`:

```typescript
// Normal params
api.get("/data", { year: 2024, state: "CA" });

// Bracket params (preserved, not encoded)
api.get("/data", { "page[number]": 1, "page[size]": 100 });

// Array/repeated params
api.get("/data", { "facets[series][]": ["WTI", "BRENT"] });
// → facets[series][]=WTI&facets[series][]=BRENT
```

### Multiple Base URLs

Create multiple clients in one SDK file (e.g. SEC):

```typescript
const dataApi = createClient({
  baseUrl: "https://data.example.gov",
  name: "example",
  /* ... */
});
const searchApi = createClient({
  baseUrl: "https://search.example.gov",
  name: "example-search",
  /* ... */
});

export function clearCache() {
  dataApi.clearCache();
  searchApi.clearCache();
}
```

## Step 2: Create the Metadata

Create `src/apis/{name}/meta.ts`:

```typescript
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "example",
  displayName: "Example Agency",
  category: "Other",
  description: "What this API provides",
  auth: {
    envVar: "EXAMPLE_API_KEY",
    signup: "https://example.gov/signup",
  },
  workflow: "example_search → example_data to get values",
  tips: "Helpful tips for the MCP client",
  domains: ["economy"],
  crossRef: [
    { question: "economy", route: "example_data (key economic indicators)" },
    { question: "state-level", route: "example_data with state param (state-level breakdown)" },
  ],
  reference: {
    popularItems: { ITEM1: "Description", ITEM2: "Description" },
    docs: {
      "API Docs": "https://example.gov/api",
      "Get Key": "https://example.gov/signup",
    },
  },
} satisfies ModuleMeta;
```

### Metadata fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Folder name (e.g. `"fred"`) |
| `displayName` | Yes | Human-readable (e.g. `"FRED (Federal Reserve Economic Data)"`) |
| `category` | Yes | Docs grouping (e.g. `"Economic"`, `"Health"`, `"Legislative"`) |
| `description` | Yes | Brief description for the instructions block |
| `auth` | No | Omit for keyless APIs |
| `workflow` | Yes | Tool call sequence guidance for the LLM |
| `tips` | Yes | Usage tips (parameters, gotchas, rate limits) |
| `domains` | Yes | Which domains this module participates in (from `Domain` type). Used for type checking and docs grouping. |
| `crossRef` | No | Question-type routing hints. Maps research questions to specific tools/params. Auto-generates the routing table. |
| `reference` | No | Lookup tables, docs links — exposed as MCP resources |

### `domains` — which topic areas does your module serve?

Pick from: `"economy"`, `"health"`, `"legislation"`, `"finance"`, `"energy"`, `"environment"`, `"education"`, `"housing"`, `"spending"`, `"safety"`, `"agriculture"`, `"justice"`, `"transportation"`, `"international"`.

Most modules have 1-3 domains. FRED has 4 (`economy`, `finance`, `housing`, `international`) because its data serves many research contexts.

### `crossRef` — how does the routing table know about your module?

Each entry says: "When someone asks about **X**, use **these specific tools/params** from this module."

```typescript
crossRef: [
  { question: "economy", route: "example_data with GDP, UNRATE, CPI" },
  { question: "housing", route: "example_data with MORTGAGE30US, home_prices" },
]
```

The `route` string is consumed by the LLM as natural language guidance. Be specific — include tool names, parameter values, series IDs. The more specific, the fewer wasted tool calls.

The `question` field is type-checked against the `QuestionType` union — a typo fails compilation.

::: info
Omit `auth` entirely for keyless APIs. Omit `reference` if no reference data is needed. `crossRef` is optional but strongly encouraged — without it, your module won't appear in the routing table.
:::

## Step 3: Create the Tools

Create `src/apis/{name}/tools.ts`:

```typescript
import { z } from "zod";
import type { Tool } from "fastmcp";
import { getData } from "./sdk.js";
import { listResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "example_data",
    description: "What this tool does",
    annotations: { title: "Example: Get Data", readOnlyHint: true },
    parameters: z.object({
      id: z.string().describe("Item ID"),
      year: z.number().optional().describe("Year"),
    }),
    execute: async ({ id, year }) => {
      const data = await getData(id, year);
      if (!data.length) return emptyResponse(`No data for "${id}".`);
      return listResponse(
        `${data.length} records for ${id}`,
        { items: data, total: data.length },
      );
    },
  },
];
```

### Key Patterns

::: info
- **Tools return `JSON.stringify()`** with a `summary` field — no markdown
- **Errors propagate naturally** — `createClient` throws, FastMCP catches and returns `isError: true`
- **Auth is handled by `createClient`** — no per-tool auth checks
:::

## Step 4: Create the Barrel

Create `src/apis/{name}/index.ts`:

```typescript
import type { ApiModule } from "../../shared/types.js";
import meta from "./meta.js";
import { tools } from "./tools.js";
import { clearCache } from "./sdk.js";

export default { ...meta, tools, clearCache } satisfies ApiModule;
```

If you have prompts, also create `prompts.ts` and add:

```typescript
import type { ApiModule } from "../../shared/types.js";
import meta from "./meta.js";
import { tools } from "./tools.js";
import { prompts } from "./prompts.js";
import { clearCache } from "./sdk.js";

export default { ...meta, tools, prompts, clearCache } satisfies ApiModule;
```

## Step 5: Build and Test

```bash
npx tsc          # compile
# restart MCP server in VS Code: Ctrl+Shift+P → MCP: Restart Server
```

That's it. The server auto-discovers the new folder — no imports or wiring needed.
