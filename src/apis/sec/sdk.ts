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

import { createClient, type ApiClient } from "../../shared/client.js";
import { configuredEnv } from "../../shared/env.js";
import { PACKAGE_VERSION } from "../../shared/version.js";

// ─── Clients ─────────────────────────────────────────────────────────

const CONTACT_EMAIL = configuredEnv("SEC_CONTACT_EMAIL");

/**
 * SEC's fair access policy asks automated tools to put a contact email in the
 * User-Agent. Without SEC_CONTACT_EMAIL, only the tool name and version are
 * sent: no made-up address, and no repository URL either, since SEC's
 * firewall rejects User-Agents that mention GitHub (HTTP 403).
 */
const USER_AGENT = CONTACT_EMAIL
  ? `us-gov-open-data-mcp/${PACKAGE_VERSION} (${CONTACT_EMAIL})`
  : `us-gov-open-data-mcp/${PACKAGE_VERSION}`;

let warnedNoContact = false;

/** Warn once, on the first SEC request, when no contact email is configured. */
function warnIfNoContact(): void {
  if (CONTACT_EMAIL || warnedNoContact) return;
  warnedNoContact = true;
  console.error(
    "SEC EDGAR: SEC_CONTACT_EMAIL is not set. SEC asks automated tools to identify themselves with a contact " +
    "email (https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data) and may block requests without one.",
  );
}

/** A client whose requests trigger the missing-contact warning. */
function withContactWarning(client: ApiClient): ApiClient {
  return {
    ...client,
    get: (path, params) => { warnIfNoContact(); return client.get(path, params); },
  };
}

const dataApi = withContactWarning(createClient({
  baseUrl: "https://data.sec.gov",
  name: "sec-data",
  defaultHeaders: { "User-Agent": USER_AGENT, Accept: "application/json" },
  rateLimit: { perSecond: 10, burst: 10 },
  cacheTtlMs: 30 * 60 * 1000, // 30 min
}));

const searchApi = withContactWarning(createClient({
  baseUrl: "https://efts.sec.gov/LATEST",
  name: "sec-search",
  defaultHeaders: { "User-Agent": USER_AGENT, Accept: "application/json" },
  rateLimit: { perSecond: 10, burst: 10 },
  cacheTtlMs: 30 * 60 * 1000,
}));

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

/** A single XBRL concept's full time series for one company (companyconcept API). */
export interface SecCompanyConcept {
  cik: number;
  entityName: string;
  taxonomy: string;
  tag: string;
  label: string;
  description: string;
  unit: string;
  annual: SecXbrlObservation[];
  quarterly: SecXbrlObservation[];
}

/** One company's value for a concept in a reporting frame (frames API). */
export interface SecFrameDatum {
  accn: string;
  cik: number;
  entityName: string;
  loc: string | null;
  start?: string;
  end: string;
  val: number;
}

