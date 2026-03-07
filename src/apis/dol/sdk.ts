/**
 * DOL SDK — typed API client for the U.S. Department of Labor APIs.
 *
 * Covers OSHA (inspections, violations, accidents), WHD (Wage and Hour Division
 * enforcement), and ETA (Employment and Training Administration — UI claims).
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { getOshaInspections, getOshaViolations, getWhdEnforcement } from "us-gov-open-data-mcp/sdk/dol";
 *
 *   const inspections = await getOshaInspections({ state: "TX", limit: 25 });
 *   console.log(inspections);
 *
 * Requires DOL_API_KEY (free registration: https://data.dol.gov/registration via LOGIN.GOV).
 * Docs: https://data.dol.gov/user-guide
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const client = createClient({
  baseUrl: "https://apiprod.dol.gov/v4/get",
  name: "dol",
  auth: {
    type: "query",
    envParams: { "X-API-KEY": "DOL_API_KEY" },
  },
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
});

// ─── Types ───────────────────────────────────────────────────────────

/** Osha Inspection. */
export interface OshaInspection {
  activity_nr?: number;
  reporting_id?: string;
  state_flag?: string;
  estab_name?: string;
  site_address?: string;
  site_city?: string;
  site_state?: string;
  site_zip?: string;
  owner_type?: string;
  owner_code?: string;
  adv_notice?: string;
  safety_hlth?: string;
  sic_code?: string;
  naics_code?: string;
  insp_type?: string;
  insp_scope?: string;
  why_no_insp?: string;
  union_status?: string;
  safety_manuf?: string;
  safety_const?: string;
  safety_marit?: string;
  health_manuf?: string;
  health_const?: string;
  health_marit?: string;
  migrant?: string;
  mail_street?: string;
  mail_city?: string;
  mail_state?: string;
  mail_zip?: string;
  host_est_key?: string;
  nr_in_estab?: number;
  open_date?: string;
  case_mod_date?: string;
  close_conf_date?: string;
  close_case_date?: string;
  ld_dt?: string;
  [key: string]: unknown;
}

/** Osha Violation. */
export interface OshaViolation {
  activity_nr?: number;
  citation_id?: string;
  delete_flag?: string;
  standard?: string;
  viol_type?: string;
  issuance_date?: string;
  abate_date?: string;
  abate_complete?: string;
  current_penalty?: number;
  initial_penalty?: number;
  contest_date?: string;
  final_order_date?: string;
  nr_instances?: number;
  nr_exposed?: number;
  rec?: string;
  gravity?: string;
  emphasis?: string;
  hazcat?: string;
  fta_insp_nr?: number;
  fta_issuance_date?: string;
  fta_penalty?: number;
  fta_contest_date?: string;
  fta_final_order_date?: string;
  hazsub1?: string;
  hazsub2?: string;
  hazsub3?: string;
  hazsub4?: string;
  hazsub5?: string;
  [key: string]: unknown;
}

/** Osha Accident. */
export interface OshaAccident {
  summary_nr?: number;
  event_date?: string;
  event_time?: string;
  event_desc?: string;
  event_keyword?: string;
  const_end_use?: string;
  build_stories?: number;
  nonbuild_ht?: number;
  project_cost?: string;
  project_type?: string;
  sic_list?: string;
  fatession?: string;
  state?: string;
  sitecity?: string;
  sitestate?: string;
  sitezip?: string;
  owner_type?: string;
  nature_of_insp?: string;
  abstract_text?: string;
  load_dt?: string;
  [key: string]: unknown;
}

/** Osha Accident Injury. */
export interface OshaAccidentInjury {
  summary_nr?: number;
  rel_insp_nr?: number;
  age?: number;
  sex?: string;
  nature_of_inj?: number;
  part_of_body?: number;
  src_of_injury?: number;
  event_type?: number;
  evn_factor?: number;
  human_factor?: number;
  occ_code?: number;
  degree_of_inj?: number;
  task_assigned?: number;
  hazsub?: string;
  const_op?: number;
  const_op_cause?: number;
  fat_cause?: number;
  fall_distance?: number;
  fall_ht?: number;
  injury_line_nr?: number;
  [key: string]: unknown;
}

/** Whd Enforcement. */
export interface WhdEnforcement {
  case_id?: number;
  trade_nm?: string;
  legal_name?: string;
  street_addr_1_txt?: string;
  cty_nm?: string;
  st_cd?: string;
  zip_cd?: string;
  naic_cd?: string;
  naics_code_description?: string;
  case_violtn_cnt?: number;
  cmp_assd_cnt?: number;
  ee_violtd_cnt?: number;
  bw_atp_amt?: number;
  ee_atp_cnt?: number;
  findings_start_date?: string;
  findings_end_date?: string;
  flsa_violtn_cnt?: number;
  flsa_repeat_violator?: string;
  flsa_bw_atp_amt?: number;
  flsa_ee_atp_cnt?: number;
  flsa_mw_bw_atp_amt?: number;
  flsa_ot_bw_atp_amt?: number;
  flsa_15a3_bw_atp_amt?: number;
  flsa_cmp_assd_amt?: number;
  sca_violtn_cnt?: number;
  sca_bw_atp_amt?: number;
  sca_ee_atp_cnt?: number;
  dbra_violtn_cnt?: number;
  dbra_bw_atp_amt?: number;
  dbra_ee_atp_cnt?: number;
  fmla_violtn_cnt?: number;
  fmla_bw_atp_amt?: number;
  fmla_ee_atp_cnt?: number;
  [key: string]: unknown;
}

