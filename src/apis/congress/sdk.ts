/**
 * Congress.gov SDK — typed API client for the Congress.gov API (v3).
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchBills, getBillDetails } from "us-gov-open-data-mcp/sdk/congress";
 *
 * Requires DATA_GOV_API_KEY env var. Get one at https://api.data.gov/signup/
 */

import { createClient, qp } from "../../shared/client.js";
import { htmlToText } from "../../shared/html.js";
import { isHostOrSubdomain } from "../../shared/url.js";
export * from "./types.js";
import type {
  CongressBill, CongressBillDetail, CongressCosponsor, CongressBillTitle,
  CongressLaw, CongressSponsoredBill, CongressRelatedBill,
  CongressAction, CongressSubject, CongressSummary, CongressStandaloneSummary,
  CongressTextVersion, CongressMember, CongressMemberDetail,
  CongressVoteSummary, CongressVoteMember, SenateVoteSummary, SenateVoteMember,
  CongressAmendment, CongressCommitteeRef, CongressCommittee,
  CongressCommitteeReport, CongressCommitteePrint, CongressCommitteeMeeting,
  CongressHearing, CongressNomination, CongressTreaty, CongressCrsReport,
  CongressCongressionalRecord, CongressDailyCongressionalRecord,
  CongressBoundCongressionalRecord, CongressHouseCommunication,
  CongressHouseRequirement, CongressSenateCommunication, CongressInfo,
} from "./types.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.congress.gov/v3",
  name: "congress",
  auth: {
    type: "query",
    envParams: { api_key: "DATA_GOV_API_KEY" },
    extraParams: { format: "json" },
  },
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 30 * 60 * 1000, // 30 min
});

// ─── Helpers ─────────────────────────────────────────────────────────

/** Current congress number based on date. */
export function currentCongress(): number {
  const year = new Date().getFullYear();
  return Math.floor((year - 1789) / 2) + 1;
}

// ─── Reference data ──────────────────────────────────────────────────

/** Single source of truth for bill type metadata. */
const BILL_TYPE_DATA = {
  hr:      { name: "House Bill",                    urlSegment: "house-bill" },
  s:       { name: "Senate Bill",                   urlSegment: "senate-bill" },
  hjres:   { name: "House Joint Resolution",        urlSegment: "house-joint-resolution" },
  sjres:   { name: "Senate Joint Resolution",       urlSegment: "senate-joint-resolution" },
  hconres: { name: "House Concurrent Resolution",   urlSegment: "house-concurrent-resolution" },
  sconres: { name: "Senate Concurrent Resolution",  urlSegment: "senate-concurrent-resolution" },
  hres:    { name: "House Simple Resolution",       urlSegment: "house-resolution" },
  sres:    { name: "Senate Simple Resolution",      urlSegment: "senate-resolution" },
} as const;

/** Bill type codes → display names (for keysEnum/describeEnum in tool parameters) */
export const BILL_TYPES: Record<string, string> =
  Object.fromEntries(Object.entries(BILL_TYPE_DATA).map(([k, v]) => [k, v.name]));

/** Convert a bill type code to its Congress.gov URL segment. */
export function billTypeToUrlSegment(billType: string): string {
  return BILL_TYPE_DATA[billType.toLowerCase() as keyof typeof BILL_TYPE_DATA]?.urlSegment ?? "house-bill";
}

/** Chamber codes */
export const CHAMBERS = {
  house: "House of Representatives", senate: "Senate", joint: "Joint",
} as const;

/** Amendment type codes */
export const AMENDMENT_TYPES = {
  hamdt: "House Amendment", samdt: "Senate Amendment", suamdt: "Senate Unnumbered Amendment",
} as const;

/** Law type codes (for /law/{congress}/{lawType} filtering) */
export const LAW_TYPES = {
  pub: "Public Law", priv: "Private Law",
} as const;

/** Committee report type codes */
export const REPORT_TYPES = {
  hrpt: "House Report", srpt: "Senate Report", erpt: "Executive Report",
} as const;

/** House communication type codes */
export const HOUSE_COMMUNICATION_TYPES = {
  ec: "Executive Communication", ml: "Memorial", pm: "Presidential Message", pt: "Petition",
} as const;

/** Senate communication type codes */
export const SENATE_COMMUNICATION_TYPES = {
  ec: "Executive Communication", pm: "Presidential Message", pom: "Petition or Memorial",
} as const;

