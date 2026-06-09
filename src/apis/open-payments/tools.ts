/**
 * open-payments MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchPayments,
  searchPaymentsAdvanced,
  getTopDoctorTotals,
  searchResearchPayments,
  searchOwnershipPayments,
  getPaymentsByCompany,
  getPaymentsByPhysician,
  getPaymentsByTeachingHospital,
  getPaymentsBySpecialty,
  getProviderProfiles,
  getNationalTotals,
  getStateTotals,
  listAvailableDatasets,
  PAYMENT_TYPES,
  clearCache as sdkClearCache,
} from "./sdk.js";
import { tableResponse, listResponse, emptyResponse } from "../../shared/response.js";

export const tools: Tool<any, any>[] = [
  {
    name: "open_payments_search",
    description:
      "Search CMS Open Payments (Sunshine Act) data — payments from pharma/device companies to doctors.\n" +
      "15M+ records per year. Shows exact dollar amounts, payment type, doctor name/specialty, and which drugs/devices are involved.\n" +
      "Cross-reference with FDA (drug safety), lobbying (company influence), and clinical trials.",
    annotations: { title: "Open Payments: Search", readOnlyHint: true },
    parameters: z.object({
      company: z.string().optional().describe("Company name (partial match): 'Pfizer', 'Novo Nordisk', 'Johnson & Johnson'"),
      doctor: z.string().optional().describe("Doctor last name: 'Smith', 'Jones' (case-insensitive)"),
      state: z.string().optional().describe("Two-letter state: 'CA', 'TX', 'NY'"),
      specialty: z.string().optional().describe("Medical specialty (partial match): 'Cardiology', 'Orthopedic', 'Psychiatry'"),
      year: z.string().optional().describe("Payment year (auto-discovers latest if omitted). Available: 2018-2024+, new years added automatically when CMS publishes."),
      limit: z.number().int().max(100).default(20).describe("Max results (default 20)"),
    }),
    execute: async (args) => {
      const data = await searchPayments(args);
      if (!data.results?.length) return emptyResponse("No payments found matching the criteria.");
      return tableResponse(
        `Open Payments: ${data.count?.toLocaleString() ?? "?"} matching records (showing ${data.results.length})`,
        { rows: data.results as Record<string, unknown>[], total: data.count },
      );
    },
  },

  {
    name: "open_payments_top",
    description:
      "Find the HIGHEST pharma payments to doctors — sorted by amount descending.\\n" +
      "Use this to find the biggest consulting fees, royalties, and speaking fees in a state or specialty.\\n" +
      "Supports sorting by payment amount — unlike the basic search which returns results in default order.",
    annotations: { title: "Open Payments: Top Payments", readOnlyHint: true },
    parameters: z.object({
      company: z.string().optional().describe("Company name: 'Pfizer', 'Stryker', 'Medtronic'"),
      doctor: z.string().optional().describe("Doctor last name"),
      state: z.string().optional().describe("Two-letter state: 'WA', 'CA', 'TX'"),
      specialty: z.string().optional().describe("Specialty: 'Orthopaedic', 'Cardio', 'Neurology'"),
      year: z.string().optional().describe("Year (auto-discovers latest)"),
      limit: z.number().int().max(100).default(20).describe("Number of top results (default 20)"),
    }),
    execute: async (args) => {
      const data = await searchPaymentsAdvanced({
        ...args,
        sortBy: "total_amount_of_payment_usdollars",
        sortOrder: "desc",
      });
      if (!data.results?.length) return emptyResponse("No payments found.");
      return tableResponse(
        `Top payments (sorted by amount, ${data.count?.toLocaleString() ?? "?"} total matches)`,
        { rows: data.results as Record<string, unknown>[], total: data.count },
      );
    },
  },

  {
    name: "open_payments_top_doctors",
    description:
      "Find the HIGHEST-PAID doctors by TOTAL payments received — aggregates all individual payments per doctor.\n" +
      "Groups by doctor and sums all their payments, sorted by total descending.\n" +
      "This is the key tool for finding doctors with the biggest pharma relationships.",
    annotations: { title: "Open Payments: Top Doctors", readOnlyHint: true },
    parameters: z.object({
      state: z.string().optional().describe("Two-letter state: 'WA', 'CA', 'TX'"),
      specialty: z.string().optional().describe("Specialty: 'Orthopaedic', 'Cardio', 'Neurology'"),
      company: z.string().optional().describe("Company name: 'Pfizer', 'Stryker'"),
      year: z.string().optional().describe("Year (auto-discovers latest)"),
      limit: z.number().int().max(100).default(20).describe("Number of top doctors (default 20)"),
    }),
    execute: async (args) => {
      const data = await getTopDoctorTotals(args);
      if (!data.results?.length) return emptyResponse("No grouped payment data found.");
      return tableResponse(
        `Top doctors by total payments received`,
        { rows: data.results as Record<string, unknown>[], total: data.count },
      );
    },
  },

  {
    name: "open_payments_by_company",
    description:
      "Get payment summary data grouped by pharmaceutical/device company (all years combined).\n" +
      "Shows total amounts and number of payments per company.",
    annotations: { title: "Open Payments: By Company", readOnlyHint: true },
    parameters: z.object({
      limit: z.number().int().max(50).default(20).describe("Number of companies to return (default 20)"),
    }),
    execute: async (args) => {
      const data = await getPaymentsByCompany({ limit: args.limit });
      if (!data.results?.length) return emptyResponse("No company data found.");
      return tableResponse(
        `Open Payments by company (${data.count?.toLocaleString() ?? "?"} total)`,
        { rows: data.results as Record<string, unknown>[], total: data.count },
      );
    },
  },

  {
    name: "open_payments_summary",
    description:
      "Get national-level Open Payment totals and averages across all years.\n" +
      "Shows how much money flows from pharma to doctors nationally.",
    annotations: { title: "Open Payments: National Summary", readOnlyHint: true },
    parameters: z.object({}),
    execute: async () => {
      const data = await getNationalTotals();
      if (!data.results?.length) return emptyResponse("No summary data found.");
      return listResponse(
        `Open Payments National Summary`,
        { items: data.results as Record<string, unknown>[], total: data.results.length },
      );
    },
  },

  {
    name: "open_payments_research",
    description:
      "Search Open Payments RESEARCH payment data — grants, clinical research funding from pharma to doctors.\n" +
      "Separate from general payments. Shows research funding amounts, sponsors, and principal investigators.",
    annotations: { title: "Open Payments: Research", readOnlyHint: true },
    parameters: z.object({
      company: z.string().optional().describe("Company name: 'Pfizer', 'Novo Nordisk'"),
      doctor: z.string().optional().describe("Doctor last name: 'Smith'"),
      state: z.string().optional().describe("Two-letter state: 'CA', 'WA'"),
      year: z.string().optional().describe("Year (auto-discovers latest if omitted)"),
      limit: z.number().int().max(100).default(20).describe("Max results (default 20)"),
    }),
    execute: async (args) => {
      const data = await searchResearchPayments(args);
      if (!data.results?.length) return emptyResponse("No research payments found.");
      return tableResponse(
        `Research Payments: ${data.count?.toLocaleString() ?? "?"} records (showing ${data.results.length})`,
        { rows: data.results as Record<string, unknown>[], total: data.count },
      );
    },
  },

  {
    name: "open_payments_ownership",
    description:
      "Search Open Payments OWNERSHIP data — doctors with ownership or investment stakes in pharma/device companies.\n" +
      "The deepest form of conflict of interest. Shows which doctors have financial interests in the companies whose products they prescribe.",
    annotations: { title: "Open Payments: Ownership", readOnlyHint: true },
    parameters: z.object({
      company: z.string().optional().describe("Company name: 'Pfizer', 'Johnson & Johnson'"),
      doctor: z.string().optional().describe("Doctor last name"),
      state: z.string().optional().describe("Two-letter state: 'CA', 'WA'"),
      year: z.string().optional().describe("Year (auto-discovers latest if omitted)"),
      limit: z.number().int().max(100).default(20).describe("Max results (default 20)"),
    }),
    execute: async (args) => {
      const data = await searchOwnershipPayments(args);
      if (!data.results?.length) return emptyResponse("No ownership payments found.");
      return tableResponse(
        `Ownership Payments: ${data.count?.toLocaleString() ?? "?"} records (showing ${data.results.length})`,
        { rows: data.results as Record<string, unknown>[], total: data.count },
      );
    },
  },

  {
    name: "open_payments_by_physician",
    description:
      "Get payments grouped by individual physician across all years.\n" +
      "Pre-aggregated totals — shows how much each doctor received from pharma overall.",
    annotations: { title: "Open Payments: By Physician", readOnlyHint: true },
    parameters: z.object({
      limit: z.number().int().max(100).default(20).describe("Number of physicians (default 20)"),
    }),
    execute: async (args) => {
      const data = await getPaymentsByPhysician({ limit: args.limit });
      if (!data.results?.length) return emptyResponse("No physician data found.");
      return tableResponse(
        `Payments by physician (${data.count?.toLocaleString() ?? "?"} total)`,
        { rows: data.results as Record<string, unknown>[], total: data.count },
      );
    },
  },

  {
    name: "open_payments_by_hospital",
    description:
      "Get payments grouped by teaching hospital.\n" +
      "Shows total pharma payments to teaching hospitals — useful for identifying institutional conflicts of interest.",
    annotations: { title: "Open Payments: By Hospital", readOnlyHint: true },
    parameters: z.object({
      limit: z.number().int().max(100).default(20).describe("Number of hospitals (default 20)"),
    }),
    execute: async (args) => {
      const data = await getPaymentsByTeachingHospital({ limit: args.limit });
      if (!data.results?.length) return emptyResponse("No teaching hospital data found.");
      return tableResponse(
        `Payments by teaching hospital (${data.count?.toLocaleString() ?? "?"} total)`,
        { rows: data.results as Record<string, unknown>[], total: data.count },
      );
    },
  },

  {
    name: "open_payments_by_specialty",
    description:
      "Get national payment totals and averages by medical specialty.\n" +
      "Shows which specialties receive the most pharma money — cardiologists, orthopedic surgeons, psychiatrists, etc.",
    annotations: { title: "Open Payments: By Specialty", readOnlyHint: true },
    parameters: z.object({
      limit: z.number().int().max(100).default(30).describe("Number of specialties (default 30)"),
    }),
    execute: async (args) => {
      const data = await getPaymentsBySpecialty({ limit: args.limit });
      if (!data.results?.length) return emptyResponse("No specialty data found.");
      return tableResponse(
        `Payments by specialty (${data.count?.toLocaleString() ?? "?"} total)`,
        { rows: data.results as Record<string, unknown>[], total: data.count },
      );
    },
  },
];
