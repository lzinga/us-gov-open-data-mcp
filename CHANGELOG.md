# Changelog

Release notes for each version are on the [GitHub releases page](https://github.com/lzinga/us-gov-open-data-mcp/releases).
This file lists what upgrading requires.

## Unreleased

### Breaking changes

- **Node.js 22 or later is required.** Node 18 and 20 are no longer supported (Node 20 reached end of life in April 2026).
- **HTTP transport off loopback needs a token.** Serving `--transport httpStream` on a non-loopback address
  (including the Docker image, which binds `0.0.0.0`) now requires `MCP_AUTH_TOKEN`; clients send
  `Authorization: Bearer <token>`. `MCP_ALLOW_INSECURE_HTTP=1` restores the old behavior. stdio and the default
  `127.0.0.1` binding are unchanged.
- **Treasury tools are prefixed.** `list_datasets`, `search_datasets`, `get_endpoint_fields` and
  `query_fiscal_data` are now `treasury_list_datasets`, `treasury_search_datasets`, `treasury_get_endpoint_fields`
  and `treasury_query_fiscal_data`. The old names still work for one release, marked deprecated.
- **Importing the package root no longer starts the server.** `import "us-gov-open-data-mcp"` now returns the SDK
  (the same as `us-gov-open-data-mcp/sdk`). Run the server with `npx us-gov-open-data-mcp` or import
  `us-gov-open-data-mcp/server`.
- **Unknown module names are an error.** A typo in `--modules` / `MODULES` used to be ignored silently; the server now
  exits with the list of valid names.
- **`cdc_drug_overdose` returns current data by default.** It returns CDC's provisional overdose death counts by
  drug; pass `source: "historical"` for the old dataset of final death rates (1999–2016).
- **`usa_spending_by_award` without `award_type` searches contracts.** Before, that call always failed with HTTP 422.

### Changed behavior

- Tool results larger than 150,000 bytes are trimmed to fit, and stay valid JSON with a `truncatedToFit` note.
  Set `MAX_RESPONSE_BYTES` to change the limit, or `0` to turn it off. `code_mode` still sees the full result.
- Every result lists the upstream requests behind it in `meta.sources` (URLs without API keys).
- The instructions no longer list every tool name; clients get tool names from `tools/list`.
- The disk cache stores one file per response, is capped at 250 MB, and never contains API keys. Cache files from
  earlier versions are deleted on first use.
- `SEC_CONTACT_EMAIL` and `NWS_USER_AGENT` values copied unchanged from `.env.example` are ignored instead of being
  sent to SEC and NWS.
- Congress bill summaries are plain text instead of the CRS summary HTML, and HTML is converted to text the same
  strict way everywhere (markup revealed by decoding entities is removed too).
- The Docker image runs as a non-root user and has a health check.
- `fema_query` reads each OpenFEMA dataset at its current version. NFIP claims and policies and HMGP summaries now come
  from OpenFEMA v3 (the v2 datasets are retired on 2026-10-15).

### New

- Tools: `census_place_profile`, `eia_browse`, `eia_query`, `fema_nfip_claims`, `fred_release_calendar`,
  `sec_insider_filings`, `usa_award_detail`.
- Discovery mode (`--tool-mode discovery`): four tools instead of 350, with `find_tools` and `call_tool`.
- Module selection by domain (`--domains economy,health`) and `--hide-unconfigured`.
- Each module's reference tables as MCP resources: `govdata://{module}/reference`.
- States can be given as names, USPS codes or FIPS codes in the CDC, Census, EIA, EPA AQS, FEMA and HUD tools.
- `fred_series_data` takes `units` (e.g. `pc1`, percent change from a year ago) and `frequency` with
  `aggregation_method`; `bls_series_data` builds LAUS and OEWS series IDs from states, counties and occupations;
  `sec_*` tools accept tickers and company names; `lobbying_search` has lda.gov's filing filters.
- `noaa_climate_data` works without `NOAA_API_KEY` for station queries.
- Releases are listed in the [MCP Registry](https://registry.modelcontextprotocol.io) as
  `io.github.lzinga/us-gov-open-data-mcp`.
