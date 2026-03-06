/**
 * FEMA OpenFEMA SDK — typed API client for disaster declarations, grants, and assistance data.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getDisasterDeclarations, getHousingAssistance } from "us-gov-open-data-mcp/sdk/fema";
 *
 * No API key required.
 * Docs: https://www.fema.gov/about/openfema/api
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://www.fema.gov/api/open/v2",
  name: "fema",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour — disaster data updates periodically
});

// ─── Types ───────────────────────────────────────────────────────────

/** Disaster Declaration. */
export interface DisasterDeclaration {
  disasterNumber?: number;
  declarationDate?: string;
  disasterName?: string;
  incidentType?: string;
  declarationType?: string;
  state?: string;
  fipsStateCode?: string;
  fipsCountyCode?: string;
  designatedArea?: string;
  ihProgramDeclared?: boolean;
  iaProgramDeclared?: boolean;
  paProgramDeclared?: boolean;
  hmProgramDeclared?: boolean;
  incidentBeginDate?: string;
  incidentEndDate?: string;
  lastRefresh?: string;
  [key: string]: unknown;
}

/** Housing Assistance Record. */
export interface HousingAssistanceRecord {
  disasterNumber?: number;
  state?: string;
  county?: string;
  zipCode?: string;
  validRegistrations?: number;
  totalInspected?: number;
  totalDamage?: number;
  totalApprovedIhpAmount?: number;
  repairReplaceAmount?: number;
  rentalAmount?: number;
  otherNeedsAmount?: number;
  approvedForFemaAssistance?: number;
  [key: string]: unknown;
}

/** Public Assistance Record. */
export interface PublicAssistanceRecord {
  disasterNumber?: number;
  state?: string;
  applicantName?: string;
  county?: string;
  damageCategory?: string;
  projectAmount?: number;
  federalShareObligated?: number;
  obligatedDate?: string;
  projectTitle?: string;
  [key: string]: unknown;
}

/** Nfip Claim. */
export interface NfipClaim {
  state?: string;
  countyCode?: string;
  dateOfLoss?: string;
  amountPaidOnBuildingClaim?: number;
  amountPaidOnContentsClaim?: number;
  totalBuildingInsuranceCoverage?: number;
  floodZone?: string;
  yearOfLoss?: number;
  [key: string]: unknown;
}

/** Fema Region. */
export interface FemaRegion {
  regionNumber?: number;
  regionName?: string;
  regionAddress?: string;
  states?: string;
  [key: string]: unknown;
}

/** Fema List Response. */
export interface FemaListResponse<T> {
  metadata?: {
    count?: number;
    skip?: number;
    top?: number;
    entityName?: string;
  };
  [key: string]: unknown;
}

// ─── Datasets ────────────────────────────────────────────────────────

