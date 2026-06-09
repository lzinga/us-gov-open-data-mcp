/**
 * fda MCP tools — covers all OpenFDA API endpoints.
 *
 * Organized by category: Drug, Device, Food, Animal/Vet, Tobacco, Other.
 * Each tool uses the generic fdaSearch helper where possible.
 * Docs: https://open.fda.gov/apis/
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  searchDrugEvents, searchDrugLabels, searchDrugNdc, searchDrugRecalls,
  searchApprovedDrugs, searchDrugShortages,
  searchDeviceEvents, searchDevice510k, searchDeviceClassification,
  searchDeviceEnforcement, searchDeviceRecalls, searchDevicePma,
  searchDeviceRegistrations, searchDeviceUdi, searchCovidSerology,
  searchFoodRecalls, searchFoodAdverseEvents,
  searchAnimalEvents, searchTobaccoProblems,
  searchHistoricalDocs, searchNsde, searchSubstances, searchUnii,
  countDrugEvents, countEndpoint,
} from "./sdk.js";
import { FDA_ENDPOINTS } from "./types.js";
import { tableResponse, listResponse, emptyResponse } from "../../shared/response.js";
import { keysEnum } from "../../shared/enum-utils.js";

// ─── Shared helpers ──────────────────────────────────────────────────

/** Truncate long text array fields for tool output. */
function truncArr(arr?: string[], maxLen = 500): string | undefined {
  if (!arr?.length) return undefined;
  const text = arr.join(" ").substring(0, maxLen);
  return text.length === maxLen ? text + "…" : text;
}

/** Extract total from OpenFDA meta. */
function total(data: any): number {
  return data.meta?.results?.total ?? 0;
}

/** Standard search + limit params used by nearly every tool. */
const searchParams = z.object({
  search: z.string().optional().describe("OpenFDA search query. Examples: 'field:value', 'field:\"Exact Phrase\"', 'field:[20200101+TO+20231231]', '_exists_:field'. Combine with '+AND+', '+OR+', '+NOT+'."),
  limit: z.number().int().max(100).default(10).describe("Max results (default 10, max 100)"),
});

const endpointEnum = keysEnum(FDA_ENDPOINTS);

// ═══════════════════════════════════════════════════════════════════════
// DRUG TOOLS
// ═══════════════════════════════════════════════════════════════════════

