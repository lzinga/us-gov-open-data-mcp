/**
 * @module BEA — Bureau of Economic Analysis
 *
 * Typed API client for BEA's economic statistics: GDP, personal income,
 * international transactions, fixed assets, and industry accounts.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getNationalGdp, getGdpByState } from "us-gov-open-data-mcp/sdk/bea";
 *
 *   const gdp = await getNationalGdp({ year: "2023" });
 *   console.log(gdp.series);
 *
 * Requires `BEA_API_KEY` env var. Register at {@link https://apps.bea.gov/API/signup/}.
 * API docs: {@link https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf}.
 */

import { createClient } from "../../shared/client.js";
import type {
  BeaDataRow,
  BeaRawResponse,
  BeaNationalGdpResult,
  BeaStateGdpResult,
  BeaPersonalIncomeResult,
  BeaIndustryGdpResult,
  BeaDatasetInfo,
  BeaParameterInfo,
  BeaParamValue,
  BeaGenericResult,
  BeaItaResult,
  BeaIipResult,
  BeaIntlServTradeResult,
} from "./types.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://apps.bea.gov/api/data",
  name: "bea",
  auth: {
    type: "query",
    key: "UserID",
    envVar: "BEA_API_KEY",
    extraParams: { ResultFormat: "JSON" },
  },
  // 100 req/min, 100 MB/min, 30 errors/min. Exceeding any = 1-hour lockout.
  rateLimit: { perSecond: 1.5, burst: 5 },
  cacheTtlMs: 60 * 60 * 1000,
  checkError: (data) => {
    const beaapi = (data as BeaRawResponse)?.BEAAPI;
    if (!beaapi) return null;
    // Top-level error
    if (beaapi.Error) {
      const desc = String(beaapi.Error.APIErrorDescription ?? "Unknown BEA error");
      const detail = extractErrorDetail(beaapi.Error.ErrorDetail);
      return detail ? `${desc} — ${detail}` : desc;
    }
    // Results-level error
    const resultsErr = beaapi.Results?.Error as { APIErrorDescription?: string; ErrorDetail?: unknown } | undefined;
    if (resultsErr) {
      const desc = String(resultsErr.APIErrorDescription ?? "Unknown BEA error");
      const detail = extractErrorDetail(resultsErr.ErrorDetail);
      return detail ? `${desc} — ${detail}` : desc;
    }
    return null;
  },
});

/** BEA ErrorDetail can be a string, { Description }, or [{ Description }]. */
function extractErrorDetail(detail: unknown): string | null {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d: Record<string, unknown>) => (d?.Description as string) ?? String(d)).join("; ");
  if (typeof detail === "object" && detail !== null) return (detail as Record<string, unknown>).Description as string ?? JSON.stringify(detail);
  return String(detail);
}

// ─── Reference Data ──────────────────────────────────────────────────

/** NIPA table codes — use as `tableName` in getNationalGdp(). */
export const nipaTables = {
  T10101: "Real GDP percent change",
  T10105: "Nominal GDP",
  T10106: "Real GDP (chained dollars)",
  T10111: "GDP percent change contributions",
  T20100: "Personal income and its disposition",
  T20600: "Personal income (monthly)",
  T30100: "Government receipts and expenditures",
  T30200: "Federal government receipts and expenditures",
  T30300: "State/local government receipts and expenditures",
} as const;

/** GDP by industry table IDs — use as `tableId` in getGdpByIndustry(). */
export const gdpIndustryTables = {
  1: "Value added by industry",
  5: "Contributions to percent change in real GDP",
  6: "Value added as percentage of GDP",
  25: "Real value added by industry",
} as const;

