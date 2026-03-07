/**
 * EPA SDK — typed API client for EPA Envirofacts (DMAP) and ECHO (Enforcement & Compliance) APIs.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchFacilities, getUVIndex, getToxicReleases } from "us-gov-open-data-mcp/sdk/epa";
 *
 *   const facilities = await searchFacilities({ state: "NY", mediaType: "air", majorOnly: true });
 *   const uv = await getUVIndex({ zip: "10001" });
 *   const tri = await getToxicReleases({ state: "TX" });
 *   const ghg = await getGreenhouseGasEmissions({ state: "CA" });
 *   const water = await getDrinkingWaterSystems({ state: "NY" });
 *
 * No API key required. For air quality data (AQS), see the epa-aqs module.
 * Docs:
 *   Envirofacts (DMAP): https://www.epa.gov/enviro/web-services
 *   ECHO: https://echo.epa.gov/tools/web-services
 */

import { createClient } from "../../shared/client.js";

// ─── Clients ─────────────────────────────────────────────────────────

const envirofacts = createClient({
  baseUrl: "https://data.epa.gov/dmapservice",
  name: "epa-envirofacts",
  rateLimit: { perSecond: 3, burst: 8 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

const echo = createClient({
  baseUrl: "https://echodata.epa.gov/echo",
  name: "epa-echo",
  rateLimit: { perSecond: 3, burst: 8 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

// ─── Types ───────────────────────────────────────────────────────────

/** ECHO Facility record (from air_rest_services or cwa_rest_services). */
export interface EchoFacility {
  AIRName?: string;
  CWPName?: string;
  SourceID?: string;
  RegistryID?: string;
  AIRStreet?: string;
  CWPStreet?: string;
  AIRCity?: string;
  CWPCity?: string;
  AIRState?: string;
  CWPState?: string;
  AIRZip?: string;
  CWPZip?: string;
  AIRCounty?: string;
  CWPCounty?: string;
  FacLat?: string;
  FacLong?: string;
  FacSICCodes?: string;
  AIRNAICS?: string;
  AIRStatus?: string;
  AIRClassification?: string;
  AIRComplStatus?: string;
  AIRHpvStatus?: string;
  AIRQtrsWithViol?: string;
  AIRRecentViolCnt?: string;
  AIRLastViolDate?: string;
  AIREvalCnt?: string;
  AIRLastEvalDate?: string;
  TRIIDs?: string;
  GHGIDs?: string;
  [key: string]: unknown;
}

/** ECHO Search Result (from get_facilities). */
export interface EchoSearchResult {
  Results: {
    Message: string;
    QueryRows?: string;
    QueryID?: string;
    TotalPenalties?: string;
    SVRows?: string;
    CVRows?: string;
    Facilities?: EchoFacility[];
    [key: string]: unknown;
  };
}

/** ECHO Facility Detail (from dfr_rest_services.get_dfr). */
export interface EchoFacilityDetail {
  Results: {
    Message?: string;
    RegistryID?: string;
    Reports?: Record<string, unknown>;
    Permits?: Record<string, unknown>[];
    EnforcementComplianceSummaries?: Record<string, unknown>;
    NAICS?: Record<string, unknown>[];
    SIC?: Record<string, unknown>[];
    [key: string]: unknown;
  };
}

/** UV index forecast data. */
export interface UVForecast {
  ZIP?: string;
  CITY?: string;
  STATE?: string;
  DATE_TIME?: string;
  UV_INDEX?: number;
  UV_ALERT?: number;
  ORDER?: number;
  [key: string]: unknown;
}

/** TRI (Toxics Release Inventory) facility record. */
export interface TRIFacility {
  TRI_FACILITY_ID?: string;
  FACILITY_NAME?: string;
  STREET_ADDRESS?: string;
  CITY_NAME?: string;
  COUNTY_NAME?: string;
  STATE_ABBR?: string;
  ZIP_CODE?: string;
  LATITUDE?: number;
  LONGITUDE?: number;
  CHEMICAL_NAME?: string;
  SRS_CAS_NUMBER?: string;
  INDUSTRY_SECTOR?: string;
  REPORTING_YEAR?: number;
  [key: string]: unknown;
}

/** GHG (Greenhouse Gas) emitter record. */
export interface GHGEmitter {
  FACILITY_NAME?: string;
  FACILITY_ID?: number;
  STATE?: string;
  CITY?: string;
  ZIP?: string;
  LATITUDE?: number;
  LONGITUDE?: number;
  SECTOR?: string;
  SUBSECTOR?: string;
  YEAR?: number;
  CO2E_EMISSION?: number;
  [key: string]: unknown;
}

/** SDWIS (Safe Drinking Water) system record. */
export interface WaterSystem {
  PWSID?: string;
  PWS_NAME?: string;
  STATE_CODE?: string;
  CITY_SERVED?: string;
  COUNTY_SERVED?: string;
  ZIP_CODE_SERVED?: string;
  PWS_TYPE_CODE?: string;
  PRIMARY_SOURCE_CODE?: string;
  POPULATION_SERVED_COUNT?: number;
  [key: string]: unknown;
}

/** ECHO Enforcement Case record. */
export interface EnforcementCase {
  CaseNumber?: string;
  CaseName?: string;
  CaseCategoryDesc?: string;
  CaseStatusDesc?: string;
  PrimaryLaw?: string;
  PrimarySection?: string;
  DateFiled?: string;
  SettlementDate?: string;
  DateClosed?: string;
  FedPenalty?: string;
  StateLocPenaltyAmt?: string;
  SEPCost?: string;
  CostRecovery?: string;
  TotalCompActionAmt?: string;
  CivilCriminalIndicator?: string;
  EnfOutcome?: string;
  Lead?: string;
  PrimaryNAICSCode?: string;
  DOJDocketNmbr?: string;
  CourtDocketNumber?: string;
  [key: string]: unknown;
}

/** ECHO Enforcement Case Search Result. */
export interface EnforcementCaseResult {
  Results: {
    Message: string;
    QueryRows?: string;
    QueryID?: string;
    Cases?: EnforcementCase[];
    [key: string]: unknown;
  };
}

/** Superfund (SEMS/CERCLA) site record from Envirofacts. */
export interface SuperfundSite {
  site_id?: string;
  epa_id?: string;
  name?: string;
  street_addr_txt?: string;
  city_name?: string;
  county_name?: string;
  fk_ref_state_code?: string;
  zip_code?: string;
  fk_ref_region_code?: string;
  npl_status_code?: string;
  npl_status_name?: string;
  non_npl_status_code?: string;
  non_npl_status_name?: string;
  federal_facility_ind?: string;
  primary_latitude_decimal_val?: number;
  primary_longitude_decimal_val?: number;
  congressional_district_code?: string;
  [key: string]: unknown;
}

/** ECHO RCRA Hazardous Waste Facility record. */
export interface RCRAFacility {
  RCRAName?: string;
  SourceID?: string;
  RCRAStreet?: string;
  RCRACity?: string;
  RCRAState?: string;
  RCRAZip?: string;
  RCRACounty?: string;
  RegistryID?: string;
  FacLat?: string;
  FacLong?: string;
  RCRALandTypeCode?: string;
  FacFIPSCode?: string;
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** ECHO media types for facility searches. */
export const MEDIA_TYPES = {
  air: "Clean Air Act (CAA) facilities via ICIS-Air",
  water: "Clean Water Act (CWA) facilities via ICIS-NPDES",
} as const;

/** UV Index scale descriptions. */
export const UV_INDEX_SCALE = {
  "0-2": "Low — minimal danger for average person",
  "3-5": "Moderate — take precautions (hat, sunscreen)",
  "6-7": "High — protection required, reduce sun exposure",
  "8-10": "Very High — extra protection, avoid midday sun",
  "11+": "Extreme — unprotected skin can burn in minutes",
} as const;

/** TRI industry sectors. */
export const TRI_SECTORS = {
  "Chemicals": "Chemical manufacturing and processing",
  "Metal Mining": "Metal ore mining and processing",
  "Electric Utilities": "Power generation and electricity",
  "Petroleum": "Petroleum refining and distribution",
  "Food/Beverages/Tobacco": "Food, beverage, and tobacco products",
  "Paper": "Pulp and paper manufacturing",
  "Primary Metals": "Iron, steel, aluminum smelting",
} as const;

/** Water system types (SDWIS). */
export const WATER_SYSTEM_TYPES = {
  CWS: "Community Water System (serves residents year-round)",
  NTNCWS: "Non-transient Non-community (serves 25+ of same people, e.g. schools)",
  TNCWS: "Transient Non-community (serves transient users, e.g. gas stations)",
} as const;

/** Enforcement case types. */
export const CASE_TYPES = {
  JDC: "Judicial (court) case",
  AFR: "Administrative formal (EPA order)",
} as const;

/** Superfund NPL statuses. */
export const NPL_STATUSES = {
  F: "Final NPL (active cleanup)",
  P: "Proposed NPL",
  D: "Deleted from NPL (cleanup completed)",
  N: "Not on NPL",
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search EPA-regulated facilities via ECHO (Enforcement & Compliance History Online).
 * Uses the new echodata.epa.gov REST services (two-step: get_facilities for QID, then get_qid for rows).
 *
 * Example:
 *   const air = await searchFacilities({ state: "TX", mediaType: "air", majorOnly: true });
 *   const water = await searchFacilities({ state: "CA", mediaType: "water" });
 */
export async function searchFacilities(opts: {
  state: string;
  mediaType?: "air" | "water";
  majorOnly?: boolean;
  activeOnly?: boolean;
  responseset?: number;
  zip?: string;
  penaltyRange?: string;
}): Promise<EchoSearchResult> {
  const prefix = opts.mediaType === "water" ? "cwa" : "air";

  const params: Record<string, string | number | undefined> = {
    output: "JSON",
    p_st: opts.state.toUpperCase(),
    responseset: opts.responseset ?? 20,
  };
  if (opts.majorOnly) params.p_pc = "MAJOR";
  if (opts.activeOnly) params.p_act = "Y";
  if (opts.zip) params.p_zip = opts.zip;
  if (opts.penaltyRange) params.p_penalty = opts.penaltyRange;

  // Step 1: get_facilities returns summary + QID
  const summary = await echo.get<EchoSearchResult>(
    `/${prefix}_rest_services.get_facilities`,
    params,
  );

  const qid = summary?.Results?.QueryID;
  if (!qid) return summary;

  // Step 2: get_qid returns actual facility rows
  const detail = await echo.get<EchoSearchResult>(
    `/${prefix}_rest_services.get_qid`,
    { output: "JSON", qid, responseset: opts.responseset ?? 20 },
  );

  // Merge summary stats into detail response
  if (detail?.Results) {
    detail.Results.TotalPenalties = summary.Results.TotalPenalties;
    detail.Results.SVRows = summary.Results.SVRows;
    detail.Results.CVRows = summary.Results.CVRows;
  }

  return detail;
}

/**
 * Get detailed facility report from ECHO including permits, violations, and enforcement actions.
 *
 * Example:
 *   const detail = await getFacilityDetail("110000350016");
 */
export async function getFacilityDetail(registryId: string): Promise<EchoFacilityDetail> {
  return echo.get<EchoFacilityDetail>("/dfr_rest_services.get_dfr", {
    p_id: registryId,
    output: "JSON",
  });
}

/**
 * Get UV index forecast by ZIP code or city/state from EPA Envirofacts.
 *
 * Example:
 *   const forecast = await getUVIndex({ zip: "90210" });
 *   const forecast = await getUVIndex({ city: "Los Angeles", state: "CA" });
 */
export async function getUVIndex(opts: {
  zip?: string;
  city?: string;
  state?: string;
}): Promise<UVForecast[]> {
  if (opts.city && opts.state) {
    return envirofacts.get<UVForecast[]>(
      `/getEnvirofactsUVDAILY/CITY/${encodeURIComponent(opts.city)}/STATE/${opts.state.toUpperCase()}/JSON`,
    );
  }
  const zip = opts.zip ?? "20001";
  return envirofacts.get<UVForecast[]>(
    `/getEnvirofactsUVDAILY/ZIP/${zip}/JSON`,
  );
}

/**
 * Get Toxics Release Inventory (TRI) facility data by state.
 * Returns facilities reporting chemical releases to EPA under EPCRA Section 313.
 *
 * Example:
 *   const data = await getToxicReleases({ state: "TX" });
 *   const data = await getToxicReleases({ state: "CA", rows: 50 });
 */
export async function getToxicReleases(opts: {
  state: string;
  county?: string;
  rows?: number;
}): Promise<TRIFacility[]> {
  const limit = opts.rows ?? 100;
  let path = `/tri.tri_facility/state_abbr/equals/${opts.state.toUpperCase()}`;
  if (opts.county) {
    path += `/county_name/equals/${encodeURIComponent(opts.county.toUpperCase())}`;
  }
  path += `/1:${limit}/JSON`;
  return envirofacts.get<TRIFacility[]>(path);
}

/**
 * Get Greenhouse Gas (GHG) emissions data by state.
 * Returns large emitters reporting under EPA's Greenhouse Gas Reporting Program (GHGRP).
 *
 * Example:
 *   const data = await getGreenhouseGasEmissions({ state: "TX" });
 *   const data = await getGreenhouseGasEmissions({ state: "CA", rows: 50 });
 */
export async function getGreenhouseGasEmissions(opts: {
  state: string;
  rows?: number;
}): Promise<GHGEmitter[]> {
  const limit = opts.rows ?? 100;
  return envirofacts.get<GHGEmitter[]>(
    `/ghg.ghg_emitter_sector/state/equals/${opts.state.toUpperCase()}/1:${limit}/JSON`,
  );
}

/**
 * Get Safe Drinking Water Information System (SDWIS) data by state.
 * Returns public water systems with population served, source type, and system type.
 *
 * Example:
 *   const data = await getDrinkingWaterSystems({ state: "NY" });
 *   const data = await getDrinkingWaterSystems({ state: "CA", rows: 50 });
 */
export async function getDrinkingWaterSystems(opts: {
  state: string;
  rows?: number;
}): Promise<WaterSystem[]> {
  const limit = opts.rows ?? 100;
  return envirofacts.get<WaterSystem[]>(
    `/sdwis.water_system/state_code/equals/${opts.state.toUpperCase()}/1:${limit}/JSON`,
  );
}

/**
 * Search EPA enforcement cases via ECHO.
 * Returns civil and criminal enforcement actions with penalties, settlements, and outcomes.
 *
 * Example:
 *   const cases = await searchEnforcementCases({ state: "TX" });
 *   const cases = await searchEnforcementCases({ state: "CA", law: "CAA" });
 */
export async function searchEnforcementCases(opts: {
  state: string;
  law?: string;
  responseset?: number;
}): Promise<EnforcementCaseResult> {
  const params: Record<string, string | number | undefined> = {
    output: "JSON",
    p_st: opts.state.toUpperCase(),
    responseset: opts.responseset ?? 20,
  };
  if (opts.law) params.p_law = opts.law;

  const summary = await echo.get<EnforcementCaseResult>(
    "/case_rest_services.get_case_info",
    params,
  );

  const qid = summary?.Results?.QueryID;
  if (!qid) return summary;

  const detail = await echo.get<EnforcementCaseResult>(
    "/case_rest_services.get_qid",
    { output: "JSON", qid, responseset: opts.responseset ?? 20 },
  );

  if (detail?.Results) {
    detail.Results.QueryRows = summary.Results.QueryRows;
  }
  return detail;
}

/**
 * Get Superfund (CERCLA/SEMS) sites by state from EPA Envirofacts.
 * Returns NPL and non-NPL contaminated sites with location and cleanup status.
 *
 * Example:
 *   const sites = await getSuperfundSites({ state: "NJ" });
 *   const sites = await getSuperfundSites({ state: "TX", rows: 50 });
 */
export async function getSuperfundSites(opts: {
  state: string;
  rows?: number;
}): Promise<SuperfundSite[]> {
  const limit = opts.rows ?? 100;
  return envirofacts.get<SuperfundSite[]>(
    `/sems.envirofacts_site/fk_ref_state_code/equals/${opts.state.toUpperCase()}/1:${limit}/JSON`,
  );
}

/**
 * Search RCRA hazardous waste facilities via ECHO.
 * Returns facilities regulated under RCRA Subtitle C (generators, transporters, TSD facilities).
 *
 * Example:
 *   const facs = await searchRCRAFacilities({ state: "TX" });
 */
export async function searchRCRAFacilities(opts: {
  state: string;
  responseset?: number;
}): Promise<EchoSearchResult> {
  const params: Record<string, string | number | undefined> = {
    output: "JSON",
    p_st: opts.state.toUpperCase(),
    responseset: opts.responseset ?? 20,
  };

  const summary = await echo.get<EchoSearchResult>(
    "/rcra_rest_services.get_facilities",
    params,
  );

  const qid = summary?.Results?.QueryID;
  if (!qid) return summary;

  const detail = await echo.get<EchoSearchResult>(
    "/rcra_rest_services.get_qid",
    { output: "JSON", qid, responseset: opts.responseset ?? 20 },
  );

  if (detail?.Results) {
    detail.Results.TotalPenalties = summary.Results.TotalPenalties;
    detail.Results.SVRows = summary.Results.SVRows;
    detail.Results.CVRows = summary.Results.CVRows;
  }
  return detail;
}

/** Clear cached responses from both clients. */
export function clearCache(): void {
  envirofacts.clearCache();
  echo.clearCache();
}
