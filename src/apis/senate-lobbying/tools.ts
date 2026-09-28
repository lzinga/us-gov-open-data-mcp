/**
 * senate-lobbying MCP tools.
 */

import { z } from "zod";
import { UserError, type Tool } from "fastmcp";
import { searchFilings, searchFilingsByIssue, getFilingDetail, searchContributions, searchRegistrants, searchLobbyists, FILING_TYPES, ISSUE_CODES, ISSUE_SCAN_MAX_FILINGS } from "./sdk.js";
import { tableResponse, listResponse, recordResponse, emptyResponse } from "../../shared/response.js";
import { keysEnum, describeEnum } from "../../shared/enum-utils.js";

function summarizeFiling(f: any) {
  return {
    uuid: f.filing_uuid,
    type: f.filing_type_display,
    year: f.filing_year,
    period: f.filing_period_display,
    registrant: f.registrant?.name,
    client: f.client?.name,
    clientDescription: f.client?.general_description,
    income: f.income ? `$${Number(f.income).toLocaleString()}` : null,
    expenses: f.expenses ? `$${Number(f.expenses).toLocaleString()}` : null,
    issuesLobbied: f.lobbying_activities?.map((a: any) => a.general_issue_code_display).filter(Boolean),
    documentUrl: f.filing_document_url,
    posted: f.dt_posted,
  };
}

