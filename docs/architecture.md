---
layout: default
title: "Architecture"
---

# Architecture

## Overview

```
src/
  client.ts              # Shared HTTP client factory
  server.ts              # FastMCP server bootstrap
  instructions.ts        # Cross-referencing guide (static)
  sdk/                   # Typed API clients — usable standalone (30 files)
    fred.ts, treasury.ts, bls.ts, bea.ts, eia.ts, census.ts,
    fec.ts, congress.ts, federal-register.ts, usaspending.ts,
    sec.ts, fbi.ts, govinfo.ts, noaa.ts, usda-nass.ts,
    world-bank.ts, cdc.ts, naep.ts, college-scorecard.ts,
    nrel.ts, fda.ts, epa.ts, senate-lobbying.ts,
    regulations.ts, usda-fooddata.ts, fema.ts, nhtsa.ts,
    cms.ts, hud.ts, uspto.ts
  modules/               # MCP tool definitions — imports from sdk/ (30 files)
    (mirrors sdk/ — one module per API)
```

## Layers

### 1. `client.ts` — HTTP Client Factory

`createClient(config)` returns an `ApiClient` with `.get()`, `.post()`, `.clearCache()`.

Built-in:
- **Disk-backed TTL cache** — one file per response under `~/.cache/us-gov-open-data-mcp/v3/` (or
  `$XDG_CACHE_HOME`), private to the user and never holding API keys. It survives restarts, is safe to share
  between concurrent server processes, and is capped at 250 MB with least-recently-used eviction.
- **Retry with exponential backoff** — 429, 502, 503, 504
- **Token-bucket rate limiting** — per-client
- **Timeout** (30s default)
- **Auth injection** — query param, header, or POST body
- **Custom error detection** — for APIs that return 200 OK with errors

### 2. `sdk/*.ts` — Typed API Clients

One file per API. Each:
- Creates a client via `createClient({...})`
- Exports typed async functions (`getObservations`, `searchSeries`, etc.)
- Exports TypeScript interfaces for response types
- Exports `clearCache()`
- Has **zero MCP/Zod dependencies** — importable in any project

### 3. `modules/*.ts` — MCP Tool Definitions

One file per API. Each exports named values:
- `name`, `displayName`, `description` — metadata
- `auth?` — `{ envVar, signup }` if key required
- `workflow?`, `tips?` — client guidance
- `reference?` — auto-generated into resources
- `tools` — array of FastMCP `Tool` objects
- `prompts?` — array of FastMCP `InputPrompt` objects
- `clearCache` — re-exported from SDK

Tools return `JSON.stringify({ summary: "...", ...data })` — no markdown formatting. The client decides presentation.

### 4. `server.ts` — Auto-wiring

Imports all modules, then:
1. **Registers tools** via `server.addTools()`
2. **Registers prompts** via `server.addPrompts()`
3. **Auto-generates instructions** from module metadata
4. **Auto-generates resources** from module reference data
5. **Adds `clear_cache` tool** that calls each module's `clearCache()`
6. **Validates API keys on startup** — logs which are configured

### 5. `instructions.ts` — Cross-referencing Guide

Static expert knowledge about combining data from multiple APIs. Covers:
- Question-type routing (debt → Treasury + FRED + Congress)
- Enrichment rules (always show context, trends, cite sources)
- Objectivity guidelines (correlation ≠ causation)

## Data Flow

```
User question → Client → MCP tool call → module → SDK function → createClient → API
                                                                    ↓
                                                              disk cache
                                                              rate limiter
                                                              retry logic
                                                                    ↓
                                                              JSON response
                                                                    ↓
                                                         JSON.stringify() back to client
```

## Adding a New API

See [adding-modules.md](adding-modules.md).

## Key Design Decisions

1. **FastMCP over raw MCP SDK** — eliminates auth/error/response boilerplate
2. **SDK ≠ MCP** — typed API clients are standalone, modules are MCP-only wrappers
3. **Config over inheritance** — `createClient({...})` replaces `class extends BaseApiClient`
4. **JSON over markdown** — tools return data, client formats for display
5. **Named exports over interfaces** — modules export `name`, `tools`, etc. directly; `typeof fred` infers the shape
6. **Disk cache** — MCP servers restart constantly (VS Code reloads); in-memory cache is useless
7. **One file per concern** — each module is exactly 2 files (sdk + module), no endpoints.ts/tools.ts/client.ts/prompts.ts split
