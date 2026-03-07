/**
 * EIA SDK — typed API client for the U.S. Energy Information Administration API v2.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { queryEia } from "us-gov-open-data-mcp/sdk/eia";
 *
 * Requires EIA_API_KEY env var — register at https://www.eia.gov/opendata/register.php
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.eia.gov/v2",
  name: "eia",
  auth: {
    type: "query",
    envParams: { api_key: "EIA_API_KEY" },
  },
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour — EIA data updates infrequently
  checkError: (data) => (data as any)?.error ?? null,
});

// ─── Types ───────────────────────────────────────────────────────────

/** Eia Response. */
export interface EiaResponse {
  response: {
    total: number;
    data: EiaObservation[];
    description?: string;
    dateFormat?: string;
    frequency?: string;
  };
  request?: Record<string, unknown>;
}

/** Eia Observation. */
export interface EiaObservation {
  period: string;
  value: number | string | null;
  units?: string;
  unit?: string;
  "series-description"?: string;
  seriesDescription?: string;
  series?: string;
  stateDescription?: string;
  stateid?: string;
  stateId?: string;
  sectorName?: string;
  sectorid?: string;
  msn?: string;
  process?: string;
  [key: string]: unknown;
}

/** Eia Route. */
export interface EiaRoute {
  path: string;
  description: string;
  frequency: string[];
  facets?: string[];
}

// ─── Reference data ──────────────────────────────────────────────────

/** EIA State Energy Data System (SEDS) MSN codes for state energy profiles. */
export const sedsMsnCodes = {
  TETCB: "Total energy consumption (trillion BTU)",
  TETCD: "Total energy consumption per capita",
  TEPRB: "Total energy production (trillion BTU)",
  ESTCB: "Electricity total consumption",
  CLTCB: "Coal consumption",
  NNTCB: "Natural gas consumption",
  PATCB: "Petroleum consumption (all products)",
  RETCB: "Renewable energy consumption",
  NUETB: "Nuclear energy consumption",
  ELISB: "Electricity interstate flow",
  TETXB: "Total energy expenditures",
} as const;

/** Routes. */
export const routes: EiaRoute[] = [
  { path: "/petroleum/pri/spt/data", description: "Petroleum spot prices (WTI, Brent)", frequency: ["daily", "weekly", "monthly", "annual"], facets: ["series"] },
  { path: "/petroleum/pri/gnd/data", description: "Retail gasoline and diesel prices", frequency: ["weekly", "monthly", "annual"], facets: ["series", "product", "duoarea"] },
  { path: "/petroleum/crd/crpdn/data", description: "Crude oil production", frequency: ["monthly", "annual"], facets: ["duoarea", "product"] },
  { path: "/petroleum/sum/snd/data", description: "Petroleum supply and disposition", frequency: ["weekly", "monthly", "annual"] },
  { path: "/petroleum/stoc/wstk/data", description: "Weekly petroleum stocks", frequency: ["weekly"], facets: ["product", "duoarea"] },
  { path: "/petroleum/move/imp/data", description: "Petroleum imports", frequency: ["monthly", "annual"], facets: ["product", "originCountry"] },
  { path: "/electricity/retail-sales/data", description: "Electricity retail sales, revenue, prices, customers", frequency: ["monthly", "annual"], facets: ["stateid", "sectorid"] },
  { path: "/electricity/electric-power-operational-data/data", description: "Power plant operational data", frequency: ["monthly", "annual"], facets: ["stateid", "sectorid", "fueltypeid"] },
  { path: "/electricity/state-electricity-profiles/emissions-by-state-by-fuel/data", description: "CO2 emissions by state and fuel", frequency: ["annual"], facets: ["stateid"] },
  { path: "/natural-gas/pri/sum/data", description: "Natural gas prices summary", frequency: ["monthly", "annual"], facets: ["process", "duoarea"] },
  { path: "/natural-gas/sum/snd/data", description: "Natural gas supply and disposition", frequency: ["monthly", "annual"] },
  { path: "/natural-gas/prod/sum/data", description: "Natural gas production", frequency: ["monthly", "annual"] },
  { path: "/coal/production/data", description: "Coal production", frequency: ["quarterly", "annual"] },
  { path: "/coal/consumption-and-quality/data", description: "Coal consumption", frequency: ["quarterly", "annual"] },
  { path: "/seds/data", description: "State energy profiles (SEDS)", frequency: ["annual"], facets: ["stateId", "msn"] },
  { path: "/total-energy/data", description: "Monthly Energy Review — total US energy overview", frequency: ["monthly", "annual"], facets: ["msn"] },
  { path: "/aeo/data", description: "Annual Energy Outlook projections", frequency: ["annual"] },
  { path: "/international/data", description: "International energy data", frequency: ["monthly", "annual"] },
  { path: "/nuclear/status-operable-units/data", description: "Nuclear power plant status", frequency: ["monthly"] },
];

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Query the EIA API v2.
 * Uses bracket-style params: data[0], facets[series][], sort[0][column], etc.
 * String arrays produce repeated keys automatically via createClient.
 */
