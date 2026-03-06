/**
 * CMS SDK — typed API client for Centers for Medicare & Medicaid Services provider data.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchDatasets, queryDataset } from "us-gov-open-data-mcp/sdk/cms";
 *
 * No API key required.
 * Docs: https://data.cms.gov/provider-data/
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://data.cms.gov/provider-data/api/1",
  name: "cms",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours — provider data updates monthly/quarterly
});

// ─── Types ───────────────────────────────────────────────────────────

/** Cms Dataset Summary. */
export interface CmsDatasetSummary {
  identifier: string;
  title: string;
  description: string;
  modified?: string;
  theme?: string[];
  keyword?: string[];
}

/** Cms Distribution. */
export interface CmsDistribution {
  identifier: string;
  downloadURL?: string;
  mediaType?: string;
}

/** Cms Dataset Detail. */
export interface CmsDatasetDetail {
  identifier: string;
  title: string;
  description: string;
  modified?: string;
  distribution?: CmsDistribution[];
  keyword?: Array<{ data: string }>;
  theme?: Array<{ data: string }>;
}

/** Cms Query Result. */
export interface CmsQueryResult {
  results: Record<string, unknown>[];
  count?: number;
  limit?: number;
  offset?: number;
}

// ─── Dataset Catalog ─────────────────────────────────────────────────
// Key CMS Provider Data datasets with their identifiers (short IDs).
// Use searchDatasets to discover more.

