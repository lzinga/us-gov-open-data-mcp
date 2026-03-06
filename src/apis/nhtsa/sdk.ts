/**
 * NHTSA SDK — typed API client for vehicle recalls, complaints, and VIN decoding.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getRecalls, getComplaints, decodeVin } from "us-gov-open-data-mcp/sdk/nhtsa";
 *
 * No API key required.
 * Docs: https://www.nhtsa.gov/nhtsa-datasets-and-apis
 */

import { createClient } from "../../shared/client.js";

// ─── Clients ─────────────────────────────────────────────────────────

const recallsApi = createClient({
  baseUrl: "https://api.nhtsa.gov",
  name: "nhtsa",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

const vpicApi = createClient({
  baseUrl: "https://vpic.nhtsa.dot.gov/api",
  name: "nhtsa-vpic",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours — vehicle data is static
});

// ─── Types ───────────────────────────────────────────────────────────

/** Recall. */
export interface Recall {
  Manufacturer?: string;
  NHTSACampaignNumber?: string;
  parkIt?: boolean;
  parkOutSide?: boolean;
  ReportReceivedDate?: string;
  Component?: string;
  Summary?: string;
  Consequence?: string;
  Remedy?: string;
  Notes?: string;
  ModelYear?: string;
  Make?: string;
  Model?: string;
  NHTSAActionNumber?: string;
  [key: string]: unknown;
}

/** Recall Response. */
export interface RecallResponse {
  Count?: number;
  Message?: string;
  results?: Recall[];
}

/** Complaint. */
export interface Complaint {
  odiNumber?: number;
  manufacturer?: string;
  crash?: boolean;
  fire?: boolean;
  numberOfInjuries?: number;
  numberOfDeaths?: number;
  dateOfIncident?: string;
  dateComplaintFiled?: string;
  vin?: string;
  components?: string;
  summary?: string;
  products?: Array<{
    type?: string;
    productYear?: string;
    productMake?: string;
    productModel?: string;
    manufacturer?: string;
  }>;
  [key: string]: unknown;
}

/** Complaint Response. */
export interface ComplaintResponse {
  count?: number;
  message?: string;
  results?: Complaint[];
}

/** Vin Result. */
export interface VinResult {
  Make?: string;
  Model?: string;
  ModelYear?: string;
  Manufacturer?: string;
  VehicleType?: string;
  BodyClass?: string;
  DriveType?: string;
  FuelTypePrimary?: string;
  EngineModel?: string;
  EngineCylinders?: string;
  DisplacementL?: string;
  TransmissionStyle?: string;
  PlantCity?: string;
  PlantCountry?: string;
  ErrorCode?: string;
  ErrorText?: string;
  [key: string]: unknown;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search for vehicle recalls by make, model, and/or model year.
 */
export async function getRecalls(opts: {
  make: string;
  model: string;
  modelYear: number;
}): Promise<Recall[]> {
  const res = (await recallsApi.get("/recalls/recallsByVehicle", {
    make: opts.make,
    model: opts.model,
    modelYear: String(opts.modelYear),
  })) as RecallResponse;
  return res?.results ?? [];
}

/**
 * Search for vehicle complaints by make, model, and/or model year.
 */
export async function getComplaints(opts: {
  make: string;
  model: string;
  modelYear: number;
}): Promise<Complaint[]> {
  const res = (await recallsApi.get("/complaints/complaintsByVehicle", {
    make: opts.make,
    model: opts.model,
    modelYear: String(opts.modelYear),
  })) as ComplaintResponse;
  return res?.results ?? [];
}

/**
 * Decode a VIN (Vehicle Identification Number) to get vehicle specifications.
 */
export async function decodeVin(vin: string): Promise<VinResult> {
  const res = (await vpicApi.get(`/vehicles/DecodeVinValues/${encodeURIComponent(vin)}`, {
    format: "json",
  })) as { Results?: VinResult[] };
  const results = res?.Results ?? [];
  return results[0] ?? {};
}

/**
 * Get all vehicle makes from the vPIC database.
 */
export async function getAllMakes(): Promise<Array<{ Make_ID: number; Make_Name: string }>> {
  const res = (await vpicApi.get("/vehicles/GetAllMakes", { format: "json" })) as {
    Results?: Array<{ Make_ID: number; Make_Name: string }>;
  };
  return res?.Results ?? [];
}

/**
 * Get models for a specific make and optional year.
 */
export async function getModelsForMake(opts: {
  make: string;
  modelYear?: number;
}): Promise<Array<{ Make_ID: number; Make_Name: string; Model_ID: number; Model_Name: string }>> {
  const path = opts.modelYear
    ? `/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(opts.make)}/modelyear/${opts.modelYear}`
    : `/vehicles/GetModelsForMake/${encodeURIComponent(opts.make)}`;
  const res = (await vpicApi.get(path, { format: "json" })) as {
    Results?: Array<{ Make_ID: number; Make_Name: string; Model_ID: number; Model_Name: string }>;
  };
  return res?.Results ?? [];
}

// ─── Safety Ratings ──────────────────────────────────────────────────

/** Safety Rating Vehicle. */
export interface SafetyRatingVehicle {
  VehicleId?: number;
  VehicleDescription?: string;
  ModelYear?: number;
  Make?: string;
  Model?: string;
  [key: string]: unknown;
}

/** Safety Rating. */
export interface SafetyRating {
  VehicleId?: number;
  VehicleDescription?: string;
  OverallRating?: string;
  OverallFrontCrashRating?: string;
  FrontCrashDriversideRating?: string;
  FrontCrashPassengersideRating?: string;
  OverallSideCrashRating?: string;
  SideCrashDriversideRating?: string;
  SideCrashPassengersideRating?: string;
  RolloverRating?: string;
  RolloverPossibility?: number;
  RolloverPossibility2?: number;
  SidePoleCrashRating?: string;
  NHTSAElectronicStabilityControl?: string;
  NHTSAForwardCollisionWarning?: string;
  NHTSALaneDepartureWarning?: string;
  ComplaintsCount?: number;
  RecallsCount?: number;
  InvestigationCount?: number;
  [key: string]: unknown;
}

/**
 * Search for NHTSA 5-star safety ratings by make/model/year.
 * Returns vehicle variants with VehicleId for detail lookup.
 *
 * Example:
 *   const vehicles = await getSafetyRatingVehicles({ make: 'honda', model: 'civic', modelYear: 2023 });
 */
export async function getSafetyRatingVehicles(opts: {
  make: string;
  model: string;
  modelYear: number;
}): Promise<SafetyRatingVehicle[]> {
  const res = (await recallsApi.get(
    `/SafetyRatings/modelyear/${opts.modelYear}/make/${encodeURIComponent(opts.make)}/model/${encodeURIComponent(opts.model)}`,
    { format: "json" },
  )) as { Results?: SafetyRatingVehicle[]; Count?: number };
  return res?.Results ?? [];
}

/**
 * Get detailed safety ratings for a specific vehicle by VehicleId.
 * Returns crash test results, rollover rating, and safety tech.
 *
 * Example:
 *   const rating = await getSafetyRatingDetail(5531);
 */
export async function getSafetyRatingDetail(vehicleId: number): Promise<SafetyRating | null> {
  const res = (await recallsApi.get(
    `/SafetyRatings/VehicleId/${vehicleId}`,
    { format: "json" },
  )) as { Results?: SafetyRating[]; Count?: number };
  return res?.Results?.[0] ?? null;
}

/** Clear both NHTSA caches. */
export function clearCache(): void {
  recallsApi.clearCache();
  vpicApi.clearCache();
}
