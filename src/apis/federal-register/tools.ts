/**
 * federal-register MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchExecutiveOrders,
  searchPresidentialDocuments,
  searchRules,
  getDocumentDetail,
  listAgencies,
  getCurrentPublicInspection,
  getSuggestedSearches,
  type FRDocument,
} from "./sdk.js";
import { listResponse, recordResponse, tableResponse, emptyResponse } from "../../shared/response.js";

function summarizeDoc(d: FRDocument) {
  return {
    title: d.title,
    type: d.type,
    subtype: d.subtype ?? d.presidential_document_type_id ?? null,
    documentNumber: d.document_number,
    executiveOrderNumber: d.executive_order_number ?? null,
    publicationDate: d.publication_date,
    signingDate: d.signing_date ?? null,
    president: d.president?.name ?? null,
    abstract: d.abstract ?? null,
    htmlUrl: d.html_url,
    agencies: d.agencies?.map(a => a.name ?? a.raw_name).filter(Boolean) ?? [],
  };
}

export const tools: Tool<any, any>[] = [
  {
    name: "fr_executive_orders",
    description:
      "Search for presidential executive orders. Filter by president, year, or keyword. " +
      "Covers all executive orders since 1994.",
    annotations: { title: "Federal Register: Executive Orders", readOnlyHint: true },
    parameters: z.object({
      keyword: z.string().optional().describe("Search keyword in title/abstract, e.g. 'tariff', 'immigration', 'climate'"),
      president: z.string().optional().describe("President slug: 'donald-trump', 'joe-biden', 'barack-obama', 'george-w-bush', 'william-j-clinton'"),
      year: z.number().int().optional().describe("Year to filter by, e.g. 2025"),
      per_page: z.number().int().positive().max(100).default(20).describe("Results per page (default: 20)"),
      page: z.number().int().positive().optional().describe("Page number (default: 1)"),
    }),
    execute: async ({ keyword, president, year, per_page, page }) => {
      const data = await searchExecutiveOrders({ keyword, president, year, per_page, page });
      const results = data.results ?? [];
      if (!results.length) return emptyResponse("No executive orders found.");
      return listResponse(
        `Executive orders: ${data.count} total, showing ${results.length}`,
        { items: results.map(summarizeDoc), total: data.count, meta: { totalPages: data.total_pages } },
      );
    },
  },

  {
    name: "fr_presidential_documents",
    description:
      "Search all presidential documents: executive orders, memoranda, proclamations, and other presidential actions.",
    annotations: { title: "Federal Register: Presidential Documents", readOnlyHint: true },
    parameters: z.object({
      keyword: z.string().optional().describe("Search keyword"),
      doc_type: z.enum(["executive_order", "memorandum", "proclamation", "notice", "determination"]).optional().describe(
        "Document subtype"
      ),
      president: z.string().optional().describe("President slug: 'donald-trump', 'joe-biden', 'barack-obama', 'george-w-bush', 'william-j-clinton'"),
      start_date: z.string().optional().describe("Start date YYYY-MM-DD"),
      end_date: z.string().optional().describe("End date YYYY-MM-DD"),
      per_page: z.number().int().positive().max(100).default(20).describe("Results per page (default: 20)"),
    }),
    execute: async ({ keyword, doc_type, president, start_date, end_date, per_page }) => {
      const data = await searchPresidentialDocuments({ keyword, doc_type, president, start_date, end_date, per_page });
      const results = data.results ?? [];
      if (!results.length) return emptyResponse("No presidential documents found.");
      return listResponse(
        `Presidential documents: ${data.count} total, showing ${results.length}`,
        { items: results.map(summarizeDoc), total: data.count, meta: { totalPages: data.total_pages } },
      );
    },
  },

  {
    name: "fr_search_rules",
    description:
      "Search for proposed rules, final rules, and agency notices in the Federal Register. " +
      "Use to track regulatory activity by agencies.",
    annotations: { title: "Federal Register: Search Rules & Regulations", readOnlyHint: true },
    parameters: z.object({
      keyword: z.string().optional().describe("Search keyword, e.g. 'tariff', 'emissions', 'banking'"),
      doc_type: z.enum(["RULE", "PRORULE", "NOTICE"]).optional().describe("Rule type"),
      agency: z.string().optional().describe("Agency slug, e.g. 'environmental-protection-agency', 'securities-and-exchange-commission'"),
      start_date: z.string().optional().describe("Start date YYYY-MM-DD"),
      end_date: z.string().optional().describe("End date YYYY-MM-DD"),
      per_page: z.number().int().positive().max(100).default(20).describe("Results per page (default: 20)"),
      significant: z.boolean().optional().describe("Only show significant/major rules (true/false)"),
    }),
    execute: async ({ keyword, doc_type, agency, start_date, end_date, per_page, significant }) => {
      const data = await searchRules({ keyword, doc_type, agency, start_date, end_date, per_page, significant });
      const results = data.results ?? [];
      if (!results.length) return emptyResponse("No rules/notices found.");
      return listResponse(
        `Federal Register documents: ${data.count} total, showing ${results.length}`,
        { items: results.map(summarizeDoc), total: data.count, meta: { totalPages: data.total_pages } },
      );
    },
  },
  {
    name: "fr_document_detail",
    description:
      "Get full details for a specific Federal Register document by document number.\n" +
      "Returns title, abstract, full text URL, agencies, CFR references, and more.",
    annotations: { title: "Federal Register: Document Detail", readOnlyHint: true },
    parameters: z.object({
      document_number: z.string().describe("Federal Register document number: '2024-00001'"),
    }),
    execute: async ({ document_number }) => {
      const doc = await getDocumentDetail(document_number);
      if (!doc) return emptyResponse("Document not found.");
      return recordResponse(
        `${doc.title} (${doc.document_number})`,
        {
          title: doc.title,
          type: doc.type,
          documentNumber: doc.document_number,
          publicationDate: doc.publication_date,
          agencies: (doc as any).agencies?.map((a: any) => a.name),
          abstract: (doc as any).abstract,
          htmlUrl: doc.html_url,
          pdfUrl: (doc as any).pdf_url,
          citation: (doc as any).citation,
          signingDate: (doc as any).signing_date,
          executiveOrderNumber: (doc as any).executive_order_number,
        },
      );
    },
  },

  {
    name: "fr_agencies",
    description:
      "List all federal agencies that publish in the Federal Register.\n" +
      "Returns agency names, short names, slugs (for filtering), and URLs. 470+ agencies.",
    annotations: { title: "Federal Register: Agencies", readOnlyHint: true },
    parameters: z.object({}),
    execute: async () => {
      const agencies = await listAgencies();
      if (!agencies?.length) return emptyResponse("No agencies returned.");
      const top = agencies.filter((a: any) => !a.parent_id).slice(0, 50);
      return listResponse(
        `${agencies.length} total agencies (showing ${top.length} top-level)`,
        { items: top.map((a: any) => ({ name: a.name, shortName: a.short_name, slug: a.slug })), total: agencies.length },
      );
    },
  },

  {
    name: "fr_public_inspection",
    description:
      "List documents currently on public inspection — approved for publication but NOT yet officially published " +
      "(appearing in the Federal Register tomorrow, or imminently for 'special' filings).\n" +
      "This is the forward-looking view: 'what regulations are about to come out?' Special filings are expedited/emergency documents.",
    annotations: { title: "Federal Register: Public Inspection", readOnlyHint: true },
    parameters: z.object({
      type: z.enum(["Rule", "Proposed Rule", "Notice", "Presidential Document"]).optional().describe("Filter by document type"),
      special_only: z.boolean().default(false).describe("Only show 'special' (expedited/emergency) filings"),
    }),
    execute: async ({ type, special_only }) => {
      const data = await getCurrentPublicInspection();
      let docs = data.results ?? [];
      if (type) docs = docs.filter(d => d.type === type);
      if (special_only) docs = docs.filter(d => d.filing_type === "special");
      if (!docs.length) return emptyResponse("No documents currently on public inspection match the filter.");
      return tableResponse(
        `${docs.length} document(s) on public inspection${special_only ? " (special filings)" : ""}`,
        {
          rows: docs.map(d => ({
            title: d.title,
            type: d.type,
            filing: d.filing_type,
            filedAt: d.filed_at,
            publicationDate: d.publication_date,
            agencies: (d.agency_names ?? d.agencies?.map(a => a.name ?? a.raw_name).filter(Boolean) ?? []).join("; "),
            documentNumber: d.document_number,
          })),
          total: data.count,
        },
      );
    },
  },

  {
    name: "fr_suggested_searches",
    description:
      "List the Office of the Federal Register's curated topic bundles (e.g. 'Dodd-Frank', 'Endangered Species').\n" +
      "Each topic shows how many documents appeared in the last year and how many currently have OPEN public comment periods — " +
      "useful for discovering active regulatory topics and where the public can still weigh in.\n" +
      "Sections: money, environment, world, science-and-technology, business-and-industry, health-and-public-welfare.",
    annotations: { title: "Federal Register: Suggested Searches", readOnlyHint: true },
    parameters: z.object({
      section: z.enum(["money", "environment", "world", "science-and-technology", "business-and-industry", "health-and-public-welfare"]).optional().describe("Filter to a single topic section"),
      open_comments_only: z.boolean().default(false).describe("Only show topics that currently have documents with open comment periods"),
    }),
    execute: async ({ section, open_comments_only }) => {
      let topics = await getSuggestedSearches(section);
      if (open_comments_only) topics = topics.filter(t => (t.documents_with_open_comment_periods ?? 0) > 0);
      if (!topics.length) return emptyResponse("No suggested searches match the filter.");
      topics.sort((a, b) => (b.documents_with_open_comment_periods ?? 0) - (a.documents_with_open_comment_periods ?? 0));
      return tableResponse(
        `${topics.length} curated topic(s)${section ? ` in ${section}` : ""}`,
        {
          rows: topics.map(t => ({
            topic: t.title,
            section: t.section,
            slug: t.slug,
            docsLastYear: t.documents_in_last_year ?? 0,
            openComments: t.documents_with_open_comment_periods ?? 0,
          })),
        },
      );
    },
  },
];