/** BEA Regional table codes — use as `tableName` in getGdpByState() and getPersonalIncome(). */
export const regionalTables = {
  SAGDP1: "State annual GDP summary",
  SAGDP9: "Real GDP by state",
  SQGDP1: "State quarterly GDP summary",
  SAINC1: "Personal income, population, per capita income",
  SAINC3: "Per capita personal income",
  SAINC4: "Personal income by major component",
  SAINC5N: "Personal income by NAICS industry",
  SAINC30: "Economic profile",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────

/** Unwrap BEAAPI.Results from the raw response. Single cast point for the SDK. */
function getBeaResults(raw: unknown): Record<string, unknown> {
  return (raw as BeaRawResponse)?.BEAAPI?.Results ?? {};
}

/**
 * Extract data rows from a BEA GetData response.
 *
 * Two response shapes:
 *   - Results.Data (most datasets)
 *   - Results["0"].Data (GDPbyIndustry, UnderlyingGDPbyIndustry, InputOutput)
 *
 * BEA drops the array wrapper for single-row results, so asArray() normalizes.
 * Meta-data methods bypass this — they read Results.Dataset/.Parameter/.ParamValue directly.
 */
function extractData(raw: unknown): BeaDataRow[] {
  const results = getBeaResults(raw);

  if (results.Data != null) return asArray<BeaDataRow>(results.Data);

  // Industry datasets nest under a numeric key: Results["0"].Data
  for (const key of Object.keys(results)) {
    if (/^\d+$/.test(key)) {
      const inner = results[key] as Record<string, unknown> | undefined;
      if (inner?.Data != null) return asArray<BeaDataRow>(inner.Data);
    }
  }

  return [];
}

function extractNotes(raw: unknown): string[] {
  const results = getBeaResults(raw);
  let notes = results.Notes;
  if (!notes) {
    for (const key of Object.keys(results)) {
      if (/^\d+$/.test(key)) {
        notes = (results[key] as Record<string, unknown>)?.Notes;
        if (notes) break;
      }
    }
  }

  if (!notes) return [];
  const arr = Array.isArray(notes) ? notes : [notes];
  return arr.map((n: Record<string, unknown>) => String(n.NoteText ?? "")).filter(Boolean);
}

/** Parse BEA numeric values, handling special markers like (NA), (D), (NM). */
function parseValue(val: string | undefined): number | null {
  if (!val || val === "(NA)" || val === "(D)" || val === "(NM)" || val === "") return null;
  const num = parseFloat(val.replace(/,/g, ""));
  return Number.isNaN(num) ? null : num;
}

/** Group NIPA/FixedAssets rows by SeriesCode to keep distinct series separate. */
function groupBySeries(data: BeaDataRow[], maxSeries = 20, maxObs = 10) {
  const byKey = new Map<string, { desc: string; obs: { period: string; value: string }[] }>();
  for (const row of data.slice(0, 500)) {
    const key = String(row.SeriesCode ?? row.LineDescription ?? "?");
    const desc = String(row.LineDescription ?? row.SeriesCode ?? "?");
    const period = String(row.TimePeriod ?? "?");
    const value = String(row.DataValue ?? "?");
    if (!byKey.has(key)) byKey.set(key, { desc, obs: [] });
    byKey.get(key)!.obs.push({ period, value });
  }
  return Array.from(byKey.values()).slice(0, maxSeries).map(({ desc, obs }) => ({
    description: desc,
    observations: obs.slice(0, maxObs).map(v => ({
      period: v.period,
      value: parseValue(v.value),
    })),
  }));
}

/** Group Regional rows by GeoName, return latest year sorted descending. */
function groupByGeoLatest(data: BeaDataRow[], limit = 55) {
  const byGeo = new Map<string, { year: string; value: string }[]>();
  for (const row of data) {
    const name = String(row.GeoName ?? "?");
    const yr = String(row.TimePeriod ?? "?");
    const value = String(row.DataValue ?? "?");
    if (!byGeo.has(name)) byGeo.set(name, []);
    byGeo.get(name)!.push({ year: yr, value });
  }

  const latestYear = data.reduce((max, r) => {
    const yr = String(r.TimePeriod ?? "");
    return yr > max ? yr : max;
  }, "");

  const rows = Array.from(byGeo.entries())
    .map(([name, values]) => {
      const latest = values.find(v => v.year === latestYear);
      return { name, value: parseValue(latest?.value) ?? 0 };
    })
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value);

  return { latestYear, rows: rows.slice(0, limit), byGeo };
}