/** One XBRL concept across all reporting companies for a single period (frames API). */
export interface SecFrame {
  taxonomy: string;
  tag: string;
  label: string;
  description: string;
  unit: string;
  period: string; // ccp, e.g. "CY2023" or "CY2023Q1I"
  count: number;
  data: SecFrameDatum[];
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

/**
 * Get the full reported time series of a single XBRL concept for one company
 * (companyconcept API). Smaller and faster than getCompanyFacts when you only
 * need one metric, and includes the `frame` field linking to the frames API.
 */
export async function getCompanyConcept(
  cik: string,
  tag: string,
  taxonomy = "us-gaap",
): Promise<SecCompanyConcept | null> {
  const raw = await dataApi.get<{
    cik: number; entityName: string; taxonomy?: string; tag?: string;
    label?: string; description?: string; units: Record<string, SecXbrlObservation[]>;
  }>(`/api/xbrl/companyconcept/CIK${padCik(cik)}/${taxonomy}/${tag}.json`);
  if (!raw || !raw.units) return null;
  // Prefer USD when a concept reports multiple units (e.g. EPS); else first available.
  const unit = raw.units["USD"] ? "USD" : Object.keys(raw.units)[0];
  if (!unit) return null;
  const obs = raw.units[unit] ?? [];
  // Annual: 10-K (domestic), 20-F/40-F (foreign filers), plus amendments (e.g. 10-K/A).
  const isAnnual = (f: string) => /^(10-K|20-F|40-F)/.test(f);
  const isQuarterly = (f: string) => /^10-Q/.test(f);
  return {
    cik: raw.cik,
    entityName: raw.entityName,
    taxonomy: raw.taxonomy ?? taxonomy,
    tag: raw.tag ?? tag,
    label: raw.label ?? tag,
    description: raw.description ?? "",
    unit,
    annual: obs.filter(d => isAnnual(d.form)).slice(-20),
    quarterly: obs.filter(d => isQuarterly(d.form)).slice(-12),
  };
}

/**
 * Get a single XBRL concept reported by every company for one calendar period
 * (frames API) — the basis for cross-company comparison and screening.
 *
 * Period formats:
 *   - "CY2023"      annual (calendar year, duration concept like Revenues)
 *   - "CY2023Q1"    quarterly duration
 *   - "CY2023Q1I"   instantaneous / point-in-time (balance-sheet concepts like Assets)
 *
 * Units: "USD" (default), "shares", "USD-per-shares" (e.g. EarningsPerShareBasic).
 */
export async function getFrame(opts: {
  tag: string;
  period: string;
  taxonomy?: string;
  unit?: string;
}): Promise<SecFrame> {
  const taxonomy = opts.taxonomy ?? "us-gaap";
  const unit = opts.unit ?? "USD";
  const raw = await dataApi.get<{
    taxonomy: string; tag: string; label?: string; description?: string;
    ccp: string; uom: string; pts?: number; data: SecFrameDatum[];
  }>(`/api/xbrl/frames/${taxonomy}/${opts.tag}/${unit}/${opts.period}.json`);
  const data = raw.data ?? [];
  return {
    taxonomy: raw.taxonomy ?? taxonomy,
    tag: raw.tag ?? opts.tag,
    label: raw.label ?? opts.tag,
    description: raw.description ?? "",
    unit: raw.uom ?? unit,
    period: raw.ccp ?? opts.period,
    count: raw.pts ?? data.length,
    data,
  };
}

/** Clear cached responses from both clients. */
export function clearCache(): void {
  dataApi.clearCache();
  searchApi.clearCache();
}

// ─── Company lookup and insider filings (EDGAR full-text search) ─────

/** A company or person known to EDGAR. */
export interface EdgarEntity {
  cik: string;
  name: string;
  tickers: string[];
}

/**
 * Find companies by ticker or name using EDGAR's entity search (the same
 * index as the EDGAR search box). Works without SEC_CONTACT_EMAIL.
 */
export async function lookupCompanies(text: string, limit = 5): Promise<EdgarEntity[]> {
  const raw = await searchApi.get<{ hits?: { hits?: { _id?: string; _source?: { entity?: string; tickers?: string } }[] } }>(
    "/search-index", { keysTyped: text.trim() },
  );
  return (raw.hits?.hits ?? []).slice(0, limit).map(h => ({
    cik: padCik(String(h._id ?? "")),
    name: String(h._source?.entity ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim(),
    tickers: String(h._source?.tickers ?? "").split(",").map(t => t.trim()).filter(Boolean),
  })).filter(e => /^\d{10}$/.test(e.cik));
}

/** A CIK from a CIK, ticker ("AAPL", "BRK-B") or company name. */
export async function resolveCik(input: string): Promise<string> {
  const raw = input.trim();
  if (/^\d{1,10}$/.test(raw)) return padCik(raw);
  const matches = await lookupCompanies(raw, 10);
  const ticker = raw.toUpperCase();
  const best = matches.find(m => m.tickers.some(t => t.toUpperCase() === ticker)) ?? matches[0];
  if (!best) throw new Error(`No SEC registrant found for "${input}". Try the exact ticker or legal name.`);
  return best.cik;
}

/** An insider ownership filing (Form 3, 4 or 5) about a company. */
export interface InsiderFiling {
  form: string;
  filedDate: string;
  /** Date of the earliest reported transaction (period of report). */
  transactionDate: string | null;
  insider: string | null;
  insiderCik: string | null;
  accessionNumber: string;
  /** EDGAR filing index page. */
  url: string;
}

/**
 * Insider ownership filings where the company is the issuer: Form 4
 * (changes in ownership) by default, or 3/5. Newest first, from EDGAR
 * full-text search. The transaction details are in the linked filing.
 */
export async function getInsiderFilings(issuerCik: string, opts: {
  forms?: string; startDate?: string; endDate?: string; limit?: number;
} = {}): Promise<{ total: number; filings: InsiderFiling[] }> {
  const cik = padCik(issuerCik);
  const raw = await searchApi.get<{ hits?: { total?: { value?: number }; hits?: { _id?: string; _source?: Record<string, unknown> }[] } }>(
    "/search-index", { forms: opts.forms ?? "4", ciks: cik, startdt: opts.startDate, enddt: opts.endDate },
  );
  const hits = raw.hits?.hits ?? [];
  const filings = hits
    .map(h => {
      const src = h._source ?? {};
      const names = (src.display_names as string[] | undefined) ?? [];
      const ciks = (src.ciks as string[] | undefined) ?? [];
      // Display names look like "Newstead Jennifer  (CIK 0001780525)"; the insider is the one that isn't the issuer.
      const ownerIndex = ciks.findIndex(c => c !== cik);
      const adsh = String(src.adsh ?? String(h._id ?? "").split(":")[0]);
      return {
        form: String(src.form ?? "?"),
        filedDate: String(src.file_date ?? ""),
        transactionDate: (src.period_ending as string | undefined) ?? null,
        insider: ownerIndex >= 0 ? (names[ownerIndex] ?? "").replace(/\s*\(CIK \d+\)\s*$/, "").trim() || null : null,
        insiderCik: ownerIndex >= 0 ? ciks[ownerIndex] : null,
        accessionNumber: adsh,
        url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${adsh.replace(/-/g, "")}/${adsh}-index.htm`,
      };
    })
    .sort((a, b) => b.filedDate.localeCompare(a.filedDate));
  return { total: raw.hits?.total?.value ?? filings.length, filings: filings.slice(0, opts.limit ?? 20) };
}
