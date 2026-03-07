---
layout: default
title: "Adding New Modules"
---

# Adding New Modules

This guide shows how to add a new government data API to the server.

## Overview

Each API module consists of 2 files + 2 lines of wiring:

1. **`src/sdk/{name}.ts`** — Typed API client (no MCP dependency)
2. **`src/modules/{name}.ts`** — MCP tools + metadata
3. **2 lines in `src/server.ts`** — import + add to MODULES array

## Step 1: Create the SDK (`src/sdk/{name}.ts`)

```typescript
import { createClient } from "../client.js";

const api = createClient({
  baseUrl: "https://api.example.gov/v1",
  name: "example",                                    // used for cache filename
  auth: { type: "query", envParams: { api_key: "EXAMPLE_API_KEY" } },  // or type: "header", "body"
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000,                        // 1 hour
  checkError: (data) => {                             // optional: detect 200 OK with error body
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

// Public API — typed async functions
export async function getData(id: string, year?: number): Promise<ExampleRecord[]> {
  return api.get<ExampleRecord[]>("/data", { id, year });
}

export function clearCache(): void { api.clearCache(); }
```

### Auth options

| Pattern | Config | Used by |
|---------|--------|---------|
| Query param | `{ type: "query", envParams: { api_key: "KEY" } }` | FRED, BEA, EIA, Census, FEC, Congress |
| Header | `{ type: "header", envParams: { token: "KEY" } }` | NOAA |
| Header with prefix | `{ type: "header", envParams: { Authorization: "KEY" }, prefix: "Bearer " }` | HUD |
| POST body | `{ type: "body", envParams: { registrationkey: "KEY" } }` | BLS |
| Multi-credential | `{ type: "query", envParams: { key: "KEY", email: "EMAIL" } }` | AQS (EPA) |
| None | omit `auth` entirely | Treasury, USAspending, Federal Register, World Bank, CDC, FEMA, NHTSA, CMS |

### Param types

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

### Multiple base URLs (e.g. SEC)

Create multiple clients in one SDK file:

```typescript
const dataApi = createClient({ baseUrl: "https://data.example.gov", name: "example", ... });
const searchApi = createClient({ baseUrl: "https://search.example.gov", name: "example-search", ... });

export function clearCache() { dataApi.clearCache(); searchApi.clearCache(); }
```

## Step 2: Create the Module (`src/modules/{name}.ts`)

```typescript
import { z } from "zod";
import type { Tool } from "fastmcp";
import { getData } from "../sdk/example.js";

// Metadata — server.ts reads these
export const name = "example";
export const displayName = "Example Agency";
export const description = "What this API provides";
export const auth = { envVar: "EXAMPLE_API_KEY", signup: "https://example.gov/signup" };
export const workflow = "example_search → example_data to get values";
export const tips = "Helpful tips for the MCP client";

// Reference data — auto-generated into resources
export const reference = {
  popularItems: { ITEM1: "Description", ITEM2: "Description" },
  docs: { "API Docs": "https://example.gov/api", "Get Key": "https://example.gov/signup" },
};

// Tools — return JSON.stringify with summary field
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
      if (!data.length) return `No data for "${id}".`;
      return JSON.stringify({
        summary: `${data.length} records for ${id}`,
        records: data,
      });
    },
  },
];

// Prompts (optional) — use FastMCP's InputPrompt type
// export const prompts: InputPrompt<any, any>[] = [{ name: "...", load: async () => "..." }];

// Re-export cache control
export { clearCache } from "../sdk/example.js";
```

### Key patterns

- **Tools return `JSON.stringify()`** with a `summary` field — no markdown
- **Errors propagate naturally** — `createClient` throws, FastMCP catches and returns `isError: true`
- **Auth is handled by `createClient`** — no per-tool auth checks
- **No auth field** = no auth needed (omit `export const auth` entirely)

## Step 3: Wire in `src/server.ts`

Add 2 lines:

```typescript
import * as example from "./modules/example.js";   // add import

const MODULES: Module[] = [
  // ... existing modules
  example,                                          // add to array
];
```

That's it. The server auto-generates:
- **Instructions** from `displayName`, `description`, `workflow`, `tips`, `auth`
- **Resources** from `reference` data
- **clear_cache** support from the re-exported `clearCache()`

## Step 4: Build and test

```bash
npx tsc          # compile
# restart MCP server in VS Code: Ctrl+Shift+P → MCP: Restart Server
```
