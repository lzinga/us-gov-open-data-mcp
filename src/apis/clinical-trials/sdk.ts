/**
 * ClinicalTrials.gov SDK — typed API client for clinical trial search and detail.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchTrials, getTrialDetail } from "us-gov-open-data-mcp/sdk/clinical-trials";
 *
 *   const trials = await searchTrials({ query: "lung cancer", status: "RECRUITING" });
 *   const detail = await getTrialDetail("NCT06000000");
 *
 * No API key required.
 * Docs: https://clinicaltrials.gov/data-api/api
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://clinicaltrials.gov/api/v2",
  name: "clinical-trials",
  rateLimit: { perSecond: 3, burst: 8 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour — trial data doesn't change fast
});

// ─── Types ───────────────────────────────────────────────────────────

/** Trial Protocol. */
export interface TrialProtocol {
  identificationModule?: {
    nctId?: string;
    orgStudyIdInfo?: { id?: string };
    organization?: { fullName?: string; class?: string };
    briefTitle?: string;
    officialTitle?: string;
    acronym?: string;
  };
  statusModule?: {
    statusVerifiedDate?: string;
    overallStatus?: string;
    expandedAccessInfo?: { hasExpandedAccess?: boolean };
    startDateStruct?: { date?: string; type?: string };
    primaryCompletionDateStruct?: { date?: string; type?: string };
    completionDateStruct?: { date?: string; type?: string };
    studyFirstSubmitDate?: string;
    studyFirstPostDateStruct?: { date?: string };
    lastUpdateSubmitDate?: string;
    lastUpdatePostDateStruct?: { date?: string };
  };
  sponsorCollaboratorsModule?: {
    responsibleParty?: { type?: string; investigatorFullName?: string; investigatorAffiliation?: string };
    leadSponsor?: { name?: string; class?: string };
    collaborators?: Array<{ name?: string; class?: string }>;
  };
  descriptionModule?: {
    briefSummary?: string;
    detailedDescription?: string;
  };
  conditionsModule?: {
    conditions?: string[];
    keywords?: string[];
  };
  designModule?: {
    studyType?: string;
    phases?: string[];
    designInfo?: {
      allocation?: string;
      interventionModel?: string;
      primaryPurpose?: string;
      maskingInfo?: { masking?: string };
    };
    enrollmentInfo?: { count?: number; type?: string };
  };
  armsInterventionsModule?: {
    armGroups?: Array<{
      label?: string;
      type?: string;
      description?: string;
      interventionNames?: string[];
    }>;
    interventions?: Array<{
      type?: string;
      name?: string;
      description?: string;
      armGroupLabels?: string[];
      otherNames?: string[];
    }>;
  };
  eligibilityModule?: {
    eligibilityCriteria?: string;
    healthyVolunteers?: boolean;
    sex?: string;
    minimumAge?: string;
    maximumAge?: string;
    stdAges?: string[];
  };
  contactsLocationsModule?: {
    centralContacts?: Array<{
      name?: string;
      role?: string;
      phone?: string;
      email?: string;
    }>;
    locations?: Array<{
      facility?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      status?: string;
      geoPoint?: { lat?: number; lon?: number };
    }>;
  };
  [key: string]: unknown;
}

/** Trial Study. */
export interface TrialStudy {
  protocolSection?: TrialProtocol;
  hasResults?: boolean;
  [key: string]: unknown;
}

/** Trial Search Response. */
export interface TrialSearchResponse {
  studies: TrialStudy[];
  totalCount: number;
  nextPageToken?: string;
}