/** Ui Claims National. */
export interface UiClaimsNational {
  rptdate?: string;
  reflected_week_end?: string;
  initial_claims?: number;
  continued_claims?: number;
  covered_employment?: number;
  insured_unemployment_rate?: number;
  [key: string]: unknown;
}

/** Ui Claims State. */
export interface UiClaimsState {
  st?: string;
  rptdate?: string;
  reflected_week_end?: string;
  initial_claims?: number;
  continued_claims?: number;
  covered_employment?: number;
  insured_unemployment_rate?: number;
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** OSHA inspection types. */
export const INSPECTION_TYPES = {
  A: "Accident investigation",
  B: "Complaint",
  C: "Referral",
  D: "Monitoring",
  E: "Variance",
  F: "Follow-up",
  G: "Unprogrammed related",
  H: "Planned",
  I: "Unprogrammed other",
  J: "Programmed related",
  K: "Programmed other",
  L: "Programmed — high hazard",
} as const;

/** OSHA violation types. */
export const VIOLATION_TYPES = {
  S: "Serious",
  W: "Willful",
  R: "Repeat",
  O: "Other-than-serious",
  U: "Unclassified",
  F: "Failure to abate",
} as const;

/** Available DOL API datasets. */
export const DATASETS = {
  "OSHA/inspection": "OSHA workplace inspections — site, type, scope, dates",
  "OSHA/violation": "OSHA violations found during inspections — standards, penalties, abatement",
  "OSHA/accident": "OSHA accident/fatality investigations — events, descriptions",
  "OSHA/accident_injury": "Injuries from OSHA accident investigations — demographics, injury type",
  "WHD/enforcement": "Wage & Hour Division enforcement — back wages, penalties, FLSA/FMLA/DBRA violations",
  "ETA/ui_claims_national": "Unemployment Insurance weekly claims — national",
  "ETA/ui_claims_state": "Unemployment Insurance weekly claims — by state",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────

/** DOL filter condition: {field, operator, value}. */
interface DolFilterCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "in" | "not_in" | "like";
  value: string | number | string[];
}

/** Build a DOL filter_object from simple field=value pairs (uses "eq" operator). */
function buildFilterObject(
  filters: Record<string, string | number>,
): string | undefined {
  const entries = Object.entries(filters).filter(([, v]) => v !== undefined);
  if (!entries.length) return undefined;

  if (entries.length === 1) {
    const [field, value] = entries[0];
    const cond: DolFilterCondition = { field, operator: "eq", value };
    return JSON.stringify(cond);
  }

  // Multiple filters → combine with "and"
  const conditions: DolFilterCondition[] = entries.map(([field, value]) => ({
    field,
    operator: "eq" as const,
    value,
  }));
  return JSON.stringify({ and: conditions });
}

async function queryDol<T>(
  agencyEndpoint: string,
  opts: {
    filter?: Record<string, string | number>;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: string;
    fields?: string;
  } = {},
): Promise<T[]> {
  const params: Record<string, string | number | undefined> = {};

  if (opts.limit !== undefined) params.limit = opts.limit;
  if (opts.offset !== undefined) params.offset = opts.offset;
  if (opts.sort_by) params.sort_by = opts.sort_by;
  if (opts.sort_order) params.sort = opts.sort_order;
  if (opts.fields) params.fields = opts.fields;

  // DOL API uses filter_object with {field, operator, value} JSON syntax
  if (opts.filter && Object.keys(opts.filter).length > 0) {
    params.filter_object = buildFilterObject(opts.filter);
  }

  return client.get<T[]>(`/${agencyEndpoint}/json`, params);
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search OSHA workplace inspections.
 *
 * Example:
 *   const inspections = await getOshaInspections({ state: "TX", limit: 25 });
 *   const recent = await getOshaInspections({ estab_name: "Amazon", limit: 10 });
 */
export async function getOshaInspections(opts: {
  state?: string;
  estab_name?: string;
  sic_code?: string;
  naics_code?: string;
  insp_type?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
} = {}): Promise<OshaInspection[]> {
  const filter: Record<string, string | number> = {};
  if (opts.state) filter.site_state = opts.state.toUpperCase();
  if (opts.estab_name) filter.estab_name = opts.estab_name;
  if (opts.sic_code) filter.sic_code = opts.sic_code;
  if (opts.naics_code) filter.naics_code = opts.naics_code;
  if (opts.insp_type) filter.insp_type = opts.insp_type;

  return queryDol<OshaInspection>("OSHA/inspection", {
    filter,
    limit: opts.limit ?? 25,
    offset: opts.offset,
    sort_by: opts.sort_by ?? "open_date",
    sort_order: opts.sort_order ?? "desc",
  });
}

/**
 * Search OSHA violations found during inspections.
 *
 * Example:
 *   const violations = await getOshaViolations({ activity_nr: 317463633 });
 *   const willful = await getOshaViolations({ viol_type: "W", limit: 25 });
 */
export async function getOshaViolations(opts: {
  activity_nr?: number;
  viol_type?: string;
  standard?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
} = {}): Promise<OshaViolation[]> {
  const filter: Record<string, string | number> = {};
  if (opts.activity_nr) filter.activity_nr = opts.activity_nr;
  if (opts.viol_type) filter.viol_type = opts.viol_type;
  if (opts.standard) filter.standard = opts.standard;

  return queryDol<OshaViolation>("OSHA/violation", {
    filter,
    limit: opts.limit ?? 25,
    offset: opts.offset,
    sort_by: opts.sort_by ?? "issuance_date",
    sort_order: opts.sort_order ?? "desc",
  });
}

/**
 * Search OSHA accident/fatality investigations.
 *
 * Example:
 *   const accidents = await getOshaAccidents({ state: "CA", limit: 25 });
 */
export async function getOshaAccidents(opts: {
  state?: string;
  sic_code?: string;
  event_keyword?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
} = {}): Promise<OshaAccident[]> {
  const filter: Record<string, string | number> = {};
  if (opts.state) filter.sitestate = opts.state.toUpperCase();
  if (opts.sic_code) filter.sic_list = opts.sic_code;
  if (opts.event_keyword) filter.event_keyword = opts.event_keyword;

  return queryDol<OshaAccident>("OSHA/accident", {
    filter,
    limit: opts.limit ?? 25,
    offset: opts.offset,
    sort_by: opts.sort_by ?? "event_date",
    sort_order: opts.sort_order ?? "desc",
  });
}

/**
 * Get injury details from OSHA accident investigations.
 *
 * Example:
 *   const injuries = await getOshaAccidentInjuries({ summary_nr: 123456 });
 */
export async function getOshaAccidentInjuries(opts: {
  summary_nr?: number;
  degree_of_inj?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<OshaAccidentInjury[]> {
  const filter: Record<string, string | number> = {};
  if (opts.summary_nr) filter.summary_nr = opts.summary_nr;
  if (opts.degree_of_inj) filter.degree_of_inj = opts.degree_of_inj;

  return queryDol<OshaAccidentInjury>("OSHA/accident_injury", {
    filter,
    limit: opts.limit ?? 25,
    offset: opts.offset,
  });
}

/**
 * Search WHD (Wage and Hour Division) enforcement cases.
 * Covers FLSA (minimum wage, overtime), FMLA, Davis-Bacon, Service Contract Act violations.
 *
 * Example:
 *   const cases = await getWhdEnforcement({ state: "TX", limit: 25 });
 *   const company = await getWhdEnforcement({ trade_nm: "McDonald's", limit: 10 });
 */
export async function getWhdEnforcement(opts: {
  state?: string;
  trade_nm?: string;
  naics_code?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
} = {}): Promise<WhdEnforcement[]> {
  const filter: Record<string, string | number> = {};
  if (opts.state) filter.st_cd = opts.state.toUpperCase();
  if (opts.trade_nm) filter.trade_nm = opts.trade_nm;
  if (opts.naics_code) filter.naic_cd = opts.naics_code;

  return queryDol<WhdEnforcement>("WHD/enforcement", {
    filter,
    limit: opts.limit ?? 25,
    offset: opts.offset,
    sort_by: opts.sort_by ?? "findings_end_date",
    sort_order: opts.sort_order ?? "desc",
  });
}

/**
 * Get national weekly Unemployment Insurance claims data.
 *
 * Example:
 *   const claims = await getUiClaimsNational({ limit: 52 });
 */
export async function getUiClaimsNational(opts: {
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
} = {}): Promise<UiClaimsNational[]> {
  return queryDol<UiClaimsNational>("ETA/ui_claims_national", {
    limit: opts.limit ?? 25,
    offset: opts.offset,
    sort_by: opts.sort_by ?? "rptdate",
    sort_order: opts.sort_order ?? "desc",
  });
}

/**
 * Get state-level weekly Unemployment Insurance claims data.
 *
 * Example:
 *   const claims = await getUiClaimsState({ state: "CA", limit: 52 });
 */
export async function getUiClaimsState(opts: {
  state?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
} = {}): Promise<UiClaimsState[]> {
  const filter: Record<string, string | number> = {};
  if (opts.state) filter.st = opts.state.toUpperCase();

  return queryDol<UiClaimsState>("ETA/ui_claims_state", {
    filter,
    limit: opts.limit ?? 25,
    offset: opts.offset,
    sort_by: opts.sort_by ?? "rptdate",
    sort_order: opts.sort_order ?? "desc",
  });
}

/** Clear cached responses. */
export function clearCache(): void {
  client.clearCache();
}
