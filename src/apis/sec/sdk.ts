/**
 * SEC EDGAR SDK — typed API client for SEC EDGAR data.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getCompanyByCik, getCompanyFacts, searchEdgar } from "us-gov-open-data-mcp/sdk/sec";
 *
 * No API key required. Must include User-Agent with contact info.
 * Rate limit: 10 requests/second.
 */

import { createClient } from "../../shared/client.js";

// ─── Clients ─────────────────────────────────────────────────────────

const USER_AGENT = `us-gov-open-data-mcp/2.0 (${process.env.SEC_CONTACT_EMAIL || "contact@example.com"})`;

const dataApi = createClient({
  baseUrl: "https://data.sec.gov",
  name: "sec-data",
  defaultHeaders: { "User-Agent": USER_AGENT, Accept: "application/json" },
  rateLimit: { perSecond: 10, burst: 10 },
  cacheTtlMs: 30 * 60 * 1000, // 30 min
});

const searchApi = createClient({
  baseUrl: "https://efts.sec.gov/LATEST",
  name: "sec-search",
  defaultHeaders: { "User-Agent": USER_AGENT, Accept: "application/json" },
  rateLimit: { perSecond: 10, burst: 10 },
  cacheTtlMs: 30 * 60 * 1000,
});

// ─── Types ───────────────────────────────────────────────────────────

/** Sec Company. */
export interface SecCompany {
  cik: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: string;
  sicDescription: string;
  stateOfIncorporation: string;
  entityType: string;
  category: string;
  fiscalYearEnd: string;
  formerNames: { name: string; from: string; to: string }[];
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      primaryDocDescription: string[];
      accessionNumber: string[];
    };
  };
}

/** Sec Filing. */
export interface SecFiling {
  form: string;
  date: string;
  description: string;
  accessionNumber: string;
}

/** Sec Company Facts. */
export interface SecCompanyFacts {
  cik: number;
  entityName: string;
  facts: {
    "us-gaap"?: Record<string, SecXbrlConcept>;
    [namespace: string]: Record<string, SecXbrlConcept> | undefined;
  };
}

/** Sec Xbrl Concept. */
export interface SecXbrlConcept {
  label?: string;
  description?: string;
  units: Record<string, SecXbrlObservation[]>;
}

/** Sec Xbrl Observation. */
export interface SecXbrlObservation {
  start?: string;
  end?: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  frame?: string;
}

/** Sec Search Result. */
export interface SecSearchResult {
  total: number;
  hits: {
    names: string[];
    form: string;
    date: string;
    description: string;
  }[];
}

// ─── Reference data ──────────────────────────────────────────────────