/** Group rows by TimeSeriesId (ITA, IIP, IntlServTrade). */
function groupByTimeSeries<T extends Record<string, unknown>>(
  data: BeaDataRow[],
  extractMeta: (row: BeaDataRow) => T,
  maxSeries = 25,
  maxObs = 15,
) {
  const byKey = new Map<string, { meta: T; obs: { period: string; value: string }[] }>();
  for (const row of data.slice(0, 500)) {
    const key = String(row.TimeSeriesId ?? "?");
    if (!byKey.has(key)) byKey.set(key, { meta: extractMeta(row), obs: [] });
    byKey.get(key)!.obs.push({
      period: String(row.TimePeriod ?? "?"),
      value: String(row.DataValue ?? ""),
    });
  }

  return Array.from(byKey.values()).slice(0, maxSeries).map(({ meta, obs }) => ({
    ...meta,
    observations: obs.slice(0, maxObs).map(o => ({ period: o.period, value: parseValue(o.value) })),
  }));
}

/** Normalize BEA fields that may be a single object or an array. */
function asArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val != null && typeof val === "object") return [val as T];
  return [];
}

// ─── Meta-data Discovery ─────────────────────────────────────────────────

/** List all BEA datasets. */
export async function getDatasetList(): Promise<BeaDatasetInfo[]> {
  const raw = await api.get("", { method: "GetDatasetList" });
  const results = getBeaResults(raw);
  const ds = results.Dataset;
  return asArray<BeaDatasetInfo>(ds);
}

/** List parameters for a dataset. */
export async function getParameterList(datasetName: string): Promise<BeaParameterInfo[]> {
  const raw = await api.get("", { method: "GetParameterList", DatasetName: datasetName });
  const results = getBeaResults(raw);
  const params = results.Parameter;
  return asArray<BeaParameterInfo>(params);
}

/** Get valid values for a parameter. */
export async function getParameterValues(datasetName: string, parameterName: string): Promise<BeaParamValue[]> {
  const raw = await api.get("", { method: "GetParameterValues", DataSetName: datasetName, ParameterName: parameterName });
  const results = getBeaResults(raw);
  return asArray<BeaParamValue>(results.ParamValue);
}

/** Get filtered parameter values. Not all datasets support this; Regional is the primary one. */
export async function getParameterValuesFiltered(
  datasetName: string,
  targetParameter: string,
  filters: Record<string, string>,
): Promise<BeaParamValue[]> {
  const raw = await api.get("", {
    method: "GetParameterValuesFiltered",
    datasetname: datasetName,
    TargetParameter: targetParameter,
    ...filters,
  });
  const results = getBeaResults(raw);
  return asArray<BeaParamValue>(results.ParamValue);
}

// ─── Data Retrieval ─────────────────────────────────────────────────────

/** Get national GDP data from NIPA tables. */
export async function getNationalGdp(opts: {
  /** NIPA table (default: "T10101"). See nipaTables in types.ts. */
  tableName?: string;
  /** A=annual, Q=quarterly, M=monthly. Multiple: "A,Q". */
  frequency?: string;
  /** Year(s) or special: "LAST5", "LAST10", "ALL", "X", or comma-separated like "2020,2021". */
  year?: string;
} = {}): Promise<BeaNationalGdpResult> {
  const tableName = opts.tableName ?? "T10101";
  const frequency = opts.frequency ?? "Q";
  const year = opts.year ?? "LAST5";

  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "NIPA",
    TableName: tableName,
    Frequency: frequency,
    Year: year,
  });

  const data = extractData(raw);
  return {
    table: tableName,
    frequency,
    dataRows: data.length,
    series: groupBySeries(data, 20, 8),
  };
}

/** Get GDP by state from BEA Regional dataset. */
export async function getGdpByState(opts: {
  /** Regional table (default: "SAGDP1"). See regionalTables in types.ts. */
  tableName?: string;
  /** "STATE", "COUNTY", "MSA", state abbreviation ("NY"), or 5-digit FIPS ("06000"). */
  geoFips?: string;
  /** Numeric line code as string, or "ALL". */
  lineCode?: string;
  /** "LAST5" (default), "LAST10", "ALL", or comma-separated years. */
  year?: string;
} = {}): Promise<BeaStateGdpResult> {
  const tableName = opts.tableName ?? "SAGDP1";
  const geoFips = opts.geoFips ?? "STATE";
  const lineCode = opts.lineCode ?? "1";
  const year = opts.year ?? "LAST5";

  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "Regional",
    TableName: tableName,
    GeoFips: geoFips,
    LineCode: lineCode,
    Year: year,
  });

  const data = extractData(raw);
  if (!data.length) return { unit: "millions of current dollars", states: [] };

  // All states — latest period sorted by GDP
  if (!geoFips || geoFips === "STATE") {
    const { latestYear, rows } = groupByGeoLatest(data);
    return {
      year: latestYear,
      unit: "millions of current dollars",
      states: rows.map(r => ({ name: r.name, gdpMillions: r.value })),
    };
  }

  // Single state/geo — time series
  const { byGeo } = groupByGeoLatest(data);
  return {
    geoFips,
    unit: "millions of current dollars",
    series: Array.from(byGeo.entries()).map(([name, values]) => ({
      name,
      observations: values.map(v => ({ year: v.year, gdpMillions: parseValue(v.value) })),
    })),
  };
}

