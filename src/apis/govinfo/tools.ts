/**
 * govinfo MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchPublications,
  searchCboReports,
  getBillText,
  collections,
  billVersions,
} from "./sdk.js";
import { listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "govinfo_search",
    description:
      "Search across all government publications — bills, laws, CBO reports, " +
      "Congressional Record, Federal Register, committee reports, and more.\n\n" +
      "Collections: BILLS, PLAW (public laws), CRPT (committee reports), " +
      "CREC (Congressional Record), BUDGET, FR (Federal Register), CRECB (bound CR)",
    annotations: { title: "GovInfo: Search Publications", readOnlyHint: true },
    parameters: z.object({
      query: z.string().describe("Search query — bill name, topic, or keyword"),
      collection: z.string().optional().describe(
        "Collection: 'BILLS', 'PLAW' (public laws), 'CRPT' (committee reports), " +
        "'CREC' (Congressional Record), 'BUDGET', 'FR' (Federal Register)",
      ),
      congress: z.number().int().optional().describe("Filter by Congress number (e.g., 119)"),
      page_size: z.number().int().default(10).describe("Results per page (default: 10, max: 100)"),
    }),
    execute: async ({ query, collection, congress, page_size }) => {
      const data = await searchPublications({ query, collection, congress, pageSize: page_size });
      if (!data.results.length) return emptyResponse(`No results found for "${query}".`);
      return listResponse(
        `GovInfo search "${query}": ${data.total} total, showing ${data.results.length}`,
        { items: data.results, total: data.total },
      );
    },
  },

  {
    name: "govinfo_bill_text",
    description:
      "Get the FULL legislative text of a bill from GovInfo — the actual law language with " +
      "section numbers, dollar amounts, legal citations, and provisions.\n\n" +
      "IMPORTANT: Try congress_bill_summaries first for a quick CRS summary (~500-2000 chars). " +
      "Only use this tool when the user needs exact legislative language, specific provisions, " +
      "or dollar amounts from the bill text.\n\n" +
      "Use preview_only=true first to check bill size before loading. " +
      "Bills range from 5k chars (simple resolutions) to 500k+ (omnibus/appropriations). " +
      "Default limit is 100k chars.\n\n" +
      "Version suffixes: enr (enrolled/signed), eh (engrossed House), " +
      "es (engrossed Senate), ih (introduced House), is (introduced Senate)",
    annotations: { title: "GovInfo: Bill/Law Full Text", readOnlyHint: true },
    parameters: z.object({
      congress: z.number().int().describe("Congress number (e.g., 119, 118, 117)"),
      bill_type: z.enum(["hr", "s", "hjres", "sjres"]).describe("Bill type"),
      bill_number: z.number().int().describe("Bill number (e.g., 1, 5376)"),
      version: z.string().optional().describe(
        "Bill version: 'enr' (enrolled/signed, default), 'eh' (engrossed House), " +
        "'es' (engrossed Senate), 'ih' (introduced House), 'is' (introduced Senate)",
      ),
      max_length: z.number().int().optional().describe(
        "Maximum characters to return (default: 100000). Most bills fit within 100k. " +
        "Set higher (e.g. 500000) for large omnibus bills, or 0 for no limit.",
      ),
      preview_only: z.boolean().optional().describe(
        "When true, returns only metadata (title, pages, character count, estimated tokens) " +
        "WITHOUT the actual text. Use this to check bill size before loading. Default: false.",
      ),
    }),
    execute: async ({ congress, bill_type, bill_number, version, max_length, preview_only }) => {
      try {
        // If preview_only, fetch with maxLength=1 just to get the metadata + textLength
        const data = await getBillText({
          congress, billType: bill_type, billNumber: bill_number,
          version, maxLength: preview_only ? 1 : max_length,
        });

        if (!data.text && !preview_only) {
          return emptyResponse(`${data.title}: full text not available. Try a different version (ih, eh, es, enr).`);
        }

        const estimatedTokens = Math.ceil(data.textLength / 4);
        const effectiveMax = max_length === 0 ? data.textLength : (max_length || 100_000);

        if (preview_only) {
          return recordResponse(
            `📋 Preview: ${data.title} — ${data.textLength.toLocaleString()} chars (~${estimatedTokens.toLocaleString()} tokens)`,
            {
              packageId: data.packageId,
              title: data.title,
              dateIssued: data.dateIssued,
              pages: data.pages,
              textLength: data.textLength,
              estimatedTokens,
              note: data.textLength > 100_000
                ? `⚠️ This is a large bill (~${estimatedTokens.toLocaleString()} tokens). Loading the full text will use significant context. Consider setting max_length to limit it, or confirm you want the full text by calling again with preview_only=false.`
                : `This bill is ${data.textLength.toLocaleString()} chars (~${estimatedTokens.toLocaleString()} tokens). Call again with preview_only=false to load the text.`,
            },
          );
        }

        const returnedChars = data.truncated ? effectiveMax : data.textLength;
        const returnedTokens = Math.ceil(returnedChars / 4);

        return recordResponse(
          `${data.title}: ${data.textLength.toLocaleString()} chars (~${returnedTokens.toLocaleString()} tokens returned)${data.truncated ? ` — truncated to ${effectiveMax.toLocaleString()} chars, set max_length higher for full text` : ""}`,
          {
            packageId: data.packageId,
            title: data.title,
            dateIssued: data.dateIssued,
            pages: data.pages,
            textSource: data.textSource,
            textLength: data.textLength,
            returnedLength: returnedChars,
            estimatedTokens: returnedTokens,
            truncated: data.truncated,
            text: data.text,
          },
        );
      } catch (err) {
        const ver = version || "enr";
        const packageId = `BILLS-${congress}${bill_type.toLowerCase()}${bill_number}${ver}`;
        return recordResponse(
          `Error fetching bill text for ${packageId}`,
          {
            packageId,
            error: err instanceof Error ? err.message : String(err),
            hints: [
              "Check congress number and bill number",
              "Try a different version: 'ih' (introduced), 'eh' (engrossed), 'enr' (enrolled)",
              "The bill may not have reached that stage yet",
            ],
          },
        );
      }
    },
  },

  {
    name: "govinfo_cbo_reports",
    description:
      "Search for Congressional Budget Office reports published through GovInfo. " +
      "CBO scores tax bills with distributional analysis showing impact by income group.",
    annotations: { title: "GovInfo: CBO Cost Estimates & Reports", readOnlyHint: true },
    parameters: z.object({
      query: z.string().describe("Search query — bill name or topic (e.g., 'Tax Cuts and Jobs Act', 'reconciliation')"),
      page_size: z.number().int().default(10).describe("Results per page (default: 10)"),
    }),
    execute: async ({ query, page_size }) => {
      const data = await searchCboReports(query, page_size);
      if (!data.results.length) return emptyResponse(`No CBO reports found for "${query}".`);
      return listResponse(
        `CBO/Committee reports for "${query}": ${data.results.length} results`,
        { items: data.results, total: data.total },
      );
    },
  },
];