/** SEC XBRL financial concept codes to human-readable labels. */
export const xbrlConcepts = {
  Revenues: "Total revenue",
  RevenueFromContractWithCustomerExcludingAssessedTax: "Revenue from contracts (ASC 606)",
  NetIncomeLoss: "Net income (loss)",
  OperatingIncomeLoss: "Operating income",
  GrossProfit: "Gross profit",
  Assets: "Total assets",
  Liabilities: "Total liabilities",
  StockholdersEquity: "Total stockholders equity",
  CashAndCashEquivalentsAtCarryingValue: "Cash and cash equivalents",
  LongTermDebt: "Long-term debt",
  EarningsPerShareBasic: "Basic earnings per share",
  EarningsPerShareDiluted: "Diluted earnings per share",
  CommonStockSharesOutstanding: "Common shares outstanding",
  Goodwill: "Goodwill",
  ResearchAndDevelopmentExpense: "R&D expense",
  SellingGeneralAndAdministrativeExpense: "SG&A expense",
  InterestExpense: "Interest expense",
  IncomeTaxExpenseBenefit: "Income tax expense",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────

function padCik(cik: string): string {
  return cik.padStart(10, "0");
}

// ─── Public API ──────────────────────────────────────────────────────

/** Look up a company by CIK number. */
export async function getCompanyByCik(cik: string): Promise<SecCompany> {
  return dataApi.get<SecCompany>(`/submissions/CIK${padCik(cik)}.json`);
}

/** Get company financial facts (XBRL data). */
export async function getCompanyFacts(cik: string): Promise<SecCompanyFacts> {
  return dataApi.get<SecCompanyFacts>(`/api/xbrl/companyfacts/CIK${padCik(cik)}.json`);
}

/** Full-text search across EDGAR filings. */
export async function searchEdgar(
  query: string,
  opts: { forms?: string; startDate?: string; endDate?: string } = {},
): Promise<SecSearchResult> {
  const params: Record<string, string | undefined> = {
    q: query,
    forms: opts.forms,
    startdt: opts.startDate,
    enddt: opts.endDate,
  };
  const raw = await searchApi.get<Record<string, unknown>>("/search-index", params);
  const hits = raw.hits as Record<string, unknown> | undefined;
  const total = (hits?.total as Record<string, unknown>)?.value as number || 0;
  const rawHits = (hits?.hits as Record<string, unknown>[]) || [];

  return {
    total,
    hits: rawHits.map(hit => {
      const source = hit._source as Record<string, unknown>;
      return {
        names: (source.display_names as string[]) || [],
        form: String(source.form || "?"),
        date: String(source.file_date || "?"),
        description: String(source.file_description || ""),
      };
    }),
  };
}

/**
 * Extract a specific XBRL concept from company facts.
 * Traverses facts["us-gaap"][concept].units.USD
 */
export function extractConceptData(
  facts: SecCompanyFacts,
  concept: string,
): { concept: string; label: string; description: string; unit: string; annual: SecXbrlObservation[]; quarterly: SecXbrlObservation[] } | null {
  const usgaap = facts.facts["us-gaap"];
  if (!usgaap) return null;

  // Try exact match, then case-insensitive
  let conceptData = usgaap[concept];
  let resolvedName = concept;
  if (!conceptData) {
    const key = Object.keys(usgaap).find(k => k.toLowerCase() === concept.toLowerCase());
    if (!key) return null;
    conceptData = usgaap[key];
    resolvedName = key;
  }

  const unitKey = Object.keys(conceptData.units)[0];
  if (!unitKey) return null;

  const allData = conceptData.units[unitKey];
  return {
    concept: resolvedName,
    label: conceptData.label || resolvedName,
    description: conceptData.description || "",
    unit: unitKey,
    annual: allData.filter(d => d.form === "10-K").slice(-20),
    quarterly: allData.filter(d => d.form === "10-Q").slice(-8),
  };
}

/**
 * Get a summary of key financial metrics from company facts.
 */
export function summarizeFinancials(facts: SecCompanyFacts): {
  entityName: string;
  totalMetrics: number;
  keyMetrics: { concept: string; label: string; value: number | null; unit: string | null; period: string | null }[];
} {
  const usgaap = facts.facts["us-gaap"];
  if (!usgaap) return { entityName: facts.entityName, totalMetrics: 0, keyMetrics: [] };

  const keyMetrics = Object.keys(xbrlConcepts)
    .filter(m => usgaap[m])
    .map(m => {
      const concept = usgaap[m];
      const unitKey = Object.keys(concept.units)[0];
      const data = unitKey ? concept.units[unitKey] : [];
      const latest = data[data.length - 1];
      return {
        concept: m,
        label: (xbrlConcepts as Record<string, string>)[m],
        value: latest ? latest.val : null,
        unit: unitKey || null,
        period: latest?.end || null,
      };
    });

  return {
    entityName: facts.entityName,
    totalMetrics: Object.keys(usgaap).length,
    keyMetrics,
  };
}

/** Clear cached responses from both clients. */
export function clearCache(): void {
  dataApi.clearCache();
  searchApi.clearCache();
}
