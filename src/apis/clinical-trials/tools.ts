/**
 * clinical-trials MCP tools — 10 tools covering all ClinicalTrials.gov v2 API endpoints.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchTrials,
  getTrialDetail,
  getTrialEnrollmentStats,
  getStudyMetadata,
  getEnums,
  getSizeStats,
  getFieldValueStats,
  getFieldSizeStats,
  getVersion,
  clearCache as sdkClearCache,
  type Study,
} from "./sdk.js";
import {
  TRIAL_STATUSES,
  TRIAL_PHASES,
  STUDY_TYPES,
  INTERVENTION_TYPES,
  AGENCY_CLASSES,
  FIELD_STATS_TYPES,
  SEARCH_DEFAULT_FIELDS,
} from "./types.js";
import { listResponse, recordResponse, emptyResponse } from "../../shared/response.js";
import { keysEnum, describeEnum } from "../../shared/enum-utils.js";

// ─── Helpers ─────────────────────────────────────────────────────────

function studyToRecord(study: Study): Record<string, unknown> {
  const p = study.protocolSection;
  if (!p) return { error: "No protocol data available" };
  const id = p.identificationModule;
  const status = p.statusModule;
  const design = p.designModule;
  const sponsor = p.sponsorCollaboratorsModule;
  const conds = p.conditionsModule?.conditions?.join(", ") ?? null;
  const interventions = p.armsInterventionsModule?.interventions
    ?.map((i) => `${i.type ?? "?"}: ${i.name ?? "?"}`)
    .join("; ") ?? null;

  const record: Record<string, unknown> = {
    nctId: id?.nctId ?? null,
    title: id?.briefTitle ?? "Untitled",
    status: status?.overallStatus ?? null,
    phase: design?.phases?.join(", ") ?? null,
    studyType: design?.studyType ?? null,
    sponsor: sponsor?.leadSponsor?.name ?? null,
    sponsorClass: sponsor?.leadSponsor?.class ?? null,
    conditions: conds,
    interventions,
    enrollmentCount: design?.enrollmentInfo?.count ?? null,
    enrollmentType: design?.enrollmentInfo?.type ?? null,
    startDate: status?.startDateStruct?.date ?? null,
    primaryCompletionDate: status?.primaryCompletionDateStruct?.date ?? null,
    hasResults: study.hasResults ?? false,
  };

  const collabs = sponsor?.collaborators?.map((c) => c.name).join(", ");
  if (collabs) record.collaborators = collabs;

  // FDA oversight
  const oversight = p.oversightModule;
  if (oversight?.isFdaRegulatedDrug || oversight?.isFdaRegulatedDevice) {
    record.fdaRegulatedDrug = oversight.isFdaRegulatedDrug ?? false;
    record.fdaRegulatedDevice = oversight.isFdaRegulatedDevice ?? false;
  }

  const locations = p.contactsLocationsModule?.locations?.slice(0, 5);
  if (locations?.length) {
    record.locationCount = p.contactsLocationsModule?.locations?.length ?? 0;
    record.locations = locations.map((l) => ({
      facility: l.facility ?? null,
      city: l.city ?? null,
      state: l.state ?? null,
      country: l.country ?? null,
    }));
  }

  return record;
}

// ─── Tools ───────────────────────────────────────────────────────────

export const tools: Tool<any, any>[] = [
  // ─── 1. Search ─────────────────────────────────────────────────
  {
    name: "clinical_trials_search",
    description:
      "Search ClinicalTrials.gov for clinical trials by condition, drug/intervention, sponsor, " +
      "status, phase, study type, location, title, or free text.\n" +
      "Returns trial ID, title, status, phase, sponsor, conditions, enrollment, and hasResults flag.\n" +
      "Use sponsor filter to track pharma company research (e.g. 'Pfizer', 'Moderna', 'NIH').\n" +
      "Use filter_advanced for Essie expressions like 'AREA[StartDate]RANGE[2024-01-01,MAX]'.\n" +
      "Use agg_filters for shorthand filters: 'results:with', 'sex:f', 'healthy:y'.",
    annotations: { title: "ClinicalTrials.gov: Search", readOnlyHint: true },
    parameters: z.object({
      query: z.string().optional().describe("Free-text search across all fields"),
      condition: z.string().optional().describe("Disease or condition: 'lung cancer', 'diabetes', 'Alzheimer'"),
      intervention: z.string().optional().describe("Drug, device, or procedure: 'pembrolizumab', 'insulin'"),
      sponsor: z.string().optional().describe("Sponsor/collaborator: 'Pfizer', 'NIH', 'Moderna'"),
      titles: z.string().optional().describe("Title/acronym search: 'KEYNOTE', 'SPRINT'"),
      outcomes: z.string().optional().describe("Outcome measure search: 'overall survival', 'HbA1c'"),
      lead_sponsor: z.string().optional().describe("Lead sponsor name only (not collaborators): 'National Cancer Institute'"),
      study_id: z.string().optional().describe("Study ID search: 'NCT04852770' or org study ID"),
      location: z.string().optional().describe("Location search: 'California', 'Germany', 'Mayo Clinic'"),
      status: z
        .union([
          z.enum(keysEnum(TRIAL_STATUSES)),
          z.array(z.enum(keysEnum(TRIAL_STATUSES))),
        ])
        .optional()
        .describe(`Trial status. Pass an array for multiple, e.g. ["RECRUITING","ACTIVE_NOT_RECRUITING"]. Valid: ${describeEnum(TRIAL_STATUSES, 5)}`),
      phase: z.enum(keysEnum(TRIAL_PHASES)).optional().describe(`Trial phase: ${describeEnum(TRIAL_PHASES)}`),
      study_type: z.enum(keysEnum(STUDY_TYPES)).optional().describe(`Study type: ${describeEnum(STUDY_TYPES)}`),
      filter_advanced: z.string().optional().describe("Essie expression filter: 'AREA[MinimumAge]RANGE[MIN,18 years]'"),
      agg_filters: z.string().optional().describe("Aggregation filters: 'results:with,sex:f,healthy:y'"),
      sort: z.string().optional().describe("Sort field: '@relevance', 'LastUpdatePostDate', 'EnrollmentCount:desc'"),
      page_size: z.number().int().min(0).max(100).default(10).describe("Results per page (default 10, max 100)"),
      page_token: z.string().optional().describe("Pagination token from previous response"),
    }),
    execute: async (args) => {
      const data = await searchTrials({
        query: args.query,
        condition: args.condition,
        intervention: args.intervention,
        sponsor: args.sponsor,
        titles: args.titles,
        outcomes: args.outcomes,
        leadSponsor: args.lead_sponsor,
        studyId: args.study_id,
        location: args.location,
        status: args.status,
        phase: args.phase,
        studyType: args.study_type,
        filterAdvanced: args.filter_advanced,
        aggFilters: args.agg_filters,
        sort: args.sort ? [args.sort] : undefined,
        pageSize: args.page_size,
        pageToken: args.page_token,
        fields: [...SEARCH_DEFAULT_FIELDS],
      });
      if (!data.studies?.length) return emptyResponse("No clinical trials found matching the criteria.");

      const items = data.studies.map(studyToRecord);
      const meta: Record<string, unknown> = { total: data.totalCount ?? items.length };
      if (data.nextPageToken) meta.nextPageToken = data.nextPageToken;

      return listResponse(
        `${(data.totalCount ?? items.length).toLocaleString()} total trials found (showing ${data.studies.length})`,
        { items, ...meta },
      );
    },
  },

  // ─── 2. Detail ─────────────────────────────────────────────────
  {
    name: "clinical_trials_detail",
    description:
      "Get full details for a specific clinical trial by NCT ID.\n" +
      "Returns protocol, eligibility, arms/interventions, design, locations, contacts, and oversight info.\n" +
      "Use the fields param to request only specific sections (reduces response size).",
    annotations: { title: "ClinicalTrials.gov: Detail", readOnlyHint: true },
    parameters: z.object({
      nct_id: z.string().describe("ClinicalTrials.gov NCT ID: 'NCT06000000'"),
      fields: z.string().optional().describe("Pipe-separated fields to return: 'NCTId|BriefTitle|EligibilityModule'. Omit for full study."),
    }),
    execute: async (args) => {
      const fieldList = args.fields?.split("|").map((f: string) => f.trim()).filter(Boolean);
      const study = await getTrialDetail(args.nct_id, fieldList ? { fields: fieldList } : undefined);
      const record = studyToRecord(study);

      // Add eligibility if available
      const elig = study.protocolSection?.eligibilityModule;
      if (elig) {
        record.eligibilitySex = elig.sex ?? "All";
        record.eligibilityMinAge = elig.minimumAge ?? null;
        record.eligibilityMaxAge = elig.maximumAge ?? null;
        record.healthyVolunteers = elig.healthyVolunteers ?? false;
        if (elig.eligibilityCriteria) {
          record.eligibilityCriteria = elig.eligibilityCriteria.slice(0, 2000);
        }
      }

      // Add description
      const desc = study.protocolSection?.descriptionModule;
      if (desc?.briefSummary) record.briefSummary = desc.briefSummary;

      // Add design details
      const design = study.protocolSection?.designModule;
      if (design?.designInfo) {
        const di = design.designInfo;
        record.allocation = di.allocation ?? null;
        record.interventionModel = di.interventionModel ?? null;
        record.primaryPurpose = di.primaryPurpose ?? null;
        record.masking = di.maskingInfo?.masking ?? null;
      }

      // Add outcomes
      const outcomes = study.protocolSection?.outcomesModule;
      if (outcomes?.primaryOutcomes?.length) {
        record.primaryOutcomes = outcomes.primaryOutcomes.map((o) => ({
          measure: o.measure,
          timeFrame: o.timeFrame,
        }));
      }

      // Add IPD sharing
      const ipd = study.protocolSection?.ipdSharingStatementModule;
      if (ipd?.ipdSharing) record.ipdSharing = ipd.ipdSharing;

      // Add references
      const refs = study.protocolSection?.referencesModule?.references;
      if (refs?.length) {
        record.references = refs.slice(0, 10).map((r) => ({
          pmid: r.pmid ?? null,
          type: r.type ?? null,
          citation: r.citation?.slice(0, 200) ?? null,
        }));
      }

      return recordResponse(`${record.nctId ?? args.nct_id} — ${record.title ?? "Clinical Trial"}`, record);
    },
  },

  // ─── 3. Results ────────────────────────────────────────────────
  {
    name: "clinical_trials_results",
    description:
      "Get posted results for a completed clinical trial by NCT ID.\n" +
      "Returns outcome measures, adverse events (serious + other), participant flow, and baseline characteristics.\n" +
      "Only works for trials where hasResults=true. Use clinical_trials_search with agg_filters='results:with' to find them.",
    annotations: { title: "ClinicalTrials.gov: Results", readOnlyHint: true },
    parameters: z.object({
      nct_id: z.string().describe("ClinicalTrials.gov NCT ID: 'NCT00841061'"),
    }),
    execute: async (args) => {
      const study = await getTrialDetail(args.nct_id, {
        fields: ["NCTId", "BriefTitle", "OverallStatus", "HasResults", "ResultsSection"],
      });

      if (!study.hasResults && !study.resultsSection) {
        return emptyResponse(`Trial ${args.nct_id} has no posted results. Use clinical_trials_search with agg_filters='results:with' to find trials with results.`);
      }

      const results = study.resultsSection;
      const record: Record<string, unknown> = {
        nctId: study.protocolSection?.identificationModule?.nctId ?? args.nct_id,
        title: study.protocolSection?.identificationModule?.briefTitle ?? null,
        status: study.protocolSection?.statusModule?.overallStatus ?? null,
      };

      // Participant flow
      const flow = results?.participantFlowModule;
      if (flow) {
        record.participantFlow = {
          preAssignmentDetails: flow.preAssignmentDetails ?? null,
          recruitmentDetails: flow.recruitmentDetails ?? null,
          groups: flow.groups?.map((g) => ({ id: g.id, title: g.title })) ?? [],
        };
      }

      // Outcome measures
      const outMeasures = results?.outcomeMeasuresModule?.outcomeMeasures;
      if (outMeasures?.length) {
        record.outcomeMeasures = outMeasures.map((om) => ({
          type: om.type ?? null,
          title: om.title ?? null,
          description: om.description?.slice(0, 500) ?? null,
          timeFrame: om.timeFrame ?? null,
          paramType: om.paramType ?? null,
          unitOfMeasure: om.unitOfMeasure ?? null,
          reportingStatus: om.reportingStatus ?? null,
        }));
      }

      // Adverse events summary
      const ae = results?.adverseEventsModule;
      if (ae) {
        record.adverseEvents = {
          timeFrame: ae.timeFrame ?? null,
          description: ae.description ?? null,
          groups: ae.eventGroups?.map((g) => ({
            title: g.title,
            deathsAffected: g.deathsNumAffected ?? 0,
            deathsAtRisk: g.deathsNumAtRisk ?? 0,
            seriousAffected: g.seriousNumAffected ?? 0,
            seriousAtRisk: g.seriousNumAtRisk ?? 0,
            otherAffected: g.otherNumAffected ?? 0,
            otherAtRisk: g.otherNumAtRisk ?? 0,
          })) ?? [],
          seriousEventCount: ae.seriousEvents?.length ?? 0,
          otherEventCount: ae.otherEvents?.length ?? 0,
          topSeriousEvents: ae.seriousEvents?.slice(0, 10).map((e) => ({
            term: e.term,
            organSystem: e.organSystem,
          })) ?? [],
        };
      }

      // Limitations
      const limitations = results?.moreInfoModule?.limitationsAndCaveats?.description;
      if (limitations) record.limitations = limitations;

      return recordResponse(`Results for ${record.nctId} — ${record.title ?? "Trial"}`, record);
    },
  },

  // ─── 4. Stats ──────────────────────────────────────────────────
  {
    name: "clinical_trials_stats",
    description:
      "Get trial count breakdown by recruitment status for a condition or drug/intervention.\n" +
      "Shows how many trials are recruiting, active, completed, terminated, etc.\n" +
      "Works for diseases ('breast cancer') AND drug names ('semaglutide', 'pembrolizumab').\n" +
      "Queries 8 statuses in parallel for comprehensive breakdown.",
    annotations: { title: "ClinicalTrials.gov: Stats", readOnlyHint: true },
    parameters: z.object({
      condition: z.string().describe("Disease, condition, or drug name: 'breast cancer', 'semaglutide'"),
      search_as_drug: z.boolean().optional().describe("Set true to search as drug/intervention instead of condition (for drug names like 'semaglutide')"),
    }),
    execute: async (args) => {
      const data = await getTrialEnrollmentStats(args.condition, {
        asIntervention: args.search_as_drug,
      });
      const total = Object.values(data.statuses).reduce((a, b) => a + b, 0);

      // Auto-retry as intervention if condition search returns zero
      if (total === 0 && !args.search_as_drug) {
        const retryData = await getTrialEnrollmentStats(args.condition, { asIntervention: true });
        const retryTotal = Object.values(retryData.statuses).reduce((a, b) => a + b, 0);
        if (retryTotal > 0) {
          return recordResponse(
            `Clinical trials for "${args.condition}" as intervention (${retryTotal.toLocaleString()} total)`,
            { term: args.condition, searchType: "intervention", total: retryTotal, statuses: retryData.statuses },
          );
        }
      }

      if (total === 0) return emptyResponse(`No clinical trials found for "${args.condition}".`);
      return recordResponse(
        `Clinical trials for "${data.term}" (${total.toLocaleString()} total)`,
        { term: data.term, total, statuses: data.statuses },
      );
    },
  },

  // ─── 5. By Location ───────────────────────────────────────────
  {
    name: "clinical_trials_by_location",
    description:
      "Search for clinical trials near a geographic location.\n" +
      "Uses the ClinicalTrials.gov geo-distance filter to find trials within a radius of a latitude/longitude point.\n" +
      "Combine with condition or intervention filters to find specific trials nearby.",
    annotations: { title: "ClinicalTrials.gov: By Location", readOnlyHint: true },
    parameters: z.object({
      latitude: z.number().describe("Latitude of the search center: 38.9072 (Washington DC)"),
      longitude: z.number().describe("Longitude of the search center: -77.0369 (Washington DC)"),
      distance: z.string().optional().describe("Search radius with unit: '50mi' (default), '100km'"),
      condition: z.string().optional().describe("Filter by condition: 'diabetes', 'breast cancer'"),
      intervention: z.string().optional().describe("Filter by intervention: 'pembrolizumab'"),
      status: z.enum(keysEnum(TRIAL_STATUSES)).optional().describe("Filter by status (default: RECRUITING)"),
      page_size: z.number().int().min(1).max(50).default(10).describe("Results per page (default 10)"),
    }),
    execute: async (args) => {
      const dist = args.distance ?? "50mi";
      const geoFilter = `distance(${args.latitude},${args.longitude},${dist})`;

      const data = await searchTrials({
        geoFilter,
        condition: args.condition,
        intervention: args.intervention,
        status: args.status ?? "RECRUITING",
        pageSize: args.page_size ?? 10,
        sort: ["@relevance"],
        fields: [...SEARCH_DEFAULT_FIELDS],
      });

      if (!data.studies?.length) {
        return emptyResponse(`No trials found within ${dist} of (${args.latitude}, ${args.longitude}).`);
      }

      const items = data.studies.map((s) => {
        const rec = studyToRecord(s);
        // Include location details for geo-search results
        const locs = s.protocolSection?.contactsLocationsModule?.locations;
        if (locs?.length) {
          rec.nearestLocations = locs.slice(0, 3).map((l) => ({
            facility: l.facility ?? null,
            city: l.city ?? null,
            state: l.state ?? null,
            country: l.country ?? null,
          }));
        }
        return rec;
      });

      return listResponse(
        `${(data.totalCount ?? items.length).toLocaleString()} trials within ${dist} of (${args.latitude}, ${args.longitude})`,
        { items, total: data.totalCount ?? items.length },
      );
    },
  },

  // ─── 6. Field Values ──────────────────────────────────────────
  {
    name: "clinical_trials_field_values",
    description:
      "Get value statistics for study data fields — top values, counts, and distributions.\n" +
      "Powerful analytics tool: find top conditions, top sponsors, phase distributions, intervention type counts.\n" +
      "Examples: fields='Phase' shows trial count by phase; fields='Condition' shows top conditions.",
    annotations: { title: "ClinicalTrials.gov: Field Values", readOnlyHint: true },
    parameters: z.object({
      fields: z.string().describe("Pipe-separated field names: 'Phase', 'Condition', 'OverallStatus', 'LeadSponsorName'"),
      types: z
        .enum(keysEnum(FIELD_STATS_TYPES))
        .optional()
        .describe(`Filter by field type: ${describeEnum(FIELD_STATS_TYPES)}`),
    }),
    execute: async (args) => {
      const fieldList = args.fields.split("|").map((f: string) => f.trim()).filter(Boolean);
      const data = await getFieldValueStats({
        fields: fieldList,
        types: args.types ? [args.types] : undefined,
      });

      if (!data?.length) return emptyResponse(`No statistics found for fields: ${args.fields}`);

      const items = data.map((stat) => ({
        field: stat.field,
        piece: stat.piece,
        type: stat.type,
        uniqueValues: stat.uniqueValuesCount,
        missingStudies: stat.missingStudiesCount,
        topValues: stat.topValues?.slice(0, 20) ?? [],
        ...(stat.min != null && { min: stat.min }),
        ...(stat.max != null && { max: stat.max }),
        ...(stat.avg != null && { avg: stat.avg }),
        ...(stat.trueCount != null && { trueCount: stat.trueCount, falseCount: stat.falseCount }),
      }));

      return listResponse(
        `Field statistics for ${fieldList.join(", ")}`,
        { items },
      );
    },
  },

  // ─── 7. Enums ─────────────────────────────────────────────────
  {
    name: "clinical_trials_enums",
    description:
      "List all valid enum values for ClinicalTrials.gov data fields.\n" +
      "Returns every enum type (Status, Phase, StudyType, InterventionType, etc.) with all valid values.\n" +
      "Use as a reference when building search filters or understanding field values.",
    annotations: { title: "ClinicalTrials.gov: Enums", readOnlyHint: true },
    parameters: z.object({
      enum_type: z.string().optional().describe("Filter to a specific enum type: 'Status', 'Phase', 'InterventionType'. Omit for all enums."),
    }),
    execute: async (args) => {
      const data = await getEnums();
      if (!data?.length) return emptyResponse("No enum data available.");

      let filtered = data;
      if (args.enum_type) {
        filtered = data.filter((e) =>
          e.type.toLowerCase().includes(args.enum_type!.toLowerCase()),
        );
        if (!filtered.length) {
          return emptyResponse(
            `No enum type matching '${args.enum_type}'. Available: ${data.map((e) => e.type).join(", ")}`,
          );
        }
      }

      const items = filtered.map((e) => ({
        type: e.type,
        fields: e.pieces,
        values: e.values.map((v) => v.value),
        valueCount: e.values.length,
      }));

      return listResponse(
        `${items.length} enum type(s)${args.enum_type ? ` matching '${args.enum_type}'` : ""}`,
        { items },
      );
    },
  },

  // ─── 8. Metadata ──────────────────────────────────────────────
  {
    name: "clinical_trials_metadata",
    description:
      "Explore the ClinicalTrials.gov study data model — field names, types, and descriptions.\n" +
      "Use to discover available fields for the `fields` parameter in search/detail tools,\n" +
      "or to build advanced filter expressions with AREA[] syntax.",
    annotations: { title: "ClinicalTrials.gov: Metadata", readOnlyHint: true },
    parameters: z.object({
      include_indexed_only: z.boolean().optional().describe("Include indexed-only fields (default false)"),
      include_historic_only: z.boolean().optional().describe("Include fields only in historic data (default false)"),
    }),
    execute: async (args) => {
      const data = await getStudyMetadata({
        includeIndexedOnly: args.include_indexed_only,
        includeHistoricOnly: args.include_historic_only,
      });

      if (!data?.length) return emptyResponse("No metadata available.");

      // Flatten the tree to show top-level modules and their child fields
      const items = data.map((node) => ({
        name: node.name,
        piece: node.piece,
        type: node.type,
        title: node.title ?? null,
        isEnum: node.isEnum ?? false,
        childCount: node.children?.length ?? 0,
        children: node.children?.slice(0, 20).map((c) => ({
          name: c.name,
          type: c.type,
          title: c.title ?? null,
          isEnum: c.isEnum ?? false,
        })) ?? [],
      }));

      return listResponse(
        `Study data model: ${data.length} top-level fields`,
        { items },
      );
    },
  },

  // ─── 9. Field Sizes ───────────────────────────────────────────
  {
    name: "clinical_trials_field_sizes",
    description:
      "Get statistics on list/array field sizes in the ClinicalTrials.gov database.\n" +
      "Shows min/max/top sizes for array fields like Condition, Intervention, Phase.\n" +
      "Useful for understanding data distribution.",
    annotations: { title: "ClinicalTrials.gov: Field Sizes", readOnlyHint: true },
    parameters: z.object({
      fields: z.string().optional().describe("Pipe-separated field names: 'Phase|Condition|InterventionName'. Omit for all."),
    }),
    execute: async (args) => {
      const fieldList = args.fields?.split("|").map((f: string) => f.trim()).filter(Boolean);
      const data = await getFieldSizeStats(fieldList ? { fields: fieldList } : undefined);

      if (!data?.length) return emptyResponse("No field size statistics available.");

      const items = data.map((stat) => ({
        field: stat.field,
        piece: stat.piece,
        uniqueSizes: stat.uniqueSizesCount,
        minSize: stat.minSize ?? null,
        maxSize: stat.maxSize ?? null,
        topSizes: stat.topSizes?.slice(0, 10) ?? [],
      }));

      return listResponse(
        `Field size statistics for ${items.length} fields`,
        { items },
      );
    },
  },

  // ─── 10. Size Stats ───────────────────────────────────────────
  {
    name: "clinical_trials_size_stats",
    description:
      "Get database statistics: total study count, average study JSON size, size distribution, and largest studies.\n" +
      "Quick overview of the ClinicalTrials.gov database scope and data volume.",
    annotations: { title: "ClinicalTrials.gov: Size Stats", readOnlyHint: true },
    parameters: z.object({}),
    execute: async () => {
      const data = await getSizeStats();

      const record: Record<string, unknown> = {
        totalStudies: data.totalStudies,
        averageSizeBytes: data.averageSizeBytes,
        averageSizeKB: Math.round(data.averageSizeBytes / 1024),
        percentiles: data.percentiles,
        sizeRanges: data.ranges,
        largestStudies: data.largestStudies?.slice(0, 5).map((s) => ({
          nctId: s.id,
          sizeKB: Math.round(s.sizeBytes / 1024),
        })),
      };

      return recordResponse(
        `ClinicalTrials.gov: ${data.totalStudies.toLocaleString()} total studies, avg ${Math.round(data.averageSizeBytes / 1024)}KB`,
        record,
      );
    },
  },
];