/** Get personal income data by state from BEA Regional dataset. */
export async function getPersonalIncome(opts: {
  /** Income table (default: "SAINC1"). See regionalTables in types.ts. */
  tableName?: string;
  /** "STATE", "COUNTY", "MSA", state abbreviation, or 5-digit FIPS. */
  geoFips?: string;
  /** e.g. "3" for per capita, "1" for total. */
  lineCode?: string;
  /** "LAST5" (default), "ALL", or comma-separated years. */
  year?: string;
} = {}): Promise<BeaPersonalIncomeResult> {
  const tableName = opts.tableName ?? "SAINC1";
  const lineCode = opts.lineCode ?? "3";
  const geoFips = opts.geoFips ?? "STATE";
  const year = opts.year ?? "LAST5";

  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "Regional",
    TableName: tableName,
    GeoFips: geoFips,
    LineCode: lineCode,
    Year: year,
  });

  const data = extractData(raw);
  const unitLabel = tableName === "SAINC3" ? "per capita" : "(thousands)";

  if (!data.length) return { table: tableName, year: "", unit: unitLabel, states: [] };

  const { latestYear, rows } = groupByGeoLatest(data);
  return { table: tableName, year: latestYear, unit: unitLabel, states: rows.map(r => ({ name: r.name, value: r.value })) };
}

/** Get GDP contribution by industry from BEA GDPbyIndustry dataset. */
export async function getGdpByIndustry(opts: {
  /** Table ID ("1", "5", "25") or "ALL". See gdpIndustryTables in types.ts. */
  tableId?: string;
  /** A=annual or Q=quarterly (not all tables support quarterly). */
  frequency?: string;
  /** Comma-separated years or "ALL". Defaults to last 3 complete years. */
  year?: string;
  /** NAICS code ("11", "21") or "ALL". */
  industry?: string;
} = {}): Promise<BeaIndustryGdpResult> {
  const tableId = opts.tableId ?? "1";
  const frequency = opts.frequency ?? "A";
  // Default to last 3 complete years (current year data may not be published yet)
  const curYear = new Date().getFullYear();
  const defaultYears = `${curYear - 3},${curYear - 2},${curYear - 1}`;
  const year = opts.year ?? defaultYears;
  const industry = opts.industry ?? "ALL";

  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "GDPbyIndustry",
    TableID: tableId,
    Frequency: frequency,
    Year: year,
    Industry: industry,
  });

  const data = extractData(raw);

  return {
    tableId,
    industries: groupByIndustry(data),
  };
}

/** Helper to group industry dataset rows by description. */
function groupByIndustry(data: BeaDataRow[], maxIndustries = 25, maxObs = 5) {
  const byIndustry = new Map<string, { period: string; value: string }[]>();
  for (const row of data.slice(0, 500)) {
    const desc = String(row.IndustrYDescription ?? row.InduDesc ?? row.Industry ?? "?");
    // BEA sets Quarter=Year for annual data. Only use Quarter if it differs from Year.
    const yr = String(row.Year ?? "?");
    const qtr = String(row.Quarter ?? "");
    const period = (qtr && qtr !== yr) ? `${yr}Q${qtr}` : yr;
    const value = String(row.DataValue ?? "?");
    if (!byIndustry.has(desc)) byIndustry.set(desc, []);
    byIndustry.get(desc)!.push({ period, value });
  }

  return Array.from(byIndustry.entries()).slice(0, maxIndustries).map(([desc, values]) => ({
    industry: desc,
    observations: values.slice(0, maxObs).map(v => ({
      period: v.period,
      value: parseValue(v.value),
    })),
  }));
}