/** Available datasets with Socrata endpoint IDs. */
export const DATASETS = {
  disaster_declarations: {
    endpoint: "DisasterDeclarationsSummaries",
    name: "Disaster Declarations",
    description: "All federally declared disasters since 1953: major disasters, emergencies, fire management",
  },
  housing_owners: {
    endpoint: "HousingAssistanceOwners",
    name: "Housing Assistance (Owners)",
    description: "Individual Assistance for homeowners: inspections, damage severity, assistance amounts by county/zip",
  },
  housing_renters: {
    endpoint: "HousingAssistanceRenters",
    name: "Housing Assistance (Renters)",
    description: "Individual Assistance for renters: inspections, damage severity, assistance amounts by county/zip",
  },
  public_assistance: {
    endpoint: "PublicAssistanceGrantAwardActivities",
    name: "Public Assistance Awards",
    description: "PA project awards: applicant, county, damage category, federal share obligated",
  },
  public_assistance_details: {
    endpoint: "PublicAssistanceFundedProjectsDetails",
    name: "PA Funded Projects",
    description: "Detailed public assistance funded projects with damage categories and amounts",
  },
  nfip_claims: {
    endpoint: "FimaNfipClaims",
    name: "NFIP Flood Insurance Claims",
    description: "National Flood Insurance Program claims: loss amounts, flood zones, damage details",
  },
  nfip_policies: {
    endpoint: "FimaNfipPolicies",
    name: "NFIP Flood Insurance Policies",
    description: "National Flood Insurance Program policy transactions: coverage, premiums, locations",
  },
  hazard_mitigation: {
    endpoint: "HazardMitigationGrantProgramDisasterSummaries",
    name: "Hazard Mitigation Grants",
    description: "HMGP disaster-level financial summaries: obligations, project counts",
  },
  mission_assignments: {
    endpoint: "MissionAssignments",
    name: "Mission Assignments",
    description: "Work orders from FEMA to other federal agencies for disaster response (FY2013+)",
  },
  fema_regions: {
    endpoint: "FemaRegions",
    name: "FEMA Regions",
    description: "FEMA region boundaries, headquarters, and associated states",
  },
  registrations: {
    endpoint: "RegistrationIntakeIndividualsHouseholdPrograms",
    name: "IHP Registrations",
    description: "Registration and IHP data by city: call center, web, mobile registrations, eligible amounts",
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────

function extractArray<T>(res: unknown, endpoint: string): T[] {
  if (typeof res === "object" && res !== null) {
    const obj = res as Record<string, unknown>;
    // OpenFEMA returns data in a key matching the endpoint name
    if (Array.isArray(obj[endpoint])) return obj[endpoint] as T[];
    // Fallback search
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && key !== "metadata") return obj[key] as T[];
    }
  }
  if (Array.isArray(res)) return res as T[];
  return [];
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search for disaster declarations. Supports OData-style filtering.
 */
export async function getDisasterDeclarations(opts?: {
  state?: string;
  year?: number;
  incidentType?: string;
  declarationType?: string;
  top?: number;
  skip?: number;
  orderBy?: string;
}): Promise<DisasterDeclaration[]> {
  const params: Record<string, string> = {
    $format: "json",
    $top: String(opts?.top ?? 50),
    $orderby: opts?.orderBy ?? "declarationDate desc",
  };
  if (opts?.skip) params.$skip = String(opts.skip);

  const filters: string[] = [];
  if (opts?.state) filters.push(`state eq '${opts.state.toUpperCase()}'`);
  if (opts?.year) {
    filters.push(`declarationDate ge '${opts.year}-01-01T00:00:00.000z'`);
    filters.push(`declarationDate le '${opts.year}-12-31T23:59:59.999z'`);
  }
  if (opts?.incidentType) filters.push(`incidentType eq '${opts.incidentType}'`);
  if (opts?.declarationType) filters.push(`declarationType eq '${opts.declarationType}'`);
  if (filters.length) params.$filter = filters.join(" and ");

  const res = await api.get("/DisasterDeclarationsSummaries", params);
  return extractArray<DisasterDeclaration>(res, "DisasterDeclarationsSummaries");
}

/**
 * Get housing assistance data for homeowners by disaster/state/county.
 */
export async function getHousingAssistance(opts?: {
  disasterNumber?: number;
  state?: string;
  county?: string;
  top?: number;
  skip?: number;
}): Promise<HousingAssistanceRecord[]> {
  const params: Record<string, string> = {
    $format: "json",
    $top: String(opts?.top ?? 50),
    $orderby: "totalApprovedIhpAmount desc",
  };
  if (opts?.skip) params.$skip = String(opts.skip);

  const filters: string[] = [];
  if (opts?.disasterNumber) filters.push(`disasterNumber eq '${opts.disasterNumber}'`);
  if (opts?.state) filters.push(`state eq '${opts.state.toUpperCase()}'`);
  if (opts?.county) filters.push(`county eq '${opts.county}'`);
  if (filters.length) params.$filter = filters.join(" and ");

  const res = await api.get("/HousingAssistanceOwners", params);
  return extractArray<HousingAssistanceRecord>(res, "HousingAssistanceOwners");
}

/**
 * Get Public Assistance grant award activities.
 */
export async function getPublicAssistance(opts?: {
  disasterNumber?: number;
  state?: string;
  top?: number;
  skip?: number;
}): Promise<PublicAssistanceRecord[]> {
  const params: Record<string, string> = {
    $format: "json",
    $top: String(opts?.top ?? 50),
    $orderby: "obligatedDate desc",
  };
  if (opts?.skip) params.$skip = String(opts.skip);

  const filters: string[] = [];
  if (opts?.disasterNumber) filters.push(`disasterNumber eq '${opts.disasterNumber}'`);
  if (opts?.state) filters.push(`state eq '${opts.state.toUpperCase()}'`);
  if (filters.length) params.$filter = filters.join(" and ");

  const res = await api.get("/PublicAssistanceGrantAwardActivities", params);
  return extractArray<PublicAssistanceRecord>(res, "PublicAssistanceGrantAwardActivities");
}

/**
 * Get FEMA regions.
 */
export async function getFemaRegions(): Promise<FemaRegion[]> {
  const res = await api.get("/FemaRegions", { $format: "json" });
  return extractArray<FemaRegion>(res, "FemaRegions");
}

/**
 * General-purpose query against any OpenFEMA v2 dataset.
 */
export async function queryDataset(opts: {
  dataset: string;
  filter?: string;
  select?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
}): Promise<unknown[]> {
  const endpoint = (DATASETS as Record<string, { endpoint: string }>)[opts.dataset]?.endpoint ?? opts.dataset;
  const params: Record<string, string> = {
    $format: "json",
    $top: String(opts.top ?? 50),
  };
  if (opts.filter) params.$filter = opts.filter;
  if (opts.select) params.$select = opts.select;
  if (opts.orderBy) params.$orderby = opts.orderBy;
  if (opts.skip) params.$skip = String(opts.skip);

  const res = await api.get(`/${endpoint}`, params);
  return extractArray<unknown>(res, endpoint);
}

/** Clear the FEMA SDK cache. */
export function clearCache(): void {
  api.clearCache();
}