/** Congress Numbers. */
export const congressNumbers = {
  119: "2025-2026", 118: "2023-2024", 117: "2021-2022",
  116: "2019-2020", 115: "2017-2018", 114: "2015-2016",
  113: "2013-2014", 112: "2011-2012", 111: "2009-2010",
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search/list bills by congress number and/or bill type.
 *
 * NOTE: The Congress.gov API v3 does NOT support text/keyword search on the /bill endpoint.
 * The `query` parameter is accepted but used for client-side title filtering only.
 * To find specific bills, use `getBillDetails()` with known bill numbers, or browse
 * by congress/bill_type and filter results.
 */
export async function searchBills(opts: {
  query?: string;
  congress?: number;
  bill_type?: string;
  limit?: number;
  offset?: number;
  fromDateTime?: string;
  toDateTime?: string;
  sort?: string;
} = {}): Promise<{ bills: CongressBill[] }> {
  let path: string;
  if (opts.congress) {
    path = `/bill/${opts.congress}`;
    if (opts.bill_type) path += `/${opts.bill_type.toLowerCase()}`;
  } else {
    // API supports /bill with no congress filter — lists all bills sorted by latest action
    path = "/bill";
  }

  // Fetch more if we need to filter client-side
  const fetchLimit = opts.query ? Math.min((opts.limit ?? 20) * 5, 250) : (opts.limit ?? 20);

  const params = qp({
    limit: fetchLimit,
    offset: opts.offset ?? 0,
    sort: opts.sort ?? "updateDate+desc",
    fromDateTime: opts.fromDateTime,
    toDateTime: opts.toDateTime,
  });

  const res = await api.get<{ bills?: CongressBill[] }>(path, params);

  let bills = res.bills ?? [];

  // Client-side keyword filtering since the API doesn't support text search
  if (opts.query) {
    const terms = opts.query.toLowerCase().split(/\s+/).filter(Boolean);
    bills = bills.filter(b => {
      const title = (b.title ?? "").toLowerCase();
      return terms.some(t => title.includes(t));
    });
    bills = bills.slice(0, opts.limit ?? 20);
  }

  return { bills };
}

/** Get detailed information about a specific bill, including cosponsors with party breakdown. */
export async function getBillDetails(
  congress: number,
  billType: string,
  billNumber: number,
): Promise<{
  bill: CongressBillDetail;
  cosponsors: CongressCosponsor[];
  cosponsorPartyBreakdown: Record<string, number>;
}> {
  const res = await api.get<{ bill?: CongressBillDetail }>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}`);
  const bill = res.bill ?? (res as unknown as CongressBillDetail);

  // Secondary call for cosponsors
  let cosponsors: CongressCosponsor[] = [];
  const cosponsorPartyBreakdown: Record<string, number> = {};
  try {
    const cRes = await api.get<{ cosponsors?: CongressCosponsor[] }>(
      `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/cosponsors`,
      { limit: 250 },
    );
    cosponsors = cRes.cosponsors ?? [];
    for (const c of cosponsors) {
      const party = (c.party ?? "?") as string;
      cosponsorPartyBreakdown[party] = (cosponsorPartyBreakdown[party] ?? 0) + 1;
    }
  } catch {
    // Non-critical — some bills may not have cosponsors
  }

  return { bill, cosponsors, cosponsorPartyBreakdown };
}

/** Search members of Congress by state, congress, and/or district. */
export async function searchMembers(opts: {
  congress?: number;
  state?: string;
  district?: number;
  currentMember?: boolean;
  fromDateTime?: string;
  toDateTime?: string;
  limit?: number;
} = {}): Promise<{ members: CongressMember[] }> {
  let path: string;
  if (opts.congress && opts.state && opts.district !== undefined) {
    // /member/congress/{congress}/{stateCode}/{district}
    path = `/member/congress/${opts.congress}/${opts.state.toUpperCase()}/${opts.district}`;
  } else if (opts.state && opts.district !== undefined) {
    // /member/{stateCode}/{district} — all-time members for a state+district
    path = `/member/${opts.state.toUpperCase()}/${opts.district}`;
  } else if (opts.congress && opts.state) {
    // Congress + state but no district — not a dedicated path, use congress path + query won't filter state
    // Best approach: use /member/congress/{congress} and note state won't filter server-side for this combo
    path = `/member/congress/${opts.congress}`;
  } else if (opts.state) {
    // /member/{stateCode}
    path = `/member/${opts.state.toUpperCase()}`;
  } else if (opts.congress) {
    // /member/congress/{congress}
    path = `/member/congress/${opts.congress}`;
  } else {
    path = `/member`;
  }

  const params = qp({
    limit: opts.limit ?? 50,
    currentMember: opts.currentMember,
    fromDateTime: opts.fromDateTime,
    toDateTime: opts.toDateTime,
  });

  const res = await api.get<{ members?: CongressMember[] }>(path, params);
  return { members: res.members ?? [] };
}

/** Convert a calendar year to Congress number and session. */
function yearToCongress(year: number): { congress: number; session: 1 | 2 } {
  const congress = Math.floor((year - 1789) / 2) + 1;
  const session = (year % 2 === 1 ? 1 : 2) as 1 | 2;
  return { congress, session };
}

/**
 * Get House roll call votes.
 *
 * Primary source: Congress.gov API (currently 118th–119th Congress, beta).
 * Fallback: clerk.house.gov XML (coverage: 1990 to present) — fills gaps
 * where the API returns no data (e.g. older congresses).
 *
 * Data sources:
 *   - https://api.congress.gov/v3/house-vote
 *   - https://clerk.house.gov/Votes
 */
export async function getHouseVotes(opts: {
  congress?: number;
  session?: number;
  vote_number?: number;
  year?: number;
  limit?: number;
} = {}): Promise<{
  votes?: CongressVoteSummary[];
  members?: CongressVoteMember[];
  vote?: CongressVoteSummary;
  partyTally?: Record<string, Record<string, number>>;
  source?: string;
}> {
  // Resolve congress+session from year if needed (API uses congress/session)
  const resolvedOpts = { ...opts };
  if (opts.year && !opts.congress) {
    const { congress, session } = yearToCongress(opts.year);
    resolvedOpts.congress = congress;
    resolvedOpts.session = opts.session ?? session;
  }

  // Try Congress.gov API first
  try {
    const apiResult = await getHouseVotesFromApi(resolvedOpts);
    const hasData = opts.vote_number
      ? (apiResult.members?.length ?? 0) > 0 || apiResult.vote != null
      : (apiResult.votes?.length ?? 0) > 0;
    if (hasData) return apiResult;
  } catch {
    // API error — continue to clerk fallback
  }

  // Fall back to clerk.house.gov XML (1990–present)
  return getHouseVotesFromClerk(opts);
}

/** Fallback: Fetch House votes from clerk.house.gov XML (1990–present). */
async function getHouseVotesFromClerk(opts: {
  congress?: number;
  session?: number;
  vote_number?: number;
  year?: number;
  limit?: number;
}): Promise<{
  votes?: CongressVoteSummary[];
  members?: CongressVoteMember[];
  vote?: CongressVoteSummary;
  partyTally?: Record<string, Record<string, number>>;
  source?: string;
}> {
  // Resolve year (either explicit or derived from congress+session)
  let year: number;
  if (opts.year) {
    year = opts.year;
  } else {
    const congressNum = opts.congress ?? currentCongress();
    const sessionNum = opts.session ?? currentSession();
    year = congressSessionToYear(congressNum, sessionNum);
  }

  if (opts.vote_number) {
    // Fetch individual vote XML from clerk.house.gov
    const num = String(opts.vote_number).padStart(3, "0");
    const url = `${HOUSE_CLERK_BASE}/${year}/roll${num}.xml`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "us-gov-open-data-mcp/2.0 (gov-accountability-tool)" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) throw new Error(`House vote fetch failed: ${resp.status} ${resp.statusText} (${url})`);
    const xml = await resp.text();

    const parsed = parseXml<Record<string, unknown>>(xml);
    const rc = (parsed["rollcall-vote"] ?? {}) as Record<string, unknown>;
    const meta = (rc["vote-metadata"] ?? {}) as Record<string, unknown>;
    const voteDataNode = (rc["vote-data"] ?? {}) as Record<string, unknown>;

    // Build vote summary
    const vote: CongressVoteSummary = {
      rollCallNumber: Number(meta["rollcall-num"]) || opts.vote_number,
      date: String(meta["action-date"] ?? ""),
      question: String(meta["vote-question"] ?? ""),
      voteQuestion: String(meta["vote-question"] ?? ""),
      result: String(meta["vote-result"] ?? ""),
      description: String(meta["vote-desc"] ?? ""),
      legislationNumber: String(meta["legis-num"] ?? ""),
      voteType: String(meta["vote-type"] ?? ""),
    };

    // Parse members from recorded-vote entries
    const recordedVotes = (voteDataNode["recorded-vote"] ?? []) as Record<string, unknown>[];
    const members: CongressVoteMember[] = recordedVotes.map((rv) => {
      const leg = (rv.legislator ?? {}) as Record<string, unknown>;
      return {
        bioguideID: String(leg["@_name-id"] ?? ""),
        lastName: String(leg["@_sort-field"] ?? leg["@_unaccented-name"] ?? ""),
        firstName: "",
        voteParty: String(leg["@_party"] ?? ""),
        party: String(leg["@_party"] ?? ""),
        voteState: String(leg["@_state"] ?? ""),
        voteCast: String(rv.vote ?? ""),
        votePosition: String(rv.vote ?? ""),
      };
    });

    // Build party tally
    const partyTally: Record<string, Record<string, number>> = {};
    for (const m of members) {
      const p = m.party ?? "?";
      const v = m.votePosition ?? "?";
      if (!partyTally[p]) partyTally[p] = {};
      partyTally[p][v] = (partyTally[p][v] ?? 0) + 1;
    }

    return { vote, members, partyTally, source: "clerk.house.gov" };
  }

  // List votes: parse HTML index page from clerk.house.gov
  const url = `${HOUSE_CLERK_BASE}/${year}/index.asp`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "us-gov-open-data-mcp/2.0 (gov-accountability-tool)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) throw new Error(`House vote index fetch failed: ${resp.status} (${url})`);
  const html = await resp.text();

  const votes = parseHouseVoteIndex(html, opts.limit ?? 20);
  return { votes, source: "clerk.house.gov" };
}

/** Primary: Fetch House votes from Congress.gov API (118th–119th Congress, beta). */
async function getHouseVotesFromApi(opts: {
  congress?: number;
  session?: number;
  vote_number?: number;
  limit?: number;
}): Promise<{
  votes?: CongressVoteSummary[];
  members?: CongressVoteMember[];
  vote?: CongressVoteSummary;
  partyTally?: Record<string, Record<string, number>>;
  source?: string;
}> {
  const congressNum = opts.congress ?? currentCongress();

  if (opts.vote_number && opts.session) {
    // Try member-level breakdown first
    try {
      interface MemberVoteResponse {
        houseRollCallVoteMemberVotes?: {
          results?: Array<{
            bioguideID?: string;
            firstName?: string;
            lastName?: string;
            voteCast?: string;
            voteParty?: string;
            voteState?: string;
          }>;
          [key: string]: unknown;
        };
      }
      const res = await api.get<MemberVoteResponse>(
        `/house-vote/${congressNum}/${opts.session}/${opts.vote_number}/members`,
      );
      const raw = res.houseRollCallVoteMemberVotes?.results ?? [];
      const members: CongressVoteMember[] = raw.map((m) => ({
        ...m,
        party: m.voteParty,
        votePosition: m.voteCast,
      }));
      const partyTally: Record<string, Record<string, number>> = {};
      for (const m of members) {
        const party = (m.party ?? "?") as string;
        const pos = (m.votePosition ?? "?") as string;
        if (!partyTally[party]) partyTally[party] = {};
        partyTally[party][pos] = (partyTally[party][pos] ?? 0) + 1;
      }
      return { members, partyTally, source: "api.congress.gov" };
    } catch {
      // Fall back to vote summary
      const vRes = await api.get<{ houseRollCallVote?: CongressVoteSummary }>(
        `/house-vote/${congressNum}/${opts.session}/${opts.vote_number}`,
      );
      const vote = vRes.houseRollCallVote ?? (vRes as unknown as CongressVoteSummary);
      if (vote.votePartyTotal) {
        const partyTally: Record<string, Record<string, number>> = {};
        for (const pt of vote.votePartyTotal) {
          partyTally[pt.voteParty] = {
            Yea: pt.yeaTotal,
            Nay: pt.nayTotal,
            "Not Voting": pt.notVotingTotal,
            Present: pt.presentTotal,
          };
        }
        return { vote, partyTally, source: "api.congress.gov" };
      }
      return { vote, source: "api.congress.gov" };
    }
  }

  // List recent votes via API
  let path = `/house-vote/${congressNum}`;
  if (opts.session) path += `/${opts.session}`;
  const res = await api.get<{ houseRollCallVotes?: CongressVoteSummary[] }>(
    path, { limit: opts.limit ?? 20 },
  );
  return { votes: res.houseRollCallVotes ?? [], source: "api.congress.gov" };
}

/** Parse the clerk.house.gov HTML index page to extract a vote list. */
function parseHouseVoteIndex(html: string, limit: number): CongressVoteSummary[] {
  const votes: CongressVoteSummary[] = [];
  // Match each table row that contains vote data
  const rowPattern = /<TR>\s*<TD>[\s\S]*?<\/TR>/gi;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(html)) !== null && votes.length < limit) {
    const row = rowMatch[0];
    // Extract TD cells — content may contain nested tags
    const cellPattern = /<TD[^>]*>([\s\S]*?)<\/TD>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellPattern.exec(row)) !== null) {
      // Strip all HTML tags, decode entities, collapse whitespace
      cells.push(htmlToText(cellMatch[1], { whitespace: "collapse" }));
    }

    if (cells.length < 6) continue;
    const rollNum = Number(cells[0]);
    if (!rollNum) continue;

    const resultCode = cells[4].trim();
    const result = resultCode === "P" ? "Passed" : resultCode === "F" ? "Failed" : resultCode === "A" ? "Agreed to" : resultCode;

    votes.push({
      rollCallNumber: rollNum,
      date: cells[1],
      question: cells[3],
      result,
      description: cells[5],
      legislationNumber: cells[2],
    });
  }
  return votes;
}

/** Get recently enacted laws, optionally filtered by type (public/private). */
export async function getRecentLaws(opts: {
  congress?: number;
  lawType?: string;
  limit?: number;
} = {}): Promise<{ laws: CongressLaw[] }> {
  const congressNum = opts.congress ?? currentCongress();
  let path = `/law/${congressNum}`;
  if (opts.lawType) path += `/${opts.lawType.toLowerCase()}`;
  const res = await api.get<{ bills?: CongressLaw[]; laws?: CongressLaw[] }>(
    path, { limit: opts.limit ?? 20 },
  );
  return { laws: res.bills ?? res.laws ?? [] };
}

/** Get bills sponsored or cosponsored by a specific member. */
export async function getMemberBills(
  bioguideId: string,
  type: "sponsored" | "cosponsored" = "sponsored",
  limit = 20,
): Promise<{ bills: CongressSponsoredBill[] }> {
  const legType = type === "cosponsored" ? "cosponsored-legislation" : "sponsored-legislation";
  const res = await api.get<{
    sponsoredLegislation?: CongressSponsoredBill[];
    cosponsoredLegislation?: CongressSponsoredBill[];
  }>(`/member/${bioguideId}/${legType}`, { limit });
  return { bills: res.sponsoredLegislation ?? res.cosponsoredLegislation ?? [] };
}

// ─── Bill Sub-resource Methods ───────────────────────────────────────

/** Get the action history / timeline for a bill. */
export async function getBillActions(
  congress: number, billType: string, billNumber: number, limit = 100,
): Promise<{ actions: CongressAction[] }> {
  const res = await api.get<{ actions?: CongressAction[] }>(
    `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/actions`,
    { limit },
  );
  return { actions: res.actions ?? [] };
}

/** Get amendments filed on a bill. */
export async function getBillAmendments(
  congress: number, billType: string, billNumber: number, limit = 50,
): Promise<{ amendments: CongressAmendment[] }> {
  const res = await api.get<{ amendments?: CongressAmendment[] }>(
    `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/amendments`,
    { limit },
  );
  return { amendments: res.amendments ?? [] };
}

/** Get committees a bill was referred to. */
export async function getBillCommittees(
  congress: number, billType: string, billNumber: number,
): Promise<{ committees: CongressCommitteeRef[] }> {
  const res = await api.get<{ committees?: CongressCommitteeRef[] }>(
    `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/committees`,
  );
  return { committees: res.committees ?? [] };
}

/** Get related/companion bills. */
export async function getBillRelatedBills(
  congress: number, billType: string, billNumber: number, limit = 50,
): Promise<{ relatedBills: CongressRelatedBill[] }> {
  const res = await api.get<{ relatedBills?: CongressRelatedBill[] }>(
    `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/relatedbills`,
    { limit },
  );
  return { relatedBills: res.relatedBills ?? [] };
}

/** Get legislative subjects tagged on a bill. */
export async function getBillSubjects(
  congress: number, billType: string, billNumber: number, limit = 100,
): Promise<{ subjects: CongressSubject[]; policyArea?: string }> {
  const res = await api.get<{
    subjects?: { legislativeSubjects?: CongressSubject[]; policyArea?: { name?: string } };
    legislativeSubjects?: CongressSubject[];
    policyArea?: { name?: string };
  }>(
    `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/subjects`,
    { limit },
  );
  return {
    subjects: res.subjects?.legislativeSubjects ?? res.legislativeSubjects ?? [],
    policyArea: res.subjects?.policyArea?.name ?? res.policyArea?.name,
  };
}

/** Get CRS summaries of a bill. */
export async function getBillSummaries(
  congress: number, billType: string, billNumber: number,
): Promise<{ summaries: CongressSummary[] }> {
  const res = await api.get<{ summaries?: CongressSummary[] }>(
    `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/summaries`,
  );
  return { summaries: res.summaries ?? [] };
}

/** Get text versions available for a bill. */
export async function getBillTextVersions(
  congress: number, billType: string, billNumber: number,
): Promise<{ textVersions: CongressTextVersion[] }> {
  const res = await api.get<{ textVersions?: CongressTextVersion[] }>(
    `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/text`,
  );
  return { textVersions: res.textVersions ?? [] };
}

/** Get titles (short, official, display) for a bill. */
export async function getBillTitles(
  congress: number, billType: string, billNumber: number, limit = 100,
): Promise<{ titles: CongressBillTitle[] }> {
  const res = await api.get<{ titles?: CongressBillTitle[] }>(
    `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/titles`,
    { limit },
  );
  return { titles: res.titles ?? [] };
}

/** Get cosponsors for a bill (standalone, with sort support). */
export async function getBillCosponsors(
  congress: number, billType: string, billNumber: number,
  opts: { limit?: number; sort?: string } = {},
): Promise<{ cosponsors: CongressCosponsor[] }> {
  const params = qp({ limit: opts.limit ?? 250, sort: opts.sort });
  const res = await api.get<{ cosponsors?: CongressCosponsor[] }>(
    `/bill/${congress}/${billType.toLowerCase()}/${billNumber}/cosponsors`,
    params,
  );
  return { cosponsors: res.cosponsors ?? [] };
}

// ─── Member Details ──────────────────────────────────────────────────

/** Get detailed information about a specific member by bioguide ID. */
export async function getMemberDetails(
  bioguideId: string,
): Promise<{ member: CongressMemberDetail }> {
  const res = await api.get<{ member?: CongressMemberDetail }>(`/member/${bioguideId}`);
  return { member: res.member ?? (res as unknown as CongressMemberDetail) };
}

// ─── Amendments ──────────────────────────────────────────────────────

/** Search/list amendments. */
export async function searchAmendments(opts: {
  congress?: number;
  amendmentType?: string;
  limit?: number;
  fromDateTime?: string;
  toDateTime?: string;
} = {}): Promise<{ amendments: CongressAmendment[] }> {
  let path = "/amendment";
  if (opts.congress) {
    path += `/${opts.congress}`;
    if (opts.amendmentType) path += `/${opts.amendmentType.toLowerCase()}`;
  }
  const params = qp({ limit: opts.limit ?? 20, fromDateTime: opts.fromDateTime, toDateTime: opts.toDateTime });
  const res = await api.get<{ amendments?: CongressAmendment[] }>(path, params);
  return { amendments: res.amendments ?? [] };
}

/** Get details about a specific amendment (includes actions). */
export async function getAmendmentDetails(
  congress: number, amendmentType: string, amendmentNumber: number | string,
): Promise<{ amendment: CongressAmendment; actions: CongressAction[] }> {
  const amtType = amendmentType.toLowerCase();
  const res = await api.get<{ amendment?: CongressAmendment }>(
    `/amendment/${congress}/${amtType}/${amendmentNumber}`,
  );
  let actions: CongressAction[] = [];
  try {
    const aRes = await api.get<{ actions?: CongressAction[] }>(
      `/amendment/${congress}/${amtType}/${amendmentNumber}/actions`,
    );
    actions = aRes.actions ?? [];
  } catch { /* non-critical */ }
  return {
    amendment: res.amendment ?? (res as unknown as CongressAmendment),
    actions,
  };
}

// ─── Committees ──────────────────────────────────────────────────────

/** List congressional committees. */
export async function listCommittees(opts: {
  congress?: number;
  chamber?: string;
  limit?: number;
  fromDateTime?: string;
  toDateTime?: string;
} = {}): Promise<{ committees: CongressCommittee[] }> {
  let path = "/committee";
  if (opts.congress) {
    path += `/${opts.congress}`;
  }
  if (opts.chamber) {
    path += `/${opts.chamber.toLowerCase()}`;
  }
  const params = qp({ limit: opts.limit ?? 50, fromDateTime: opts.fromDateTime, toDateTime: opts.toDateTime });
  const res = await api.get<{ committees?: CongressCommittee[] }>(path, params);
  return { committees: res.committees ?? [] };
}

/** Get detailed committee info. */
export async function getCommitteeDetails(
  chamber: string, committeeCode: string,
): Promise<{ committee: CongressCommittee }> {
  const res = await api.get<{ committee?: CongressCommittee }>(
    `/committee/${chamber.toLowerCase()}/${committeeCode}`,
  );
  return { committee: res.committee ?? (res as unknown as CongressCommittee) };
}

/** Get bills assigned to a committee. */
export async function getCommitteeBills(
  chamber: string, committeeCode: string, limit = 20,
): Promise<{ bills: CongressBill[] }> {
  const res = await api.get<{ "committee-bills"?: { bills?: CongressBill[] }; bills?: CongressBill[] }>(
    `/committee/${chamber.toLowerCase()}/${committeeCode}/bills`,
    { limit },
  );
  return { bills: res["committee-bills"]?.bills ?? res.bills ?? [] };
}

// ─── Nominations ─────────────────────────────────────────────────────

/** List presidential nominations for a congress. */
export async function listNominations(opts: {
  congress?: number;
  limit?: number;
  fromDateTime?: string;
  toDateTime?: string;
} = {}): Promise<{ nominations: CongressNomination[] }> {
  const congressNum = opts.congress ?? currentCongress();
  const params = qp({ limit: opts.limit ?? 20, fromDateTime: opts.fromDateTime, toDateTime: opts.toDateTime });
  const res = await api.get<{ nominations?: CongressNomination[] }>(  
    `/nomination/${congressNum}`, params,
  );
  return { nominations: res.nominations ?? [] };
}

/** Get details about a specific nomination (includes actions). */
export async function getNominationDetails(
  congress: number, nominationNumber: number | string,
): Promise<{ nomination: CongressNomination; actions: CongressAction[] }> {
  const res = await api.get<{ nomination?: CongressNomination }>(
    `/nomination/${congress}/${nominationNumber}`,
  );
  let actions: CongressAction[] = [];
  try {
    const aRes = await api.get<{ actions?: CongressAction[] }>(
      `/nomination/${congress}/${nominationNumber}/actions`,
    );
    actions = aRes.actions ?? [];
  } catch { /* non-critical */ }
  return {
    nomination: res.nomination ?? (res as unknown as CongressNomination),
    actions,
  };
}

// ─── Treaties ────────────────────────────────────────────────────────

/** List treaties. */
export async function listTreaties(opts: {
  congress?: number;
  limit?: number;
  fromDateTime?: string;
  toDateTime?: string;
} = {}): Promise<{ treaties: CongressTreaty[] }> {
  let path = "/treaty";
  if (opts.congress) path += `/${opts.congress}`;
  const params = qp({ limit: opts.limit ?? 20, fromDateTime: opts.fromDateTime, toDateTime: opts.toDateTime });
  const res = await api.get<{ treaties?: CongressTreaty[] }>(path, params);
  return { treaties: res.treaties ?? [] };
}

/** Get details about a specific treaty (includes actions). */
export async function getTreatyDetails(
  congress: number, treatyNumber: number | string,
): Promise<{ treaty: CongressTreaty; actions: CongressAction[] }> {
  const res = await api.get<{ treaty?: CongressTreaty }>(
    `/treaty/${congress}/${treatyNumber}`,
  );
  let actions: CongressAction[] = [];
  try {
    const aRes = await api.get<{ actions?: CongressAction[] }>(
      `/treaty/${congress}/${treatyNumber}/actions`,
    );
    actions = aRes.actions ?? [];
  } catch { /* non-critical */ }
  return {
    treaty: res.treaty ?? (res as unknown as CongressTreaty),
    actions,
  };
}

// ─── CRS Reports ─────────────────────────────────────────────────────

/** Search Congressional Research Service reports. */
export async function searchCrsReports(opts: {
  limit?: number;
  fromDateTime?: string;
  toDateTime?: string;
} = {}): Promise<{ reports: CongressCrsReport[] }> {
  const params = qp({ limit: opts.limit ?? 20, fromDateTime: opts.fromDateTime, toDateTime: opts.toDateTime });
  const res = await api.get<{ CRSReports?: CongressCrsReport[]; reports?: CongressCrsReport[] }>(  
    "/crsreport", params,
  );
  return { reports: res.CRSReports ?? res.reports ?? [] };
}

/** Get a specific CRS report by report number. */
export async function getCrsReportDetails(
  reportNumber: string,
): Promise<{ report: CongressCrsReport }> {
  const res = await api.get<{ CRSReport?: CongressCrsReport; report?: CongressCrsReport }>(
    `/crsreport/${reportNumber}`,
  );
  return { report: res.CRSReport ?? res.report ?? (res as unknown as CongressCrsReport) };
}

// ─── Summaries (standalone) ──────────────────────────────────────────

/**
 * Search bill summaries across congresses.
 * Unlike getBillSummaries (which requires a specific bill), this endpoint
 * returns summaries across all bills, optionally filtered by congress and bill type.
 */
export async function searchSummaries(opts: {
  congress?: number;
  billType?: string;
  limit?: number;
  fromDateTime?: string;
  toDateTime?: string;
  sort?: string;
} = {}): Promise<{ summaries: CongressStandaloneSummary[] }> {
  let path = "/summaries";
  if (opts.congress) {
    path += `/${opts.congress}`;
    if (opts.billType) path += `/${opts.billType.toLowerCase()}`;
  }
  const params = qp({ limit: opts.limit ?? 20, fromDateTime: opts.fromDateTime, toDateTime: opts.toDateTime, sort: opts.sort });
  const res = await api.get<{ summaries?: CongressStandaloneSummary[] }>(path, params);
  return { summaries: res.summaries ?? [] };
}

// ─── Congress Info ───────────────────────────────────────────────────

/** Get info about congresses and their sessions. */
export async function getCongressInfo(opts: {
  congress?: number;
  current?: boolean;
  limit?: number;
} = {}): Promise<{ congresses: CongressInfo[] }> {
  let path = "/congress";
  if (opts.current) {
    path = "/congress/current";
  } else if (opts.congress) {
    path = `/congress/${opts.congress}`;
  }
  const res = await api.get<{ congresses?: CongressInfo[]; congress?: CongressInfo }>(
    path, { limit: opts.limit ?? 20 },
  );
  // Single congress detail returns { congress: {...} }, list returns { congresses: [...] }
  if (res.congress) return { congresses: [res.congress] };
  return { congresses: res.congresses ?? [] };
}

// ─── Congressional Record ────────────────────────────────────────────

/** Get Congressional Record issues. */
export async function getCongressionalRecord(opts: {
  year?: number;
  month?: number;
  day?: number;
  limit?: number;
} = {}): Promise<{ issues: CongressCongressionalRecord[] }> {
  const params = qp({ limit: opts.limit ?? 20, y: opts.year, m: opts.month, d: opts.day });
  const res = await api.get<{
    Results?: { Issues?: CongressCongressionalRecord[] };
    congressionalRecord?: CongressCongressionalRecord[];
    issues?: CongressCongressionalRecord[];
  }>("/congressional-record", params);
  return { issues: res.Results?.Issues ?? res.congressionalRecord ?? res.issues ?? [] };
}

// ─── Law Details ─────────────────────────────────────────────────────

/** Get details about a specific law by congress, type, and number. */
export async function getLawDetails(
  congress: number, lawType: string, lawNumber: number,
): Promise<{ law: CongressBillDetail }> {
  const res = await api.get<{ bill?: CongressBillDetail }>(
    `/law/${congress}/${lawType.toLowerCase()}/${lawNumber}`,
  );
  return { law: res.bill ?? (res as unknown as CongressBillDetail) };
}

// ─── Amendment Sub-resources ─────────────────────────────────────────

/** Get cosponsors of an amendment. */
export async function getAmendmentCosponsors(
  congress: number, amendmentType: string, amendmentNumber: number | string, limit = 250,
): Promise<{ cosponsors: CongressCosponsor[] }> {
  const res = await api.get<{ cosponsors?: CongressCosponsor[] }>(
    `/amendment/${congress}/${amendmentType.toLowerCase()}/${amendmentNumber}/cosponsors`,
    { limit },
  );
  return { cosponsors: res.cosponsors ?? [] };
}

/** Get sub-amendments to an amendment. */
export async function getAmendmentAmendments(
  congress: number, amendmentType: string, amendmentNumber: number | string, limit = 50,
): Promise<{ amendments: CongressAmendment[] }> {
  const res = await api.get<{ amendments?: CongressAmendment[] }>(
    `/amendment/${congress}/${amendmentType.toLowerCase()}/${amendmentNumber}/amendments`,
    { limit },
  );
  return { amendments: res.amendments ?? [] };
}

/** Get text versions of an amendment (117th Congress onwards). */
export async function getAmendmentText(
  congress: number, amendmentType: string, amendmentNumber: number | string, limit = 50,
): Promise<{ textVersions: CongressTextVersion[] }> {
  const res = await api.get<{ textVersions?: CongressTextVersion[] }>(
    `/amendment/${congress}/${amendmentType.toLowerCase()}/${amendmentNumber}/text`,
    { limit },
  );
  return { textVersions: res.textVersions ?? [] };
}

// ─── Committee Sub-resources ─────────────────────────────────────────

/** Get committee details filtered by congress. */
export async function getCommitteeDetailsByCongress(
  congress: number, chamber: string, committeeCode: string,
): Promise<{ committee: CongressCommittee }> {
  const res = await api.get<{ committee?: CongressCommittee }>(
    `/committee/${congress}/${chamber.toLowerCase()}/${committeeCode}`,
  );
  return { committee: res.committee ?? (res as unknown as CongressCommittee) };
}

/** Get reports associated with a committee. */
export async function getCommitteeReportsForCommittee(
  chamber: string, committeeCode: string, limit = 20,
  opts: { fromDateTime?: string; toDateTime?: string } = {},
): Promise<{ reports: CongressCommitteeReport[] }> {
  const params = qp({ limit, fromDateTime: opts.fromDateTime, toDateTime: opts.toDateTime });
  const res = await api.get<{ "committee-reports"?: { committeeReports?: CongressCommitteeReport[] }; committeeReports?: CongressCommitteeReport[] }>(
    `/committee/${chamber.toLowerCase()}/${committeeCode}/reports`, params,
  );
  return { reports: res["committee-reports"]?.committeeReports ?? res.committeeReports ?? [] };
}

/** Get nominations associated with a committee. */
export async function getCommitteeNominations(
  chamber: string, committeeCode: string, limit = 20,
): Promise<{ nominations: CongressNomination[] }> {
  const res = await api.get<{ nominations?: CongressNomination[] }>(
    `/committee/${chamber.toLowerCase()}/${committeeCode}/nominations`, { limit },
  );
  return { nominations: res.nominations ?? [] };
}

/** Get House communications associated with a committee. */
export async function getCommitteeHouseCommunications(
  committeeCode: string, limit = 20,
): Promise<{ communications: CongressHouseCommunication[] }> {
  const res = await api.get<{ houseCommunications?: CongressHouseCommunication[] }>(
    `/committee/house/${committeeCode}/house-communication`, { limit },
  );
  return { communications: res.houseCommunications ?? [] };
}

/** Get Senate communications associated with a committee. */
export async function getCommitteeSenateCommunications(
  committeeCode: string, limit = 20,
): Promise<{ communications: CongressSenateCommunication[] }> {
  const res = await api.get<{ senateCommunications?: CongressSenateCommunication[] }>(
    `/committee/senate/${committeeCode}/senate-communication`, { limit },
  );
  return { communications: res.senateCommunications ?? [] };
}

// ─── Committee Reports ───────────────────────────────────────────────

/** List committee reports. */
export async function listCommitteeReports(opts: {
  congress?: number;
  reportType?: string;
  conference?: boolean;
  limit?: number;
  fromDateTime?: string;
  toDateTime?: string;
} = {}): Promise<{ reports: CongressCommitteeReport[] }> {
  let path = "/committee-report";
  if (opts.congress) {
    path += `/${opts.congress}`;
    if (opts.reportType) path += `/${opts.reportType.toLowerCase()}`;
  }
  const params = qp({ limit: opts.limit ?? 20, conference: opts.conference, fromDateTime: opts.fromDateTime, toDateTime: opts.toDateTime });
  const res = await api.get<{ committeeReports?: CongressCommitteeReport[] }>(path, params);
  return { reports: res.committeeReports ?? [] };
}

/** Get details about a specific committee report. */
export async function getCommitteeReportDetails(
  congress: number, reportType: string, reportNumber: number,
): Promise<{ report: CongressCommitteeReport }> {
  const res = await api.get<{ committeeReports?: CongressCommitteeReport[] }>(
    `/committee-report/${congress}/${reportType.toLowerCase()}/${reportNumber}`,
  );
  const reports = res.committeeReports ?? [];
  return { report: reports[0] ?? (res as unknown as CongressCommitteeReport) };
}

/** Get text versions for a committee report. */
export async function getCommitteeReportText(
  congress: number, reportType: string, reportNumber: number, limit = 20,
): Promise<{ text: { type?: string; url?: string; isErrata?: string }[] }> {
  const res = await api.get<{ text?: { type?: string; url?: string; isErrata?: string }[] }>(
    `/committee-report/${congress}/${reportType.toLowerCase()}/${reportNumber}/text`, { limit },
  );
  return { text: res.text ?? [] };
}

// ─── Committee Prints ────────────────────────────────────────────────

/** List committee prints. */
export async function listCommitteePrints(opts: {
  congress?: number;
  chamber?: string;
  limit?: number;
  fromDateTime?: string;
  toDateTime?: string;
} = {}): Promise<{ prints: CongressCommitteePrint[] }> {
  let path = "/committee-print";
  if (opts.congress) {
    path += `/${opts.congress}`;
    if (opts.chamber) path += `/${opts.chamber.toLowerCase()}`;
  }
  const params = qp({ limit: opts.limit ?? 20, fromDateTime: opts.fromDateTime, toDateTime: opts.toDateTime });
  const res = await api.get<{ committeePrints?: CongressCommitteePrint[] }>(path, params);
  return { prints: res.committeePrints ?? [] };
}

/** Get details about a specific committee print. */
export async function getCommitteePrintDetails(
  congress: number, chamber: string, jacketNumber: number,
): Promise<{ print: CongressCommitteePrint }> {
  const res = await api.get<{ committeePrint?: CongressCommitteePrint }>(
    `/committee-print/${congress}/${chamber.toLowerCase()}/${jacketNumber}`,
  );
  return { print: res.committeePrint ?? (res as unknown as CongressCommitteePrint) };
}

// ─── Committee Meetings ──────────────────────────────────────────────

/** List committee meetings. */
export async function listCommitteeMeetings(opts: {
  congress?: number;
  chamber?: string;
  limit?: number;
  fromDateTime?: string;
  toDateTime?: string;
} = {}): Promise<{ meetings: CongressCommitteeMeeting[] }> {
  let path = "/committee-meeting";
  if (opts.congress) {
    path += `/${opts.congress}`;
    if (opts.chamber) path += `/${opts.chamber.toLowerCase()}`;
  }
  const params = qp({ limit: opts.limit ?? 20, fromDateTime: opts.fromDateTime, toDateTime: opts.toDateTime });
  const res = await api.get<{ committeeMeetings?: CongressCommitteeMeeting[] }>(path, params);
  return { meetings: res.committeeMeetings ?? [] };
}

/** Get details about a specific committee meeting. */
export async function getCommitteeMeetingDetails(
  congress: number, chamber: string, eventId: string,
): Promise<{ meeting: CongressCommitteeMeeting }> {
  const res = await api.get<{ committeeMeeting?: CongressCommitteeMeeting }>(
    `/committee-meeting/${congress}/${chamber.toLowerCase()}/${eventId}`,
  );
  return { meeting: res.committeeMeeting ?? (res as unknown as CongressCommitteeMeeting) };
}

// ─── Hearings ────────────────────────────────────────────────────────

/** List hearings. */
export async function listHearings(opts: {
  congress?: number;
  chamber?: string;
  limit?: number;
} = {}): Promise<{ hearings: CongressHearing[] }> {
  let path = "/hearing";
  if (opts.congress) {
    path += `/${opts.congress}`;
    if (opts.chamber) path += `/${opts.chamber.toLowerCase()}`;
  }
  const res = await api.get<{ hearings?: CongressHearing[] }>(path, { limit: opts.limit ?? 20 });
  return { hearings: res.hearings ?? [] };
}

/** Get details about a specific hearing. */
export async function getHearingDetails(
  congress: number, chamber: string, jacketNumber: number,
): Promise<{ hearing: CongressHearing }> {
  const res = await api.get<{ hearing?: CongressHearing }>(
    `/hearing/${congress}/${chamber.toLowerCase()}/${jacketNumber}`,
  );
  return { hearing: res.hearing ?? (res as unknown as CongressHearing) };
}

// ─── Daily Congressional Record ──────────────────────────────────────

/** List daily Congressional Record issues. */
export async function getDailyCongressionalRecord(opts: {
  volumeNumber?: number;
  issueNumber?: number;
  limit?: number;
} = {}): Promise<{ issues: CongressDailyCongressionalRecord[]; issue?: CongressDailyCongressionalRecord }> {
  if (opts.volumeNumber && opts.issueNumber) {
    const res = await api.get<{ issue?: CongressDailyCongressionalRecord }>(
      `/daily-congressional-record/${opts.volumeNumber}/${opts.issueNumber}`,
    );
    return { issues: [], issue: res.issue ?? (res as unknown as CongressDailyCongressionalRecord) };
  }
  let path = "/daily-congressional-record";
  if (opts.volumeNumber) path += `/${opts.volumeNumber}`;
  const res = await api.get<{ dailyCongressionalRecord?: CongressDailyCongressionalRecord[] }>(
    path, { limit: opts.limit ?? 20 },
  );
  return { issues: res.dailyCongressionalRecord ?? [] };
}

/** Get articles from a daily Congressional Record issue. */
export async function getDailyCongressionalRecordArticles(
  volumeNumber: number, issueNumber: number, limit = 50,
): Promise<{ articles: { name?: string; sectionArticles?: { startPage?: string; endPage?: string; title?: string; text?: { type?: string; url?: string }[] }[] }[] }> {
  const res = await api.get<{ articles?: unknown[] }>(
    `/daily-congressional-record/${volumeNumber}/${issueNumber}/articles`, { limit },
  );
  return { articles: (res.articles ?? []) as any[] };
}

// ─── Bound Congressional Record ──────────────────────────────────────

/** List bound Congressional Record issues. */
export async function getBoundCongressionalRecord(opts: {
  year?: number;
  month?: number;
  day?: number;
  limit?: number;
} = {}): Promise<{ records: CongressBoundCongressionalRecord[] }> {
  let path = "/bound-congressional-record";
  if (opts.year) {
    path += `/${opts.year}`;
    if (opts.month) {
      path += `/${opts.month}`;
      if (opts.day) path += `/${opts.day}`;
    }
  }
  const res = await api.get<{ boundCongressionalRecord?: CongressBoundCongressionalRecord[] }>(
    path, { limit: opts.limit ?? 20 },
  );
  return { records: res.boundCongressionalRecord ?? [] };
}

// ─── House Communications ────────────────────────────────────────────

/** List House communications. */
export async function listHouseCommunications(opts: {
  congress?: number;
  communicationType?: string;
  limit?: number;
} = {}): Promise<{ communications: CongressHouseCommunication[] }> {
  let path = "/house-communication";
  if (opts.congress) {
    path += `/${opts.congress}`;
    if (opts.communicationType) path += `/${opts.communicationType.toLowerCase()}`;
  }
  const res = await api.get<{ houseCommunications?: CongressHouseCommunication[] }>(path, { limit: opts.limit ?? 20 });
  return { communications: res.houseCommunications ?? [] };
}

/** Get details about a specific House communication. */
export async function getHouseCommunicationDetails(
  congress: number, communicationType: string, communicationNumber: number,
): Promise<{ communication: CongressHouseCommunication }> {
  const res = await api.get<{ houseCommunication?: CongressHouseCommunication }>(
    `/house-communication/${congress}/${communicationType.toLowerCase()}/${communicationNumber}`,
  );
  return { communication: res.houseCommunication ?? (res as unknown as CongressHouseCommunication) };
}

// ─── House Requirements ──────────────────────────────────────────────

/** List House requirements. */
export async function listHouseRequirements(opts: {
  limit?: number;
} = {}): Promise<{ requirements: CongressHouseRequirement[] }> {
  const res = await api.get<{ houseRequirements?: CongressHouseRequirement[] }>(
    "/house-requirement", { limit: opts.limit ?? 20 },
  );
  return { requirements: res.houseRequirements ?? [] };
}

/** Get details about a specific House requirement. */
export async function getHouseRequirementDetails(
  requirementNumber: number,
): Promise<{ requirement: CongressHouseRequirement }> {
  const res = await api.get<{ houseRequirement?: CongressHouseRequirement }>(
    `/house-requirement/${requirementNumber}`,
  );
  return { requirement: res.houseRequirement ?? (res as unknown as CongressHouseRequirement) };
}

/** Get matching communications for a House requirement. */
export async function getHouseRequirementMatchingCommunications(
  requirementNumber: number, limit = 20,
): Promise<{ communications: CongressHouseCommunication[] }> {
  const res = await api.get<{ matchingCommunications?: CongressHouseCommunication[] }>(
    `/house-requirement/${requirementNumber}/matching-communications`, { limit },
  );
  return { communications: res.matchingCommunications ?? [] };
}

// ─── Senate Communications ───────────────────────────────────────────

/** List Senate communications. */
export async function listSenateCommunications(opts: {
  congress?: number;
  communicationType?: string;
  limit?: number;
} = {}): Promise<{ communications: CongressSenateCommunication[] }> {
  let path = "/senate-communication";
  if (opts.congress) {
    path += `/${opts.congress}`;
    if (opts.communicationType) path += `/${opts.communicationType.toLowerCase()}`;
  }
  const res = await api.get<{ senateCommunications?: CongressSenateCommunication[] }>(path, { limit: opts.limit ?? 20 });
  return { communications: res.senateCommunications ?? [] };
}

/** Get details about a specific Senate communication. */
export async function getSenateCommunicationDetails(
  congress: number, communicationType: string, communicationNumber: number,
): Promise<{ communication: CongressSenateCommunication }> {
  const res = await api.get<{ senateCommunication?: CongressSenateCommunication }>(
    `/senate-communication/${congress}/${communicationType.toLowerCase()}/${communicationNumber}`,
  );
  return { communication: res.senateCommunication ?? (res as unknown as CongressSenateCommunication) };
}

// ─── Nomination Sub-resources ────────────────────────────────────────

/** Get nominees for a position within a nomination. */
export async function getNominationNominees(
  congress: number, nominationNumber: number | string, ordinal: number, limit = 20,
): Promise<{ nominees: { firstName?: string; lastName?: string; state?: string; effectiveDate?: string; [key: string]: unknown }[] }> {
  const res = await api.get<{ nominees?: unknown[] }>(
    `/nomination/${congress}/${nominationNumber}/${ordinal}`, { limit },
  );
  return { nominees: (res.nominees ?? []) as any[] };
}

/** Get committees associated with a nomination. */
export async function getNominationCommittees(
  congress: number, nominationNumber: number | string, limit = 20,
): Promise<{ committees: CongressCommitteeRef[] }> {
  const res = await api.get<{ committees?: CongressCommitteeRef[] }>(
    `/nomination/${congress}/${nominationNumber}/committees`, { limit },
  );
  return { committees: res.committees ?? [] };
}

/** Get hearings associated with a nomination. */
export async function getNominationHearings(
  congress: number, nominationNumber: number | string, limit = 20,
): Promise<{ hearings: CongressHearing[] }> {
  const res = await api.get<{ hearings?: CongressHearing[] }>(
    `/nomination/${congress}/${nominationNumber}/hearings`, { limit },
  );
  return { hearings: res.hearings ?? [] };
}

// ─── Treaty Sub-resources ────────────────────────────────────────────

/** Get details about a specific partitioned treaty. */
export async function getTreatyDetailWithSuffix(
  congress: number, treatyNumber: number | string, treatySuffix: string,
): Promise<{ treaty: CongressTreaty }> {
  const res = await api.get<{ treaty?: CongressTreaty }>(
    `/treaty/${congress}/${treatyNumber}/${treatySuffix}`,
  );
  return { treaty: res.treaty ?? (res as unknown as CongressTreaty) };
}

/** Get committees associated with a treaty. */
export async function getTreatyCommittees(
  congress: number, treatyNumber: number | string, limit = 20,
): Promise<{ committees: CongressCommitteeRef[] }> {
  const res = await api.get<{ committees?: CongressCommitteeRef[]; treatyCommittees?: CongressCommitteeRef[] }>(
    `/treaty/${congress}/${treatyNumber}/committees`, { limit },
  );
  return { committees: res.committees ?? res.treatyCommittees ?? [] };
}

/** Get actions on a partitioned treaty (with suffix). */
export async function getTreatyActionsWithSuffix(
  congress: number, treatyNumber: number | string, treatySuffix: string, limit = 50,
): Promise<{ actions: CongressAction[] }> {
  const res = await api.get<{ actions?: CongressAction[] }>(
    `/treaty/${congress}/${treatyNumber}/${treatySuffix}/actions`, { limit },
  );
  return { actions: res.actions ?? [] };
}

// ─── Committee Print Text ────────────────────────────────────────────

/** Get text versions for a committee print. */
export async function getCommitteePrintText(
  congress: number, chamber: string, jacketNumber: number, limit = 20,
): Promise<{ text: { type?: string; url?: string }[] }> {
  const res = await api.get<{ text?: { type?: string; url?: string }[] }>(
    `/committee-print/${congress}/${chamber.toLowerCase()}/${jacketNumber}/text`, { limit },
  );
  return { text: res.text ?? [] };
}

// ─── Cross-referencing Composite Functions ────────────────────────────

/**
 * Get a complete bill profile by combining multiple sub-resource calls in parallel.
 * Returns bill details, cosponsors, actions, summaries, committees, subjects, text versions,
 * and related bills — everything needed to understand a bill's full legislative context.
 */
export async function getBillFullProfile(
  congress: number, billType: string, billNumber: number,
): Promise<{
  bill: CongressBillDetail;
  cosponsors: CongressCosponsor[];
  cosponsorPartyBreakdown: Record<string, number>;
  actions: CongressAction[];
  summaries: CongressSummary[];
  committees: CongressCommitteeRef[];
  subjects: CongressSubject[];
  policyArea?: string;
  textVersions: CongressTextVersion[];
  relatedBills: CongressRelatedBill[];
  titles: CongressBillTitle[];
}> {
  // First: get bill detail (also fetches cosponsors internally)
  const { bill, cosponsors, cosponsorPartyBreakdown } = await getBillDetails(congress, billType, billNumber);

  // Then: parallel fetch all sub-resources
  const [actionsData, summariesData, committeesData, subjectsData, textData, relatedData, titlesData] = await Promise.all([
    getBillActions(congress, billType, billNumber).catch(() => ({ actions: [] as CongressAction[] })),
    getBillSummaries(congress, billType, billNumber).catch(() => ({ summaries: [] as CongressSummary[] })),
    getBillCommittees(congress, billType, billNumber).catch(() => ({ committees: [] as CongressCommitteeRef[] })),
    getBillSubjects(congress, billType, billNumber).catch(() => ({ subjects: [] as CongressSubject[], policyArea: undefined })),
    getBillTextVersions(congress, billType, billNumber).catch(() => ({ textVersions: [] as CongressTextVersion[] })),
    getBillRelatedBills(congress, billType, billNumber).catch(() => ({ relatedBills: [] as CongressRelatedBill[] })),
    getBillTitles(congress, billType, billNumber).catch(() => ({ titles: [] as CongressBillTitle[] })),
  ]);

  return {
    bill,
    cosponsors,
    cosponsorPartyBreakdown,
    actions: actionsData.actions,
    summaries: summariesData.summaries,
    committees: committeesData.committees,
    subjects: subjectsData.subjects,
    policyArea: subjectsData.policyArea,
    textVersions: textData.textVersions,
    relatedBills: relatedData.relatedBills,
    titles: titlesData.titles,
  };
}

/**
 * Get a complete member profile: details + sponsored + cosponsored legislation in parallel.
 * Provides a 360° view of a member's legislative activity.
 */
export async function getMemberFullProfile(
  bioguideId: string,
  billLimit = 20,
): Promise<{
  member: CongressMemberDetail;
  sponsoredBills: CongressSponsoredBill[];
  cosponsoredBills: CongressSponsoredBill[];
}> {
  const [memberData, sponsoredData, cosponsoredData] = await Promise.all([
    getMemberDetails(bioguideId),
    getMemberBills(bioguideId, "sponsored", billLimit).catch(() => ({ bills: [] as CongressSponsoredBill[] })),
    getMemberBills(bioguideId, "cosponsored", billLimit).catch(() => ({ bills: [] as CongressSponsoredBill[] })),
  ]);

  return {
    member: memberData.member,
    sponsoredBills: sponsoredData.bills,
    cosponsoredBills: cosponsoredData.bills,
  };
}

/**
 * Get a complete nomination profile: details + actions + committees + hearings in parallel.
 */
export async function getNominationFullProfile(
  congress: number, nominationNumber: number | string,
): Promise<{
  nomination: CongressNomination;
  actions: CongressAction[];
  committees: CongressCommitteeRef[];
  hearings: CongressHearing[];
}> {
  const [nomData, committeesData, hearingsData] = await Promise.all([
    getNominationDetails(congress, nominationNumber),
    getNominationCommittees(congress, nominationNumber).catch(() => ({ committees: [] as CongressCommitteeRef[] })),
    getNominationHearings(congress, nominationNumber).catch(() => ({ hearings: [] as CongressHearing[] })),
  ]);

  return {
    nomination: nomData.nomination,
    actions: nomData.actions,
    committees: committeesData.committees,
    hearings: hearingsData.hearings,
  };
}

/**
 * Get a complete treaty profile: details + actions + committees in parallel.
 */
export async function getTreatyFullProfile(
  congress: number, treatyNumber: number | string,
): Promise<{
  treaty: CongressTreaty;
  actions: CongressAction[];
  committees: CongressCommitteeRef[];
}> {
  const [treatyData, committeesData] = await Promise.all([
    getTreatyDetails(congress, treatyNumber),
    getTreatyCommittees(congress, treatyNumber).catch(() => ({ committees: [] as CongressCommitteeRef[] })),
  ]);

  return {
    treaty: treatyData.treaty,
    actions: treatyData.actions,
    committees: committeesData.committees,
  };
}

/**
 * Get a complete committee profile: details + recent bills + reports + nominations in parallel.
 */
export async function getCommitteeFullProfile(
  chamber: string, committeeCode: string, limit = 10,
): Promise<{
  committee: CongressCommittee;
  recentBills: CongressBill[];
  reports: CongressCommitteeReport[];
  nominations: CongressNomination[];
}> {
  const [detailData, billsData, reportsData, nominationsData] = await Promise.all([
    getCommitteeDetails(chamber, committeeCode),
    getCommitteeBills(chamber, committeeCode, limit).catch(() => ({ bills: [] as CongressBill[] })),
    getCommitteeReportsForCommittee(chamber, committeeCode, limit).catch(() => ({ reports: [] as CongressCommitteeReport[] })),
    getCommitteeNominations(chamber, committeeCode, limit).catch(() => ({ nominations: [] as CongressNomination[] })),
  ]);

  return {
    committee: detailData.committee,
    recentBills: billsData.bills,
    reports: reportsData.reports,
    nominations: nominationsData.nominations,
  };
}

/**
 * Extract recorded vote references from a bill's actions, then fetch the actual vote data.
 * Connects bills to their roll-call votes with party breakdowns — the key bridge
 * for "follow the money" investigations (bill → vote → who voted how → who donated to them).
 */
export async function getBillVotes(
  congress: number, billType: string, billNumber: number,
): Promise<{
  houseVotes: { rollNumber: number; date?: string; vote?: CongressVoteSummary; members?: CongressVoteMember[]; partyTally?: Record<string, Record<string, number>>; source?: string }[];
  senateVotes: { rollNumber: number; date?: string; vote?: SenateVoteSummary; members?: SenateVoteMember[]; partyTally?: Record<string, Record<string, number>> }[];
}> {
  // First get the bill's actions to find recorded votes
  const { actions } = await getBillActions(congress, billType, billNumber);

  const houseRolls: { rollNumber: number; date?: string; session?: number }[] = [];
  const senateRolls: { rollNumber: number; date?: string; session?: number }[] = [];

  for (const action of actions) {
    if (!action.recordedVotes) continue;
    for (const rv of action.recordedVotes) {
      if (!rv.rollNumber) continue;
      const chamber = rv.chamber?.toLowerCase() ?? (isHostOrSubdomain(rv.url, "senate.gov") ? "senate" : "house");
      if (chamber === "senate") {
        senateRolls.push({ rollNumber: rv.rollNumber, date: rv.date ?? action.actionDate, session: rv.sessionNumber });
      } else {
        senateRolls.length; // just for clarity
        houseRolls.push({ rollNumber: rv.rollNumber, date: rv.date ?? action.actionDate, session: rv.sessionNumber });
      }
    }
  }

  // Fetch vote data in parallel
  const houseVotePromises = houseRolls.map(async (rv) => {
    try {
      const session = rv.session ?? (rv.date ? (new Date(rv.date).getFullYear() % 2 === 1 ? 1 : 2) : currentSession());
      const data = await getHouseVotes({ congress, session, vote_number: rv.rollNumber });
      return { rollNumber: rv.rollNumber, date: rv.date, vote: data.vote, members: data.members, partyTally: data.partyTally, source: data.source };
    } catch {
      return { rollNumber: rv.rollNumber, date: rv.date };
    }
  });

  const senateVotePromises = senateRolls.map(async (rv) => {
    try {
      const session = rv.session ?? (rv.date ? (new Date(rv.date).getFullYear() % 2 === 1 ? 1 : 2) : currentSession());
      const data = await getSenateVotes({ congress, session, vote_number: rv.rollNumber });
      return { rollNumber: rv.rollNumber, date: rv.date, vote: data.vote, members: data.members, partyTally: data.partyTally };
    } catch {
      return { rollNumber: rv.rollNumber, date: rv.date };
    }
  });

  const [houseVotes, senateVotes] = await Promise.all([
    Promise.all(houseVotePromises),
    Promise.all(senateVotePromises),
  ]);

  return { houseVotes, senateVotes };
}

// ─── Roll Call Votes (from clerk.house.gov & senate.gov XML) ─────────

import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  // Ensure arrays for repeating elements in House and Senate vote XML
  isArray: (name) =>
    name === "member" || name === "vote" ||
    name === "recorded-vote" || name === "totals-by-party",
  // Parse numeric-looking values as numbers
  parseTagValue: true,
});

/** Parse XML string into a JS object using fast-xml-parser. */
function parseXml<T = Record<string, unknown>>(xml: string): T {
  return xmlParser.parse(xml) as T;
}

const HOUSE_CLERK_BASE = "https://clerk.house.gov/evs";
const SENATE_BASE = "https://www.senate.gov/legislative/LIS";

function padVoteNumber(n: number): string {
  return String(n).padStart(5, "0");
}

/** Convert congress number + session to calendar year. */
function congressSessionToYear(congress: number, session: number): number {
  return (congress - 1) * 2 + 1788 + session;
}

/**
 * Get Senate roll call votes from senate.gov XML data.
 *
 * Coverage: 101st Congress (1989) to present — far deeper than the Congress.gov API
 * which only has House votes for 118th-119th Congress.
 *
 * Data source: https://www.senate.gov/general/XML.htm
 */
export async function getSenateVotes(opts: {
  congress?: number;
  session?: number;
  vote_number?: number;
  limit?: number;
} = {}): Promise<{
  votes?: SenateVoteSummary[];
  vote?: SenateVoteSummary;
  members?: SenateVoteMember[];
  partyTally?: Record<string, Record<string, number>>;
}> {
  const congressNum = opts.congress ?? currentCongress();
  const sessionNum = opts.session ?? currentSession();

  if (opts.vote_number) {
    // Fetch individual vote XML
    const url =
      `${SENATE_BASE}/roll_call_votes/vote${congressNum}${sessionNum}` +
      `/vote_${congressNum}_${sessionNum}_${padVoteNumber(opts.vote_number)}.xml`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "us-gov-open-data-mcp/2.0 (gov-accountability-tool)" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) throw new Error(`Senate vote fetch failed: ${resp.status} ${resp.statusText} (${url})`);
    const xml = await resp.text();
    const parsed = parseXml<{ roll_call_vote: Record<string, unknown> }>(xml);
    const rc = parsed.roll_call_vote ?? {};

    // Parse vote metadata
    const doc = rc.document as Record<string, unknown> | undefined;
    const cnt = (rc.count ?? {}) as Record<string, unknown>;
    const tb = (rc.tie_breaker ?? {}) as Record<string, unknown>;

    const vote: SenateVoteSummary = {
      congress: Number(rc.congress) || congressNum,
      session: Number(rc.session) || sessionNum,
      voteNumber: Number(rc.vote_number) || opts.vote_number,
      date: String(rc.vote_date ?? ""),
      question: String(rc.question ?? ""),
      result: String(rc.vote_result ?? ""),
      title: String(rc.vote_title ?? ""),
      description: String(rc.vote_document_text ?? ""),
      majorityRequired: String(rc.majority_requirement ?? ""),
      count: {
        yeas: Number(cnt.yeas) || 0,
        nays: Number(cnt.nays) || 0,
        present: Number(cnt.present) || 0,
        absent: Number(cnt.absent) || 0,
      },
    };

    if (doc) {
      vote.document = {
        type: String(doc.document_type ?? ""),
        number: String(doc.document_number ?? ""),
        name: String(doc.document_name ?? ""),
        title: String(doc.document_title ?? ""),
      };
    }

    const tbWho = String(tb.by_whom ?? "");
    if (tbWho) {
      vote.tieBreaker = { byWhom: tbWho, vote: String(tb.tie_breaker_vote ?? "") };
    }

    // Parse members
    const membersContainer = (rc.members ?? {}) as Record<string, unknown>;
    const rawMembers = (membersContainer.member ?? []) as Record<string, unknown>[];
    const members: SenateVoteMember[] = rawMembers.map((m) => ({
      fullName: String(m.member_full ?? ""),
      firstName: String(m.first_name ?? ""),
      lastName: String(m.last_name ?? ""),
      party: String(m.party ?? ""),
      state: String(m.state ?? ""),
      voteCast: String(m.vote_cast ?? ""),
    }));

    // Build party tally
    const partyTally: Record<string, Record<string, number>> = {};
    for (const m of members) {
      const p = m.party || "?";
      const v = m.voteCast || "?";
      if (!partyTally[p]) partyTally[p] = {};
      partyTally[p][v] = (partyTally[p][v] ?? 0) + 1;
    }

    return { vote, members, partyTally };
  }

  // List recent votes — fetch list XML
  const listUrl = `${SENATE_BASE}/roll_call_lists/vote_menu_${congressNum}_${sessionNum}.xml`;
  const resp = await fetch(listUrl, {
    headers: { "User-Agent": "us-gov-open-data-mcp/2.0 (gov-accountability-tool)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) throw new Error(`Senate vote list fetch failed: ${resp.status} ${resp.statusText} (${listUrl})`);
  const xml = await resp.text();
  const parsed = parseXml<{ vote_summary: Record<string, unknown> }>(xml);
  const summary = parsed.vote_summary ?? {};
  const rawVotes = ((summary.votes ?? {}) as Record<string, unknown>).vote ?? [];
  const voteArr = (Array.isArray(rawVotes) ? rawVotes : [rawVotes]) as Record<string, unknown>[];

  const maxResults = opts.limit ?? 20;
  const votes: SenateVoteSummary[] = voteArr.slice(0, maxResults).map((v) => {
    const tally = (v.vote_tally ?? {}) as Record<string, unknown>;
    return {
      congress: congressNum,
      session: sessionNum,
      voteNumber: Number(v.vote_number) || 0,
      date: String(v.vote_date ?? ""),
      question: String(v.question ?? ""),
      result: String(v.result ?? ""),
      title: String(v.title ?? ""),
      description: String(v.issue ?? ""),
      majorityRequired: "",
      count: {
        yeas: Number(tally.yeas) || 0,
        nays: Number(tally.nays) || 0,
        present: 0,
        absent: 0,
      },
    };
  });

  return { votes };
}

/** Helper: current session (1 for odd years, 2 for even years). */
function currentSession(): number {
  return new Date().getFullYear() % 2 === 1 ? 1 : 2;
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
