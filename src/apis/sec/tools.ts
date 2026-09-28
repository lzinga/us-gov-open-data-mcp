/**
 * sec MCP tools.
 */

import { z } from "zod";
import { UserError, type Tool } from "fastmcp";
import {
  getCompanyByCik,
  getCompanyFacts,
  searchEdgar,
  extractConceptData,
  summarizeFinancials,
  getCompanyConcept,
  getFrame,
  resolveCik,
  getInsiderFilings,
  xbrlConcepts,
  type SecFiling,
} from "./sdk.js";
import { tableResponse, listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "sec_company_search",
    description:
      "Look up a company on SEC EDGAR by ticker, name or CIK. Returns company name, " +
      "tickers, SIC code, state, and recent filings list.\n\n" +
      "Examples: company='AAPL', company='Lockheed Martin', cik='0000320193'.",
    annotations: { title: "SEC: Company Lookup", readOnlyHint: true },
    parameters: z.object({
      company: z.string().optional().describe("Ticker ('NVDA', 'BRK-B'), company name ('Boeing') or CIK"),
      cik: z.string().optional().describe("10-digit CIK number (e.g., '0000320193' for Apple). Leading zeros optional."),
    }),
    execute: async ({ company, cik: cikArg }) => {
      if (!company && !cikArg) throw new UserError("Give a company (ticker or name) or a cik.");
      const cik = cikArg ?? await resolveCik(company!);
      const res = await getCompanyByCik(cik);

      const filings = res.filings?.recent;
      const forms = filings?.form || [];
      const dates = filings?.filingDate || [];
      const descriptions = filings?.primaryDocDescription || [];
      const accessions = filings?.accessionNumber || [];

      // Last 15 non-insider filings (skip Form 3, 4, 5, 144)
      const majorFilings: SecFiling[] = [];
      for (let i = 0; i < forms.length && majorFilings.length < 15; i++) {
        if (["3", "4", "5", "144"].includes(forms[i])) continue;
        majorFilings.push({
          form: forms[i],
          date: dates[i],
          description: descriptions[i] || "No description",
          accessionNumber: accessions[i],
        });
      }

      return recordResponse(
        `SEC EDGAR: ${res.name || "Unknown"} (CIK ${res.cik}) — ${res.tickers?.join(", ") || "no tickers"}`,
        {
          company: {
            cik: res.cik,
            name: res.name,
            tickers: res.tickers || [],
            exchanges: res.exchanges || [],
            sic: res.sic,
            sicDescription: res.sicDescription,
            stateOfIncorporation: res.stateOfIncorporation,
            entityType: res.entityType,
            category: res.category,
            fiscalYearEnd: res.fiscalYearEnd,
            formerNames: res.formerNames || [],
          },
          recentFilings: majorFilings,
        },
      );
    },
  },

  {
    name: "sec_insider_filings",
    description:
      "Insider trading disclosures for a company: Form 4 filings (changes in officers', directors' and 10% owners' holdings), " +
      "or Forms 3 and 5, newest first. Lists who filed, when, the transaction date and a link to the filing.\n" +
      "Give a ticker, company name or CIK.",
    annotations: { title: "SEC: Insider Filings", readOnlyHint: true },
    parameters: z.object({
      company: z.string().describe("Ticker ('AAPL'), company name or CIK of the issuer"),
      forms: z.string().default("4").describe("Forms, comma-separated: '4' (default), '3,4,5'"),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Filed on or after, YYYY-MM-DD"),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Filed on or before, YYYY-MM-DD"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max filings (default 20)"),
    }),
    execute: async ({ company, forms, start_date, end_date, limit }) => {
      const cik = await resolveCik(company);
      const { total, filings } = await getInsiderFilings(cik, { forms, startDate: start_date, endDate: end_date, limit });
      if (!filings.length) return emptyResponse(`No Form ${forms} filings found for ${company} (CIK ${cik}).`);
      const insiders = new Set(filings.map(f => f.insider).filter(Boolean));
      return tableResponse(
        `${total} Form ${forms} filing(s) for ${company} (CIK ${cik}), showing ${filings.length} from ${insiders.size} insider(s); latest ${filings[0].filedDate}`,
        { rows: filings, total, meta: { issuerCik: cik, note: "Transaction details (shares, prices) are in each linked filing." } },
      );
    },
  },

  {
    name: "sec_company_financials",
    description:
      "Get financial data (revenue, net income, assets, etc.) from SEC XBRL filings for a company. " +
      "Returns standardized financial data extracted from 10-K and 10-Q filings.\n\n" +
      "Takes a CIK, ticker or company name.\n\n" +
      "Common XBRL concepts: Revenues, NetIncomeLoss, Assets, Liabilities, " +
      "StockholdersEquity, EarningsPerShareBasic, CashAndCashEquivalentsAtCarryingValue",
    annotations: { title: "SEC: Company Financial Facts", readOnlyHint: true },
    parameters: z.object({
      cik: z.string().describe("CIK ('0000320193'), ticker ('AAPL') or company name"),
      metric: z.string().optional().describe(
        "Specific XBRL concept to retrieve (e.g., 'Revenues', 'NetIncomeLoss', 'Assets'). " +
        "Omit to get a summary of available key metrics.",
      ),
    }),
    execute: async ({ cik, metric }) => {
      const facts = await getCompanyFacts(await resolveCik(cik));
      const usgaap = facts.facts["us-gaap"];

      if (!usgaap) {
        return emptyResponse(`No US-GAAP financial data found for CIK ${cik}.`);
      }

      // Specific metric requested
      if (metric) {
        const data = extractConceptData(facts, metric);
        if (!data) {
          const available = Object.keys(usgaap).slice(0, 30);
          return listResponse(
            `Metric "${metric}" not found for ${facts.entityName}. Showing first 30 available metrics.`,
            { items: available.map(m => ({ metric: m })) },
          );
        }
        return recordResponse(
          `${facts.entityName} — ${data.concept} (${data.label}): ${data.annual.length} annual + ${data.quarterly.length} quarterly observations`,
          {
            entityName: facts.entityName,
            concept: data.concept,
            label: data.label,
            description: data.description,
            unit: data.unit,
            annual: data.annual.map(d => ({ period: d.end, value: d.val, filed: d.filed })),
            quarterly: data.quarterly.map(d => ({ period: d.end, value: d.val, filed: d.filed })),
          },
        );
      }

      // Summary of key metrics
      const summary = summarizeFinancials(facts);
      return recordResponse(
        `SEC Financial Facts: ${summary.entityName} — ${summary.keyMetrics.length} key metrics found (${summary.totalMetrics} total available)`,
        summary,
      );
    },
  },

  {
    name: "sec_filing_search",
    description:
      "Full-text search across all SEC EDGAR filings. " +
      "Search by company name, keyword, or topic.\n\n" +
      "Form types: 10-K (annual), 10-Q (quarterly), 8-K (current events), " +
      "DEF 14A (proxy), S-1 (IPO registration)",
    annotations: { title: "SEC: Search Filings", readOnlyHint: true },
    parameters: z.object({
      query: z.string().describe("Search query — company name, keyword, or topic"),
      forms: z.string().optional().describe("Comma-separated form types to filter: '10-K', '10-Q', '8-K', 'DEF 14A', 'S-1'"),
      start_date: z.string().optional().describe("Start date YYYY-MM-DD"),
      end_date: z.string().optional().describe("End date YYYY-MM-DD"),
    }),
    execute: async ({ query, forms, start_date, end_date }) => {
      const result = await searchEdgar(query, {
        forms,
        startDate: start_date,
        endDate: end_date,
      });

      if (result.hits.length === 0) {
        return emptyResponse(`No filings found for "${query}".`);
      }

      const filings = result.hits.map(hit => ({
        company: hit.names[0] || "?",
        form: hit.form,
        date: hit.date,
        description: hit.description,
      }));

      return listResponse(
        `SEC filing search "${query}": ${result.total} results, showing ${filings.length}`,
        { items: filings, total: result.total },
      );
    },
  },

  {
    name: "sec_company_concept",
    description:
      "Get the full reported history of a single XBRL financial concept for one company.\n" +
      "Faster and smaller than sec_company_financials when you only need one metric's time series " +
      "(e.g. quarterly revenue for 10 years).\n\n" +
      "Common concepts: Revenues, NetIncomeLoss, Assets, Liabilities, StockholdersEquity, " +
      "EarningsPerShareBasic, CashAndCashEquivalentsAtCarryingValue.",
    annotations: { title: "SEC: Company Concept Time Series", readOnlyHint: true },
    parameters: z.object({
      cik: z.string().describe("CIK ('0000320193'), ticker ('AAPL') or company name"),
      concept: z.string().describe("XBRL concept tag, e.g. 'Revenues', 'NetIncomeLoss', 'Assets'"),
      taxonomy: z.enum(["us-gaap", "ifrs-full", "dei", "srt"]).default("us-gaap").describe("XBRL taxonomy (default us-gaap)"),
    }),
    execute: async ({ cik, concept, taxonomy }) => {
      let data;
      try {
        data = await getCompanyConcept(await resolveCik(cik), concept, taxonomy);
      } catch (e) {
        if (e instanceof Error && /HTTP 404/.test(e.message)) {
          return emptyResponse(`Concept "${concept}" not reported by CIK ${cik} in taxonomy ${taxonomy}.`);
        }
        throw e;
      }
      if (!data) return emptyResponse(`No data for concept "${concept}" (CIK ${cik}).`);
      return recordResponse(
        `${data.entityName} — ${data.tag} (${data.label}): ${data.annual.length} annual + ${data.quarterly.length} quarterly observations [${data.unit}]`,
        {
          entityName: data.entityName,
          concept: data.tag,
          label: data.label,
          unit: data.unit,
          annual: data.annual.map(d => ({ period: d.end, value: d.val, fy: d.fy, filed: d.filed })),
          quarterly: data.quarterly.map(d => ({ period: d.end, value: d.val, fy: d.fy, fp: d.fp, filed: d.filed })),
        },
      );
    },
  },

  {
    name: "sec_concept_across_companies",
    description:
      "Compare a single XBRL financial concept across ALL reporting companies for one period (SEC frames API).\n" +
      "The most powerful cross-company tool: rank every filer by revenue, net income, assets, etc. in one call.\n\n" +
      "PERIOD FORMAT:\n" +
      "- 'CY2023' — full calendar year (use for flow concepts: Revenues, NetIncomeLoss)\n" +
      "- 'CY2023Q1' — single quarter (duration)\n" +
      "- 'CY2023Q4I' — instantaneous / point-in-time (use for balance-sheet concepts: Assets, Liabilities, StockholdersEquity)\n\n" +
      "UNITS: 'USD' (default), 'shares', 'USD-per-shares' (for EarningsPerShareBasic).",
    annotations: { title: "SEC: Concept Across Companies", readOnlyHint: true },
    parameters: z.object({
      concept: z.string().describe("XBRL concept tag, e.g. 'Revenues', 'NetIncomeLoss', 'Assets'"),
      period: z.string().regex(/^CY\d{4}(Q[1-4]I?)?$/, "Use CY2023, CY2023Q1, or CY2023Q4I").describe("Calendar period: 'CY2023', 'CY2023Q1', or instantaneous 'CY2023Q4I'"),
      taxonomy: z.enum(["us-gaap", "ifrs-full", "dei", "srt"]).default("us-gaap").describe("XBRL taxonomy (default us-gaap)"),
      unit: z.string().default("USD").describe("Unit of measure: USD, shares, USD-per-shares"),
      order: z.enum(["desc", "asc"]).default("desc").describe("Sort by value: desc (largest first) or asc"),
      limit: z.number().int().min(1).max(200).default(25).describe("Max companies to return (default 25)"),
    }),
    execute: async ({ concept, period, taxonomy, unit, order, limit }) => {
      let frame;
      try {
        frame = await getFrame({ tag: concept, period, taxonomy, unit });
      } catch (e) {
        if (e instanceof Error && /HTTP 404/.test(e.message)) {
          return emptyResponse(`No frame data for ${taxonomy}/${concept} (${unit}) in ${period}. Check the concept tag, unit, and whether the period needs the instantaneous 'I' suffix.`);
        }
        throw e;
      }
      const sorted = [...frame.data].sort((a, b) => order === "asc" ? a.val - b.val : b.val - a.val);
      const top = sorted.slice(0, limit);
      return tableResponse(
        `${frame.label} (${frame.tag}) ${frame.period} [${frame.unit}]: ${frame.count} companies reported, showing ${order === "asc" ? "lowest" : "highest"} ${top.length}`,
        {
          rows: top.map(d => ({
            company: d.entityName,
            cik: d.cik,
            value: d.val,
            location: d.loc,
            periodEnd: d.end,
          })),
          total: frame.count,
          meta: { concept: frame.tag, period: frame.period, unit: frame.unit },
        },
      );
    },
  },
];
