/**
 * HUD SDK — typed API client for Fair Market Rents & Income Limits.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getFairMarketRents, getIncomeLimits } from "us-gov-open-data-mcp/sdk/hud";
 *
 * Requires HUD_USER_TOKEN from https://www.huduser.gov/hudapi/public/register
 * Docs: https://www.huduser.gov/portal/dataset/fmr-api.html
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://www.huduser.gov/hudapi/public",
  name: "hud",
  auth: {
    type: "header",
    envParams: { Authorization: "HUD_USER_TOKEN" },
    prefix: "Bearer ",
  },
  rateLimit: { perSecond: 2, burst: 5 },
  cacheTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days — FMR/IL data updates annually
});

// ─── Types ───────────────────────────────────────────────────────────

/** Hud State. */
export interface HudState {
  state_code: string;
  state_name: string;
  state_num?: string;
}

/** Hud County. */
export interface HudCounty {
  county_name: string;
  fips_code: string;
  town_name?: string;
  state_code?: string;
}

/** Hud Metro Area. */
export interface HudMetroArea {
  cbsa_code: string;
  area_name: string;
}

/** Fair Market Rent. */
export interface FairMarketRent {
  county_name?: string;
  metro_name?: string;
  area_name?: string;
  state_name?: string;
  year?: number | string;
  Efficiency?: number;
  "One-Bedroom"?: number;
  "Two-Bedroom"?: number;
  "Three-Bedroom"?: number;
  "Four-Bedroom"?: number;
  efficiency?: number;
  one_bedroom?: number;
  two_bedroom?: number;
  three_bedroom?: number;
  four_bedroom?: number;
  basicdata?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Income Limit. */
export interface IncomeLimit {
  county_name?: string;
  metro_name?: string;
  area_name?: string;
  state_name?: string;
  year?: number | string;
  median_income?: number;
  very_low?: Record<string, number>;
  extremely_low?: Record<string, number>;
  low?: Record<string, number>;
  [key: string]: unknown;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * List all U.S. states with their codes.
 */
export async function listStates(): Promise<HudState[]> {
  const res = (await api.get("/fmr/listStates")) as HudState[] | unknown;
  return Array.isArray(res) ? res : [];
}

/**
 * List counties in a state.
 */
export async function listCounties(stateId: string): Promise<HudCounty[]> {
  const res = (await api.get(`/fmr/listCounties/${encodeURIComponent(stateId.toUpperCase())}`)) as HudCounty[] | unknown;
  return Array.isArray(res) ? res : [];
}

/**
 * List metropolitan/CBSA areas.
 */
export async function listMetroAreas(): Promise<HudMetroArea[]> {
  const res = (await api.get("/fmr/listMetroAreas")) as HudMetroArea[] | unknown;
  return Array.isArray(res) ? res : [];
}

/**
 * Get Fair Market Rents for a specific entity (county, metro area, or CBSA code).
 */
export async function getFairMarketRents(entityId: string, year?: number): Promise<FairMarketRent> {
  const params: Record<string, string> = {};
  if (year) params.year = String(year);
  const res = (await api.get(`/fmr/data/${encodeURIComponent(entityId)}`, params)) as FairMarketRent | unknown;
  return (typeof res === "object" && res !== null ? res : {}) as FairMarketRent;
}

/**
 * Get Fair Market Rents for an entire state.
 */
export async function getStateFairMarketRents(stateCode: string, year?: number): Promise<FairMarketRent> {
  const params: Record<string, string> = {};
  if (year) params.year = String(year);
  const res = (await api.get(`/fmr/statedata/${encodeURIComponent(stateCode.toUpperCase())}`, params)) as FairMarketRent | unknown;
  return (typeof res === "object" && res !== null ? res : {}) as FairMarketRent;
}

/**
 * Get Income Limits for a specific entity (county, metro area, or CBSA code).
 */
export async function getIncomeLimits(entityId: string, year?: number): Promise<IncomeLimit> {
  const params: Record<string, string> = {};
  if (year) params.year = String(year);
  const res = (await api.get(`/il/data/${encodeURIComponent(entityId)}`, params)) as IncomeLimit | unknown;
  return (typeof res === "object" && res !== null ? res : {}) as IncomeLimit;
}

/**
 * Get Income Limits for an entire state.
 */
export async function getStateIncomeLimits(stateCode: string, year?: number): Promise<IncomeLimit> {
  const params: Record<string, string> = {};
  if (year) params.year = String(year);
  const res = (await api.get(`/il/statedata/${encodeURIComponent(stateCode.toUpperCase())}`, params)) as IncomeLimit | unknown;
  return (typeof res === "object" && res !== null ? res : {}) as IncomeLimit;
}

/** Clear the HUD SDK cache. */
export function clearCache(): void {
  api.clearCache();
}