// ─── Additional Datasets ───────────────────────────────────────────────────────

/** NIPA Underlying Detail — more granular, lower quality than published aggregates. */
export async function getNipaUnderlyingDetail(opts: {
  tableName?: string;
  /** A=annual, Q=quarterly, or M=monthly. */
  frequency?: string;
  /** "LAST5", "ALL", "X", or comma-separated years. */
  year?: string;
} = {}): Promise<BeaNationalGdpResult> {
  const tableName = opts.tableName ?? "U20305";
  const frequency = opts.frequency ?? "A";
  const year = opts.year ?? "LAST5";

  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "NIUnderlyingDetail",
    TableName: tableName,
    Frequency: frequency,
    Year: year,
  });

  const data = extractData(raw);
  return {
    table: tableName,
    frequency,
    dataRows: data.length,
    series: groupBySeries(data),
  };
}

/** Fixed Assets — net stock, depreciation, investment. Annual only. */
export async function getFixedAssets(opts: {
  tableName?: string;
  /** "LAST5", "ALL", "X", or comma-separated years. */
  year?: string;
} = {}): Promise<BeaNationalGdpResult> {
  const tableName = opts.tableName ?? "FAAt101";
  const year = opts.year ?? "LAST5";

  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "FixedAssets",
    TableName: tableName,
    Year: year,
  });

  const data = extractData(raw);
  return {
    table: tableName,
    frequency: "A",
    dataRows: data.length,
    series: groupBySeries(data),
  };
}

/** ITA — U.S. international transactions (balance of payments). */
export async function getInternationalTransactions(opts: {
  /** BEA indicator code: "BalGds", "BalServ", "ExpGds", etc. Use bea_dataset_info to discover. */
  indicator?: string;
  /** Country name ("China"), "AllCountries" (total), or "All" (all breakdowns). */
  areaOrCountry?: string;
  /** A=annual, QSA=quarterly seasonally adjusted, QNSA=quarterly not adjusted. */
  frequency?: string;
  /** Comma-separated years or "ALL". */
  year?: string;
} = {}): Promise<BeaItaResult> {
  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "ITA",
    Indicator: opts.indicator ?? "BalGds",
    AreaOrCountry: opts.areaOrCountry ?? "AllCountries",
    Frequency: opts.frequency ?? "A",
    Year: opts.year ?? "ALL",
  });

  const data = extractData(raw);
  return {
    dataRows: data.length,
    series: groupByTimeSeries(data, (row) => ({
      indicator: String(row.Indicator ?? "?"),
      area: String(row.AreaOrCountry ?? "?"),
      description: String(row.TimeSeriesDescription ?? "?"),
    })),
  };
}

/** IIP — U.S. international investment position (assets and liabilities). */
export async function getInternationalInvestment(opts: {
  /** "FinAssetsExclFinDeriv", "DirInvAssets", etc. Use bea_dataset_info to discover. */
  typeOfInvestment?: string;
  /** "Pos" (position), "ChgPosTrans", "ChgPosPrice", "ChgPosXRate". */
  component?: string;
  /** A=annual or QNSA=quarterly not seasonally adjusted. */
  frequency?: string;
  /** Comma-separated years or "ALL". */
  year?: string;
} = {}): Promise<BeaIipResult> {
  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "IIP",
    TypeOfInvestment: opts.typeOfInvestment ?? "FinAssetsExclFinDeriv",
    Component: opts.component ?? "Pos",
    Frequency: opts.frequency ?? "A",
    Year: opts.year ?? "ALL",
  });

  const data = extractData(raw);
  return {
    dataRows: data.length,
    series: groupByTimeSeries(data, (row) => ({
      investmentType: String(row.TypeOfInvestment ?? "?"),
      component: String(row.Component ?? "?"),
      description: String(row.TimeSeriesDescription ?? "?"),
    })),
  };
}

