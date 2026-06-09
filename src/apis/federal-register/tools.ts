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
  type FRDocument,
} from "./sdk.js";
import { listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

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
  },];
