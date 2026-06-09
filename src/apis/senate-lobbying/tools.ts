/**
 * senate-lobbying MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import { searchFilings, getFilingDetail, searchContributions, searchRegistrants, searchClients, searchLobbyists, FILING_TYPES, ISSUE_CODES } from "./sdk.js";
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
      "- issue_code: policy area ('TAX', 'HCR' health, 'DEF' defense, 'ENV' environment, 'ENG' energy, 'IMM' immigration)\n" +
      "- filing_year: year of filing (2020-2026)\n\n" +
      "Returns expenses/income amounts, issues lobbied, and registrant/client info.",
    annotations: { title: "Lobbying: Search Filings", readOnlyHint: true },
    parameters: z.object({
      registrant_name: z.string().optional().describe("Lobbying firm or organization: 'Pfizer', 'Amazon', 'US Chamber of Commerce'"),
      client_name: z.string().optional().describe("Client who hired the lobbyist: 'Google', 'Meta', 'Boeing'"),
      issue_code: z.enum(keysEnum(ISSUE_CODES)).optional().describe(`Issue area code: ${describeEnum(ISSUE_CODES)}`),
      filing_year: z.number().int().optional().describe("Year: 2020-2026"),
      filing_type: z.enum(keysEnum(FILING_TYPES)).optional().describe(`Filing type: ${describeEnum(FILING_TYPES)}`),
      page_size: z.number().int().max(25).default(20).describe("Results per page (default 20)"),
    }),
    execute: async ({ registrant_name, client_name, issue_code, filing_year, filing_type, page_size }) => {
      const data = await searchFilings({ registrant_name, client_name, issue_code, filing_year, filing_type, page_size });
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