/** Trial Stats. */
export interface TrialStats {
  totalCount: number;
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** Trial overall status values. */
export const TRIAL_STATUSES = {
  RECRUITING: "Currently recruiting participants",
  NOT_YET_RECRUITING: "Approved but not yet recruiting",
  ACTIVE_NOT_RECRUITING: "Ongoing but no longer recruiting",
  COMPLETED: "Trial has concluded",
  ENROLLING_BY_INVITATION: "Recruiting by invitation only",
  SUSPENDED: "Temporarily halted",
  TERMINATED: "Stopped early",
  WITHDRAWN: "Withdrawn before enrollment",
  AVAILABLE: "Expanded access available",
} as const;

/** Study phases. */
export const TRIAL_PHASES = {
  EARLY_PHASE1: "Early Phase 1 (exploratory)",
  PHASE1: "Phase 1 (safety/dosage in small group)",
  PHASE2: "Phase 2 (efficacy/side effects in larger group)",
  PHASE3: "Phase 3 (large-scale efficacy confirmation)",
  PHASE4: "Phase 4 (post-market surveillance)",
  NA: "Not applicable (non-drug studies)",
} as const;

/** Study types. */
export const STUDY_TYPES = {
  INTERVENTIONAL: "Testing a drug, device, or procedure",
  OBSERVATIONAL: "Observing health outcomes without intervention",
  EXPANDED_ACCESS: "Making experimental treatment available outside trial",
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search for clinical trials.
 *
 * Example:
 *   const trials = await searchTrials({ query: "breast cancer", status: "RECRUITING" });
 *   const trials = await searchTrials({ condition: "diabetes", sponsor: "Pfizer", phase: "PHASE3" });
 */
export async function searchTrials(opts: {
  query?: string;
  condition?: string;
  intervention?: string;
  sponsor?: string;
  status?: string;
  phase?: string;
  studyType?: string;
  state?: string;
  country?: string;
  pageSize?: number;
  pageToken?: string;
  sort?: string;
  fields?: string[];
}): Promise<TrialSearchResponse> {
  const params: Record<string, string | number | string[] | undefined> = {
    "query.term": opts.query,
    "query.cond": opts.condition,
    "query.intr": opts.intervention,
    "query.spons": opts.sponsor,
    "filter.overallStatus": opts.status,
    "filter.phase": opts.phase,
    "filter.studyType": opts.studyType,
    "query.locn": opts.state || opts.country,
    pageSize: opts.pageSize ?? 10,
    pageToken: opts.pageToken,
    sort: opts.sort,
    "fields": opts.fields,
  };
  return api.get<TrialSearchResponse>("/studies", params);
}

/**
 * Get full details for a specific trial by NCT ID.
 *
 * Example:
 *   const trial = await getTrialDetail("NCT06000000");
 */
export async function getTrialDetail(nctId: string): Promise<TrialStudy> {
  return api.get<TrialStudy>(`/studies/${encodeURIComponent(nctId)}`);
}

/**
 * Get study statistics (total count matching criteria).
 *
 * Example:
 *   const stats = await getTrialStats({ condition: "COVID-19" });
 */
export async function getTrialStats(opts?: {
  query?: string;
  condition?: string;
  status?: string;
  phase?: string;
}): Promise<TrialStats> {
  const params: Record<string, string | number | undefined> = {
    "query.term": opts?.query,
    "query.cond": opts?.condition,
    "filter.overallStatus": opts?.status,
    "filter.phase": opts?.phase,
    countTotal: 1 as any,
    pageSize: 0,
  };
  const res = await api.get<TrialSearchResponse>("/studies", params);
  return { totalCount: res.totalCount ?? 0 };
}

/**
 * Get study size statistics — count trials by status for a condition.
 *
 * Example:
 *   const sizes = await getTrialEnrollmentStats("Alzheimer Disease");
 */
export async function getTrialEnrollmentStats(condition: string, opts?: {
  intervention?: string;
}): Promise<{
  condition: string;
  statuses: Record<string, number>;
}> {
  const statuses = ["RECRUITING", "ACTIVE_NOT_RECRUITING", "COMPLETED", "TERMINATED"];
  const result: Record<string, number> = {};

  for (const status of statuses) {
    const params: Record<string, string | number | undefined> = {
      "filter.overallStatus": status,
      pageSize: 0,
    };
    // Use intervention search if the condition looks like a drug name, or if explicitly provided
    if (opts?.intervention) {
      params["query.intr"] = opts.intervention;
      if (condition && condition !== opts.intervention) params["query.cond"] = condition;
    } else {
      params["query.cond"] = condition;
    }
    const res = await api.get<TrialSearchResponse>("/studies", params);
    result[status] = res.totalCount ?? 0;
  }

  return { condition, statuses: result };
}

/** Clear the cache. */
export function clearCache(): void {
  api.clearCache();
}
