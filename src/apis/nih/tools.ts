/**
 * nih MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchProjects,
  searchPublications,
  getSpendingByCategory,
  getProjectsByAgency,
  NIH_AGENCIES,
  SPENDING_CATEGORIES,
  ACTIVITY_CODES,
  FUNDING_MECHANISMS,
  clearCache as sdkClearCache,
  type NihProject,
} from "./sdk.js";
import { tableResponse, listResponse, recordResponse, emptyResponse } from "../../shared/response.js";
import { keysEnum, describeEnum } from "../../shared/enum-utils.js";

function projectToRecord(p: NihProject): Record<string, unknown> {
  const record: Record<string, unknown> = {
    project_num: p.project_num ?? p.core_project_num ?? null,
    project_title: p.project_title ?? "Untitled",
    fiscal_year: p.fiscal_year ?? null,
    award_amount: p.award_amount ?? 0,
    direct_cost: p.direct_cost_amt ?? null,
    indirect_cost: p.indirect_cost_amt ?? null,
    activity_code: p.activity_code ?? null,
    funding_mechanism: p.funding_mechanism ?? null,
    agency: p.agency_ic_admin?.abbreviation ?? null,
    agency_name: p.agency_ic_admin?.name ?? null,
    is_active: p.is_active ?? null,
    project_start_date: p.project_start_date?.slice(0, 10) ?? null,
    project_end_date: p.project_end_date?.slice(0, 10) ?? null,
  };

  if (p.agency_ic_fundings?.length) {
    record.funding_ics = p.agency_ic_fundings.map(f => ({
      abbreviation: f.abbreviation ?? null,
      total_cost: f.total_cost ?? 0,
    }));
  }

  const pis = p.principal_investigators?.map(pi => pi.full_name).filter(Boolean);
  if (pis?.length) record.principal_investigators = pis;

  if (p.organization) {
    const org = p.organization;
    record.organization = org.org_name ?? null;
    record.org_city = org.city ?? org.org_city ?? null;
    record.org_state = org.state ?? org.org_state ?? null;
    if (org.dept_type) record.department = org.dept_type;
  }

  if (p.spending_categories_desc) record.spending_categories = p.spending_categories_desc;
  if (p.covid_response?.length) record.covid_response = p.covid_response;
  if (p.project_detail_url) record.detail_url = p.project_detail_url;

  return record;
}

export const tools: Tool<any, any>[] = [
  {
    name: "nih_search_projects",
    description:
      "Search NIH-funded research projects by text, disease area, investigator, institution, state, " +
      "agency, spending category, grant type, and funding amount.\n" +
      "Returns project number, title, PI, organization, award amount, agency, activity code, and dates.\n" +
      "Use to find research grants for any disease, track institutional funding, or identify PIs.",
    annotations: { title: "NIH RePORTER: Search Projects", readOnlyHint: true },
    parameters: z.object({
      text: z.string().optional().describe("Free-text search in titles, abstracts, and terms: 'breast cancer', 'CRISPR', 'opioid'"),
      fiscal_years: z.array(z.number().int()).optional().describe("Fiscal years: [2024] or [2020,2021,2022,2023,2024]"),
      agencies: z.array(z.enum(keysEnum(NIH_AGENCIES))).optional().describe(`NIH institute codes: ${describeEnum(NIH_AGENCIES)}`),
      pi_name: z.string().optional().describe("Principal investigator name (partial match): 'Fauci', 'Collins'"),
      org_names: z.array(z.string()).optional().describe("Organization names (wildcard): ['JOHNS HOPKINS'], ['STANFORD']"),
      org_states: z.array(z.string()).optional().describe("State abbreviations: ['CA','NY'], ['TX']"),
      spending_categories: z.array(z.number().int()).optional().describe("RCDC category IDs: [27]=Cancer, [7]=Alzheimer's, [41]=Diabetes, [93]=Opioids, [60]=HIV/AIDS"),
      activity_codes: z.array(z.enum(keysEnum(ACTIVITY_CODES))).optional().describe(`Grant types: ${describeEnum(ACTIVITY_CODES)}`),
      funding_mechanism: z.array(z.enum(keysEnum(FUNDING_MECHANISMS))).optional().describe(`Mechanism codes: ${describeEnum(FUNDING_MECHANISMS)}`),
      award_amount_min: z.number().optional().describe("Minimum award amount in dollars"),
      award_amount_max: z.number().optional().describe("Maximum award amount in dollars"),
      covid_response: z.array(z.string()).optional().describe("COVID funding: ['All'], ['C3'] (CARES Act), ['C6'] (American Rescue Plan)"),
      exclude_subprojects: z.boolean().optional().describe("Exclude subprojects for cleaner counts (default: true)"),
      limit: z.number().int().max(50).default(10).describe("Results per page (default 10, max 50)"),
      offset: z.number().int().optional().describe("Starting offset for pagination"),
      sort_field: z.string().optional().describe("Sort by: 'award_amount', 'project_start_date', 'fiscal_year'"),
      sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    }),
    execute: async (args) => {
      const piNames = args.pi_name ? [{ any_name: args.pi_name }] : undefined;
      const data = await searchProjects({
        text: args.text,
        fiscal_years: args.fiscal_years,
        agencies: args.agencies,
        pi_names: piNames,
        org_names: args.org_names,
        org_states: args.org_states,
        spending_categories: args.spending_categories,
        activity_codes: args.activity_codes,
        funding_mechanism: args.funding_mechanism,
        award_amount_min: args.award_amount_min,
        award_amount_max: args.award_amount_max,
        covid_response: args.covid_response,
        exclude_subprojects: args.exclude_subprojects ?? true,
        limit: args.limit ?? 10,
        offset: args.offset,
        sort_field: args.sort_field,
        sort_order: args.sort_order,
      });

      if (!data.results?.length) {
        return emptyResponse("No NIH projects found matching the criteria.");
      }

      const items = data.results.map(projectToRecord);
      return listResponse(
        `${(data.meta.total ?? 0).toLocaleString()} total projects found (showing ${data.results.length})`,
        { items, total: data.meta.total ?? 0 },
      );
    },
  },

  {
    name: "nih_search_publications",
    description:
      "Search for publications linked to NIH-funded projects.\n" +
      "Search by PubMed IDs (PMIDs), application IDs, or core project numbers.\n" +
      "Returns PMID and linked project number.",
    annotations: { title: "NIH RePORTER: Search Publications", readOnlyHint: true },
    parameters: z.object({
      pmids: z.array(z.number().int()).optional().describe("PubMed IDs: [33298401, 33105091]"),
      core_project_nums: z.array(z.string()).optional().describe("Core project numbers: ['R01AG060942']"),
      appl_ids: z.array(z.number().int()).optional().describe("Application IDs"),
      limit: z.number().int().max(50).default(10).describe("Results per page (default 10)"),
      offset: z.number().int().optional().describe("Starting offset for pagination"),
    }),
    execute: async (args) => {
      const data = await searchPublications({
        pmids: args.pmids,
        core_project_nums: args.core_project_nums,
        appl_ids: args.appl_ids,
        limit: args.limit ?? 10,
        offset: args.offset,
      });

      if (!data.results?.length) {
        return emptyResponse("No publications found.");
      }

      const items = data.results.map(p => ({
        pmid: p.pmid ?? null,
        coreproject: p.coreproject ?? null,
        applid: p.applid ?? null,
      }));
      return listResponse(
        `${(data.meta.total ?? 0).toLocaleString()} total publications (showing ${data.results.length})`,
        { items, total: data.meta.total ?? 0 },
      );
    },
  },

  {
    name: "nih_spending_by_category",
    description:
      "Get NIH project counts and estimated funding for a disease/research area across fiscal years.\n" +
      "Uses RCDC spending categories with an agency-based fallback for more accurate counts.\n" +
      "Common category IDs: 27=Cancer, 7=Alzheimer's, 41=Diabetes, 60=HIV/AIDS, 93=Opioids, " +
      "30=Cardiovascular, 85=Mental Health, 38=COVID-19, 118=Stroke, 92=Obesity.\n" +
      "Note: For the most reliable counts by disease area, also try nih_projects_by_agency with the relevant institute.",
    annotations: { title: "NIH RePORTER: Spending by Category", readOnlyHint: true },
    parameters: z.object({
      category_id: z.number().int().describe("RCDC spending category ID: 27=Cancer, 7=Alzheimer's, 41=Diabetes, 60=HIV/AIDS, 93=Opioids"),
      fiscal_years: z.array(z.number().int()).describe("Fiscal years to compare: [2020,2021,2022,2023,2024]"),
    }),
    execute: async (args) => {
      const data = await getSpendingByCategory(args.category_id, args.fiscal_years);

      const yearRecords = Object.entries(data.years)
        .sort(([a], [b]) => Number(a) - Number(b))
        .reduce((acc, [year, info]) => {
          acc[`FY${year}`] = { projects: info.projects, totalFunding: info.totalFunding, method: info.method };
          return acc;
        }, {} as Record<string, unknown>);

      return recordResponse(
        `NIH funding for "${data.category}" (RCDC #${args.category_id})`,
        { category: data.category, categoryId: args.category_id, years: yearRecords },
        { note: "Funding shown is sum of top-50 awards; actual totals are higher. Project counts via agency are more complete than RCDC tags." },
      );
    },
  },

  {
    name: "nih_projects_by_agency",
    description:
      "Get project counts by NIH institute/center for a fiscal year.\n" +
      "Shows which institutes fund the most research: NCI (cancer), NIAID (infectious diseases), etc.\n" +
      "Useful for understanding NIH budget allocation across disease areas.",
    annotations: { title: "NIH RePORTER: Projects by Agency", readOnlyHint: true },
    parameters: z.object({
      fiscal_year: z.number().int().describe("Fiscal year: 2024"),
      agencies: z.array(z.enum(keysEnum(NIH_AGENCIES))).optional().describe("Specific agency codes to check (default: top 25)"),
    }),
    execute: async (args) => {
      const data = await getProjectsByAgency(args.fiscal_year, args.agencies);

      if (!data.length) {
        return emptyResponse("No data found.");
      }

      const rows = data.map(d => ({
        agency: d.agency,
        name: d.name,
        projectCount: d.projectCount,
      }));
      const total = data.reduce((sum, d) => sum + d.projectCount, 0);
      return tableResponse(
        `NIH projects by institute (FY${args.fiscal_year}): ${total.toLocaleString()} total`,
        { rows, total: rows.length },
      );
    },
  },
];
