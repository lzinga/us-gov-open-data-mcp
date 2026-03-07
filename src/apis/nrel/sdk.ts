/**
 * NREL SDK — typed API client for the National Renewable Energy Laboratory APIs.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchAltFuelStations, getSolarResource, getUtilityRates } from "us-gov-open-data-mcp/sdk/nrel";
 *
 *   const stations = await searchAltFuelStations({ state: "CA", fuel_type: "ELEC", limit: 10 });
 *   console.log(stations.total_results, stations.fuel_stations);
 *
 *   const solar = await getSolarResource(40.7128, -74.006);
 *   console.log(solar.outputs.avg_ghi);
 *
 *   const rates = await getUtilityRates(40.7128, -74.006);
 *   console.log(rates.outputs.residential, rates.outputs.utility_name);
 *
 * Requires DATA_GOV_API_KEY env var. Get one at https://api.data.gov/signup/
 * Docs: https://developer.nrel.gov/docs/
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://developer.nrel.gov/api",
  name: "nrel",
  auth: { type: "query", envParams: { api_key: "DATA_GOV_API_KEY" } },
  rateLimit: { perSecond: 5, burst: 15 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

// ─── Types ───────────────────────────────────────────────────────────

/** Fuel Station. */
export interface FuelStation {
  id: number;
  station_name: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  fuel_type_code: string;
  status_code: string;
  access_code: string;
  latitude: number;
  longitude: number;
  ev_level1_evse_num: number | null;
  ev_level2_evse_num: number | null;
  ev_dc_fast_num: number | null;
  ev_connector_types: string[] | null;
  ev_network: string | null;
  ev_network_web: string | null;
  station_phone: string | null;
  distance?: number;
  distance_km?: number;
  [key: string]: unknown;
}

/** Alt Fuel Stations Result. */
export interface AltFuelStationsResult {
  total_results: number;
  station_locator_url: string;
  fuel_stations: FuelStation[];
}

/** Utility Rates Outputs. */
export interface UtilityRatesOutputs {
  residential: number;
  commercial: number;
  industrial: number;
  utility_name: string;
  utility_info: { utility_name: string; company_id: number; state_abbr: string }[];
  [key: string]: unknown;
}

/** Utility Rates Result. */
export interface UtilityRatesResult {
  inputs: { lat: string; lon: string };
  errors: string[];
  warnings: string[];
  version: string;
  metadata: Record<string, unknown>;
  outputs: UtilityRatesOutputs;
}

/** Solar Resource Monthly. */
export interface SolarResourceMonthly {
  jan: number; feb: number; mar: number; apr: number;
  may: number; jun: number; jul: number; aug: number;
  sep: number; oct: number; nov: number; dec: number;
  annual: number;
}

/** Solar Resource Outputs. */
export interface SolarResourceOutputs {
  avg_ghi: SolarResourceMonthly;
  avg_dni: SolarResourceMonthly;
  avg_lat_tilt: SolarResourceMonthly;
  [key: string]: unknown;
}

/** Solar Resource Result. */
export interface SolarResourceResult {
  inputs: { lat: string; lon: string };
  errors: string[];
  warnings: string[];
  version: string;
  metadata: Record<string, unknown>;
  outputs: SolarResourceOutputs;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Alternative fuel type codes used in the AFDC Stations API. */
export const FUEL_TYPES = {
  ELEC: "Electric",
  E85: "Ethanol (E85)",
  CNG: "Compressed Natural Gas",
  LPG: "Propane (LPG)",
  BD: "Biodiesel (B20 and above)",
  HY: "Hydrogen",
  LNG: "Liquefied Natural Gas",
  RD: "Renewable Diesel",
} as const;

/** Station status codes. */
export const STATUS_CODES = {
  E: "Open (available)",
  P: "Planned (not yet open)",
  T: "Temporarily unavailable",
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search alternative fuel stations (EV chargers, CNG, biodiesel, hydrogen, etc.).
 *
 * Example:
 *   const result = await searchAltFuelStations({ state: "CA", fuel_type: "ELEC", limit: 20 });
 */
export async function searchAltFuelStations(opts: {
  state?: string;
  zip?: string;
  fuel_type?: string;
  limit?: number;
  radius?: number;
  status?: string;
  city?: string;
  ev_network?: string;
  latitude?: number;
  longitude?: number;
} = {}): Promise<AltFuelStationsResult> {
  return api.get<AltFuelStationsResult>("/alt-fuel-stations/v1.json", {
    state: opts.state,
    zip: opts.zip,
    fuel_type: opts.fuel_type,
    limit: opts.limit,
    radius: opts.radius,
    status: opts.status,
    city: opts.city,
    ev_network: opts.ev_network,
    latitude: opts.latitude,
    longitude: opts.longitude,
  });
}

/**
 * Get electricity utility rates by latitude/longitude.
 *
 * Example:
 *   const rates = await getUtilityRates(40.7128, -74.006);
 *   console.log(`Residential: $${rates.outputs.residential}/kWh`);
 */
export async function getUtilityRates(lat: number, lon: number): Promise<UtilityRatesResult> {
  return api.get<UtilityRatesResult>("/utility_rates/v3.json", { lat, lon });
}

/**
 * Get solar resource data (irradiance) by latitude/longitude.
 * Returns GHI, DNI, and tilt-at-latitude monthly/annual averages.
 *
 * Example:
 *   const solar = await getSolarResource(34.0522, -118.2437);
 *   console.log(`Annual GHI: ${solar.outputs.avg_ghi.annual} kWh/m²/day`);
 */
export async function getSolarResource(lat: number, lon: number): Promise<SolarResourceResult> {
  return api.get<SolarResourceResult>("/solar/solar_resource/v1.json", { lat, lon });
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
