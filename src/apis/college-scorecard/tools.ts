/**
 * college-scorecard MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchSchools,
  getSchoolById,
  querySchools,
  getMostExpensive,
  getHighestEarners,
  getHighestGraduationRates,
  POPULAR_FIELDS,
  OWNERSHIP,
  DEGREE_TYPES,
} from "./sdk.js";
import { tableResponse, listResponse, emptyResponse } from "../../shared/response.js";

function formatSchool(r: Record<string, unknown>) {
  return {
    id: r.id ?? r["id"],
    name: r["school.name"],
    state: r["school.state"],
    city: r["school.city"],
    ownership: (OWNERSHIP as Record<number, string>)[r["school.ownership"] as number] ?? r["school.ownership"],
    admissionRate: r["latest.admissions.admission_rate.overall"] != null
      ? `${(Number(r["latest.admissions.admission_rate.overall"]) * 100).toFixed(1)}%` : null,
    tuitionInState: r["latest.cost.tuition.in_state"],
    tuitionOutOfState: r["latest.cost.tuition.out_of_state"],
    avgNetPrice: r["latest.cost.avg_net_price.overall"],
    graduationRate: r["latest.completion.rate_suppressed.overall"] != null
      ? `${(Number(r["latest.completion.rate_suppressed.overall"]) * 100).toFixed(1)}%` : null,
    medianEarnings10yr: r["latest.earnings.10_yrs_after_entry.median"],
    medianEarnings6yr: r["latest.earnings.6_yrs_after_entry.median"],
    medianDebt: r["latest.aid.median_debt.completers.overall"],
    pellGrantRate: r["latest.aid.pell_grant_rate"] != null
      ? `${(Number(r["latest.aid.pell_grant_rate"]) * 100).toFixed(1)}%` : null,
    studentSize: r["latest.student.size"],
  };
}

export const tools: Tool<any, any>[] = [
  {
    name: "scorecard_search",
    description:
      "Search U.S. colleges and universities from the College Scorecard.\n" +
      "Returns tuition, admission rate, graduation rate, median earnings after graduation, student debt.\n\n" +
      "Search by name, state, or school type. Sort by cost, earnings, or graduation rate.",
    annotations: { title: "College Scorecard: Search Schools", readOnlyHint: true },
    parameters: z.object({
      name: z.string().optional().describe("School name (partial match): 'Harvard', 'community college', 'MIT'"),
      state: z.string().optional().describe("Two-letter state code: 'CA', 'NY', 'TX'"),
      ownership: z.number().int().optional().describe("1=Public, 2=Private nonprofit, 3=Private for-profit"),
      sort: z.string().optional().describe("Sort field: 'latest.cost.tuition.out_of_state:desc', 'latest.earnings.10_yrs_after_entry.median:desc', 'latest.completion.rate_suppressed.overall:desc'"),
      per_page: z.number().int().max(100).default(20).describe("Results per page (default 20, max 100)"),
    }),
    execute: async ({ name, state, ownership, sort, per_page }) => {
      const data = await searchSchools({ name, state, ownership, sort, perPage: per_page });
      if (!data.results?.length) return emptyResponse(`No schools found${name ? ` matching "${name}"` : ""}.`);
      return tableResponse(
        `College Scorecard: ${data.metadata.total} schools found, showing ${data.results.length}`,
        { rows: data.results.map(formatSchool), total: data.metadata.total },
      );
    },
  },

  {
    name: "scorecard_compare",
    description:
      "Compare specific colleges side-by-side on cost, graduation rate, earnings, and debt.\n" +
      "Provide school names to search and compare.",
    annotations: { title: "College Scorecard: Compare Schools", readOnlyHint: true },
    parameters: z.object({
      schools: z.string().describe("Comma-separated school names to compare: 'Harvard,MIT,Stanford' or 'Ohio State,Michigan'"),
    }),
    execute: async ({ schools }) => {
      const names = schools.split(",").map((s: string) => s.trim()).filter(Boolean);
      const results = await Promise.all(
        names.map(async (n: string) => {
          const data = await searchSchools({ name: n, perPage: 1 });
          return data.results?.[0] ? formatSchool(data.results[0]) : { name: n, error: "Not found" };
        })
      );
      return tableResponse(
        `Comparing ${results.length} schools`,
        { rows: results },
      );
    },
  },

  {
    name: "scorecard_top",
    description:
      "Get top-ranked colleges by earnings, graduation rate, or lowest cost.\n" +
      "Rankings: 'earnings' (highest median pay 10yr after entry), 'graduation' (highest completion rate), 'expensive' (highest tuition)",
    annotations: { title: "College Scorecard: Rankings", readOnlyHint: true },
    parameters: z.object({
      ranking: z.enum(["earnings", "graduation", "expensive"]).describe("Ranking metric"),
      state: z.string().optional().describe("Filter to state: 'CA', 'NY', 'TX'"),
      ownership: z.number().int().optional().describe("1=Public, 2=Private nonprofit, 3=Private for-profit"),
      per_page: z.number().int().max(100).default(20).describe("Number of schools (default 20)"),
    }),
    execute: async ({ ranking, state, ownership, per_page }) => {
      let data;
      if (ranking === "earnings") {
        data = await getHighestEarners({ ownership, perPage: per_page });
      } else if (ranking === "graduation") {
        data = await getHighestGraduationRates({ state, perPage: per_page });
      } else if (ranking === "expensive") {
        data = await getMostExpensive({ ownership, perPage: per_page });
      } else {
        data = await getHighestEarners({ ownership, perPage: per_page });
      }
      if (!data.results?.length) return emptyResponse(`No schools found for "${ranking}" ranking.`);
      return tableResponse(
        `Top schools by ${ranking}: ${data.results.length} schools`,
        { rows: data.results.map(formatSchool), meta: { ranking } },
      );
    },
  },

  {
    name: "scorecard_query",
    description:
      "Advanced College Scorecard query with custom field filters and ranges.\n\n" +
      "Filter examples:\n" +
      "- 'latest.admissions.admission_rate.overall__range=0..0.10' (schools with <10% admission rate)\n" +
      "- 'latest.cost.tuition.in_state__range=..5000' (tuition under $5K)\n" +
      "- 'school.degrees_awarded.predominant=3' (bachelor's-granting)\n" +
      "- 'latest.earnings.10_yrs_after_entry.median__range=80000..' (high-earning graduates)",
    annotations: { title: "College Scorecard: Advanced Query", readOnlyHint: true },
    parameters: z.object({
      filters: z.string().describe("Semicolon-separated filter params: 'school.state=CA;latest.admissions.admission_rate.overall__range=0..0.20;school.degrees_awarded.predominant=3'"),
      sort: z.string().optional().describe("Sort: 'latest.earnings.10_yrs_after_entry.median:desc'"),
      per_page: z.number().int().max(100).default(20).describe("Results per page (default 20)"),
    }),
    execute: async ({ filters, sort, per_page }) => {
      const params: Record<string, string | number | undefined> = {};
      for (const f of filters.split(";")) {
        const [key, ...rest] = f.split("=");
        if (key && rest.length) params[key.trim()] = rest.join("=").trim();
      }
      if (sort) params.sort = sort;
      if (per_page) params.per_page = per_page;
      const data = await querySchools(params);
      if (!data.results?.length) return emptyResponse("No schools found matching the filters.");
      return tableResponse(
        `College Scorecard query: ${data.metadata.total} schools found, showing ${data.results.length}`,
        { rows: data.results.map(formatSchool), total: data.metadata.total },
      );
    },
  },
];
