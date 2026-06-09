/**
 * congress MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchBills,
  getBillDetails,
  searchMembers,
  getHouseVotes,
  getSenateVotes,
  getRecentLaws,
  getMemberBills,
  getBillActions,
  getBillAmendments,
  getBillCommittees,
  getBillRelatedBills,
  getBillSubjects,
  getBillSummaries,
  getBillTextVersions,
  getBillTitles,
  getBillCosponsors,
  getMemberDetails,
  searchAmendments,
  getAmendmentDetails,
  getAmendmentCosponsors,
  getAmendmentAmendments,
  getAmendmentText,
  listCommittees,
  getCommitteeDetails,
  getCommitteeBills,
  getCommitteeReportsForCommittee,
  getCommitteeNominations,
  getCommitteeHouseCommunications,
  getCommitteeSenateCommunications,
  getCommitteeDetailsByCongress,
  listCommitteeReports,
  getCommitteeReportDetails,
  getCommitteeReportText,
  listCommitteePrints,
  getCommitteePrintDetails,
  getCommitteePrintText,
  listCommitteeMeetings,
  getCommitteeMeetingDetails,
  listHearings,
  getHearingDetails,
  listNominations,
  getNominationDetails,
  getNominationCommittees,
  getNominationHearings,
  getNominationNominees,
  listTreaties,
  getTreatyDetails,
  getTreatyDetailWithSuffix,
  getTreatyCommittees,
  getTreatyActionsWithSuffix,
  searchCrsReports,
  getCrsReportDetails,
  searchSummaries,
  getCongressInfo,
  getCongressionalRecord,
  getDailyCongressionalRecord,
  getDailyCongressionalRecordArticles,
  getBoundCongressionalRecord,
  listHouseCommunications,
  getHouseCommunicationDetails,
  listHouseRequirements,
  getHouseRequirementDetails,
  getHouseRequirementMatchingCommunications,
  listSenateCommunications,
  getSenateCommunicationDetails,
  getLawDetails,
  getBillFullProfile,
  getMemberFullProfile,
  getNominationFullProfile,
  getTreatyFullProfile,
  getCommitteeFullProfile,
  getBillVotes,
  currentCongress,
  billTypeToUrlSegment,
  BILL_TYPES,
  CHAMBERS,
  AMENDMENT_TYPES,
  LAW_TYPES,
  REPORT_TYPES,
  HOUSE_COMMUNICATION_TYPES,
  SENATE_COMMUNICATION_TYPES,
  type CongressBill,
  type CongressMember,
  type CongressVoteSummary,
  type SenateVoteSummary,
  type SenateVoteMember,
  type CongressLaw,
  type CongressSponsoredBill,
  type CongressAction,
  type CongressAmendment,
  type CongressCommitteeRef,
  type CongressRelatedBill,
  type CongressSubject,
  type CongressSummary,
  type CongressStandaloneSummary,
  type CongressTextVersion,
  type CongressBillTitle,
  type CongressMemberDetail,
  type CongressCommittee,
  type CongressInfo,
  type CongressNomination,
  type CongressTreaty,
  type CongressCrsReport,
  type CongressCongressionalRecord,
  type CongressCommitteeReport,
  type CongressCommitteePrint,
  type CongressCommitteeMeeting,
  type CongressHearing,
  type CongressDailyCongressionalRecord,
  type CongressBoundCongressionalRecord,
  type CongressHouseCommunication,
  type CongressHouseRequirement,
  type CongressSenateCommunication,
} from "./sdk.js";
import { tableResponse, listResponse, recordResponse, emptyResponse } from "../../shared/response.js";
import { keysEnum, describeEnum } from "../../shared/enum-utils.js";

function summarizeBill(b: CongressBill) {
  return {
    type: b.type ?? null,
    number: b.number ?? null,
    title: b.title ?? null,
    congress: b.congress ?? null,
    introducedDate: b.introducedDate ?? null,
    sponsor: b.sponsor ? { name: b.sponsor.name, party: b.sponsor.party, state: b.sponsor.state } : null,
    latestAction: b.latestAction ? { text: b.latestAction.text, date: b.latestAction.actionDate } : null,
    url: b.url ?? null,
  };
}

function summarizeMember(m: CongressMember) {
  return {
    name: m.name ?? (m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : null),
    party: m.partyName ?? m.party ?? null,
    state: m.state ?? null,
    chamber: m.chamber ?? null,
    district: m.district ?? null,
    bioguideId: m.bioguideId ?? null,
    startYear: m.startYear ?? null,
    endYear: m.endYear ?? null,
  };
}

function summarizeVote(v: CongressVoteSummary) {
  return {
    voteNumber: v.rollCallNumber ?? v.voteNumber ?? null,
    date: v.startDate ?? v.date ?? null,
    question: v.voteQuestion ?? v.question ?? null,
    result: v.result ?? null,
    voteType: v.voteType ?? null,
    legislation: v.legislationType && v.legislationNumber
      ? { type: v.legislationType, number: v.legislationNumber, url: v.legislationUrl }
      : v.bill ? { type: v.bill.type, number: v.bill.number, title: v.bill.title } : null,
  };
}

function summarizeLaw(l: CongressLaw) {
  return {
    type: l.type ?? null,
    number: l.number ?? null,
    title: l.title ?? null,
    signedDate: l.latestAction?.actionDate ?? null,
    url: l.url ?? null,
  };
}

function summarizeSponsoredBill(b: CongressSponsoredBill) {
  return {
    type: b.type ?? null,
    number: b.number ?? null,
    title: b.title ?? null,
    congress: b.congress ?? null,
    introducedDate: b.introducedDate ?? null,
    latestAction: b.latestAction ? { text: b.latestAction.text, date: b.latestAction.actionDate } : null,
  };
}

export const tools: Tool<any, any>[] = [
  {
    name: "congress_search_bills",
    description:
      "Search for bills in Congress by keyword, congress number, or bill type. " +
      "Returns bill number, title, sponsor, latest action, and status.\n\n" +
      "Congress numbers: 118th (2023-2024), 119th (2025-2026), 117th (2021-2022).\n" +
      "Bill types: hr (House), s (Senate), hjres, sjres, hconres, sconres, hres, sres",
    annotations: { title: "Congress: Search Bills", readOnlyHint: true },
    parameters: z.object({
      query: z.string().optional().describe("Keyword/text search across bill titles and summaries (e.g., 'infrastructure', 'tax reform', 'climate')"),
      congress: z.number().int().optional().describe("Congress number (e.g., 119 for 2025-2026, 118 for 2023-2024). Omit to list bills across all congresses"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).optional().describe("Bill type"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
      offset: z.number().int().optional().describe("Results offset for pagination (default: 0)"),
      fromDateTime: z.string().optional().describe("Filter by update date from this timestamp. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to this timestamp. Format: YYYY-MM-DDT00:00:00Z"),
      sort: z.string().optional().describe("Sort order. Value can be updateDate+asc or updateDate+desc (default: updateDate+desc)"),
    }),
    execute: async ({ query, congress, bill_type, limit, offset, fromDateTime, toDateTime, sort }) => {
      const data = await searchBills({ query, congress, bill_type, limit, offset, fromDateTime, toDateTime, sort });
      const bills = data.bills;
      if (!bills.length) {
        return emptyResponse(query ? `No bills found matching "${query}".` : "No bills found.");
      }
      return listResponse(
        `Bill search${query ? ` "${query}"` : ""}${congress ? ` (${congress}th Congress)` : ""}: ${bills.length} results`,
        { items: bills.map(summarizeBill) },
      );
    },
  },

  {
    name: "congress_bill_details",
    description:
      "Get detailed information about a specific bill including sponsors, cosponsors with party breakdown, " +
      "actions, committees, and current status.",
    annotations: { title: "Congress: Bill Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number (e.g., 119, 118, 117)"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number (e.g., 1, 25, 3076)"),
    }),
    execute: async ({ congress, bill_type, bill_number }) => {
      const { bill, cosponsors, cosponsorPartyBreakdown } = await getBillDetails(congress, bill_type, bill_number);
      const sponsors = bill.sponsors;
      const sponsor = sponsors?.[0];
      return recordResponse(
        `${bill.type ?? ""}${bill.number ?? ""}: ${bill.title ?? "No title"} (${congress}th Congress)`,
        {
          congress,
          type: bill.type ?? null,
          number: bill.number ?? null,
          title: bill.title ?? null,
          introducedDate: bill.introducedDate ?? null,
          sponsor: sponsor ? {
            name: `${sponsor.firstName ?? ""} ${sponsor.lastName ?? ""}`.trim(),
            party: sponsor.party ?? null,
            state: sponsor.state ?? null,
          } : null,
          cosponsors: {
            total: cosponsors.length,
            partyBreakdown: cosponsorPartyBreakdown,
          },
          policyArea: bill.policyArea?.name ?? null,
          latestAction: bill.latestAction ? { text: bill.latestAction.text, date: bill.latestAction.actionDate } : null,
          laws: bill.laws?.map(l => ({ type: l.type, number: l.number })) ?? [],
          congressGovUrl: `https://www.congress.gov/bill/${congress}th-congress/${billTypeToUrlSegment(bill_type)}/${bill_number}`,
        },
      );
    },
  },

  {
    name: "congress_search_members",
    description:
      "Search for members of Congress by state, congress number, district, or get all current members. " +
      "Supports: /member (all), /member/{stateCode} (by state), /member/{stateCode}/{district} (by district), " +
      "/member/congress/{congress} (by congress), /member/congress/{congress}/{stateCode}/{district} (combined).",
    annotations: { title: "Congress: Search Members", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number. When used with state+district, filters to that congress. Use alone to list all members of a congress."),
      state: z.string().optional().describe("Two-letter state code to filter by, e.g. 'CA', 'TX'. Can be used alone or with district."),
      district: z.number().int().optional().describe("House district number (use with state). Returns all historical members for that seat."),
      currentMember: z.boolean().optional().describe("Filter by current member status. true = current members only, false = former only"),
      fromDateTime: z.string().optional().describe("Filter by update date start (YYYY-MM-DDT00:00:00Z)"),
      toDateTime: z.string().optional().describe("Filter by update date end (YYYY-MM-DDT00:00:00Z)"),
      limit: z.number().int().positive().max(250).default(50).describe("Max results (default: 50)"),
    }),
    execute: async ({ congress, state, district, currentMember, fromDateTime, toDateTime, limit }) => {
      const data = await searchMembers({ congress, state, district, currentMember, fromDateTime, toDateTime, limit });
      const members = data.members;
      if (!members.length) {
        return emptyResponse("No members found.");
      }
      return listResponse(
        `Members of Congress: ${members.length} results${state ? ` (${state.toUpperCase()})` : ""}`,
        { items: members.map(summarizeMember) },
      );
    },
  },

  {
    name: "congress_house_votes",
    description:
      "Get House of Representatives roll call vote results with member-level party breakdown. " +
      "Primary source: Congress.gov API (118th-119th Congress); falls back to clerk.house.gov XML for older congresses. " +
      "Coverage: 1990 to present. Use year param for historical votes. " +
      "Cross-reference with: congress_senate_votes (same bill's Senate vote), FEC (congress_member donors via fec_candidate_financials), " +
      "lobbying_search (who lobbied on the bill), FRED (economic impact 1-3 years after passage). " +
      "For Senate votes, use congress_senate_votes.",
    annotations: { title: "Congress: House Roll Call Votes", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number (default: current). Used with session to determine year."),
      session: z.number().int().optional().describe("Session (1 or 2). Default: current session"),
      year: z.number().int().optional().describe("Calendar year (e.g. 2024). Overrides congress+session if provided."),
      vote_number: z.number().int().optional().describe("Specific roll call vote number. Omit to list recent votes."),
      limit: z.number().int().positive().max(250).default(20).describe("Max results when listing votes (default: 20)"),
    }),
    execute: async ({ congress, session, year, vote_number, limit }) => {
      const data = await getHouseVotes({ congress, session, year, vote_number, limit });
      const congressNum = congress ?? currentCongress();

      // Specific vote with member breakdown
      if (data.members && data.partyTally) {
        return recordResponse(
          `House Vote #${vote_number} (${congressNum}th Congress, Session ${session}): ${data.members.length} members voting`,
          {
            congress: congressNum,
            session,
            voteNumber: vote_number,
            totalVoting: data.members.length,
            partyBreakdown: data.partyTally,
          },
        );
      }

      // Specific vote without member breakdown (fallback)
      if (data.vote) {
        const v = data.vote;
        return recordResponse(
          `House Vote #${vote_number} (${congressNum}th Congress): ${v.result ?? "Unknown result"}`,
          {
            congress: congressNum,
            session,
            voteNumber: vote_number,
            question: v.question ?? null,
            description: v.description ?? null,
            result: v.result ?? null,
            date: v.date ?? null,
            bill: v.bill ? { type: v.bill.type, number: v.bill.number } : null,
          },
        );
      }

      // List of recent votes
      const votes = data.votes ?? [];
      if (!votes.length) {
        return emptyResponse("No House votes found.");
      }
      return listResponse(
        `House votes (${congressNum}th Congress${session ? `, Session ${session}` : ""}): ${votes.length} results`,
        { items: votes.map(summarizeVote), meta: { congress: congressNum } },
      );
    },
  },

  {
    name: "congress_senate_votes",
    description:
      "Get Senate roll call vote results from senate.gov XML. " +
      "Shows how senators voted by party on specific legislation, nominations, and procedural motions. " +
      "Coverage: 101st Congress (1989) to present. " +
      "Cross-reference with: congress_house_votes (same bill's House vote), FEC (senator donors via fec_candidate_financials), " +
      "lobbying_search (who lobbied on the bill), congress_member_bills (senator's voting vs sponsoring patterns). " +
      "For House votes, use congress_house_votes.",
    annotations: { title: "Congress: Senate Roll Call Votes", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number (default: current). Coverage: 101st (1989) to present"),
      session: z.number().int().optional().describe("Session (1 or 2). Default: current session (1 for odd years, 2 for even)"),
      vote_number: z.number().int().optional().describe("Specific roll call vote number. Omit to list recent votes."),
      limit: z.number().int().positive().max(250).default(20).describe("Max results when listing votes (default: 20)"),
    }),
    execute: async ({ congress, session, vote_number, limit }) => {
      const data = await getSenateVotes({ congress, session, vote_number, limit });
      const congressNum = congress ?? currentCongress();
      const sessionNum = session ?? (new Date().getFullYear() % 2 === 1 ? 1 : 2);

      // Specific vote with member breakdown
      if (data.members && data.partyTally && data.vote) {
        return recordResponse(
          `Senate Vote #${vote_number} (${congressNum}th Congress, Session ${sessionNum}): ${data.vote.result} — ${data.members.length} senators voting`,
          {
            congress: congressNum,
            session: sessionNum,
            voteNumber: vote_number,
            question: data.vote.question,
            result: data.vote.result,
            title: data.vote.title,
            date: data.vote.date,
            majorityRequired: data.vote.majorityRequired,
            count: data.vote.count,
            document: data.vote.document ?? null,
            tieBreaker: data.vote.tieBreaker ?? null,
            totalVoting: data.members.length,
            partyBreakdown: data.partyTally,
          },
        );
      }

      // List of recent votes
      const votes = data.votes ?? [];
      if (!votes.length) {
        return emptyResponse("No Senate votes found.");
      }
      return listResponse(
        `Senate votes (${congressNum}th Congress, Session ${sessionNum}): ${votes.length} results`,
        {
          items: votes.map((v) => ({
            voteNumber: v.voteNumber,
            date: v.date,
            question: v.question,
            result: v.result,
            title: v.title,
            issue: v.description,
            count: v.count,
          })),
          meta: { congress: congressNum, session: sessionNum },
        },
      );
    },
  },

  {
    name: "congress_recent_laws",
    description:
      "Get recently enacted laws (bills signed by the President). " +
      "Optionally filter by law type (public or private). Shows what legislation has become law.",
    annotations: { title: "Congress: Recent Laws", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number (default: current)"),
      law_type: z.enum(keysEnum(LAW_TYPES)).optional().describe("Law type: pub (public law) or priv (private law). Default: all"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ congress, law_type, limit }) => {
      const congressNum = congress ?? currentCongress();
      const data = await getRecentLaws({ congress, lawType: law_type, limit });
      const laws = data.laws;
      if (!laws.length) {
        return emptyResponse(`No laws found for the ${congressNum}th Congress.`);
      }
      return listResponse(
        `Laws enacted (${congressNum}th Congress): ${laws.length} results`,
        { items: laws.map(summarizeLaw), meta: { congress: congressNum } },
      );
    },
  },

  {
    name: "congress_member_bills",
    description:
      "Get bills sponsored or cosponsored by a specific member of Congress. " +
      "Requires the member's BioGuide ID (use congress_search_members to find it).",
    annotations: { title: "Congress: Member's Sponsored Bills", readOnlyHint: true },
    parameters: z.object({
      bioguide_id: z.string().describe("Member's BioGuide ID (e.g., 'S000033' for Bernie Sanders, 'C001098' for Ted Cruz)"),
      type: z.enum(["sponsored", "cosponsored"]).optional().describe("Bill relationship type (default: sponsored)"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ bioguide_id, type, limit }) => {
      const legType = (type === "cosponsored" ? "cosponsored" : "sponsored") as "sponsored" | "cosponsored";
      const data = await getMemberBills(bioguide_id, legType, limit ?? 20);
      const bills = data.bills;
      if (!bills.length) {
        return emptyResponse(`No ${legType} legislation found for member ${bioguide_id}.`);
      }
      return listResponse(
        `${legType === "cosponsored" ? "Cosponsored" : "Sponsored"} legislation for ${bioguide_id}: ${bills.length} results`,
        { items: bills.map(summarizeSponsoredBill), meta: { bioguideId: bioguide_id, type: legType } },
      );
    },
  },

  // ─── Bill Sub-resource Tools ─────────────────────────────────────

  {
    name: "congress_bill_actions",
    description:
      "Get the full action history / timeline for a bill — every step from introduction through committee, " +
      "floor votes, amendments, and signing. Shows recorded roll-call vote numbers when available.\n\n" +
      "Use congress_search_bills first to find the congress number, bill type, and bill number.",
    annotations: { title: "Congress: Bill Actions/Timeline", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number (e.g., 118)"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number"),
      limit: z.number().int().positive().max(250).default(100).describe("Max actions to return (default: 100)"),
    }),
    execute: async ({ congress, bill_type, bill_number, limit }) => {
      const data = await getBillActions(congress, bill_type, bill_number, limit ?? 100);
      if (!data.actions.length) {
        return emptyResponse(`No actions found for ${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress): ${data.actions.length} actions`,
        {
          items: data.actions.map(a => ({
            date: a.actionDate ?? null,
            text: a.text ?? null,
            type: a.type ?? null,
            actionCode: a.actionCode ?? null,
            sourceSystem: a.sourceSystem?.name ?? null,
            committees: a.committees?.map(c => c.name) ?? null,
            recordedVotes: a.recordedVotes?.map(rv => ({ rollNumber: rv.rollNumber, chamber: rv.chamber, date: rv.date })) ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_bill_amendments",
    description:
      "Get amendments filed on a specific bill. Shows amendment sponsors, " +
      "purposes, and status. Critical for tracking how bills are modified (e.g., 'gutted and replaced').",
    annotations: { title: "Congress: Bill Amendments", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number"),
      limit: z.number().int().positive().max(250).default(50).describe("Max results (default: 50)"),
    }),
    execute: async ({ congress, bill_type, bill_number, limit }) => {
      const data = await getBillAmendments(congress, bill_type, bill_number, limit ?? 50);
      if (!data.amendments.length) {
        return emptyResponse(`No amendments found for ${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress): ${data.amendments.length} amendments`,
        {
          items: data.amendments.map(a => ({
            number: a.number ?? null,
            type: a.type ?? null,
            congress: a.congress ?? null,
            description: a.description ?? null,
            purpose: a.purpose ?? null,
            sponsor: a.sponsor ? { name: `${a.sponsor.firstName ?? ""} ${a.sponsor.lastName ?? ""}`.trim(), party: a.sponsor.party, state: a.sponsor.state, bioguideId: a.sponsor.bioguideId } : null,
            latestAction: a.latestAction ? { text: a.latestAction.text, date: a.latestAction.actionDate } : null,
          })),
        },
      );
    },
  },

  {
    name: "congress_bill_summaries",
    description:
      "Get CRS (Congressional Research Service) summaries of a bill. " +
      "These are plain-English, non-partisan summaries written by CRS analysts. " +
      "Multiple versions may exist (as introduced, as reported, as passed).",
    annotations: { title: "Congress: Bill Summaries", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number"),
    }),
    execute: async ({ congress, bill_type, bill_number }) => {
      const data = await getBillSummaries(congress, bill_type, bill_number);
      if (!data.summaries.length) {
        return emptyResponse(`No CRS summaries available for ${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress): ${data.summaries.length} CRS summaries`,
        {
          items: data.summaries.map(s => ({
            versionCode: s.versionCode ?? null,
            actionDate: s.actionDate ?? null,
            actionDesc: s.actionDesc ?? null,
            text: s.text ?? null,
            updateDate: s.updateDate ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_bill_text",
    description:
      "Get available text versions for a bill (e.g., introduced, reported, engrossed, enrolled). " +
      "Returns version types and format URLs. For full bill text content, use govinfo_bill_text.",
    annotations: { title: "Congress: Bill Text Versions", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number"),
    }),
    execute: async ({ congress, bill_type, bill_number }) => {
      const data = await getBillTextVersions(congress, bill_type, bill_number);
      if (!data.textVersions.length) {
        return emptyResponse(`No text versions found for ${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress): ${data.textVersions.length} text versions`,
        {
          items: data.textVersions.map(t => ({
            type: t.type ?? null,
            date: t.date ?? null,
            formats: t.formats?.map(f => ({ type: f.type, url: f.url })) ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_bill_related",
    description:
      "Find related/companion bills. Identifies House-Senate companion bills, " +
      "identical bills, and bills with related provisions. Useful for tracking legislation across chambers.",
    annotations: { title: "Congress: Related Bills", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number"),
      limit: z.number().int().positive().max(250).default(50).describe("Max results (default: 50)"),
    }),
    execute: async ({ congress, bill_type, bill_number, limit }) => {
      const data = await getBillRelatedBills(congress, bill_type, bill_number, limit ?? 50);
      if (!data.relatedBills.length) {
        return emptyResponse(`No related bills found for ${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress): ${data.relatedBills.length} related bills`,
        {
          items: data.relatedBills.map(r => ({
            type: r.type ?? null,
            number: r.number ?? null,
            congress: r.congress ?? null,
            title: r.title ?? null,
            relationship: r.relationshipDetails?.map(rd => rd.type) ?? null,
            latestAction: r.latestAction ? { text: r.latestAction.text, date: r.latestAction.actionDate } : null,
          })),
        },
      );
    },
  },

  {
    name: "congress_bill_subjects",
    description:
      "Get legislative subjects tagged on a bill, plus the primary policy area. " +
      "Useful for finding all bills on a topic and for cross-referencing with lobbying data.",
    annotations: { title: "Congress: Bill Subjects", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number"),
      limit: z.number().int().positive().max(250).default(100).describe("Max results (default: 100)"),
    }),
    execute: async ({ congress, bill_type, bill_number, limit }) => {
      const data = await getBillSubjects(congress, bill_type, bill_number, limit ?? 100);
      return recordResponse(
        `${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress): ${data.subjects.length} subjects${data.policyArea ? `, policy area: ${data.policyArea}` : ""}`,
        {
          policyArea: data.policyArea ?? null,
          subjects: data.subjects.map(s => s.name),
        },
      );
    },
  },

  {
    name: "congress_bill_committees",
    description:
      "Get committees a bill was referred to, with activity dates. " +
      "Shows which committees had jurisdiction and what actions they took (referral, hearings, markup, reporting).",
    annotations: { title: "Congress: Bill Committees", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number"),
    }),
    execute: async ({ congress, bill_type, bill_number }) => {
      const data = await getBillCommittees(congress, bill_type, bill_number);
      if (!data.committees.length) {
        return emptyResponse(`No committee data for ${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress): referred to ${data.committees.length} committees`,
        {
          items: data.committees.map(c => ({
            name: c.name ?? null,
            systemCode: c.systemCode ?? null,
            chamber: c.chamber ?? null,
            type: c.type ?? null,
            activities: c.activities?.map(a => ({ name: a.name, date: a.date })) ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_bill_titles",
    description:
      "Get all titles for a bill — short titles, official titles, display titles, and titles as they appeared in different text versions. " +
      "Useful for finding the popular name of legislation (e.g., 'Inflation Reduction Act').",
    annotations: { title: "Congress: Bill Titles", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number"),
      limit: z.number().int().positive().max(250).default(100).describe("Max results (default: 100)"),
    }),
    execute: async ({ congress, bill_type, bill_number, limit }) => {
      const data = await getBillTitles(congress, bill_type, bill_number, limit ?? 100);
      if (!data.titles.length) {
        return emptyResponse(`No titles found for ${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress): ${data.titles.length} titles`,
        {
          items: data.titles.map(t => ({
            title: t.title ?? null,
            titleType: t.titleType ?? null,
            titleTypeCode: t.titleTypeCode ?? null,
            billTextVersionCode: t.billTextVersionCode ?? null,
            billTextVersionName: t.billTextVersionName ?? null,
            updateDate: t.updateDate ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_bill_cosponsors",
    description:
      "Get the full list of cosponsors for a bill with party affiliation and sponsorship dates. " +
      "Returns individual cosponsor details unlike congress_bill_details which only provides a party breakdown summary.",
    annotations: { title: "Congress: Bill Cosponsors", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number"),
      limit: z.number().int().positive().max(250).default(250).describe("Max results (default: 250)"),
      sort: z.string().optional().describe("Sort order. Value can be updateDate+asc or updateDate+desc"),
    }),
    execute: async ({ congress, bill_type, bill_number, limit, sort }) => {
      const data = await getBillCosponsors(congress, bill_type, bill_number, { limit, sort });
      const cosponsors = data.cosponsors;
      if (!cosponsors.length) {
        return emptyResponse(`No cosponsors found for ${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress).`);
      }
      const partyBreakdown: Record<string, number> = {};
      for (const c of cosponsors) {
        const party = (c.party ?? "?") as string;
        partyBreakdown[party] = (partyBreakdown[party] ?? 0) + 1;
      }
      return listResponse(
        `${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress): ${cosponsors.length} cosponsors`,
        {
          items: cosponsors.map((c: any) => ({
            firstName: c.firstName ?? null,
            lastName: c.lastName ?? null,
            party: c.party ?? null,
            state: c.state ?? null,
            district: c.district ?? null,
            bioguideId: c.bioguideId ?? c.bioguidId ?? null,
            isOriginalCosponsor: c.isOriginalCosponsor ?? null,
            sponsorshipDate: c.sponsorshipDate ?? null,
          })),
          meta: { totalCosponsors: cosponsors.length, partyBreakdown },
        },
      );
    },
  },

  // ─── Member Details ──────────────────────────────────────────────

  {
    name: "congress_member_details",
    description:
      "Get detailed information about a specific member of Congress by BioGuide ID. " +
      "Returns full bio, party history, all terms served, committee assignments, photo URL, and official website.\n\n" +
      "Use congress_search_members first to find the BioGuide ID.",
    annotations: { title: "Congress: Member Details", readOnlyHint: true },
    parameters: z.object({
      bioguide_id: z.string().describe("BioGuide ID (e.g., 'P000197' for Pelosi, 'M000355' for McConnell)"),
    }),
    execute: async ({ bioguide_id }) => {
      const data = await getMemberDetails(bioguide_id);
      const m = data.member;
      return recordResponse(
        `${m.directOrderName ?? m.invertedOrderName ?? `${m.firstName} ${m.lastName}`} (${m.party ?? "Unknown"}-${m.state ?? "?"})`,
        {
          bioguideId: m.bioguideId ?? bioguide_id,
          name: m.directOrderName ?? `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim(),
          party: m.party ?? null,
          state: m.state ?? null,
          birthYear: m.birthYear ?? null,
          deathYear: m.deathYear ?? null,
          currentMember: m.currentMember ?? null,
          officialWebsiteUrl: m.officialWebsiteUrl ?? null,
          depiction: m.depiction ?? null,
          partyHistory: m.partyHistory ?? null,
          terms: m.terms ?? null,
        },
      );
    },
  },

  // ─── Committees ──────────────────────────────────────────────────

  {
    name: "congress_committees",
    description:
      "List congressional committees. Filter by congress number and/or chamber (house, senate, joint). " +
      "Returns committee name, system code, and chamber.",
    annotations: { title: "Congress: List Committees", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number (e.g., 119). Default: current"),
      chamber: z.enum(keysEnum(CHAMBERS)).optional().describe("Chamber"),
      limit: z.number().int().positive().max(250).default(50).describe("Max results (default: 50)"),
      fromDateTime: z.string().optional().describe("Filter by update date from. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to. Format: YYYY-MM-DDT00:00:00Z"),
    }),
    execute: async ({ congress, chamber, limit, fromDateTime, toDateTime }) => {
      const data = await listCommittees({ congress, chamber, limit, fromDateTime, toDateTime });
      if (!data.committees.length) {
        return emptyResponse("No committees found matching criteria.");
      }
      return listResponse(
        `${data.committees.length} committees${congress ? ` (${congress}th Congress)` : ""}${chamber ? ` — ${chamber}` : ""}`,
        {
          items: data.committees.map(c => ({
            name: c.name ?? null,
            systemCode: c.systemCode ?? null,
            chamber: c.chamber ?? null,
            type: c.type ?? null,
            isCurrent: c.isCurrent ?? null,
            subcommittees: c.subcommittees?.map(sc => sc.name) ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_committee_bills",
    description:
      "Get bills referred to a specific committee. Use congress_committees to find the committee system code. " +
      "Useful for tracking which bills die in committee vs. get reported out.",
    annotations: { title: "Congress: Committee Bills", readOnlyHint: true },
    parameters: z.object({
      chamber: z.enum(keysEnum(CHAMBERS)).describe("Chamber"),
      committee_code: z.string().describe("Committee system code (e.g., 'hsba00' for House Financial Services, 'ssfi00' for Senate Finance)"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ chamber, committee_code, limit }) => {
      const data = await getCommitteeBills(chamber, committee_code, limit ?? 20);
      if (!data.bills.length) {
        return emptyResponse(`No bills found for committee ${committee_code}.`);
      }
      return listResponse(
        `${data.bills.length} bills referred to committee ${committee_code}`,
        { items: data.bills.map(summarizeBill), meta: { committee: committee_code } },
      );
    },
  },

  {
    name: "congress_committee_details",
    description:
      "Get detailed information about a specific congressional committee by chamber and committee code. " +
      "Returns full history, website URL, subcommittees, bill/report counts, and related communications.",
    annotations: { title: "Congress: Committee Details", readOnlyHint: true },
    parameters: z.object({
      chamber: z.enum(keysEnum(CHAMBERS)).describe("Chamber"),
      committee_code: z.string().describe("Committee system code (e.g., 'hspw00' for House Transportation, 'ssju00' for Senate Judiciary)"),
    }),
    execute: async ({ chamber, committee_code }) => {
      const data = await getCommitteeDetails(chamber, committee_code);
      const c = data.committee;
      return recordResponse(
        `${c.name ?? committee_code} (${c.chamber ?? chamber})`,
        {
          systemCode: c.systemCode ?? committee_code,
          name: c.name ?? null,
          chamber: c.chamber ?? null,
          type: c.type ?? null,
          isCurrent: c.isCurrent ?? null,
          committeeWebsiteUrl: c.committeeWebsiteUrl ?? null,
          parent: c.parent ?? null,
          subcommittees: c.subcommittees?.map(sc => ({ name: sc.name, systemCode: sc.systemCode })) ?? null,
          history: c.history ?? null,
          bills: c.bills ?? null,
          reports: c.reports ?? null,
          updateDate: c.updateDate ?? null,
        },
      );
    },
  },

  // ─── Amendments ──────────────────────────────────────────────────

  {
    name: "congress_amendments",
    description:
      "Search/list amendments by congress and optional type (hamdt = House, samdt = Senate, suamdt = Senate Unnumbered). " +
      "Returns amendment number, type, sponsor, purpose, and status.",
    annotations: { title: "Congress: Search Amendments", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number (default: current)"),
      amendment_type: z.enum(keysEnum(AMENDMENT_TYPES)).optional().describe("Amendment type"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
      fromDateTime: z.string().optional().describe("Filter by update date from. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to. Format: YYYY-MM-DDT00:00:00Z"),
    }),
    execute: async ({ congress, amendment_type, limit, fromDateTime, toDateTime }) => {
      const data = await searchAmendments({ congress, amendmentType: amendment_type, limit, fromDateTime, toDateTime });
      if (!data.amendments.length) {
        return emptyResponse("No amendments found.");
      }
      return listResponse(
        `${data.amendments.length} amendments${congress ? ` (${congress}th Congress)` : ""}`,
        {
          items: data.amendments.map(a => ({
            number: a.number ?? null,
            type: a.type ?? null,
            congress: a.congress ?? null,
            description: a.description ?? null,
            purpose: a.purpose ?? null,
            latestAction: a.latestAction ? { text: a.latestAction.text, date: a.latestAction.actionDate } : null,
          })),
        },
      );
    },
  },

  {
    name: "congress_amendment_details",
    description:
      "Get detailed information about a specific amendment, including its actions/timeline. " +
      "Requires congress number, amendment type (hamdt/samdt), and amendment number.",
    annotations: { title: "Congress: Amendment Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      amendment_type: z.enum(keysEnum(AMENDMENT_TYPES)).describe("Amendment type"),
      amendment_number: z.union([z.string(), z.number()]).describe("Amendment number"),
    }),
    execute: async ({ congress, amendment_type, amendment_number }) => {
      const data = await getAmendmentDetails(congress, amendment_type, amendment_number);
      const a = data.amendment;
      return recordResponse(
        `${amendment_type.toUpperCase()} ${amendment_number} (${congress}th Congress)`,
        {
          amendment: {
            number: a.number ?? null,
            type: a.type ?? null,
            congress: a.congress ?? null,
            description: a.description ?? null,
            purpose: a.purpose ?? null,
            sponsor: a.sponsor ? { name: `${a.sponsor.firstName ?? ""} ${a.sponsor.lastName ?? ""}`.trim(), party: a.sponsor.party, state: a.sponsor.state, bioguideId: a.sponsor.bioguideId } : null,
            latestAction: a.latestAction ? { text: a.latestAction.text, date: a.latestAction.actionDate } : null,
          },
          actions: data.actions.map(act => ({
            date: act.actionDate ?? null,
            text: act.text ?? null,
            type: act.type ?? null,
          })),
        },
      );
    },
  },

  // ─── Nominations ─────────────────────────────────────────────────

  {
    name: "congress_nominations",
    description:
      "List presidential nominations to federal offices (judges, cabinet, ambassadors, agency heads). " +
      "Shows nominee name, position, organization, and confirmation status.",
    annotations: { title: "Congress: Nominations", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number (default: current)"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
      fromDateTime: z.string().optional().describe("Filter by update date from. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to. Format: YYYY-MM-DDT00:00:00Z"),
    }),
    execute: async ({ congress, limit, fromDateTime, toDateTime }) => {
      const congressNum = congress ?? currentCongress();
      const data = await listNominations({ congress, limit, fromDateTime, toDateTime });
      if (!data.nominations.length) {
        return emptyResponse(`No nominations found for ${congressNum}th Congress.`);
      }
      return listResponse(
        `${data.nominations.length} nominations (${congressNum}th Congress)`,
        {
          items: data.nominations.map(n => ({
            number: n.number ?? null,
            congress: n.congress ?? null,
            description: n.description ?? null,
            organization: n.organization ?? null,
            receivedDate: n.receivedDate ?? null,
            nominees: n.nominees ?? null,
            latestAction: n.latestAction ? { text: n.latestAction.text, date: n.latestAction.actionDate } : null,
          })),
        },
      );
    },
  },

  {
    name: "congress_nomination_details",
    description:
      "Get detailed information about a specific presidential nomination, including all actions (committee referral, hearing, vote, confirmation/rejection).",
    annotations: { title: "Congress: Nomination Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      nomination_number: z.union([z.string(), z.number()]).describe("Nomination number (PN number)"),
    }),
    execute: async ({ congress, nomination_number }) => {
      const data = await getNominationDetails(congress, nomination_number);
      const n = data.nomination;
      return recordResponse(
        `Nomination PN${nomination_number} (${congress}th Congress)`,
        {
          nomination: {
            number: n.number ?? null,
            congress: n.congress ?? null,
            description: n.description ?? null,
            organization: n.organization ?? null,
            receivedDate: n.receivedDate ?? null,
            nominees: n.nominees ?? null,
            latestAction: n.latestAction ? { text: n.latestAction.text, date: n.latestAction.actionDate } : null,
          },
          actions: data.actions.map(a => ({
            date: a.actionDate ?? null,
            text: a.text ?? null,
            type: a.type ?? null,
          })),
        },
      );
    },
  },

  // ─── Treaties ────────────────────────────────────────────────────

  {
    name: "congress_treaties",
    description:
      "List treaties submitted to the Senate. Shows treaty topic, " +
      "date transmitted, and ratification status.",
    annotations: { title: "Congress: Treaties", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number (default: all)"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
      fromDateTime: z.string().optional().describe("Filter by update date from. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to. Format: YYYY-MM-DDT00:00:00Z"),
    }),
    execute: async ({ congress, limit, fromDateTime, toDateTime }) => {
      const data = await listTreaties({ congress, limit, fromDateTime, toDateTime });
      if (!data.treaties.length) {
        return emptyResponse("No treaties found.");
      }
      return listResponse(
        `${data.treaties.length} treaties${congress ? ` (${congress}th Congress)` : ""}`,
        {
          items: data.treaties.map(t => ({
            number: t.number ?? null,
            suffix: t.suffix ?? null,
            congress: t.congress ?? null,
            topic: t.topic ?? null,
            transmittedDate: t.transmittedDate ?? null,
            inForceDate: t.inForceDate ?? null,
            latestAction: t.latestAction ? { text: t.latestAction.text, date: t.latestAction.actionDate } : null,
          })),
        },
      );
    },
  },

  {
    name: "congress_treaty_details",
    description:
      "Get detailed information about a specific treaty, including all Senate actions (committee referral, hearings, ratification vote).",
    annotations: { title: "Congress: Treaty Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress in which the treaty was received"),
      treaty_number: z.union([z.string(), z.number()]).describe("Treaty document number"),
    }),
    execute: async ({ congress, treaty_number }) => {
      const data = await getTreatyDetails(congress, treaty_number);
      const t = data.treaty;
      return recordResponse(
        `Treaty Doc. ${treaty_number} (${congress}th Congress): ${t.topic ?? "No topic"}`,
        {
          treaty: {
            number: t.number ?? null,
            suffix: t.suffix ?? null,
            congress: t.congress ?? null,
            congressReceived: t.congressReceived ?? null,
            topic: t.topic ?? null,
            transmittedDate: t.transmittedDate ?? null,
            inForceDate: t.inForceDate ?? null,
            resolutionText: t.resolutionText ?? null,
            latestAction: t.latestAction ? { text: t.latestAction.text, date: t.latestAction.actionDate } : null,
          },
          actions: data.actions.map(a => ({
            date: a.actionDate ?? null,
            text: a.text ?? null,
            type: a.type ?? null,
          })),
        },
      );
    },
  },

  // ─── CRS Reports ─────────────────────────────────────────────────

  {
    name: "congress_crs_reports",
    description:
      "Get Congressional Research Service reports — authoritative, nonpartisan analysis on legislative topics. " +
      "CRS reports are considered the gold standard for policy research.",
    annotations: { title: "Congress: CRS Reports", readOnlyHint: true },
    parameters: z.object({
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
      fromDateTime: z.string().optional().describe("Filter by update date from. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to. Format: YYYY-MM-DDT00:00:00Z"),
    }),
    execute: async ({ limit, fromDateTime, toDateTime }) => {
      const data = await searchCrsReports({ limit, fromDateTime, toDateTime });
      if (!data.reports.length) {
        return emptyResponse("No CRS reports found.");
      }
      return listResponse(
        `${data.reports.length} CRS reports`,
        {
          items: data.reports.map(r => ({
            reportNumber: r.reportNumber ?? null,
            title: r.title ?? null,
            type: r.type ?? null,
            activeRecord: r.activeRecord ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_crs_report_details",
    description:
      "Get detailed information about a specific CRS report by report number/ID. " +
      "Returns full summary, authors, topics, related legislation, and format links (PDF, etc.).",
    annotations: { title: "Congress: CRS Report Details", readOnlyHint: true },
    parameters: z.object({
      report_number: z.string().describe("The report number or ID (e.g., 'R47175', 'RL33110', 'IF12345')"),
    }),
    execute: async ({ report_number }) => {
      const data = await getCrsReportDetails(report_number);
      const r = data.report;
      return recordResponse(
        `CRS Report ${report_number}: ${r.title ?? "No title"}`,
        {
          reportNumber: r.id ?? r.reportNumber ?? report_number,
          title: r.title ?? null,
          status: r.status ?? null,
          contentType: r.contentType ?? r.type ?? null,
          publishDate: r.publishDate ?? null,
          updateDate: r.updateDate ?? null,
          summary: r.summary ?? null,
          authors: r.authors ?? null,
          topics: r.topics ?? null,
          formats: r.formats ?? null,
          relatedMaterials: r.relatedMaterials ?? null,
          url: r.url ?? null,
        },
      );
    },
  },

  // ─── Summaries Search ────────────────────────────────────────────

  {
    name: "congress_summaries_search",
    description:
      "Search bill summaries across all bills and congresses. Unlike congress_bill_summaries (which requires a specific bill), " +
      "this searches CRS summaries across the entire collection. Filter by congress, bill type, and date range. " +
      "Sorted by last update date. Results include the associated bill reference.",
    annotations: { title: "Congress: Search Summaries", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number to filter by (omit for all congresses)"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).optional().describe("Bill type to filter by"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
      fromDateTime: z.string().optional().describe("Filter by update date from. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to. Format: YYYY-MM-DDT00:00:00Z"),
      sort: z.string().optional().describe("Sort order: updateDate+asc or updateDate+desc"),
    }),
    execute: async ({ congress, bill_type, limit, fromDateTime, toDateTime, sort }) => {
      const data = await searchSummaries({ congress, billType: bill_type, limit, fromDateTime, toDateTime, sort });
      if (!data.summaries.length) {
        return emptyResponse("No summaries found.");
      }
      return listResponse(
        `${data.summaries.length} bill summaries${congress ? ` (${congress}th Congress)` : ""}`,
        {
          items: data.summaries.map(s => ({
            actionDate: s.actionDate ?? null,
            actionDesc: s.actionDesc ?? null,
            text: s.text ?? null,
            updateDate: s.updateDate ?? null,
            bill: s.bill ? {
              congress: s.bill.congress ?? null,
              type: s.bill.type ?? null,
              number: s.bill.number ?? null,
              title: s.bill.title ?? null,
              url: s.bill.url ?? null,
            } : null,
            currentChamber: s.currentChamber ?? null,
          })),
        },
      );
    },
  },

  // ─── Congress Info ───────────────────────────────────────────────

  {
    name: "congress_info",
    description:
      "Get information about congresses and their sessions — start/end dates, session numbers, and chambers. " +
      "Use to look up when a congress was in session, or get current congress details.",
    annotations: { title: "Congress: Congress Info", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Specific congress number (e.g., 118). Omit to list recent congresses"),
      current: z.boolean().optional().describe("Set true to get the current congress info"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results when listing (default: 20)"),
    }),
    execute: async ({ congress, current, limit }) => {
      const data = await getCongressInfo({ congress, current, limit });
      if (!data.congresses.length) {
        return emptyResponse("No congress data found.");
      }
      return listResponse(
        data.congresses.length === 1
          ? `${data.congresses[0].name ?? `Congress #${congress}`}`
          : `${data.congresses.length} congresses`,
        {
          items: data.congresses.map(c => ({
            name: c.name ?? null,
            number: c.number ?? null,
            startYear: c.startYear ?? null,
            endYear: c.endYear ?? null,
            sessions: c.sessions ?? null,
            url: c.url ?? null,
          })),
        },
      );
    },
  },

  // ─── Congressional Record ────────────────────────────────────────

  {
    name: "congress_congressional_record",
    description:
      "Get Congressional Record issues — the official daily record of debate, speeches, and proceedings in Congress. " +
      "Filter by year, month, and day.",
    annotations: { title: "Congress: Congressional Record", readOnlyHint: true },
    parameters: z.object({
      year: z.number().int().optional().describe("Year (e.g., 2024)"),
      month: z.number().int().min(1).max(12).optional().describe("Month (1-12)"),
      day: z.number().int().min(1).max(31).optional().describe("Day of month"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ year, month, day, limit }) => {
      const data = await getCongressionalRecord({ year, month, day, limit });
      if (!data.issues.length) {
        return emptyResponse("No Congressional Record issues found.");
      }
      return listResponse(
        `${data.issues.length} Congressional Record issues`,
        {
          items: data.issues.map(i => ({
            issueNumber: i.issueNumber ?? null,
            volumeNumber: i.volumeNumber ?? null,
            issueDate: i.issueDate ?? null,
            congress: i.congress ?? null,
            sessionNumber: i.sessionNumber ?? null,
            url: i.url ?? null,
          })),
        },
      );
    },
  },

  // ─── Law Details ─────────────────────────────────────────────────

  {
    name: "congress_law_details",
    description:
      "Get detailed information about a specific public or private law, including sponsors, CBO cost estimates, " +
      "committee reports, and constitutional authority statement. Requires congress number, law type, and law number.",
    annotations: { title: "Congress: Law Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number (e.g., 118, 119)"),
      law_type: z.enum(keysEnum(LAW_TYPES)).describe(`Law type: ${describeEnum(LAW_TYPES)}`),
      law_number: z.number().int().describe("Law number (e.g., 274 for Public Law 118-274)"),
    }),
    execute: async ({ congress, law_type, law_number }) => {
      const data = await getLawDetails(congress, law_type, law_number);
      const law = data.law;
      return recordResponse(
        `${law_type === "pub" ? "Public" : "Private"} Law ${congress}-${law_number}: ${law.title ?? "No title"}`,
        {
          congress,
          type: law.type ?? null,
          number: law.number ?? null,
          title: law.title ?? null,
          introducedDate: law.introducedDate ?? null,
          sponsors: law.sponsors ?? null,
          policyArea: law.policyArea?.name ?? null,
          latestAction: law.latestAction ? { text: law.latestAction.text, date: law.latestAction.actionDate } : null,
          laws: law.laws ?? null,
        },
      );
    },
  },

  // ─── Committee Reports ───────────────────────────────────────────

  {
    name: "congress_committee_reports",
    description:
      "List committee reports — formal reports accompanying legislation reported out of committee. " +
      "Filter by congress, report type (hrpt/srpt/erpt), and conference report flag. " +
      "Critical for understanding committee intent and legislative history.",
    annotations: { title: "Congress: Committee Reports", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number"),
      report_type: z.enum(keysEnum(REPORT_TYPES)).optional().describe(`Report type: ${describeEnum(REPORT_TYPES)}`),
      conference: z.boolean().optional().describe("Filter to conference reports only"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
      fromDateTime: z.string().optional().describe("Filter by update date from. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to. Format: YYYY-MM-DDT00:00:00Z"),
    }),
    execute: async ({ congress, report_type, conference, limit, fromDateTime, toDateTime }) => {
      const data = await listCommitteeReports({ congress, reportType: report_type, conference, limit, fromDateTime, toDateTime });
      if (!data.reports.length) {
        return emptyResponse("No committee reports found.");
      }
      return listResponse(
        `${data.reports.length} committee reports${congress ? ` (${congress}th Congress)` : ""}`,
        {
          items: data.reports.map(r => ({
            citation: r.citation ?? null,
            congress: r.congress ?? null,
            number: r.number ?? null,
            type: r.type ?? null,
            chamber: r.chamber ?? null,
            updateDate: r.updateDate ?? null,
            url: r.url ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_committee_report_details",
    description:
      "Get detailed information about a specific committee report, including associated bills, " +
      "title, issue date, and text versions.",
    annotations: { title: "Congress: Committee Report Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      report_type: z.enum(keysEnum(REPORT_TYPES)).describe(`Report type: ${describeEnum(REPORT_TYPES)}`),
      report_number: z.number().int().describe("Report number (e.g., 617)"),
    }),
    execute: async ({ congress, report_type, report_number }) => {
      const data = await getCommitteeReportDetails(congress, report_type, report_number);
      const r = data.report;
      return recordResponse(
        `${r.citation ?? `${report_type.toUpperCase()} ${report_number}`} (${congress}th Congress)`,
        {
          citation: r.citation ?? null,
          congress: r.congress ?? null,
          title: r.title ?? null,
          type: r.type ?? null,
          chamber: r.chamber ?? null,
          isConferenceReport: r.isConferenceReport ?? null,
          issueDate: r.issueDate ?? null,
          sessionNumber: r.sessionNumber ?? null,
          associatedBill: r.associatedBill ?? null,
          text: r.text ?? null,
          updateDate: r.updateDate ?? null,
        },
      );
    },
  },

  // ─── Committee Prints ────────────────────────────────────────────

  {
    name: "congress_committee_prints",
    description:
      "List committee prints — publications ordered by committees that are not committee reports. " +
      "Often include Rules Committee prints with bill text for floor consideration.",
    annotations: { title: "Congress: Committee Prints", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number"),
      chamber: z.enum(keysEnum(CHAMBERS)).optional().describe("Chamber"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
      fromDateTime: z.string().optional().describe("Filter by update date from. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to. Format: YYYY-MM-DDT00:00:00Z"),
    }),
    execute: async ({ congress, chamber, limit, fromDateTime, toDateTime }) => {
      const data = await listCommitteePrints({ congress, chamber, limit, fromDateTime, toDateTime });
      if (!data.prints.length) {
        return emptyResponse("No committee prints found.");
      }
      return listResponse(
        `${data.prints.length} committee prints${congress ? ` (${congress}th Congress)` : ""}`,
        {
          items: data.prints.map(p => ({
            chamber: p.chamber ?? null,
            congress: p.congress ?? null,
            jacketNumber: p.jacketNumber ?? null,
            title: p.title ?? null,
            updateDate: p.updateDate ?? null,
            url: p.url ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_committee_print_details",
    description:
      "Get details about a specific committee print by congress, chamber, and jacket number.",
    annotations: { title: "Congress: Committee Print Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      chamber: z.enum(keysEnum(CHAMBERS)).describe("Chamber"),
      jacket_number: z.number().int().describe("Jacket number (e.g., 48144)"),
    }),
    execute: async ({ congress, chamber, jacket_number }) => {
      const data = await getCommitteePrintDetails(congress, chamber, jacket_number);
      const p = data.print;
      return recordResponse(
        `Committee Print ${p.citation ?? jacket_number} (${congress}th Congress)`,
        {
          chamber: p.chamber ?? null,
          congress: p.congress ?? null,
          jacketNumber: p.jacketNumber ?? null,
          citation: p.citation ?? null,
          number: p.number ?? null,
          title: p.title ?? null,
          committees: p.committees ?? null,
          associatedBills: p.associatedBills ?? null,
          text: p.text ?? null,
          updateDate: p.updateDate ?? null,
        },
      );
    },
  },

  // ─── Committee Meetings ──────────────────────────────────────────

  {
    name: "congress_committee_meetings",
    description:
      "List committee meetings (hearings, markups, etc.) with dates, locations, and topics. " +
      "Filter by congress and chamber.",
    annotations: { title: "Congress: Committee Meetings", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number"),
      chamber: z.enum(keysEnum(CHAMBERS)).optional().describe("Chamber"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
      fromDateTime: z.string().optional().describe("Filter by update date from. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to. Format: YYYY-MM-DDT00:00:00Z"),
    }),
    execute: async ({ congress, chamber, limit, fromDateTime, toDateTime }) => {
      const data = await listCommitteeMeetings({ congress, chamber, limit, fromDateTime, toDateTime });
      if (!data.meetings.length) {
        return emptyResponse("No committee meetings found.");
      }
      return listResponse(
        `${data.meetings.length} committee meetings${congress ? ` (${congress}th Congress)` : ""}`,
        {
          items: data.meetings.map(m => ({
            congress: m.congress ?? null,
            chamber: m.chamber ?? null,
            eventid: m.eventid ?? null,
            updateDate: m.updateDate ?? null,
            url: m.url ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_committee_meeting_details",
    description:
      "Get detailed information about a specific committee meeting including title, committees, " +
      "witnesses, meeting documents, related bills, and video links.",
    annotations: { title: "Congress: Committee Meeting Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      chamber: z.enum(keysEnum(CHAMBERS)).describe("Chamber"),
      event_id: z.string().describe("Event ID (e.g., '115538')"),
    }),
    execute: async ({ congress, chamber, event_id }) => {
      const data = await getCommitteeMeetingDetails(congress, chamber, event_id);
      const m = data.meeting;
      return recordResponse(
        `Committee Meeting ${event_id}: ${m.title ?? "No title"}`,
        {
          congress: m.congress ?? null,
          chamber: m.chamber ?? null,
          eventid: m.eventid ?? event_id,
          date: m.date ?? null,
          title: m.title ?? null,
          type: m.type ?? null,
          meetingStatus: m.meetingStatus ?? null,
          location: m.location ?? null,
          committees: m.committees ?? null,
          witnesses: m.witnesses ?? null,
          meetingDocuments: m.meetingDocuments ?? null,
          videos: m.videos ?? null,
          relatedItems: m.relatedItems ?? null,
          updateDate: m.updateDate ?? null,
        },
      );
    },
  },

  // ─── Hearings ────────────────────────────────────────────────────

  {
    name: "congress_hearings",
    description:
      "List congressional hearings. Filter by congress and chamber. " +
      "Hearings are formal proceedings where committees gather testimony from witnesses.",
    annotations: { title: "Congress: Hearings", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number"),
      chamber: z.enum(keysEnum(CHAMBERS)).optional().describe("Chamber"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ congress, chamber, limit }) => {
      const data = await listHearings({ congress, chamber, limit });
      if (!data.hearings.length) {
        return emptyResponse("No hearings found.");
      }
      return listResponse(
        `${data.hearings.length} hearings${congress ? ` (${congress}th Congress)` : ""}`,
        {
          items: data.hearings.map(h => ({
            congress: h.congress ?? null,
            chamber: h.chamber ?? null,
            jacketNumber: h.jacketNumber ?? null,
            updateDate: h.updateDate ?? null,
            url: h.url ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_hearing_details",
    description:
      "Get detailed information about a specific hearing including title, date, committees, " +
      "associated meeting, citation, and available text formats.",
    annotations: { title: "Congress: Hearing Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      chamber: z.enum(keysEnum(CHAMBERS)).describe("Chamber"),
      jacket_number: z.number().int().describe("Hearing jacket number"),
    }),
    execute: async ({ congress, chamber, jacket_number }) => {
      const data = await getHearingDetails(congress, chamber, jacket_number);
      const h = data.hearing;
      return recordResponse(
        `Hearing ${h.citation ?? jacket_number} (${congress}th Congress): ${h.title ?? "No title"}`,
        {
          congress: h.congress ?? null,
          chamber: h.chamber ?? null,
          jacketNumber: h.jacketNumber ?? jacket_number,
          citation: h.citation ?? null,
          title: h.title ?? null,
          dates: h.dates ?? null,
          committees: h.committees ?? null,
          formats: h.formats ?? null,
          associatedMeeting: h.associatedMeeting ?? null,
          updateDate: h.updateDate ?? null,
        },
      );
    },
  },

  // ─── Daily Congressional Record ──────────────────────────────────

  {
    name: "congress_daily_congressional_record",
    description:
      "Get daily Congressional Record issues with sections (Senate, House, Extensions of Remarks, Daily Digest). " +
      "Filter by volume and issue number for specific issues, or list recent issues.",
    annotations: { title: "Congress: Daily Congressional Record", readOnlyHint: true },
    parameters: z.object({
      volume_number: z.number().int().optional().describe("Volume number (e.g., 171)"),
      issue_number: z.number().int().optional().describe("Issue number (requires volume_number)"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ volume_number, issue_number, limit }) => {
      const data = await getDailyCongressionalRecord({ volumeNumber: volume_number, issueNumber: issue_number, limit });
      if (data.issue) {
        return recordResponse(
          `Daily Congressional Record Vol. ${volume_number} No. ${issue_number}`,
          {
            congress: data.issue.congress ?? null,
            issueDate: data.issue.issueDate ?? null,
            issueNumber: data.issue.issueNumber ?? null,
            volumeNumber: data.issue.volumeNumber ?? null,
            sessionNumber: data.issue.sessionNumber ?? null,
            fullIssue: data.issue.fullIssue ?? null,
            updateDate: data.issue.updateDate ?? null,
          },
        );
      }
      if (!data.issues.length) {
        return emptyResponse("No daily Congressional Record issues found.");
      }
      return listResponse(
        `${data.issues.length} daily Congressional Record issues`,
        {
          items: data.issues.map(i => ({
            congress: i.congress ?? null,
            issueDate: i.issueDate ?? null,
            issueNumber: i.issueNumber ?? null,
            volumeNumber: i.volumeNumber ?? null,
            sessionNumber: i.sessionNumber ?? null,
            url: i.url ?? null,
          })),
        },
      );
    },
  },

  // ─── Bound Congressional Record ──────────────────────────────────

  {
    name: "congress_bound_congressional_record",
    description:
      "Get bound Congressional Record issues — the permanent, final publication of proceedings. " +
      "Filter by year, month, and day.",
    annotations: { title: "Congress: Bound Congressional Record", readOnlyHint: true },
    parameters: z.object({
      year: z.number().int().optional().describe("Year (e.g., 1990)"),
      month: z.number().int().min(1).max(12).optional().describe("Month (1-12)"),
      day: z.number().int().min(1).max(31).optional().describe("Day of month"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ year, month, day, limit }) => {
      const data = await getBoundCongressionalRecord({ year, month, day, limit });
      if (!data.records.length) {
        return emptyResponse("No bound Congressional Record issues found.");
      }
      return listResponse(
        `${data.records.length} bound Congressional Record issues`,
        {
          items: data.records.map(r => ({
            congress: r.congress ?? null,
            date: r.date ?? null,
            sessionNumber: r.sessionNumber ?? null,
            volumeNumber: r.volumeNumber ?? null,
            updateDate: r.updateDate ?? null,
            url: r.url ?? null,
          })),
        },
      );
    },
  },

  // ─── House Communications ────────────────────────────────────────

  {
    name: "congress_house_communications",
    description:
      "List House communications — executive communications, memorials, presidential messages, and petitions " +
      "referred to House committees. Types: ec (Executive Communication), ml (Memorial), pm (Presidential Message), pt (Petition).",
    annotations: { title: "Congress: House Communications", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number"),
      communication_type: z.enum(keysEnum(HOUSE_COMMUNICATION_TYPES)).optional().describe(`Communication type: ${describeEnum(HOUSE_COMMUNICATION_TYPES)}`),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ congress, communication_type, limit }) => {
      const data = await listHouseCommunications({ congress, communicationType: communication_type, limit });
      if (!data.communications.length) {
        return emptyResponse("No House communications found.");
      }
      return listResponse(
        `${data.communications.length} House communications${congress ? ` (${congress}th Congress)` : ""}`,
        {
          items: data.communications.map(c => ({
            congress: c.congress ?? c.congressNumber ?? null,
            number: c.number ?? null,
            communicationType: c.communicationType ?? null,
            updateDate: c.updateDate ?? null,
            url: c.url ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_house_communication_details",
    description:
      "Get detailed information about a specific House communication including abstract, " +
      "committees, submitting agency, and legal authority.",
    annotations: { title: "Congress: House Communication Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      communication_type: z.enum(keysEnum(HOUSE_COMMUNICATION_TYPES)).describe(`Communication type: ${describeEnum(HOUSE_COMMUNICATION_TYPES)}`),
      communication_number: z.number().int().describe("Communication number"),
    }),
    execute: async ({ congress, communication_type, communication_number }) => {
      const data = await getHouseCommunicationDetails(congress, communication_type, communication_number);
      const c = data.communication;
      return recordResponse(
        `House Communication ${communication_type.toUpperCase()} ${communication_number} (${congress}th Congress)`,
        {
          congress: c.congress ?? null,
          number: c.number ?? null,
          communicationType: c.communicationType ?? null,
          abstract: c.abstract ?? null,
          committees: c.committees ?? null,
          submittingAgency: c.submittingAgency ?? null,
          submittingOfficial: c.submittingOfficial ?? null,
          legalAuthority: c.legalAuthority ?? null,
          isRulemaking: c.isRulemaking ?? null,
          reportNature: c.reportNature ?? null,
          congressionalRecordDate: c.congressionalRecordDate ?? null,
          sessionNumber: c.sessionNumber ?? null,
          matchingRequirements: c.matchingRequirements ?? null,
          updateDate: c.updateDate ?? null,
        },
      );
    },
  },

  // ─── House Requirements ──────────────────────────────────────────

  {
    name: "congress_house_requirements",
    description:
      "List House requirements — recurring reporting obligations from executive agencies to Congress. " +
      "Shows requirement number, frequency, and matching communications count.",
    annotations: { title: "Congress: House Requirements", readOnlyHint: true },
    parameters: z.object({
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ limit }) => {
      const data = await listHouseRequirements({ limit });
      if (!data.requirements.length) {
        return emptyResponse("No House requirements found.");
      }
      return listResponse(
        `${data.requirements.length} House requirements`,
        {
          items: data.requirements.map(r => ({
            number: r.number ?? null,
            updateDate: r.updateDate ?? null,
            url: r.url ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_house_requirement_details",
    description:
      "Get detailed information about a specific House requirement including legal authority, " +
      "frequency, nature, and matching communications count.",
    annotations: { title: "Congress: House Requirement Details", readOnlyHint: true },
    parameters: z.object({
      requirement_number: z.number().int().describe("Requirement number (e.g., 8070)"),
    }),
    execute: async ({ requirement_number }) => {
      const data = await getHouseRequirementDetails(requirement_number);
      const r = data.requirement;
      return recordResponse(
        `House Requirement #${requirement_number}`,
        {
          number: r.number ?? requirement_number,
          activeRecord: r.activeRecord ?? null,
          frequency: r.frequency ?? null,
          nature: r.nature ?? null,
          legalAuthority: r.legalAuthority ?? null,
          parentAgency: r.parentAgency ?? null,
          submittingAgency: r.submittingAgency ?? null,
          matchingCommunications: r.matchingCommunications ?? null,
          updateDate: r.updateDate ?? null,
        },
      );
    },
  },

  // ─── Senate Communications ───────────────────────────────────────

  {
    name: "congress_senate_communications",
    description:
      "List Senate communications — executive communications, presidential messages, and petitions/memorials " +
      "referred to Senate committees. Types: ec (Executive Communication), pm (Presidential Message), pom (Petition or Memorial).",
    annotations: { title: "Congress: Senate Communications", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().optional().describe("Congress number"),
      communication_type: z.enum(keysEnum(SENATE_COMMUNICATION_TYPES)).optional().describe(`Communication type: ${describeEnum(SENATE_COMMUNICATION_TYPES)}`),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ congress, communication_type, limit }) => {
      const data = await listSenateCommunications({ congress, communicationType: communication_type, limit });
      if (!data.communications.length) {
        return emptyResponse("No Senate communications found.");
      }
      return listResponse(
        `${data.communications.length} Senate communications${congress ? ` (${congress}th Congress)` : ""}`,
        {
          items: data.communications.map(c => ({
            congress: c.congress ?? null,
            number: c.number ?? null,
            communicationType: c.communicationType ?? null,
            updateDate: c.updateDate ?? null,
            url: c.url ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_senate_communication_details",
    description:
      "Get detailed information about a specific Senate communication including abstract, " +
      "committees, and congressional record date.",
    annotations: { title: "Congress: Senate Communication Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      communication_type: z.enum(keysEnum(SENATE_COMMUNICATION_TYPES)).describe(`Communication type: ${describeEnum(SENATE_COMMUNICATION_TYPES)}`),
      communication_number: z.number().int().describe("Communication number"),
    }),
    execute: async ({ congress, communication_type, communication_number }) => {
      const data = await getSenateCommunicationDetails(congress, communication_type, communication_number);
      const c = data.communication;
      return recordResponse(
        `Senate Communication ${communication_type.toUpperCase()} ${communication_number} (${congress}th Congress)`,
        {
          congress: c.congress ?? null,
          number: c.number ?? null,
          communicationType: c.communicationType ?? null,
          abstract: c.abstract ?? null,
          committees: c.committees ?? null,
          congressionalRecordDate: c.congressionalRecordDate ?? null,
          sessionNumber: c.sessionNumber ?? null,
          updateDate: c.updateDate ?? null,
        },
      );
    },
  },

  // ─── Nomination Sub-resources ────────────────────────────────────

  {
    name: "congress_nomination_committees",
    description:
      "Get committees associated with a nomination. Shows committee activities (referral, hearing, discharge).",
    annotations: { title: "Congress: Nomination Committees", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      nomination_number: z.union([z.string(), z.number()]).describe("Nomination number"),
    }),
    execute: async ({ congress, nomination_number }) => {
      const data = await getNominationCommittees(congress, nomination_number);
      if (!data.committees.length) {
        return emptyResponse(`No committees found for nomination PN${nomination_number} (${congress}th Congress).`);
      }
      return listResponse(
        `Nomination PN${nomination_number} (${congress}th Congress): ${data.committees.length} committees`,
        {
          items: data.committees.map(c => ({
            name: c.name ?? null,
            systemCode: c.systemCode ?? null,
            chamber: c.chamber ?? null,
            type: c.type ?? null,
            activities: c.activities?.map(a => ({ name: a.name, date: a.date })) ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_nomination_hearings",
    description:
      "Get printed hearings associated with a nomination. Shows hearing dates, citations, and chambers.",
    annotations: { title: "Congress: Nomination Hearings", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      nomination_number: z.union([z.string(), z.number()]).describe("Nomination number"),
    }),
    execute: async ({ congress, nomination_number }) => {
      const data = await getNominationHearings(congress, nomination_number);
      if (!data.hearings.length) {
        return emptyResponse(`No hearings found for nomination PN${nomination_number} (${congress}th Congress).`);
      }
      return listResponse(
        `Nomination PN${nomination_number} (${congress}th Congress): ${data.hearings.length} hearings`,
        {
          items: data.hearings.map(h => ({
            jacketNumber: h.jacketNumber ?? null,
            citation: h.citation ?? null,
            chamber: h.chamber ?? null,
            dates: h.dates ?? null,
            url: h.url ?? null,
          })),
        },
      );
    },
  },

  // ─── Treaty Sub-resources ────────────────────────────────────────

  {
    name: "congress_treaty_committees",
    description:
      "Get committees associated with a treaty. Typically the Senate Foreign Relations Committee.",
    annotations: { title: "Congress: Treaty Committees", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      treaty_number: z.union([z.string(), z.number()]).describe("Treaty document number"),
    }),
    execute: async ({ congress, treaty_number }) => {
      const data = await getTreatyCommittees(congress, treaty_number);
      if (!data.committees.length) {
        return emptyResponse(`No committees found for Treaty Doc. ${treaty_number} (${congress}th Congress).`);
      }
      return listResponse(
        `Treaty Doc. ${treaty_number} (${congress}th Congress): ${data.committees.length} committees`,
        {
          items: data.committees.map(c => ({
            name: c.name ?? null,
            systemCode: c.systemCode ?? null,
            chamber: c.chamber ?? null,
            type: c.type ?? null,
            activities: c.activities?.map(a => ({ name: a.name, date: a.date })) ?? null,
          })),
        },
      );
    },
  },

  // ─── Amendment Sub-resources ─────────────────────────────────────

  {
    name: "congress_amendment_text",
    description:
      "Get text versions for a specific amendment (from 117th Congress onwards). " +
      "Returns version types and format URLs (PDF, HTML).",
    annotations: { title: "Congress: Amendment Text", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number (117th onwards)"),
      amendment_type: z.enum(keysEnum(AMENDMENT_TYPES)).describe("Amendment type"),
      amendment_number: z.union([z.string(), z.number()]).describe("Amendment number"),
    }),
    execute: async ({ congress, amendment_type, amendment_number }) => {
      const data = await getAmendmentText(congress, amendment_type, amendment_number);
      if (!data.textVersions.length) {
        return emptyResponse(`No text versions found for ${amendment_type.toUpperCase()} ${amendment_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${amendment_type.toUpperCase()} ${amendment_number} (${congress}th Congress): ${data.textVersions.length} text versions`,
        {
          items: data.textVersions.map(t => ({
            type: t.type ?? null,
            date: t.date ?? null,
            formats: t.formats?.map(f => ({ type: f.type, url: f.url })) ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_amendment_cosponsors",
    description:
      "Get cosponsors of a specific amendment. Shows party affiliation and sponsorship details.",
    annotations: { title: "Congress: Amendment Cosponsors", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      amendment_type: z.enum(keysEnum(AMENDMENT_TYPES)).describe("Amendment type"),
      amendment_number: z.union([z.string(), z.number()]).describe("Amendment number"),
      limit: z.number().int().positive().max(250).default(250).describe("Max results (default: 250)"),
    }),
    execute: async ({ congress, amendment_type, amendment_number, limit }) => {
      const data = await getAmendmentCosponsors(congress, amendment_type, amendment_number, limit ?? 250);
      if (!data.cosponsors.length) {
        return emptyResponse(`No cosponsors found for ${amendment_type.toUpperCase()} ${amendment_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${amendment_type.toUpperCase()} ${amendment_number} (${congress}th Congress): ${data.cosponsors.length} cosponsors`,
        {
          items: data.cosponsors.map(c => ({
            firstName: c.firstName ?? null,
            lastName: c.lastName ?? null,
            party: c.party ?? null,
            state: c.state ?? null,
            bioguideId: c.bioguideId ?? c.bioguidId ?? null,
            isOriginalCosponsor: c.isOriginalCosponsor ?? null,
            sponsorshipDate: c.sponsorshipDate ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_amendment_amendments",
    description:
      "Get sub-amendments to a specific amendment. Shows amendments that modify the parent amendment.",
    annotations: { title: "Congress: Sub-Amendments", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      amendment_type: z.enum(keysEnum(AMENDMENT_TYPES)).describe("Amendment type"),
      amendment_number: z.union([z.string(), z.number()]).describe("Amendment number"),
      limit: z.number().int().positive().max(250).default(50).describe("Max results (default: 50)"),
    }),
    execute: async ({ congress, amendment_type, amendment_number, limit }) => {
      const data = await getAmendmentAmendments(congress, amendment_type, amendment_number, limit ?? 50);
      if (!data.amendments.length) {
        return emptyResponse(`No sub-amendments found for ${amendment_type.toUpperCase()} ${amendment_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${amendment_type.toUpperCase()} ${amendment_number} (${congress}th Congress): ${data.amendments.length} sub-amendments`,
        {
          items: data.amendments.map(a => ({
            number: a.number ?? null,
            type: a.type ?? null,
            congress: a.congress ?? null,
            description: a.description ?? null,
            purpose: a.purpose ?? null,
            latestAction: a.latestAction ? { text: a.latestAction.text, date: a.latestAction.actionDate } : null,
          })),
        },
      );
    },
  },

  // ─── Committee Sub-resource Tools ────────────────────────────────

  {
    name: "congress_committee_details_by_congress",
    description:
      "Get detailed information about a committee filtered by a specific congress number. " +
      "Shows membership for that specific congress vs. all-time details from congress_committee_details.",
    annotations: { title: "Congress: Committee Details by Congress", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number (e.g., 119)"),
      chamber: z.enum(keysEnum(CHAMBERS)).describe("Chamber"),
      committee_code: z.string().describe("Committee system code (e.g., 'hspw00')"),
    }),
    execute: async ({ congress, chamber, committee_code }) => {
      const data = await getCommitteeDetailsByCongress(congress, chamber, committee_code);
      const c = data.committee;
      return recordResponse(
        `${c.name ?? committee_code} (${congress}th Congress, ${chamber})`,
        {
          systemCode: c.systemCode ?? committee_code,
          name: c.name ?? null,
          chamber: c.chamber ?? null,
          type: c.type ?? null,
          isCurrent: c.isCurrent ?? null,
          subcommittees: c.subcommittees?.map(sc => ({ name: sc.name, systemCode: sc.systemCode })) ?? null,
          history: c.history ?? null,
          bills: c.bills ?? null,
          reports: c.reports ?? null,
          updateDate: c.updateDate ?? null,
        },
      );
    },
  },

  {
    name: "congress_committee_reports_for_committee",
    description:
      "Get reports published by a specific committee. Shows formal committee reports " +
      "accompanying legislation — use congress_committees to find the committee system code.",
    annotations: { title: "Congress: Committee's Reports", readOnlyHint: true },
    parameters: z.object({
      chamber: z.enum(keysEnum(CHAMBERS)).describe("Chamber"),
      committee_code: z.string().describe("Committee system code (e.g., 'hsju00')"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
      fromDateTime: z.string().optional().describe("Filter by update date from. Format: YYYY-MM-DDT00:00:00Z"),
      toDateTime: z.string().optional().describe("Filter by update date to. Format: YYYY-MM-DDT00:00:00Z"),
    }),
    execute: async ({ chamber, committee_code, limit, fromDateTime, toDateTime }) => {
      const data = await getCommitteeReportsForCommittee(chamber, committee_code, limit ?? 20, { fromDateTime, toDateTime });
      if (!data.reports.length) {
        return emptyResponse(`No reports found for committee ${committee_code}.`);
      }
      return listResponse(
        `${data.reports.length} reports for committee ${committee_code}`,
        {
          items: data.reports.map(r => ({
            citation: r.citation ?? null,
            congress: r.congress ?? null,
            number: r.number ?? null,
            type: r.type ?? null,
            updateDate: r.updateDate ?? null,
            url: r.url ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_committee_nominations_for_committee",
    description:
      "Get nominations referred to a specific committee. Useful for tracking judicial or agency head nominations " +
      "before a particular Senate committee.",
    annotations: { title: "Congress: Committee's Nominations", readOnlyHint: true },
    parameters: z.object({
      chamber: z.enum(keysEnum(CHAMBERS)).describe("Chamber (usually 'senate' for nominations)"),
      committee_code: z.string().describe("Committee system code (e.g., 'ssju00' for Senate Judiciary)"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ chamber, committee_code, limit }) => {
      const data = await getCommitteeNominations(chamber, committee_code, limit ?? 20);
      if (!data.nominations.length) {
        return emptyResponse(`No nominations found for committee ${committee_code}.`);
      }
      return listResponse(
        `${data.nominations.length} nominations for committee ${committee_code}`,
        {
          items: data.nominations.map(n => ({
            number: n.number ?? null,
            congress: n.congress ?? null,
            description: n.description ?? null,
            organization: n.organization ?? null,
            receivedDate: n.receivedDate ?? null,
            latestAction: n.latestAction ? { text: n.latestAction.text, date: n.latestAction.actionDate } : null,
          })),
        },
      );
    },
  },

  {
    name: "congress_committee_house_communications",
    description:
      "Get House communications referred to a specific House committee.",
    annotations: { title: "Congress: Committee's House Communications", readOnlyHint: true },
    parameters: z.object({
      committee_code: z.string().describe("House committee system code (e.g., 'hsgo00')"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ committee_code, limit }) => {
      const data = await getCommitteeHouseCommunications(committee_code, limit ?? 20);
      if (!data.communications.length) {
        return emptyResponse(`No House communications found for committee ${committee_code}.`);
      }
      return listResponse(
        `${data.communications.length} House communications for committee ${committee_code}`,
        {
          items: data.communications.map(c => ({
            congress: c.congress ?? c.congressNumber ?? null,
            number: c.number ?? null,
            communicationType: c.communicationType ?? null,
            updateDate: c.updateDate ?? null,
            url: c.url ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_committee_senate_communications",
    description:
      "Get Senate communications referred to a specific Senate committee.",
    annotations: { title: "Congress: Committee's Senate Communications", readOnlyHint: true },
    parameters: z.object({
      committee_code: z.string().describe("Senate committee system code (e.g., 'ssfr00')"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ committee_code, limit }) => {
      const data = await getCommitteeSenateCommunications(committee_code, limit ?? 20);
      if (!data.communications.length) {
        return emptyResponse(`No Senate communications found for committee ${committee_code}.`);
      }
      return listResponse(
        `${data.communications.length} Senate communications for committee ${committee_code}`,
        {
          items: data.communications.map(c => ({
            congress: c.congress ?? null,
            number: c.number ?? null,
            communicationType: c.communicationType ?? null,
            updateDate: c.updateDate ?? null,
            url: c.url ?? null,
          })),
        },
      );
    },
  },

  // ─── Committee Report Text ───────────────────────────────────────

  {
    name: "congress_committee_report_text",
    description:
      "Get text versions for a committee report. Returns formatted text and PDF URLs.",
    annotations: { title: "Congress: Committee Report Text", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      report_type: z.enum(keysEnum(REPORT_TYPES)).describe(`Report type: ${describeEnum(REPORT_TYPES)}`),
      report_number: z.number().int().describe("Report number"),
    }),
    execute: async ({ congress, report_type, report_number }) => {
      const data = await getCommitteeReportText(congress, report_type, report_number);
      if (!data.text.length) {
        return emptyResponse(`No text versions found for ${report_type.toUpperCase()} ${report_number} (${congress}th Congress).`);
      }
      return listResponse(
        `${report_type.toUpperCase()} ${report_number} (${congress}th Congress): ${data.text.length} text versions`,
        {
          items: data.text.map(t => ({
            type: t.type ?? null,
            url: t.url ?? null,
            isErrata: t.isErrata ?? null,
          })),
        },
      );
    },
  },

  // ─── Committee Print Text ────────────────────────────────────────

  {
    name: "congress_committee_print_text",
    description:
      "Get text versions for a committee print. Returns formatted text and PDF URLs.",
    annotations: { title: "Congress: Committee Print Text", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      chamber: z.enum(keysEnum(CHAMBERS)).describe("Chamber"),
      jacket_number: z.number().int().describe("Jacket number"),
    }),
    execute: async ({ congress, chamber, jacket_number }) => {
      const data = await getCommitteePrintText(congress, chamber, jacket_number);
      if (!data.text.length) {
        return emptyResponse(`No text versions found for committee print ${jacket_number} (${congress}th Congress).`);
      }
      return listResponse(
        `Committee print ${jacket_number} (${congress}th Congress): ${data.text.length} text versions`,
        {
          items: data.text.map(t => ({
            type: t.type ?? null,
            url: t.url ?? null,
          })),
        },
      );
    },
  },

  // ─── Nomination Nominees ─────────────────────────────────────────

  {
    name: "congress_nomination_nominees",
    description:
      "Get the list of nominees for a specific position within a nomination. " +
      "Some nominations contain multiple positions (ordinals). " +
      "Use congress_nomination_details first to see the ordinal numbers.",
    annotations: { title: "Congress: Nomination Nominees", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      nomination_number: z.union([z.string(), z.number()]).describe("Nomination number"),
      ordinal: z.number().int().describe("Position ordinal (typically 1)"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ congress, nomination_number, ordinal, limit }) => {
      const data = await getNominationNominees(congress, nomination_number, ordinal, limit ?? 20);
      if (!data.nominees.length) {
        return emptyResponse(`No nominees found for PN${nomination_number} ordinal ${ordinal} (${congress}th Congress).`);
      }
      return listResponse(
        `Nomination PN${nomination_number} position ${ordinal} (${congress}th Congress): ${data.nominees.length} nominees`,
        {
          items: data.nominees.map(n => ({
            firstName: n.firstName ?? null,
            lastName: n.lastName ?? null,
            state: n.state ?? null,
            effectiveDate: n.effectiveDate ?? null,
          })),
        },
      );
    },
  },

  // ─── House Requirement Matching Communications ───────────────────

  {
    name: "congress_house_requirement_matching_communications",
    description:
      "Get communications that match a specific House requirement. Shows agency submissions fulfilling " +
      "a recurring reporting obligation.",
    annotations: { title: "Congress: House Requirement Matching Communications", readOnlyHint: true },
    parameters: z.object({
      requirement_number: z.number().int().describe("Requirement number (e.g., 8070)"),
      limit: z.number().int().positive().max(250).default(20).describe("Max results (default: 20)"),
    }),
    execute: async ({ requirement_number, limit }) => {
      const data = await getHouseRequirementMatchingCommunications(requirement_number, limit ?? 20);
      if (!data.communications.length) {
        return emptyResponse(`No matching communications found for House Requirement #${requirement_number}.`);
      }
      return listResponse(
        `${data.communications.length} matching communications for House Requirement #${requirement_number}`,
        {
          items: data.communications.map(c => ({
            congress: c.congress ?? null,
            number: c.number ?? null,
            chamber: c.chamber ?? null,
            communicationType: c.communicationType ?? null,
            url: c.url ?? null,
          })),
        },
      );
    },
  },

  // ─── Treaty Partitioned (Suffix) ─────────────────────────────────

  {
    name: "congress_treaty_partitioned_details",
    description:
      "Get details about a partitioned treaty (one with a suffix letter like A, B, etc.). " +
      "Some treaties are divided into parts, each identified by a suffix.",
    annotations: { title: "Congress: Partitioned Treaty Details", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      treaty_number: z.union([z.string(), z.number()]).describe("Treaty document number"),
      treaty_suffix: z.string().describe("Treaty partition letter (e.g., 'A', 'B')"),
    }),
    execute: async ({ congress, treaty_number, treaty_suffix }) => {
      const data = await getTreatyDetailWithSuffix(congress, treaty_number, treaty_suffix);
      const t = data.treaty;
      return recordResponse(
        `Treaty Doc. ${treaty_number}-${treaty_suffix} (${congress}th Congress): ${t.topic ?? "No topic"}`,
        {
          number: t.number ?? null,
          suffix: t.suffix ?? treaty_suffix,
          congress: t.congress ?? null,
          congressReceived: t.congressReceived ?? null,
          topic: t.topic ?? null,
          transmittedDate: t.transmittedDate ?? null,
          inForceDate: t.inForceDate ?? null,
          resolutionText: t.resolutionText ?? null,
          latestAction: t.latestAction ? { text: t.latestAction.text, date: t.latestAction.actionDate } : null,
        },
      );
    },
  },

  {
    name: "congress_treaty_partitioned_actions",
    description:
      "Get actions on a partitioned treaty (one with a suffix letter). " +
      "Shows committee referral, hearings, and ratification votes for a specific treaty partition.",
    annotations: { title: "Congress: Partitioned Treaty Actions", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      treaty_number: z.union([z.string(), z.number()]).describe("Treaty document number"),
      treaty_suffix: z.string().describe("Treaty partition letter (e.g., 'A', 'B')"),
      limit: z.number().int().positive().max(250).default(50).describe("Max results (default: 50)"),
    }),
    execute: async ({ congress, treaty_number, treaty_suffix, limit }) => {
      const data = await getTreatyActionsWithSuffix(congress, treaty_number, treaty_suffix, limit ?? 50);
      if (!data.actions.length) {
        return emptyResponse(`No actions found for Treaty Doc. ${treaty_number}-${treaty_suffix} (${congress}th Congress).`);
      }
      return listResponse(
        `Treaty Doc. ${treaty_number}-${treaty_suffix} (${congress}th Congress): ${data.actions.length} actions`,
        {
          items: data.actions.map(a => ({
            date: a.actionDate ?? null,
            text: a.text ?? null,
            type: a.type ?? null,
          })),
        },
      );
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // ─── Cross-Referencing Composite Tools ─────────────────────────────
  // These combine multiple API calls in parallel for a 360° view.
  // ═══════════════════════════════════════════════════════════════════

  {
    name: "congress_bill_full_profile",
    description:
      "Get a COMPLETE bill profile in ONE call — combines bill details, all cosponsors (with party breakdown), " +
      "full action timeline, CRS summaries, committees, legislative subjects, text versions, related bills, and all titles. " +
      "Fetches 8 endpoints in parallel. Use this instead of calling congress_bill_details + congress_bill_actions + " +
      "congress_bill_summaries + congress_bill_committees + congress_bill_subjects + congress_bill_text + " +
      "congress_bill_related + congress_bill_titles individually.\n\n" +
      "Ideal for: Complete legislative analysis, bill research, accountability investigations, or " +
      "getting everything needed to cross-reference with FEC (who funded the sponsors), " +
      "lobbying_search (who lobbied), and FRED (economic impact after passage).",
    annotations: { title: "Congress: Bill Full Profile (Composite)", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number (e.g., 119, 118, 117)"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number (e.g., 1, 25, 3076)"),
    }),
    execute: async ({ congress, bill_type, bill_number }) => {
      const data = await getBillFullProfile(congress, bill_type, bill_number);
      const bill = data.bill;
      const sponsor = bill.sponsors?.[0];

      return recordResponse(
        `${bill.type ?? ""}${bill.number ?? ""}: ${bill.title ?? "No title"} (${congress}th Congress) — FULL PROFILE`,
        {
          bill: {
            congress,
            type: bill.type ?? null,
            number: bill.number ?? null,
            title: bill.title ?? null,
            introducedDate: bill.introducedDate ?? null,
            sponsor: sponsor ? {
              name: `${sponsor.firstName ?? ""} ${sponsor.lastName ?? ""}`.trim(),
              party: sponsor.party ?? null,
              state: sponsor.state ?? null,
            } : null,
            policyArea: data.policyArea ?? bill.policyArea?.name ?? null,
            latestAction: bill.latestAction ? { text: bill.latestAction.text, date: bill.latestAction.actionDate } : null,
            laws: bill.laws?.map(l => ({ type: l.type, number: l.number })) ?? [],
            congressGovUrl: `https://www.congress.gov/bill/${congress}th-congress/${billTypeToUrlSegment(bill_type)}/${bill_number}`,
          },
          cosponsors: {
            total: data.cosponsors.length,
            partyBreakdown: data.cosponsorPartyBreakdown,
            list: data.cosponsors.slice(0, 50).map(c => ({
              name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
              party: c.party ?? null,
              state: c.state ?? null,
              isOriginal: c.isOriginalCosponsor ?? null,
            })),
          },
          actions: {
            total: data.actions.length,
            timeline: data.actions.map(a => ({
              date: a.actionDate ?? null,
              text: a.text ?? null,
              type: a.type ?? null,
              recordedVotes: a.recordedVotes?.map(rv => ({ rollNumber: rv.rollNumber, chamber: rv.chamber })) ?? null,
            })),
          },
          summaries: data.summaries.map(s => ({
            version: s.actionDesc ?? null,
            text: s.text ?? null,
            date: s.actionDate ?? null,
          })),
          committees: data.committees.map(c => ({
            name: c.name ?? null,
            chamber: c.chamber ?? null,
            activities: c.activities?.map(a => ({ name: a.name, date: a.date })) ?? null,
          })),
          subjects: data.subjects.map(s => s.name),
          textVersions: data.textVersions.map(t => ({
            type: t.type ?? null,
            date: t.date ?? null,
            formats: t.formats?.map(f => ({ type: f.type, url: f.url })) ?? null,
          })),
          relatedBills: data.relatedBills.map(r => ({
            type: r.type ?? null,
            number: r.number ?? null,
            title: r.title ?? null,
            relationship: r.relationshipDetails?.map(rd => rd.type) ?? null,
          })),
          titles: data.titles.map(t => ({
            title: t.title ?? null,
            titleType: t.titleType ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_member_full_profile",
    description:
      "Get a COMPLETE member of Congress profile in ONE call — combines bio/details, " +
      "recent sponsored legislation, and recent cosponsored legislation (3 endpoints in parallel). " +
      "Returns party history, terms served, committee assignments, photo, website, " +
      "plus legislative activity.\n\n" +
      "Use this instead of calling congress_member_details + congress_member_bills (sponsored) + " +
      "congress_member_bills (cosponsored) individually.\n\n" +
      "Ideal for: Accountability research — cross-reference with FEC (fec_candidate_financials) for donors, " +
      "lobbying_search for industry lobbying, and congress_house_votes / congress_senate_votes for voting record.",
    annotations: { title: "Congress: Member Full Profile (Composite)", readOnlyHint: true },
    parameters: z.object({
      bioguide_id: z.string().describe("Member's BioGuide ID (e.g., 'P000197' for Pelosi, 'M000355' for McConnell). Use congress_search_members to find it."),
      bill_limit: z.number().int().positive().max(50).optional().describe("Max bills to return per category (default: 20)"),
    }),
    execute: async ({ bioguide_id, bill_limit }) => {
      const data = await getMemberFullProfile(bioguide_id, bill_limit ?? 20);
      const m = data.member;

      return recordResponse(
        `${m.directOrderName ?? `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()} — FULL PROFILE`,
        {
          member: {
            bioguideId: m.bioguideId ?? bioguide_id,
            name: m.directOrderName ?? `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim(),
            party: m.party ?? null,
            state: m.state ?? null,
            birthYear: m.birthYear ?? null,
            currentMember: m.currentMember ?? null,
            officialWebsiteUrl: m.officialWebsiteUrl ?? null,
            depiction: m.depiction ?? null,
            partyHistory: m.partyHistory ?? null,
            terms: m.terms ?? null,
          },
          sponsoredLegislation: {
            total: data.sponsoredBills.length,
            bills: data.sponsoredBills.map(b => ({
              type: b.type ?? null,
              number: b.number ?? null,
              title: b.title ?? null,
              congress: b.congress ?? null,
              introducedDate: b.introducedDate ?? null,
              latestAction: b.latestAction ? { text: b.latestAction.text, date: b.latestAction.actionDate } : null,
            })),
          },
          cosponsoredLegislation: {
            total: data.cosponsoredBills.length,
            bills: data.cosponsoredBills.map(b => ({
              type: b.type ?? null,
              number: b.number ?? null,
              title: b.title ?? null,
              congress: b.congress ?? null,
              introducedDate: b.introducedDate ?? null,
              latestAction: b.latestAction ? { text: b.latestAction.text, date: b.latestAction.actionDate } : null,
            })),
          },
        },
      );
    },
  },

  {
    name: "congress_nomination_full_profile",
    description:
      "Get a COMPLETE presidential nomination profile in ONE call — combines nomination details, " +
      "full action timeline, committee referrals/activity, and associated hearings (4 endpoints in parallel). " +
      "Use this instead of calling congress_nomination_details + congress_nomination_committees + " +
      "congress_nomination_hearings individually.\n\n" +
      "Ideal for: Tracking judicial and executive nominations from submission through confirmation/rejection. " +
      "Cross-reference with lobbying_search for industry interest in the nominee.",
    annotations: { title: "Congress: Nomination Full Profile (Composite)", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      nomination_number: z.union([z.string(), z.number()]).describe("Nomination number (PN number)"),
    }),
    execute: async ({ congress, nomination_number }) => {
      const data = await getNominationFullProfile(congress, nomination_number);
      const n = data.nomination;

      return recordResponse(
        `Nomination PN${nomination_number} (${congress}th Congress) — FULL PROFILE`,
        {
          nomination: {
            number: n.number ?? null,
            congress: n.congress ?? null,
            description: n.description ?? null,
            organization: n.organization ?? null,
            receivedDate: n.receivedDate ?? null,
            nominees: n.nominees ?? null,
            latestAction: n.latestAction ? { text: n.latestAction.text, date: n.latestAction.actionDate } : null,
          },
          actions: data.actions.map(a => ({
            date: a.actionDate ?? null,
            text: a.text ?? null,
            type: a.type ?? null,
          })),
          committees: data.committees.map(c => ({
            name: c.name ?? null,
            systemCode: c.systemCode ?? null,
            chamber: c.chamber ?? null,
            activities: c.activities?.map(a => ({ name: a.name, date: a.date })) ?? null,
          })),
          hearings: data.hearings.map(h => ({
            jacketNumber: h.jacketNumber ?? null,
            citation: h.citation ?? null,
            chamber: h.chamber ?? null,
            title: h.title ?? null,
            dates: h.dates ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_treaty_full_profile",
    description:
      "Get a COMPLETE treaty profile in ONE call — combines treaty details, full action timeline, " +
      "and committee assignments (3 endpoints in parallel). " +
      "Use this instead of calling congress_treaty_details + congress_treaty_committees individually.\n\n" +
      "Ideal for: International agreement research and Senate Foreign Relations Committee tracking.",
    annotations: { title: "Congress: Treaty Full Profile (Composite)", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress in which the treaty was received"),
      treaty_number: z.union([z.string(), z.number()]).describe("Treaty document number"),
    }),
    execute: async ({ congress, treaty_number }) => {
      const data = await getTreatyFullProfile(congress, treaty_number);
      const t = data.treaty;

      return recordResponse(
        `Treaty Doc. ${treaty_number} (${congress}th Congress): ${t.topic ?? "No topic"} — FULL PROFILE`,
        {
          treaty: {
            number: t.number ?? null,
            suffix: t.suffix ?? null,
            congress: t.congress ?? null,
            congressReceived: t.congressReceived ?? null,
            topic: t.topic ?? null,
            transmittedDate: t.transmittedDate ?? null,
            inForceDate: t.inForceDate ?? null,
            resolutionText: t.resolutionText ?? null,
            latestAction: t.latestAction ? { text: t.latestAction.text, date: t.latestAction.actionDate } : null,
          },
          actions: data.actions.map(a => ({
            date: a.actionDate ?? null,
            text: a.text ?? null,
            type: a.type ?? null,
          })),
          committees: data.committees.map(c => ({
            name: c.name ?? null,
            systemCode: c.systemCode ?? null,
            chamber: c.chamber ?? null,
            activities: c.activities?.map(a => ({ name: a.name, date: a.date })) ?? null,
          })),
        },
      );
    },
  },

  {
    name: "congress_committee_full_profile",
    description:
      "Get a COMPLETE committee profile in ONE call — combines committee details (history, subcommittees, website), " +
      "recent bills referred, recent reports published, and recent nominations referred (4 endpoints in parallel). " +
      "Use this instead of calling congress_committee_details + congress_committee_bills + " +
      "congress_committee_reports_for_committee + congress_committee_nominations_for_committee individually.\n\n" +
      "Ideal for: Understanding a committee's jurisdiction, workload, and oversight activity. " +
      "Cross-reference committee chair (from congress_member_details) with FEC donors and lobbying_search.",
    annotations: { title: "Congress: Committee Full Profile (Composite)", readOnlyHint: true },
    parameters: z.object({
      chamber: z.enum(keysEnum(CHAMBERS)).describe("Chamber"),
      committee_code: z.string().describe("Committee system code (e.g., 'hsba00' for House Financial Services, 'ssju00' for Senate Judiciary)"),
      limit: z.number().int().positive().max(50).default(10).describe("Max items per sub-resource (default: 10)"),
    }),
    execute: async ({ chamber, committee_code, limit }) => {
      const data = await getCommitteeFullProfile(chamber, committee_code, limit ?? 10);
      const c = data.committee;

      return recordResponse(
        `${c.name ?? committee_code} (${c.chamber ?? chamber}) — FULL PROFILE`,
        {
          committee: {
            systemCode: c.systemCode ?? committee_code,
            name: c.name ?? null,
            chamber: c.chamber ?? null,
            type: c.type ?? null,
            isCurrent: c.isCurrent ?? null,
            committeeWebsiteUrl: c.committeeWebsiteUrl ?? null,
            parent: c.parent ?? null,
            subcommittees: c.subcommittees?.map(sc => ({ name: sc.name, systemCode: sc.systemCode })) ?? null,
            history: c.history ?? null,
            updateDate: c.updateDate ?? null,
          },
          recentBills: {
            total: data.recentBills.length,
            bills: data.recentBills.map(summarizeBill),
          },
          reports: {
            total: data.reports.length,
            items: data.reports.map(r => ({
              citation: r.citation ?? null,
              congress: r.congress ?? null,
              type: r.type ?? null,
              title: r.title ?? null,
              updateDate: r.updateDate ?? null,
            })),
          },
          nominations: {
            total: data.nominations.length,
            items: data.nominations.map(n => ({
              number: n.number ?? null,
              description: n.description ?? null,
              receivedDate: n.receivedDate ?? null,
              latestAction: n.latestAction ? { text: n.latestAction.text, date: n.latestAction.actionDate } : null,
            })),
          },
        },
      );
    },
  },

  {
    name: "congress_bill_votes",
    description:
      "Find ALL roll-call votes on a specific bill and fetch the party-line breakdowns — the KEY tool " +
      "for 'follow the money' investigations. Scans the bill's action timeline for recorded vote references, " +
      "then fetches each House and Senate vote with member-level results and party tallies.\n\n" +
      "This is the critical bridge between legislation and accountability:\n" +
      "• Bill → Votes (this tool)\n" +
      "• Votes → Who voted how (party tallies returned here)\n" +
      "• Who voted → Who funded them (fec_candidate_financials / fec_committee_disbursements)\n" +
      "• Who lobbied → lobbying_search\n\n" +
      "Returns all House and Senate roll-call votes associated with the bill, with full party breakdowns.",
    annotations: { title: "Congress: Bill Votes (Composite)", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number"),
      bill_type: z.enum(keysEnum(BILL_TYPES)).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number"),
    }),
    execute: async ({ congress, bill_type, bill_number }) => {
      const data = await getBillVotes(congress, bill_type, bill_number);

      const totalVotes = data.houseVotes.length + data.senateVotes.length;
      if (totalVotes === 0) {
        return emptyResponse(`No recorded roll-call votes found for ${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress). The bill may not have reached a roll-call vote, or votes may be in a different format.`);
      }

      return recordResponse(
        `${bill_type.toUpperCase()} ${bill_number} (${congress}th Congress): ${totalVotes} roll-call votes found (${data.houseVotes.length} House, ${data.senateVotes.length} Senate)`,
        {
          houseVotes: data.houseVotes.map(v => ({
            rollNumber: v.rollNumber,
            date: v.date ?? null,
            question: v.vote?.voteQuestion ?? v.vote?.question ?? null,
            result: v.vote?.result ?? null,
            partyBreakdown: v.partyTally ?? null,
            totalMembers: v.members?.length ?? null,
            source: v.source ?? null,
          })),
          senateVotes: data.senateVotes.map(v => ({
            rollNumber: v.rollNumber,
            date: v.date ?? null,
            question: v.vote?.question ?? null,
            result: v.vote?.result ?? null,
            count: v.vote?.count ?? null,
            partyBreakdown: v.partyTally ?? null,
            totalMembers: v.members?.length ?? null,
          })),
        },
      );
    },
  },
];