/** IntlServTrade — annual U.S. trade in services. */
export async function getIntlServTrade(opts: {
  typeOfService?: string;
  tradeDirection?: string;
  affiliation?: string;
  areaOrCountry?: string;
  year?: string;
} = {}): Promise<BeaIntlServTradeResult> {
  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "IntlServTrade",
    // BEA constraint: must provide a specific TypeOfService OR a specific AreaOrCountry.
    TypeOfService: opts.typeOfService ?? "All",
    TradeDirection: opts.tradeDirection ?? "All",
    Affiliation: opts.affiliation ?? "All",
    AreaOrCountry: opts.areaOrCountry ?? "AllCountries",
    Year: opts.year ?? "All",
  });

  const data = extractData(raw);
  return {
    dataRows: data.length,
    series: groupByTimeSeries(data, (row) => ({
      service: String(row.TypeOfService ?? "?"),
      direction: String(row.TradeDirection ?? "?"),
      area: String(row.AreaOrCountry ?? "?"),
      description: String(row.TimeSeriesDescription ?? "?"),
    })),
  };
}

/** MNE — Direct Investment (DI) and Activities of Multinational Enterprises (AMNE).
 *  For AMNE, ownershipLevel and nonBankAffiliatesOnly are required. */
export async function getMultinationalEnterprises(opts: {
  directionOfInvestment: string;
  classification: string;
  year: string;
  ownershipLevel?: string;
  nonBankAffiliatesOnly?: string;
  seriesId?: string;
  country?: string;
  industry?: string;
  state?: string;
  getFootnotes?: string;
}): Promise<BeaGenericResult> {
  const params: Record<string, string> = {
    method: "GetData",
    DataSetName: "MNE",
    DirectionOfInvestment: opts.directionOfInvestment,
    Classification: opts.classification,
    Year: opts.year,
  };
  if (opts.ownershipLevel != null) params.OwnershipLevel = opts.ownershipLevel;
  if (opts.nonBankAffiliatesOnly != null) params.NonBankAffiliatesOnly = opts.nonBankAffiliatesOnly;
  if (opts.seriesId) params.SeriesID = opts.seriesId;
  if (opts.country) params.Country = opts.country;
  if (opts.industry) params.Industry = opts.industry;
  if (opts.state) params.State = opts.state;
  if (opts.getFootnotes) params.GetFootnotes = opts.getFootnotes;

  const raw = await api.get("", params);
  const data = extractData(raw);
  const notes = extractNotes(raw);

  return {
    dataset: "MNE",
    params: { direction: opts.directionOfInvestment, classification: opts.classification, year: opts.year },
    dataRows: data.length,
    data: data.slice(0, 200),
    notes,
  };
}

/** InputOutput — Make, Use, and Requirements tables. */
export async function getInputOutput(opts: {
  tableId: string;
  year: string;
}): Promise<BeaGenericResult> {
  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "InputOutput",
    TableID: opts.tableId,
    Year: opts.year,
  });

  const data = extractData(raw);
  const notes = extractNotes(raw);

  return {
    dataset: "InputOutput",
    params: { tableId: opts.tableId, year: opts.year },
    dataRows: data.length,
    data: data.slice(0, 200),
    notes,
  };
}

/** Underlying GDP by Industry — more detail than getGdpByIndustry. Annual only, from 1997. */
export async function getUnderlyingGdpByIndustry(opts: {
  /** Numeric table ID as string or "ALL". */
  tableId?: string;
  /** A=annual only — no quarterly data available for this dataset. */
  frequency?: string;
  /** Comma-separated years or "ALL". Defaults to last 3 complete years. */
  year?: string;
  /** NAICS code or "ALL". */
  industry?: string;
} = {}): Promise<BeaIndustryGdpResult> {
  const tableId = opts.tableId ?? "210";
  const frequency = opts.frequency ?? "A";
  // Default to last 3 complete years (current year data may not exist yet)
  const curYear = new Date().getFullYear();
  const defaultYears = `${curYear - 3},${curYear - 2},${curYear - 1}`;
  const year = opts.year ?? defaultYears;
  const industry = opts.industry ?? "ALL";

  const raw = await api.get("", {
    method: "GetData",
    DataSetName: "UnderlyingGDPbyIndustry",
    TableID: tableId,
    Frequency: frequency,
    Year: year,
    Industry: industry,
  });

  const data = extractData(raw);

  return {
    tableId,
    industries: groupByIndustry(data),
  };
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