export const tools: Tool<any, any>[] = [
  {
    name: "lobbying_search",
    description:
      "Search lobbying disclosure filings — find out who is lobbying Congress, on what issues, and how much they're spending.\n\n" +
      "Search by:\n" +
      "- registrant_name: lobbying firm or self-filing org ('Pfizer', 'Amazon', 'National Rifle Association')\n" +
      "- client_name: who hired the lobbyist ('Google', 'ExxonMobil')\n" +
      "- issue_code: policy area ('TAX', 'HCR' health, 'DEF' defense, 'ENV' environment, 'ENG' energy, 'IMM' immigration). " +
      `Requires registrant_name or client_name: the LDA API can't filter by issue, so up to ${ISSUE_SCAN_MAX_FILINGS} of that ` +
      "registrant's/client's filings are scanned and the total number of matches may be unknown.\n" +
      "- filing_year: year of filing (2020-2026)\n" +
      "- More filters: lobbyist_name, lobbyist_covered_position (former government job of a listed lobbyist, " +
      "e.g. 'Chief of Staff'; needs registrant_name, client_name or lobbyist_name, since that search is slow otherwise), " +
      "specific_issues (text of the issues lobbied, e.g. 'semiconductor'), foreign_entity_name / foreign_entity_country " +
      "(foreign interests, e.g. 'CN'), client_state, amount_min / amount_max (income or expenses reported, USD), " +
      "posted_after / posted_before (YYYY-MM-DD), filing_period.\n\n" +
      "Returns expenses/income amounts, issues lobbied, and registrant/client info.",
    annotations: { title: "Lobbying: Search Filings", readOnlyHint: true },
    parameters: z.object({
      registrant_name: z.string().optional().describe("Lobbying firm or organization: 'Pfizer', 'Amazon', 'US Chamber of Commerce'"),
      client_name: z.string().optional().describe("Client who hired the lobbyist: 'Google', 'Meta', 'Boeing'"),
      issue_code: z.enum(keysEnum(ISSUE_CODES)).optional().describe(
        `Issue area code (requires registrant_name or client_name): ${describeEnum(ISSUE_CODES)}`,
      ),
      filing_year: z.number().int().optional().describe("Year: 2020-2026"),
      filing_type: z.enum(keysEnum(FILING_TYPES)).optional().describe(`Filing type: ${describeEnum(FILING_TYPES)}`),
      filing_period: z.enum(["first_quarter", "second_quarter", "third_quarter", "fourth_quarter", "mid_year", "year_end"]).optional()
        .describe("Reporting period"),
      lobbyist_name: z.string().optional().describe("A lobbyist listed on the filing: 'Smith'"),
      lobbyist_covered_position: z.string().optional().describe(
        "Former government position of a listed lobbyist (text search): 'Chief of Staff', 'Senator', 'Legislative Director'. " +
        "Needs registrant_name, client_name or lobbyist_name.",
      ),
      specific_issues: z.string().optional().describe("Text of the specific issues lobbied (text search): 'semiconductor', 'H.R. 4346'"),
      foreign_entity_name: z.string().optional().describe("Foreign entity with an interest in the lobbying: 'Airbus'"),
      foreign_entity_country: z.string().regex(/^[A-Za-z]{2}$/).optional().describe("Two-letter country code of a foreign entity: 'CN', 'JP', 'DE'"),
      client_state: z.string().optional().describe("Client's state: 'CA' or 'California'"),
      amount_min: z.number().int().min(0).optional().describe("Minimum income or expenses reported, in dollars"),
      amount_max: z.number().int().min(0).optional().describe("Maximum income or expenses reported, in dollars"),
      posted_after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Posted on or after, YYYY-MM-DD"),
      posted_before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Posted on or before, YYYY-MM-DD"),
      page_size: z.number().int().max(25).default(20).describe("Results per page (default 20)"),
    }),
    execute: async (args) => {
      const { registrant_name, client_name, issue_code, filing_year, filing_type, page_size } = args;
      if (args.lobbyist_covered_position && !registrant_name && !client_name && !args.lobbyist_name) {
        throw new UserError(
          "lobbyist_covered_position needs registrant_name, client_name or lobbyist_name as well: " +
          "across all filings that text search takes over a minute and times out.",
        );
      }
      const filters = {
        registrant_name, client_name, filing_year, filing_type,
        filing_period: args.filing_period,
        lobbyist_name: args.lobbyist_name,
        lobbyist_covered_position: args.lobbyist_covered_position,
        filing_specific_lobbying_issues: args.specific_issues,
        foreign_entity_name: args.foreign_entity_name,
        foreign_entity_country: args.foreign_entity_country,
        client_state: args.client_state,
        filing_amount_reported_min: args.amount_min,
        filing_amount_reported_max: args.amount_max,
        filing_dt_posted_after: args.posted_after,
        filing_dt_posted_before: args.posted_before,
      };
      if (issue_code) {
        const scan = await searchFilingsByIssue({ ...filters, issue_code, limit: page_size });
        const who = [registrant_name, client_name].filter(Boolean).join(" / ");
        const scope = scan.truncated
          ? `${scan.matched} matches in the first ${scan.scanned} of ${scan.baseTotal} filings for ${who} (scan stopped; more may exist)`
          : `${scan.matched} of ${scan.baseTotal} filings for ${who} (all scanned)`;
        const meta = {
          issueCodeFilter: {
            code: issue_code,
            appliedClientSide: true,
            scanned: scan.scanned,
            matched: scan.matched,
            baseTotal: scan.baseTotal,
            truncated: scan.truncated,
            totalUnknown: scan.truncated,
          },
        };
        if (!scan.filings.length) {
          return emptyResponse(`No ${issue_code} lobbying filings found — ${scope}.`);
        }
        return listResponse(
          `Lobbying filings with issue ${issue_code}: ${scope}, showing ${scan.filings.length}`,
          { items: scan.filings.map(summarizeFiling), total: scan.truncated ? null : scan.matched, meta },
        );
      }

      const data = await searchFilings({ ...filters, page_size });
      if (!data.results?.length) return emptyResponse("No lobbying filings found.");
      return listResponse(
        `Lobbying filings: ${data.count} total, showing ${data.results.length}`,
        { items: data.results.map(summarizeFiling), total: data.count },
      );
    },
  },

  {
    name: "lobbying_detail",
    description:
      "Get full detail on a specific lobbying filing — shows every issue lobbied, specific bills mentioned, and lobbyist names.\n" +
      "Use the filing UUID from lobbying_search results.",
    annotations: { title: "Lobbying: Filing Detail", readOnlyHint: true },
    parameters: z.object({
      filing_uuid: z.string().describe("Filing UUID from lobbying_search results"),
    }),
    execute: async ({ filing_uuid }) => {
      const f = await getFilingDetail(filing_uuid);
      return recordResponse(
        `Lobbying filing: ${f.registrant?.name} for ${f.client?.name} (${f.filing_year} ${f.filing_type_display})`,
        {
          registrant: f.registrant?.name,
          client: f.client?.name,
          clientDescription: f.client?.general_description,
          expenses: f.expenses ? `$${Number(f.expenses).toLocaleString()}` : null,
          income: f.income ? `$${Number(f.income).toLocaleString()}` : null,
          activities: f.lobbying_activities?.map((a: any) => ({
            issue: a.general_issue_code_display,
            description: a.description,
            lobbyists: a.lobbyists?.map((l: any) => l.lobbyist_full_display_name).filter(Boolean),
          })),
          documentUrl: f.filing_document_url,
        },
      );
    },
  },

  {
    name: "lobbying_contributions",
    description:
      "Search campaign contributions made by lobbyists — shows which lobbyists donated to which politicians.\n" +
      "Required under the LDA to disclose political contributions by registered lobbyists.",
    annotations: { title: "Lobbying: Campaign Contributions", readOnlyHint: true },
    parameters: z.object({
      filing_year: z.number().int().optional().describe("Year: 2020-2026"),
      registrant_name: z.string().optional().describe("Lobbying firm name"),
      lobbyist_name: z.string().optional().describe("Individual lobbyist name"),
      page_size: z.number().int().max(25).default(20).describe("Results per page (default 20)"),
    }),
    execute: async ({ filing_year, registrant_name, lobbyist_name, page_size }) => {
      const data = await searchContributions({ filing_year, registrant_name, lobbyist_name, page_size });
      if (!data.results?.length) return emptyResponse("No contribution filings found.");

      // Flatten nested contribution_items from each filing
      const allContributions: any[] = [];
      for (const filing of data.results) {
        if (!filing.contribution_items?.length) continue;
        for (const item of filing.contribution_items) {
          allContributions.push({
            lobbyist: filing.lobbyist ? `${filing.lobbyist.first_name} ${filing.lobbyist.last_name}`.trim() : null,
            registrant: filing.registrant?.name,
            filerType: filing.filer_type_display,
            recipient: item.payee_name,
            honoree: item.honoree_name,
            amount: item.amount ? `$${Number(item.amount).toLocaleString()}` : null,
            date: item.date,
            type: item.contribution_type_display,
            contributor: item.contributor_name,
          });
        }
      }

      const filingsWithItems = data.results.filter((r: any) => r.contribution_items?.length > 0).length;

      return tableResponse(
        `Lobbying contributions: ${data.count} filings total, ${filingsWithItems} with contribution items, ${allContributions.length} individual contributions`,
        { rows: allContributions, total: data.count },
      );
    },
  },

  {
    name: "lobbying_registrants",
    description: "Search lobbying firms and organizations registered to lobby Congress.",
    annotations: { title: "Lobbying: Search Registrants", readOnlyHint: true },
    parameters: z.object({
      name: z.string().describe("Registrant name: 'Amazon', 'Pfizer', 'National Rifle Association'"),
      page_size: z.number().int().max(25).default(20).describe("Results per page (default 20)"),
    }),
    execute: async ({ name, page_size }) => {
      const data = await searchRegistrants({ registrant_name: name, page_size });
      if (!data.results?.length) return emptyResponse(`No registrants found matching "${name}".`);
      return listResponse(
        `Lobbying registrants matching "${name}": ${data.count} found`,
        {
          items: data.results.map((r: any) => ({
            id: r.id, name: r.name, description: r.description,
            address: `${r.address_1}, ${r.city}, ${r.state}`,
            contact: r.contact_name, phone: r.contact_telephone,
          })),
          total: data.count,
        },
      );
    },
  },

  {
    name: "lobbying_lobbyists",
    description:
      "Search individual lobbyists by name or firm.\n" +
      "Find specific people who lobby Congress and which firms they work for.",
    annotations: { title: "Lobbying: Lobbyist Search", readOnlyHint: true },
    parameters: z.object({
      name: z.string().optional().describe("Lobbyist name (partial match): 'Smith', 'Johnson'"),
      firm: z.string().optional().describe("Lobbying firm name: 'Akin Gump', 'K Street'"),
      page_size: z.number().int().max(50).default(20).describe("Results per page (default 20)"),
    }),
    execute: async ({ name, firm, page_size }) => {
      const data = await searchLobbyists({ lobbyist_name: name, registrant_name: firm, page_size });
      if (!data.results?.length) return emptyResponse(`No lobbyists found.`);
      return listResponse(
        `Lobbyists: ${data.count} found`,
        {
          items: data.results.map((r: any) => ({
            name: `${r.prefix ?? ""} ${r.first_name ?? ""} ${r.last_name ?? ""}${r.suffix ? " " + r.suffix : ""}`.trim(),
            firm: r.registrant?.name,
          })),
          total: data.count,
        },
      );
    },
  },
];