/** Available datasets with Socrata endpoint IDs. */
export const DATASETS = {
  hospital_info: {
    id: "xubh-q36u",
    name: "Hospital General Information",
    description: "All Medicare-certified hospitals: name, address, phone, type, ownership, star ratings, emergency services",
    theme: "Hospitals",
  },
  nursing_home_info: {
    id: "4pq5-n9py",
    name: "Nursing Home Provider Information",
    description: "All nursing homes: beds, quality ratings, staffing, penalties, five-star ratings",
    theme: "Nursing homes",
  },
  home_health_info: {
    id: "6jpm-sxkc",
    name: "Home Health Agency Information",
    description: "Medicare-registered home health agencies: addresses, quality ratings",
    theme: "Home health services",
  },
  hospice_info: {
    id: "yc9t-dgbk",
    name: "Hospice General Information",
    description: "Medicare-certified hospice providers: addresses, phone numbers",
    theme: "Hospice care",
  },
  dialysis_info: {
    id: "23ew-n7w9",
    name: "Dialysis Facility Information",
    description: "Dialysis facilities: addresses, services, quality of care measures",
    theme: "Dialysis facilities",
  },
  hospital_mortality: {
    id: "ynj2-r877",
    name: "Complications and Deaths - Hospital",
    description: "Hospital-level mortality rates, hip/knee complications, patient safety indicators",
    theme: "Hospitals",
  },
  hospital_readmissions: {
    id: "9n3s-kdb3",
    name: "Hospital Readmissions Reduction Program",
    description: "Excess readmission ratios and payment reductions for hospitals",
    theme: "Hospitals",
  },
  hospital_infections: {
    id: "77hc-ibv8",
    name: "Healthcare Associated Infections - Hospital",
    description: "HAI measures: CLABSI, CAUTI, SSI, MRSA, C.difficile rates by hospital",
    theme: "Hospitals",
  },
  hospital_timely_care: {
    id: "yv7e-xc69",
    name: "Timely and Effective Care - Hospital",
    description: "ED wait times, heart attack/stroke care, preventive care, immunization measures",
    theme: "Hospitals",
  },
  hospital_spending: {
    id: "rrqw-56er",
    name: "Medicare Spending Per Beneficiary - Hospital",
    description: "Medicare spending per episode of care compared to national average",
    theme: "Hospitals",
  },
  hospital_patient_survey: {
    id: "dgck-syfz",
    name: "Patient Survey (HCAHPS) - Hospital",
    description: "HCAHPS patient experience scores: communication, responsiveness, cleanliness, recommendations",
    theme: "Hospitals",
  },
  nursing_home_health_citations: {
    id: "r5ix-sfxw",
    name: "Nursing Home Health Deficiencies",
    description: "Health inspection citations in the last 3 years: tag codes, scope/severity, correction dates",
    theme: "Nursing homes",
  },
  nursing_home_quality: {
    id: "djen-97ju",
    name: "Nursing Home Quality Measures (MDS)",
    description: "Quality measures from the Minimum Data Set: falls, pressure ulcers, pain, UTIs, restraints",
    theme: "Nursing homes",
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────

function extractDistributionId(detail: CmsDatasetDetail): string | null {
  // Find the first CSV distribution
  if (detail.distribution?.length) {
    return detail.distribution[0].identifier ?? null;
  }
  return null;
}

function simplifyDataset(raw: Record<string, unknown>): CmsDatasetSummary {
  const keywords = Array.isArray(raw.keyword)
    ? raw.keyword.map((k: any) => (typeof k === "string" ? k : k?.data ?? "")).filter(Boolean)
    : [];
  const themes = Array.isArray(raw.theme)
    ? raw.theme.map((t: any) => (typeof t === "string" ? t : t?.data ?? "")).filter(Boolean)
    : [];
  return {
    identifier: (raw.identifier as string) ?? "",
    title: (raw.title as string) ?? "",
    description: (raw.description as string) ?? "",
    modified: (raw.modified as string) ?? undefined,
    theme: themes.length ? themes : undefined,
    keyword: keywords.length ? keywords : undefined,
  };
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search CMS Provider Data catalog by keyword.
 */
export async function searchDatasets(keyword: string): Promise<CmsDatasetSummary[]> {
  const res = (await api.get("/metastore/schemas/dataset/items", {
    "show-reference-ids": "",
  })) as Record<string, unknown>[];

  if (!Array.isArray(res)) return [];

  // Client-side keyword filter (DKAN API returns all items)
  const kw = keyword.toLowerCase();
  const matches = res.filter((item) => {
    const title = ((item.title as string) ?? "").toLowerCase();
    const desc = ((item.description as string) ?? "").toLowerCase();
    const keywords = Array.isArray(item.keyword)
      ? item.keyword.map((k: any) => (typeof k === "string" ? k : k?.data ?? "").toLowerCase())
      : [];
    return title.includes(kw) || desc.includes(kw) || keywords.some((k: string) => k.includes(kw));
  });

  return matches.slice(0, 25).map(simplifyDataset);
}

/**
 * Get details for a specific CMS dataset by identifier.
 */
export async function getDatasetDetails(datasetId: string): Promise<CmsDatasetDetail | null> {
  try {
    const res = (await api.get(`/metastore/schemas/dataset/items/${datasetId}`, {
      "show-reference-ids": "",
    })) as Record<string, unknown>;
    if (!res || !res.identifier) return null;

    const distributions = Array.isArray(res.distribution)
      ? res.distribution.map((d: any) => ({
          identifier: d?.identifier ?? d?.data?.identifier ?? "",
          downloadURL: d?.data?.downloadURL ?? d?.downloadURL ?? "",
          mediaType: d?.data?.mediaType ?? d?.mediaType ?? "",
        }))
      : [];

    return {
      identifier: res.identifier as string,
      title: (res.title as string) ?? "",
      description: (res.description as string) ?? "",
      modified: (res.modified as string) ?? undefined,
      distribution: distributions,
    };
  } catch {
    return null;
  }
}

/**
 * Query data from a CMS dataset. The SDK resolves the distribution UUID
 * automatically from the dataset identifier.
 */
export async function queryDataset(opts: {
  datasetId: string;
  conditions?: Array<{ property: string; value: string; operator?: string }>;
  limit?: number;
  offset?: number;
}): Promise<CmsQueryResult> {
  // Look up the dataset key in our catalog
  const catalogEntry = Object.values(DATASETS).find((d) => d.id === opts.datasetId);
  const datasetId = catalogEntry?.id ?? opts.datasetId;

  // Get dataset details to find the distribution UUID
  const detail = await getDatasetDetails(datasetId);
  if (!detail) {
    return { results: [], count: 0 };
  }

  const distId = extractDistributionId(detail as any);
  if (!distId) {
    return { results: [], count: 0 };
  }

  // Query the DKAN datastore
  const params: Record<string, string> = {
    limit: String(opts.limit ?? 50),
    offset: String(opts.offset ?? 0),
  };

  // Add conditions
  if (opts.conditions) {
    opts.conditions.forEach((cond, i) => {
      params[`conditions[${i}][property]`] = cond.property;
      params[`conditions[${i}][value]`] = cond.value;
      if (cond.operator) params[`conditions[${i}][operator]`] = cond.operator;
    });
  }

  const res = (await api.get(`/datastore/query/${distId}/0`, params)) as Record<string, unknown>;
  const results = Array.isArray(res?.results) ? (res.results as Record<string, unknown>[]) : [];
  const count = typeof res?.count === "number" ? res.count : results.length;

  return { results, count, limit: opts.limit ?? 50, offset: opts.offset ?? 0 };
}

/**
 * Query a dataset using its short key from the DATASETS catalog.
 */
export async function queryByKey(
  key: string,
  conditions?: Array<{ property: string; value: string; operator?: string }>,
  limit?: number,
  offset?: number
): Promise<CmsQueryResult> {
  const entry = (DATASETS as Record<string, (typeof DATASETS)[keyof typeof DATASETS]>)[key];
  if (!entry) {
    return { results: [], count: 0 };
  }
  return queryDataset({ datasetId: entry.id, conditions, limit, offset });
}

/** Clear the CMS SDK cache. */
export function clearCache(): void {
  api.clearCache();
}
