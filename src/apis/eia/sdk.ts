/**
 * EIA SDK — typed API client for the U.S. Energy Information Administration API v2.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { queryEia } from "us-gov-open-data-mcp/sdk/eia";
 *
 * Requires EIA_API_KEY env var — register at https://www.eia.gov/opendata/register.php
 */

import { createClient, qp } from "../../shared/client.js";
import { stateAs } from "../../shared/geo.js";

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

// ─── Route browser and generic query (the whole v2 route tree) ───────

/** "/electricity/retail-sales/data/" → "electricity/retail-sales". */
export function normalizeRoute(route: string): string {
  return route.trim().replace(/^\/+|\/+$/g, "").replace(/\/data$/, "");
}

/** What a route offers: child routes, or (at a leaf) its facets, data columns and frequencies. */
export interface EiaRouteInfo {
  route: string;
  name: string | null;
  description: string | null;
  routes?: { id: string; name: string | null; description: string | null }[];
  frequencies?: { id: string; description: string | null }[];
  facets?: { id: string; description: string | null }[];
  data?: { id: string; units: string | null }[];
  startPeriod?: string | null;
  endPeriod?: string | null;
  defaultFrequency?: string | null;
}

/** Metadata for a route in the EIA v2 tree (the root when empty). */
export async function getRouteInfo(route = ""): Promise<EiaRouteInfo> {
  const r = normalizeRoute(route);
  const res = await api.get<{ response?: Record<string, any> }>(r ? `/${r}/` : "/");
  const m = res.response ?? {};
  const info: EiaRouteInfo = { route: r, name: m.name ?? null, description: m.description ?? null };
  if (Array.isArray(m.routes)) {
    info.routes = m.routes.map((c: Record<string, string>) => ({ id: r ? `${r}/${c.id}` : c.id, name: c.name ?? null, description: c.description ?? null }));
  }
  if (Array.isArray(m.frequency)) info.frequencies = m.frequency.map((f: Record<string, string>) => ({ id: f.id, description: f.description ?? null }));
  if (Array.isArray(m.facets)) info.facets = m.facets.map((f: Record<string, string>) => ({ id: f.id, description: f.description ?? null }));
  if (m.data && typeof m.data === "object") {
    info.data = Object.entries(m.data as Record<string, { units?: string }>).map(([id, d]) => ({ id, units: d?.units ?? null }));
  }
  if (m.startPeriod !== undefined) {
    info.startPeriod = m.startPeriod ?? null;
    info.endPeriod = m.endPeriod ?? null;
    info.defaultFrequency = m.defaultFrequency ?? null;
  }
  return info;
}

/** Values a facet can take on a route (e.g. stateid → CA, TX, …). */
export async function getFacetValues(route: string, facet: string): Promise<{ id: string; name: string | null }[]> {
  const res = await api.get<{ response?: { facets?: { id: string; name?: string }[] } }>(`/${normalizeRoute(route)}/facet/${encodeURIComponent(facet)}/`);
  return (res.response?.facets ?? []).map(f => ({ id: f.id, name: f.name ?? null }));
}

/**
 * Data from any EIA v2 leaf route, newest first unless sorted otherwise.
 * Facet filters map to `facets[<id>][]` and data columns to `data[]`.
 */
export async function queryRoute(route: string, opts: {
  data?: string[];
  facets?: Record<string, string[]>;
  frequency?: string;
  start?: string;
  end?: string;
  length?: number;
  offset?: number;
  sortAscending?: boolean;
} = {}): Promise<EiaResponse> {
  const params: Record<string, string | number | string[] | undefined> = {
    "data[]": opts.data?.length ? opts.data : ["value"],
    frequency: opts.frequency,
    start: opts.start,
    end: opts.end,
    "sort[0][column]": "period",
    "sort[0][direction]": opts.sortAscending ? "asc" : "desc",
    length: opts.length ?? 100,
    offset: opts.offset,
  };
  for (const [facet, values] of Object.entries(opts.facets ?? {})) params[`facets[${facet}][]`] = values;
  return api.get<EiaResponse>(`/${normalizeRoute(route)}/data/`, params);
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

  const params = qp({
    frequency: opts.frequency || "monthly",
    "data[0]": "value",
    start: opts.start || `${new Date().getFullYear() - 2}-01`,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    end: opts.end,
    length: opts.length,
    offset: opts.offset,
  });

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
  const params = qp({
    frequency: opts.frequency || "monthly",
    "data[0]": opts.dataType || "price",
    start: opts.start || `${new Date().getFullYear() - 2}-01`,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    end: opts.end,
    length: opts.length,
    offset: opts.offset,
    "facets[stateid][]": opts.state ? stateAs(opts.state, "usps").toUpperCase() : undefined,
    "facets[sectorid][]": opts.sector?.toUpperCase(),
  });

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
  const params = qp({
    frequency: opts.frequency || "monthly",
    "data[0]": "value",
    start: opts.start || `${new Date().getFullYear() - 2}-01`,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    end: opts.end,
    length: opts.length,
    offset: opts.offset,
    "facets[process][]": opts.process?.toUpperCase(),
  });

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
  const params = qp({
    frequency: "annual",
    "data[0]": "value",
    start: opts.start || String(new Date().getFullYear() - 5),
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    end: opts.end,
    length: opts.length,
    offset: opts.offset,
    "facets[stateId][]": opts.state ? stateAs(opts.state, "usps").toUpperCase() : undefined,
    "facets[seriesId][]": (opts.msn || "TETCB").toUpperCase(),
  });

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
  const params = qp({
    frequency: opts.frequency || "monthly",
    "data[0]": "value",
    start: opts.start || `${new Date().getFullYear() - 2}-01`,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    end: opts.end,
    length: opts.length,
    offset: opts.offset,
    "facets[msn][]": opts.msn?.toUpperCase(),
  });

  return queryEia("/total-energy/data", params);
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