export async function queryEia(
  route: string,
  params: Record<string, string | number | string[] | undefined> = {},
): Promise<EiaResponse> {
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  return api.get<EiaResponse>(`${normalizedRoute}`, params);
}

/** Get petroleum data (spot prices, gasoline, diesel). */
export async function getPetroleum(opts: {
  product?: string;
  frequency?: string;
  start?: string;
  end?: string;
  length?: number;
  offset?: number;
} = {}): Promise<EiaResponse> {
  const productMap: Record<string, string> = {
    crude: "/petroleum/pri/spt/data",
    gasoline: "/petroleum/pri/gnd/data",
    diesel: "/petroleum/pri/gnd/data",
    all: "/petroleum/pri/spt/data",
  };

  const prod = (opts.product || "crude").toLowerCase();
  const route = productMap[prod] || "/petroleum/pri/spt/data";

  const params: Record<string, string | number | string[] | undefined> = {
    frequency: opts.frequency || "monthly",
    "data[0]": "value",
    start: opts.start || `${new Date().getFullYear() - 2}-01`,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
  };

  if (opts.end) params.end = opts.end;
  if (opts.length) params.length = opts.length;
  if (opts.offset) params.offset = opts.offset;

  // Set correct facet based on product selection and route
  if (prod === "crude") params["facets[product][]"] = "EPCWTI";
  else if (prod === "gasoline") params["facets[series][]"] = "EMM_EPMRU_PTE_NUS_DPG";
  else if (prod === "diesel") params["facets[series][]"] = "EMD_EPD2D_PTE_NUS_DPG";

  return queryEia(route, params);
}

/** Get electricity data (retail sales, prices, etc.). */
export async function getElectricity(opts: {
  state?: string;
  sector?: string;
  dataType?: string;
  frequency?: string;
  start?: string;
  end?: string;
  length?: number;
  offset?: number;
} = {}): Promise<EiaResponse> {
  const params: Record<string, string | number | string[] | undefined> = {
    frequency: opts.frequency || "monthly",
    "data[0]": opts.dataType || "price",
    start: opts.start || `${new Date().getFullYear() - 2}-01`,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
  };

  if (opts.end) params.end = opts.end;
  if (opts.length) params.length = opts.length;
  if (opts.offset) params.offset = opts.offset;
  if (opts.state) params["facets[stateid][]"] = opts.state.toUpperCase();
  if (opts.sector) params["facets[sectorid][]"] = opts.sector.toUpperCase();

  return queryEia("/electricity/retail-sales/data", params);
}

/** Get natural gas prices. */
export async function getNaturalGas(opts: {
  process?: string;
  frequency?: string;
  start?: string;
  end?: string;
  length?: number;
  offset?: number;
} = {}): Promise<EiaResponse> {
  const params: Record<string, string | number | string[] | undefined> = {
    frequency: opts.frequency || "monthly",
    "data[0]": "value",
    start: opts.start || `${new Date().getFullYear() - 2}-01`,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
  };

  if (opts.end) params.end = opts.end;
  if (opts.length) params.length = opts.length;
  if (opts.offset) params.offset = opts.offset;
  if (opts.process) params["facets[process][]"] = opts.process.toUpperCase();

  return queryEia("/natural-gas/pri/sum/data", params);
}

/** Get state energy profile data (SEDS). */
export async function getStateEnergy(opts: {
  state?: string;
  msn?: string;
  start?: string;
  end?: string;
  length?: number;
  offset?: number;
} = {}): Promise<EiaResponse> {
  const params: Record<string, string | number | string[] | undefined> = {
    frequency: "annual",
    "data[0]": "value",
    start: opts.start || String(new Date().getFullYear() - 5),
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
  };

  if (opts.end) params.end = opts.end;
  if (opts.length) params.length = opts.length;
  if (opts.offset) params.offset = opts.offset;
  if (opts.state) params["facets[stateId][]"] = opts.state.toUpperCase();
  params["facets[seriesId][]"] = (opts.msn || "TETCB").toUpperCase();

  return queryEia("/seds/data", params);
}

/** Get total energy overview. */
export async function getTotalEnergy(opts: {
  msn?: string;
  frequency?: string;
  start?: string;
  end?: string;
  length?: number;
  offset?: number;
} = {}): Promise<EiaResponse> {
  const params: Record<string, string | number | string[] | undefined> = {
    frequency: opts.frequency || "monthly",
    "data[0]": "value",
    start: opts.start || `${new Date().getFullYear() - 2}-01`,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
  };

  if (opts.end) params.end = opts.end;
  if (opts.length) params.length = opts.length;
  if (opts.offset) params.offset = opts.offset;
  if (opts.msn) params["facets[msn][]"] = opts.msn.toUpperCase();

  return queryEia("/total-energy/data", params);
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
