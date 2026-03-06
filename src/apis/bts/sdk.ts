/**
 * BTS SDK — typed API client for Bureau of Transportation Statistics data.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getTransportStats, getBorderCrossings } from "us-gov-open-data-mcp/sdk/bts";
 *
 *   const stats = await getTransportStats({ limit: 12 });
 *   const border = await getBorderCrossings({ state: "Texas", measure: "Trucks" });
 *
 * No API key required (uses Socrata SODA API at data.bts.gov).
 * Docs: https://data.bts.gov/
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://data.bts.gov/resource",
  name: "bts",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

// ─── Types ───────────────────────────────────────────────────────────

/** Transport Stats Record. */
export interface TransportStatsRecord {
  index?: string;
  date?: string;
  // Airline
  u_s_airline_traffic_total_non_seasonally_adjusted?: string;
  u_s_airline_traffic_domestic_non_seasonally_adjusted?: string;
  u_s_airline_traffic_international_non_seasonally_adjusted?: string;
  u_s_marketing_air_carriers_on_time_performance_percent?: string;
  u_s_air_carrier_cargo_millions_of_revenue_ton_miles_domestic?: string;
  u_s_air_carrier_cargo_millions_of_revenue_ton_miles_international?: string;
  // Transit & Highway
  system_use_transit_ridership?: string;
  system_use_highway_vehicle?: string;
  // Rail
  system_use_freight_rail?: string;
  passenger_rail_passengers?: string;
  passenger_rail_passenger_miles?: string;
  amtrak_on_time_performance?: string;
  // Safety
  safety_general_aviation?: string;
  air_safety_air_carrier_fatalities?: string;
  rail_fatalities?: string;
  // TSI
  transportation_services_index_freight?: string;
  transportation_services_index_passenger?: string;
  transportation_services_index_combined?: string;
  // Border
  u_s_canada_incoming_person_crossings?: string;
  u_s_canada_incoming_truck_crossings?: string;
  u_s_mexico_incoming_person_crossings?: string;
  u_s_mexico_incoming_truck_crossings?: string;
  // Vehicle sales
  auto_sales?: string;
  auto_sales_saar_millions?: string;
  light_truck_sales?: string;
  heavy_truck_sales?: string;
  // Fuel & Freight
  highway_fuel_prices_regular?: string;
  truck_tonnage_index?: string;
  u_s_waterway_tonnage?: string;
  // Economy
  general_economic_indicators?: string;
  transportation_economic?: string;
  [key: string]: unknown;
}

/** Border Crossing Record. */
export interface BorderCrossingRecord {
  port_name?: string;
  state?: string;
  port_code?: string;
  border?: string;
  date?: string;
  measure?: string;
  value?: string;
  latitude?: string;
  longitude?: string;
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Key fields in the Monthly Transportation Statistics dataset. */
export const TRANSPORT_FIELDS = {
  u_s_airline_traffic_total_non_seasonally_adjusted: "U.S. airline passenger traffic (total, not SA)",
  u_s_marketing_air_carriers_on_time_performance_percent: "Airline on-time performance (%)",
  system_use_transit_ridership: "Transit ridership",
  transportation_services_index_freight: "Transportation Services Index — Freight",
  transportation_services_index_passenger: "Transportation Services Index — Passenger",
  transportation_services_index_combined: "Transportation Services Index — Combined",
  truck_tonnage_index: "Truck Tonnage Index",
  amtrak_on_time_performance: "Amtrak on-time performance",
  highway_fuel_prices_regular: "Regular gasoline price ($/gallon)",
  auto_sales_saar_millions: "Auto sales (SAAR, millions)",
  rail_fatalities: "Rail fatalities",
  air_safety_air_carrier_fatalities: "Air carrier fatalities",
} as const;

/** Border crossing measures. */
export const BORDER_MEASURES = {
  Trucks: "Commercial trucks",
  "Personal Vehicles": "Personal vehicles (cars)",
  Pedestrians: "Foot traffic",
  "Train Passengers": "Rail passengers",
  "Rail Containers Loaded": "Rail freight containers (loaded)",
  "Rail Containers Empty": "Rail freight containers (empty)",
  Buses: "Bus crossings",
} as const;

/** Socrata dataset IDs. */
export const DATASETS = {
  monthly_stats: {
    id: "crem-w557",
    description: "Monthly Transportation Statistics: 50+ indicators on airlines, transit, rail, safety, fuel, vehicle sales",
  },
  border_crossings: {
    id: "keg4-3bc2",
    description: "Border crossing data: vehicles, passengers, containers at U.S. ports of entry (monthly)",
  },
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Get Monthly Transportation Statistics (50+ time series in one dataset).
 * Covers airline traffic, on-time %, transit ridership, rail freight, truck tonnage,
 * fuel prices, vehicle sales, safety fatalities, Transportation Services Index,
 * and border crossing summaries.
 *
 * Example:
 *   const data = await getTransportStats({ limit: 24 }); // latest 2 years (monthly)
 *   const data = await getTransportStats({ startDate: "2020-01-01", endDate: "2023-12-31" });
 */
export async function getTransportStats(opts?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  order?: string;
  where?: string;
}): Promise<TransportStatsRecord[]> {
  const params: Record<string, string | number | undefined> = {
    $limit: opts?.limit ?? 24,
    $offset: opts?.offset,
    $order: opts?.order ?? "date DESC",
  };

  const wheres: string[] = [];
  if (opts?.startDate) wheres.push(`date >= '${opts.startDate}'`);
  if (opts?.endDate) wheres.push(`date <= '${opts.endDate}'`);
  // Filter out empty placeholder rows
  wheres.push("general_economic_indicators IS NOT NULL");
  if (opts?.where) wheres.push(opts.where);
  if (wheres.length) params.$where = wheres.join(" AND ");

  return api.get<TransportStatsRecord[]>(`/${DATASETS.monthly_stats.id}.json`, params);
}

/**
 * Get border crossing data (vehicles, passengers, containers at U.S. ports of entry).
 *
 * Example:
 *   const data = await getBorderCrossings({ state: "Texas", measure: "Trucks" });
 *   const data = await getBorderCrossings({ border: "US-Mexico Border" });
 */
export async function getBorderCrossings(opts?: {
  state?: string;
  border?: string;
  portName?: string;
  measure?: string;
  limit?: number;
  offset?: number;
  order?: string;
  where?: string;
}): Promise<BorderCrossingRecord[]> {
  const params: Record<string, string | number | undefined> = {
    $limit: opts?.limit ?? 20,
    $offset: opts?.offset,
    $order: opts?.order ?? "date DESC",
  };

  const wheres: string[] = [];
  if (opts?.state) wheres.push(`state='${opts.state}'`);
  if (opts?.border) wheres.push(`border='${opts.border}'`);
  if (opts?.portName) wheres.push(`port_name='${opts.portName}'`);
  if (opts?.measure) wheres.push(`measure='${opts.measure}'`);
  if (opts?.where) wheres.push(opts.where);
  if (wheres.length) params.$where = wheres.join(" AND ");

  return api.get<BorderCrossingRecord[]>(`/${DATASETS.border_crossings.id}.json`, params);
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