export const tools: Tool<any, any>[] = [
  // ── Drug Events ──────────────────────────────────────────────────
  {
    name: "fda_drug_events",
    description:
      "Search FDA adverse drug event reports (FAERS) — side effects, hospitalizations, deaths.\n" +
      "Over 20 million reports. Search by drug name, reaction, seriousness.\n\n" +
      "Example searches:\n" +
      "- 'patient.drug.openfda.brand_name:aspirin' — events involving aspirin\n" +
      "- 'patient.drug.openfda.generic_name:ibuprofen+AND+serious:1' — serious ibuprofen events\n" +
      "- 'patient.reaction.reactionmeddrapt:nausea' — events where nausea was reported",
    annotations: { title: "FDA: Drug Adverse Events", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDrugEvents({ search, limit });
      if (!data.results?.length) return emptyResponse("No drug event reports found.");
      return listResponse(
        `FDA drug adverse events: ${total(data).toLocaleString()} total reports, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            reportId: r.safetyreportid, serious: r.serious === "1", death: r.seriousnessdeath === "1",
            receiveDate: r.receivedate,
            drugs: r.patient?.drug?.map((d: any) => d.medicinalproduct || d.openfda?.brand_name?.[0]).filter(Boolean),
            reactions: r.patient?.reaction?.map((rx: any) => rx.reactionmeddrapt).filter(Boolean),
          })),
        },
      );
    },
  },

  // ── Drug Counts (legacy, kept for backward compat) ───────────────
  {
    name: "fda_drug_counts",
    description:
      "Aggregate/count FDA drug adverse event data by any field.\n" +
      "For counting other endpoints, use fda_count instead.\n\n" +
      "Common count fields:\n" +
      "- 'patient.reaction.reactionmeddrapt.exact' — most common adverse reactions\n" +
      "- 'patient.drug.openfda.brand_name.exact' — most reported drug brands\n" +
      "- 'patient.drug.openfda.generic_name.exact' — most reported generic names\n" +
      "- 'receivedate' — reports over time\n" +
      "- 'primarysource.reportercountry.exact' — reports by country",
    annotations: { title: "FDA: Drug Event Counts", readOnlyHint: true },
    parameters: z.object({
      count_field: z.string().describe("Field to count by. Use '.exact' suffix for full phrase counts. E.g. 'patient.reaction.reactionmeddrapt.exact'"),
      search: z.string().optional().describe("Optional search filter, e.g. 'patient.drug.openfda.brand_name:aspirin'"),
      limit: z.number().int().max(1000).default(10).describe("Max count results (default 10)"),
    }),
    execute: async ({ count_field, search, limit }) => {
      const data = await countDrugEvents(count_field, { search, limit });
      if (!data.results?.length) return emptyResponse("No count data found.");
      return tableResponse(
        `FDA drug event counts by ${count_field}: ${data.results.length} categories`,
        { rows: data.results.slice(0, 50), meta: { field: count_field } },
      );
    },
  },

  // ── Drug Labels ──────────────────────────────────────────────────
  {
    name: "fda_drug_labels",
    description:
      "Search FDA drug product labeling (package inserts / prescribing information — SPL).\n" +
      "Contains indications, warnings, boxed warnings, adverse reactions, drug interactions, dosage.\n\n" +
      "Example searches:\n" +
      "- 'openfda.brand_name:\"Tylenol\"' — labeling for Tylenol\n" +
      "- '_exists_:boxed_warning' — all labels with a Black Box Warning\n" +
      "- 'effective_time:[20200101+TO+20231231]' — labels updated in date range\n" +
      "- 'openfda.product_type:\"HUMAN PRESCRIPTION DRUG\"' — prescription drug labels only\n\n" +
      "Count fields: openfda.product_type.exact, openfda.brand_name.exact, openfda.route.exact",
    annotations: { title: "FDA: Drug Labels", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDrugLabels({ search, limit });
      if (!data.results?.length) return emptyResponse("No drug labels found.");
      return listResponse(
        `FDA drug labels: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 15).map((r: any) => ({
            id: r.id, effectiveTime: r.effective_time,
            brandName: r.openfda?.brand_name, genericName: r.openfda?.generic_name,
            manufacturer: r.openfda?.manufacturer_name, route: r.openfda?.route,
            productType: r.openfda?.product_type,
            hasBoxedWarning: !!r.boxed_warning?.length,
            indicationsAndUsage: truncArr(r.indications_and_usage),
            boxedWarning: truncArr(r.boxed_warning),
            warnings: truncArr(r.warnings),
            adverseReactions: truncArr(r.adverse_reactions),
            drugInteractions: truncArr(r.drug_interactions),
          })),
        },
      );
    },
  },

  // ── Drug NDC Directory ───────────────────────────────────────────
  {
    name: "fda_drug_ndc",
    description:
      "Search the NDC Directory — National Drug Code product listings (132K+ records).\n" +
      "Find drugs by brand name, generic name, dosage form, DEA schedule, pharmacological class.\n" +
      "Each entry has product data, active ingredients, packaging info, and openfda annotations.\n\n" +
      "Example searches:\n" +
      "- 'brand_name:\"Tylenol\"' — Tylenol products\n" +
      "- 'dea_schedule:\"CII\"' — Schedule II controlled substances\n" +
      "- 'dosage_form:\"LOTION\"' — all lotions\n" +
      "- 'active_ingredients.name:\"OXYCODONE\"' — products containing oxycodone\n" +
      "- 'finished:true' — finished drug products only\n\n" +
      "Count fields: pharm_class.exact, dea_schedule, dosage_form.exact, route.exact",
    annotations: { title: "FDA: NDC Directory", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDrugNdc({ search, limit });
      if (!data.results?.length) return emptyResponse("No NDC records found.");
      return listResponse(
        `FDA NDC Directory: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            productNdc: r.product_ndc, brandName: r.brand_name, genericName: r.generic_name,
            dosageForm: r.dosage_form, route: r.route, deaSchedule: r.dea_schedule,
            marketingCategory: r.marketing_category, productType: r.product_type,
            pharmClass: r.pharm_class,
            activeIngredients: r.active_ingredients?.map((i: any) => `${i.name} ${i.strength}`),
            packagingCount: r.packaging?.length ?? 0,
            firstPackageNdc: r.packaging?.[0]?.package_ndc,
          })),
        },
      );
    },
  },

  // ── Drug Recalls (Enforcement) ───────────────────────────────────
  {
    name: "fda_drug_recalls",
    description:
      "Search FDA drug recall enforcement reports.\n" +
      "Find recalled drugs by classification (Class I=most serious), company, or reason.\n\n" +
      "Example searches:\n" +
      "- 'classification:\"Class I\"' — most dangerous recalls\n" +
      "- 'recalling_firm:\"Pfizer\"' — recalls by Pfizer\n" +
      "- 'reason_for_recall:listeria' — recalls due to listeria",
    annotations: { title: "FDA: Drug Recalls", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDrugRecalls({ search, limit });
      if (!data.results?.length) return emptyResponse("No drug recalls found.");
      return listResponse(
        `FDA drug recalls: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            recallNumber: r.recall_number, classification: r.classification,
            firm: r.recalling_firm, date: r.recall_initiation_date,
            reason: r.reason_for_recall, product: r.product_description?.substring(0, 200),
            status: r.status,
          })),
        },
      );
    },
  },

  // ── Approved Drugs (Drugs@FDA) ───────────────────────────────────
  {
    name: "fda_approved_drugs",
    description:
      "Search FDA-approved drugs (Drugs@FDA database).\n" +
      "Find approved drugs by brand name, sponsor/manufacturer, or application number.\n" +
      "Shows approval history, active ingredients, and marketing status.\n\n" +
      "Example searches:\n" +
      "- 'openfda.brand_name:\"Ozempic\"' — find Ozempic\n" +
      "- 'sponsor_name:\"Pfizer\"' — all Pfizer approvals\n" +
      "- 'products.active_ingredients.name:\"SEMAGLUTIDE\"' — by ingredient",
    annotations: { title: "FDA: Approved Drugs", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchApprovedDrugs({ search, limit });
      if (!data.results?.length) return emptyResponse("No approved drugs found.");
      return listResponse(
        `FDA approved drugs: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            applicationNumber: r.application_number, sponsor: r.sponsor_name,
            products: r.products?.map((p: any) => ({
              brandName: p.brand_name, route: p.route, dosageForm: p.dosage_form,
              activeIngredients: p.active_ingredients?.map((i: any) => `${i.name} ${i.strength}`).join(", "),
              marketingStatus: p.marketing_status,
            })),
            latestSubmission: r.submissions?.[0] ? {
              type: r.submissions[0].submission_type, status: r.submissions[0].submission_status,
              date: r.submissions[0].submission_status_date,
            } : undefined,
          })),
        },
      );
    },
  },

  // ── Drug Shortages ───────────────────────────────────────────────
  {
    name: "fda_drug_shortages",
    description:
      "Search FDA drug shortage listings — which drugs are in shortage and why.\n" +
      "Tracks status, dosage form, therapeutic category, company, and shortage reason.\n\n" +
      "Example searches:\n" +
      "- 'status:\"Currently in Shortage\"' — active shortages\n" +
      "- 'dosage_form:\"Capsule\"' — capsule shortages\n" +
      "- 'therapeutic_category:\"Antiviral\"' — antiviral shortages\n" +
      "- 'generic_name:\"Adderall\"' — specific drug\n\n" +
      "Count fields: update_type, status.exact, therapeutic_category.exact",
    annotations: { title: "FDA: Drug Shortages", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDrugShortages({ search, limit });
      if (!data.results?.length) return emptyResponse("No drug shortages found.");
      return listResponse(
        `FDA drug shortages: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            genericName: r.generic_name, company: r.company_name, status: r.status,
            dosageForm: r.dosage_form, presentation: r.presentation,
            therapeuticCategory: r.therapeutic_category,
            initialPostingDate: r.initial_posting_date, updateDate: r.update_date,
            updateType: r.update_type, reasonForShortage: r.related_info,
            brandName: r.openfda?.brand_name,
          })),
        },
      );
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // DEVICE TOOLS
  // ═══════════════════════════════════════════════════════════════════

  // ── Device Events ────────────────────────────────────────────────
  {
    name: "fda_device_events",
    description:
      "Search FDA medical device adverse event reports (MAUDE) — injuries, malfunctions, deaths.\n\n" +
      "Example searches:\n" +
      "- 'device.generic_name:pacemaker' — pacemaker events\n" +
      "- 'event_type:death' — events resulting in death",
    annotations: { title: "FDA: Device Events", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDeviceEvents({ search, limit });
      if (!data.results?.length) return emptyResponse("No device event reports found.");
      return listResponse(
        `FDA device events: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            eventType: r.event_type, date: r.date_received,
            deviceName: r.device?.[0]?.generic_name, manufacturer: r.device?.[0]?.manufacturer_d_name,
            description: (r.mdr_text?.[0]?.text || "").substring(0, 300),
          })),
        },
      );
    },
  },

  // ── Device 510(k) Clearances ─────────────────────────────────────
  {
    name: "fda_device_510k",
    description:
      "Search 510(k) premarket clearance decisions (174K+ since 1976).\n" +
      "A 510(k) demonstrates a device is substantially equivalent to a legally marketed device.\n\n" +
      "Example searches:\n" +
      "- 'advisory_committee:cv' — cardiovascular devices\n" +
      "- 'openfda.regulation_number:868.5895' — by regulation number\n" +
      "- 'device_name:\"pacemaker\"' — by device name\n" +
      "- 'applicant:\"Medtronic\"' — by company\n\n" +
      "Count fields: country_code, advisory_committee, clearance_type.exact, decision_code",
    annotations: { title: "FDA: 510(k) Clearances", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDevice510k({ search, limit });
      if (!data.results?.length) return emptyResponse("No 510(k) records found.");
      return listResponse(
        `FDA 510(k) clearances: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            kNumber: r.k_number, deviceName: r.device_name, applicant: r.applicant,
            decisionDate: r.decision_date, decisionDescription: r.decision_description,
            clearanceType: r.clearance_type, productCode: r.product_code,
            advisoryCommittee: r.advisory_committee_description,
            deviceClass: r.openfda?.device_class, regulationNumber: r.openfda?.regulation_number,
          })),
        },
      );
    },
  },

  // ── Device Classification ────────────────────────────────────────
  {
    name: "fda_device_classification",
    description:
      "Search medical device classification — ~1,700 generic device types.\n" +
      "Returns device class (1=Class I, 2=Class II, 3=Class III), product codes, definitions.\n\n" +
      "Example searches:\n" +
      "- 'regulation_number:872.6855' — by regulation number\n" +
      "- 'product_code:NOB' — by product code\n" +
      "- 'device_name:\"pacemaker\"' — by device name\n" +
      "- 'device_class:3' — Class III (highest risk) devices\n\n" +
      "Count fields: device_class, medical_specialty.exact",
    annotations: { title: "FDA: Device Classification", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDeviceClassification({ search, limit });
      if (!data.results?.length) return emptyResponse("No device classifications found.");
      return listResponse(
        `FDA device classifications: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            deviceName: r.device_name, deviceClass: r.device_class,
            productCode: r.product_code, regulationNumber: r.regulation_number,
            medicalSpecialty: r.medical_specialty_description,
            definition: r.definition?.substring(0, 500),
            implant: r.implant_flag, lifeSustaining: r.life_sustain_support_flag,
          })),
        },
      );
    },
  },

  // ── Device Enforcement (Recalls) ─────────────────────────────────
  {
    name: "fda_device_enforcement",
    description:
      "Search FDA device recall enforcement reports.\n" +
      "Same classification system as drug/food recalls: Class I (most dangerous) to Class III.\n" +
      "Note: Records before June 2012 may lack some fields.\n\n" +
      "Example searches:\n" +
      "- 'classification:\"Class I\"' — most dangerous recalls\n" +
      "- 'report_date:[20200101+TO+20231231]' — recalls in date range\n" +
      "- 'recalling_firm:\"Medtronic\"' — by company\n\n" +
      "Count fields: voluntary_mandated.exact, classification.exact, status.exact",
    annotations: { title: "FDA: Device Enforcement", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDeviceEnforcement({ search, limit });
      if (!data.results?.length) return emptyResponse("No device enforcement reports found.");
      return listResponse(
        `FDA device enforcement: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            recallNumber: r.recall_number, classification: r.classification,
            firm: r.recalling_firm, date: r.recall_initiation_date,
            reason: r.reason_for_recall, product: r.product_description?.substring(0, 200),
            status: r.status, voluntaryMandated: r.voluntary_mandated,
          })),
        },
      );
    },
  },

  // ── Device Recalls (RES) ─────────────────────────────────────────
  {
    name: "fda_device_recalls",
    description:
      "Search FDA medical device recall reports (RES system).\n" +
      "Find recalled devices by name, manufacturer, or reason for recall.\n\n" +
      "Example searches:\n" +
      "- 'openfda.device_name:\"pacemaker\"' — pacemaker recalls\n" +
      "- 'reason_for_recall:\"software\"' — software-related recalls",
    annotations: { title: "FDA: Device Recalls", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDeviceRecalls({ search, limit });
      if (!data.results?.length) return emptyResponse("No device recalls found.");
      return listResponse(
        `FDA device recalls: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            eventNumber: r.res_event_number,
            product: r.product_description?.substring(0, 200),
            reason: r.reason_for_recall?.substring(0, 300),
            rootCause: r.root_cause_description,
            deviceName: r.openfda?.device_name, deviceClass: r.openfda?.device_class,
          })),
        },
      );
    },
  },

  // ── Device PMA (Premarket Approval) ──────────────────────────────
  {
    name: "fda_device_pma",
    description:
      "Search Premarket Approval (PMA) decisions for Class III medical devices.\n" +
      "PMA is required for high-risk devices — evaluates safety and effectiveness.\n\n" +
      "Example searches:\n" +
      "- 'decision_code:APPR' — approved PMAs\n" +
      "- 'product_code:LWP' — by product code\n" +
      "- 'advisory_committee:CV' — cardiovascular devices\n" +
      "- 'applicant:\"Medtronic\"' — by company\n\n" +
      "Count fields: advisory_committee, decision_code",
    annotations: { title: "FDA: Device PMA", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDevicePma({ search, limit });
      if (!data.results?.length) return emptyResponse("No PMA records found.");
      return listResponse(
        `FDA device PMA: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            pmaNumber: r.pma_number, supplementNumber: r.supplement_number,
            tradeName: r.trade_name, genericName: r.generic_name,
            applicant: r.applicant, decisionDate: r.decision_date, decisionCode: r.decision_code,
            productCode: r.product_code, advisoryCommittee: r.advisory_committee_description,
            supplementType: r.supplement_type,
            deviceClass: r.openfda?.device_class,
          })),
        },
      );
    },
  },

  // ── Device Registration & Listing ────────────────────────────────
  {
    name: "fda_device_registrations",
    description:
      "Search medical device establishment registrations & listings (336K+ records).\n" +
      "Where devices are manufactured and which devices are made at each establishment.\n\n" +
      "Example searches:\n" +
      "- 'products.product_code:HQY' — establishments making product code HQY\n" +
      "- 'products.openfda.regulation_number:886.5850' — by regulation number\n\n" +
      "Count fields: products.openfda.device_class",
    annotations: { title: "FDA: Device Registrations", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDeviceRegistrations({ search, limit });
      if (!data.results?.length) return emptyResponse("No device registrations found.");
      return listResponse(
        `FDA device registrations: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 15).map((r: any) => ({
            registrationNumber: r.registration_number, feiNumber: r.fei_number,
            establishmentType: r.establishment_type,
            firmName: r.registration?.owner_operator?.firm_name,
            productCount: r.products?.length ?? 0,
            productCodes: r.products?.slice(0, 5).map((p: any) => p.product_code).filter(Boolean),
          })),
        },
      );
    },
  },

  // ── Device UDI (Unique Device Identifier) ────────────────────────
  {
    name: "fda_device_udi",
    description:
      "Search the Global Unique Device Identification Database (GUDID).\n" +
      "Detailed device records: description, MRI safety, product codes, sterilization.\n" +
      "Note: Booleans are stored as strings ('true'/'false').\n\n" +
      "Example searches:\n" +
      "- 'brand_name:\"CoRoent\"' — by brand\n" +
      "- 'is_rx:true' — prescription devices\n" +
      "- 'mri_safety:\"MR Unsafe\"' — MRI unsafe devices\n" +
      "- '_exists_:public_device_record_key' — records with a public key\n\n" +
      "Count fields: product_codes.openfda.device_class, is_rx, mri_safety.exact",
    annotations: { title: "FDA: Device UDI", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchDeviceUdi({ search, limit });
      if (!data.results?.length) return emptyResponse("No UDI records found.");
      return listResponse(
        `FDA device UDI: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 15).map((r: any) => ({
            brandName: r.brand_name, companyName: r.company_name,
            deviceDescription: r.device_description?.substring(0, 300),
            versionModel: r.version_or_model_number,
            isRx: r.is_rx, isOtc: r.is_otc, isSingleUse: r.is_single_use,
            mriSafety: r.mri_safety,
            distributionStatus: r.commercial_distribution_status,
            primaryIdentifier: r.identifiers?.find((i: any) => i.type === "Primary")?.id,
            productCodes: r.product_codes?.map((p: any) => ({ code: p.code, name: p.name, class: p.openfda?.device_class })),
          })),
        },
      );
    },
  },

  // ── COVID-19 Serology ────────────────────────────────────────────
  {
    name: "fda_covid_serology",
    description:
      "Search COVID-19 serology test evaluation results.\n" +
      "FDA's evaluation of antibody test performance (sensitivity/specificity).\n\n" +
      "Example searches:\n" +
      "- 'antibody_truth:\"Positive\"' — positive samples\n" +
      "- 'manufacturer:\"Abbott\"' — tests by manufacturer\n\n" +
      "Count fields: type (sample material), manufacturer.exact",
    annotations: { title: "FDA: COVID-19 Serology", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchCovidSerology({ search, limit });
      if (!data.results?.length) return emptyResponse("No serology records found.");
      return listResponse(
        `FDA COVID-19 serology: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            device: r.device, manufacturer: r.manufacturer,
            datePerformed: r.date_performed, sampleType: r.type, panel: r.panel,
            antibodyTruth: r.antibody_truth, antibodyAgree: r.antibody_agree,
            iggResult: r.igg_result, iggAgree: r.igg_agree,
            igmResult: r.igm_result, igmAgree: r.igm_agree,
          })),
        },
      );
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // FOOD TOOLS
  // ═══════════════════════════════════════════════════════════════════

  // ── Food Recalls ─────────────────────────────────────────────────
  {
    name: "fda_food_recalls",
    description:
      "Search FDA food recall enforcement reports.\n" +
      "Class I (may cause death), Class II (temporary health problems), Class III (unlikely harm).\n\n" +
      "Example searches:\n" +
      "- 'classification:\"Class I\"' — most serious recalls\n" +
      "- 'recalling_firm:tyson' — recalls by a specific company\n" +
      "- 'reason_for_recall:listeria' — recalls due to listeria",
    annotations: { title: "FDA: Food Recalls", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchFoodRecalls({ search, limit });
      if (!data.results?.length) return emptyResponse("No food recalls found.");
      return listResponse(
        `FDA food recalls: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            classification: r.classification, reason: r.reason_for_recall,
            firm: r.recalling_firm, state: r.state, status: r.status,
            productDescription: r.product_description?.substring(0, 200),
            recallDate: r.recall_initiation_date,
            distribution: r.distribution_pattern?.substring(0, 200),
          })),
        },
      );
    },
  },

  // ── Food Adverse Events ──────────────────────────────────────────
  {
    name: "fda_food_adverse_events",
    description:
      "Search FDA food adverse event reports (CAERS database).\n" +
      "Reports of illnesses, allergic reactions, and injuries from foods and dietary supplements.\n\n" +
      "Example searches:\n" +
      "- 'products.industry_name:\"Dietary Supplements\"' — supplement events\n" +
      "- 'reactions:\"hospitalization\"' — events involving hospitalization\n\n" +
      "Count fields: reactions.exact, outcomes.exact, products.industry_name.exact",
    annotations: { title: "FDA: Food Adverse Events", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchFoodAdverseEvents({ search, limit });
      if (!data.results?.length) return emptyResponse("No food adverse event reports found.");
      return listResponse(
        `FDA food adverse events: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            reportNumber: r.report_number, date: r.date_created,
            outcomes: r.outcomes, reactions: r.reactions,
            products: r.products?.map((p: any) => `${p.name_brand ?? "?"} (${p.industry_name ?? "?"})`.trim()),
            consumer: r.consumer,
          })),
        },
      );
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // ANIMAL & VETERINARY TOOLS
  // ═══════════════════════════════════════════════════════════════════

  {
    name: "fda_animal_events",
    description:
      "Search animal/veterinary adverse event reports (1.3M+ reports).\n" +
      "Reports of drug side effects in animals — dogs, cats, horses, cattle, etc.\n" +
      "Each report has: animal info (species, breed), drugs, reactions (VEDDRA terms), outcomes.\n" +
      "Note: Some fields may contain 'MSK' (masked) values for privacy.\n\n" +
      "Example searches:\n" +
      "- 'animal.species:\"Dog\"' — dog events\n" +
      "- 'original_receive_date:[20200101+TO+20231231]' — events in date range\n" +
      "- 'serious_ae:true' — serious adverse events only\n\n" +
      "Count fields: animal.species.exact, primary_reporter.exact, serious_ae",
    annotations: { title: "FDA: Animal/Vet Events", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchAnimalEvents({ search, limit });
      if (!data.results?.length) return emptyResponse("No animal event reports found.");
      return listResponse(
        `FDA animal/vet events: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 15).map((r: any) => ({
            reportId: r.report_id, date: r.original_receive_date,
            reporter: r.primary_reporter, seriousAe: r.serious_ae,
            species: r.animal?.species, breed: r.animal?.breed?.breed_component,
            gender: r.animal?.gender,
            drugs: r.drug?.map((d: any) => d.brand_name || d.active_ingredients?.[0]?.name).filter(Boolean),
            reactions: r.reaction?.map((rx: any) => rx.veddra_term_name).filter(Boolean),
            outcomes: r.outcome?.map((o: any) => o.medical_status).filter(Boolean),
          })),
        },
      );
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // TOBACCO TOOLS
  // ═══════════════════════════════════════════════════════════════════

  {
    name: "fda_tobacco_problems",
    description:
      "Search tobacco product problem reports (~1.3K reports).\n" +
      "Reports about damaged, defective, or health-affecting tobacco products.\n" +
      "E-cigarettes/vaping products dominate (~60% of reports).\n\n" +
      "Example searches:\n" +
      "- 'date_submitted:[20180101+TO+20200723]' — reports in date range\n" +
      "- 'nonuser_affected:\"Yes\"' — reports where non-users were affected\n\n" +
      "Count fields: tobacco_products.exact, reported_health_problems.exact",
    annotations: { title: "FDA: Tobacco Problems", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchTobaccoProblems({ search, limit });
      if (!data.results?.length) return emptyResponse("No tobacco problem reports found.");
      return listResponse(
        `FDA tobacco problem reports: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            reportId: r.report_id, dateSubmitted: r.date_submitted,
            tobaccoProducts: r.tobacco_products,
            healthProblems: r.reported_health_problems,
            productProblems: r.reported_product_problems,
            nonuserAffected: r.nonuser_affected,
          })),
        },
      );
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // OTHER TOOLS
  // ═══════════════════════════════════════════════════════════════════

  {
    name: "fda_historical_docs",
    description:
      "Search historical FDA documents — press releases from 1913 to 2014 (OCR full-text search).\n\n" +
      "Example searches:\n" +
      "- 'doc_type:pr+AND+text:\"poison prevention packaging\"' — press releases about poison prevention\n" +
      "- 'year:1920+AND+text:Botulism' — 1920s botulism references\n" +
      "- 'text:\"thalidomide\"' — mentions of thalidomide",
    annotations: { title: "FDA: Historical Documents", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchHistoricalDocs({ search, limit });
      if (!data.results?.length) return emptyResponse("No historical documents found.");
      return listResponse(
        `FDA historical documents: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 10).map((r: any) => ({
            year: r.year, docType: r.doc_type, pages: r.num_of_pages,
            text: r.text?.substring(0, 1000) + (r.text?.length > 1000 ? "…" : ""),
          })),
        },
      );
    },
  },

  {
    name: "fda_nsde",
    description:
      "Search NDC SPL Data Elements — comprehensive drug product data.\n" +
      "Use '_missing_:marketing_end_date' for products still on market.\n" +
      "Use '_exists_:marketing_end_date' for discontinued products.\n\n" +
      "Example searches:\n" +
      "- 'package_ndc:\"55700-019-60\"' — by NDC\n" +
      "- '_missing_:\"marketing_end_date\"' — currently marketed products",
    annotations: { title: "FDA: NSDE", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchNsde({ search, limit });
      if (!data.results?.length) return emptyResponse("No NSDE records found.");
      return listResponse(
        `FDA NSDE: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            proprietaryName: r.proprietary_name, packageNdc: r.package_ndc,
            productType: r.product_type, dosageForm: r.dosage_form,
            marketingCategory: r.marketing_category,
            marketingStartDate: r.marketing_start_date, marketingEndDate: r.marketing_end_date,
            applicationNumber: r.application_number_or_citation,
          })),
        },
      );
    },
  },

  {
    name: "fda_substance",
    description:
      "Search FDA substance data — molecular-level ingredient information.\n" +
      "Search by name, CAS code, UNII, or molecular formula.\n\n" +
      "Example searches:\n" +
      "- 'names.name:\"PARACETAMOL\"' — by substance name\n" +
      "- 'codes.code:\"220127-57-1\"' — by CAS registry number\n" +
      "- 'unii:\"09211A0HHL\"' — by UNII\n" +
      "- 'structure.formula:\"C6H12\"' — by molecular formula",
    annotations: { title: "FDA: Substance Data", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchSubstances({ search, limit });
      if (!data.results?.length) return emptyResponse("No substance records found.");
      return listResponse(
        `FDA substances: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 10).map((r: any) => ({
            unii: r.unii, substanceClass: r.substance_class, status: r.status,
            names: r.names?.slice(0, 5).map((n: any) => n.name),
            codes: r.codes?.slice(0, 5).map((c: any) => `${c.code_system}: ${c.code}`),
            formula: r.structure?.formula,
          })),
        },
      );
    },
  },

  {
    name: "fda_unii",
    description:
      "Search UNII (Unique Ingredient Identifiers) — links ingredient names to unique chemical IDs.\n\n" +
      "Example searches:\n" +
      "- 'unii:\"L7V4I673D2\"' — by UNII code\n" +
      "- 'substance_name:\"ASPIRIN\"' — by substance name",
    annotations: { title: "FDA: UNII", readOnlyHint: true },
    parameters: searchParams,
    execute: async ({ search, limit }) => {
      const data = await searchUnii({ search, limit });
      if (!data.results?.length) return emptyResponse("No UNII records found.");
      return listResponse(
        `FDA UNII: ${total(data).toLocaleString()} total, showing ${data.results.length}`,
        {
          total: total(data),
          items: data.results.slice(0, 20).map((r: any) => ({
            unii: r.unii, substanceName: r.substance_name,
          })),
        },
      );
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // GENERIC COUNT TOOL — Works on ANY endpoint
  // ═══════════════════════════════════════════════════════════════════

  {
    name: "fda_count",
    description:
      "Count/aggregate any OpenFDA endpoint by a specific field.\n" +
      "Returns top terms with counts. Works on ALL FDA endpoints.\n" +
      "IMPORTANT: Use '.exact' suffix for full phrase counts (e.g. 'brand_name.exact').\n" +
      "Without '.exact', multi-word values like 'Class III' are split into separate word counts.\n\n" +
      "Endpoints: drug/event, drug/label, drug/ndc, drug/enforcement, drug/drugsfda, drug/shortages,\n" +
      "device/event, device/510k, device/classification, device/enforcement, device/recall,\n" +
      "device/pma, device/udi, food/enforcement, food/event, animalandveterinary/event, tobacco/problem.\n\n" +
      "Example count_field values per endpoint:\n" +
      "- drug/ndc → pharm_class.exact, dea_schedule, dosage_form.exact\n" +
      "- drug/shortages → update_type, status.exact, therapeutic_category.exact\n" +
      "- device/510k → country_code, advisory_committee, clearance_type.exact\n" +
      "- tobacco/problem → tobacco_products.exact, reported_health_problems.exact\n" +
      "- food/event → reactions.exact, outcomes.exact\n" +
      "- animalandveterinary/event → animal.species.exact, primary_reporter.exact",
    annotations: { title: "FDA: Count/Aggregate Any Endpoint", readOnlyHint: true },
    parameters: z.object({
      endpoint: z.enum(endpointEnum).describe("OpenFDA endpoint path (e.g. 'drug/ndc', 'device/510k', 'tobacco/problem')"),
      count_field: z.string().describe("Field to count. Use '.exact' for full phrases (e.g. 'pharm_class.exact')"),
      search: z.string().optional().describe("Optional search filter to narrow results before counting"),
      limit: z.number().int().max(1000).optional().describe("Max count results (default: API default)"),
    }),
    execute: async ({ endpoint, count_field, search, limit }) => {
      const data = await countEndpoint(endpoint, count_field, { search, limit });
      if (!data.results?.length) return emptyResponse(`No count data for '${count_field}' on ${endpoint}.`);
      return tableResponse(
        `FDA count: ${endpoint} by ${count_field} — ${data.results.length} categories`,
        { rows: data.results.slice(0, 100), meta: { endpoint, field: count_field } },
      );
    },
  },
];
