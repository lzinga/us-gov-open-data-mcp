/**
 * fema module metadata.
 */

import { DATASETS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "fema",
  displayName: "FEMA",
  category: "Demographics",
  description:
    "Federal Emergency Management Agency — disaster declarations, emergency/major disaster assistance, NFIP flood insurance claims, housing assistance, public assistance grants. Data since 1953.",
  workflow:
    "Use fema_disaster_declarations to find disasters by state/year/type → fema_housing_assistance for individual assistance details → fema_public_assistance for PA grants → fema_query for NFIP claims or any other dataset.",
  tips:
    "State codes are two-letter uppercase (TX, FL, CA). Incident types include Hurricane, Flood, Fire, Severe Storm(s), Tornado, Earthquake, Snow, Biological. Declaration types: DR (Major Disaster), EM (Emergency), FM (Fire Management). Use fema_query with dataset 'nfip_claims' to analyze flood insurance data.",
  domains: ["safety", "housing"],
  crossRef: [
    { question: "state-level", route: "fema_disaster_declarations (disaster history by state)" },
    { question: "housing", route: "fema_housing_assistance (disaster housing aid)" },
    { question: "disasters", route: "fema_disaster_declarations, fema_housing_assistance, fema_public_assistance" },
    { question: "earthquakes/water", route: "fema_disaster_declarations (earthquake/flood declarations)" },
    { question: "spending/budget", route: "fema_public_assistance, fema_housing_assistance (federal disaster spending)" },
    { question: "presidential comparison", route: "fema_disaster_declarations (disaster responses across administrations)" },
  ],
  reference: { datasets: DATASETS },
} satisfies ModuleMeta;
