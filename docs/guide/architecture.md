# Architecture

## Overview

```
src/
  server.ts                 # Entry point — auto-discovers API modules
  server/
    instructions.ts         # Cross-referencing guide for MCP clients
    prompts.ts              # Cross-cutting analysis prompts
  shared/
    client.ts               # createClient() — HTTP, cache, retry, rate-limit
    response.ts             # Standardized response helpers
    enum-utils.ts           # Zod enum helpers
  apis/
    index.ts                # SDK barrel re-export
    fred/                   # One folder per API
      sdk.ts                # Typed API client (standalone, no MCP dep)
      meta.ts               # Name, description, auth, workflow, tips
      tools.ts              # MCP tool definitions
      prompts.ts            # MCP prompts (optional)
      index.ts              # Barrel re-export
    treasury/
      ...
```

## Layers

### 1. `shared/client.ts` — HTTP Client Factory

`createClient(config)` returns an `ApiClient` with `.get()`, `.post()`, `.clearCache()`.

Built-in:
- **Disk-backed TTL cache** — survives MCP server restarts (`~/.cache/us-gov-open-data-mcp/`)
- **Retry with exponential backoff** — 429, 502, 503, 504
- **Token-bucket rate limiting** — per-client
- **Timeout** (30s default)
- **Auth injection** — query param, header, or POST body
- **Custom error detection** — for APIs that return 200 OK with errors

### 2. `apis/{name}/sdk.ts` — Typed API Clients

One file per API. Each:
- Creates a client via `createClient({...})`
- Exports typed async functions (`getObservations`, `searchSeries`, etc.)
- Exports TypeScript interfaces for response types
- Exports `clearCache()`
- Has **zero MCP/Zod dependencies** — importable in any project

### 3. `apis/{name}/meta.ts` — Module Metadata

Exports identity and configuration:
- `name`, `displayName`, `description` — identity
- `auth?` — `{ envVar, signup }` if key required
- `workflow?`, `tips?` — client guidance  
- `reference?` — auto-generated into MCP resources

### 4. `apis/{name}/tools.ts` — MCP Tool Definitions

Exports a `tools` array of FastMCP `Tool` objects. Each tool:
- Has a Zod parameter schema
- Delegates to SDK functions
- Returns `JSON.stringify({ summary, ...data })` — no markdown

### 5. `apis/{name}/prompts.ts` — MCP Prompts (Optional)

17 of 40+ APIs export prompts — guided multi-step analysis workflows.

### 6. `server.ts` — Auto-Discovery

Scans `apis/` at startup, dynamically imports each folder's `index.ts`, then:
1. **Registers tools** via `server.addTools()`
2. **Registers prompts** via `server.addPrompts()`
3. **Auto-generates instructions** from module metadata
4. **Auto-generates resources** from module reference data
5. **Adds `clear_cache` tool** that calls each module's `clearCache()`
6. **Validates API keys on startup** — logs which are configured

### 7. `server/instructions.ts` — Cross-referencing Guide

Compact routing table teaching the client how to combine APIs:
- Question-type routing (debt → Treasury + FRED + Congress)
- Investigative workflows (follow the money)
- Enrichment rules (always show context, trends, cite sources)

## Data Flow

```
User question → Client → MCP tool call → tools.ts → sdk.ts → createClient → API
                                                                    ↓
                                                              disk cache
                                                              rate limiter
                                                              retry logic
                                                                    ↓
                                                              JSON response
                                                                    ↓
                                                         JSON.stringify() back to client
```

## Key Design Decisions

1. **Co-located API folders** — each API is one self-contained folder with sdk, meta, tools, prompts
2. **Auto-discovery** — adding an API = create a folder, no wiring in server.ts
3. **SDK ≠ MCP** — typed API clients have zero MCP/Zod dependency, usable in any project
4. **Config over inheritance** — `createClient({...})` replaces class hierarchies
5. **JSON over markdown** — tools return data, client decides presentation
6. **Disk cache** — MCP servers restart constantly (VS Code reloads); in-memory cache is useless
7. **Compact instructions** — routing table format saves ~80% tokens vs verbose instructions
