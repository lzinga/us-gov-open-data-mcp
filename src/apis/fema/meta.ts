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
  toolPrefix: "fema_",
  workflow:
    "Use fema_disaster_declarations to find disasters by state/year/type → fema_housing_assistance for individual assistance details → fema_public_assistance for PA grants → fema_nfip_claims for flood insurance claims and payouts → fema_query for any other OpenFEMA dataset.",
  tips:
    "States accept names, two-letter codes or FIPS (Texas, TX, 48). Incident types include Hurricane, Flood, Fire, Severe Storm(s), Tornado, Earthquake, Snow, Biological. Declaration types: DR (Major Disaster), EM (Emergency), FM (Fire Management). fema_nfip_claims filters claims by storm name (flood_event: 'Harvey'), place and year; use fema_query with dataset 'nfip_claims' for other fields.",
  domains: ["safety", "housing"],
  crossRef: [
    { question: "state-level", route: "fema_disaster_declarations (disaster history by state)" },
    { question: "housing", route: "fema_housing_assistance (disaster housing aid)" },
    { question: "disasters", route: "fema_disaster_declarations, fema_housing_assistance, fema_public_assistance, fema_nfip_claims" },
    { question: "earthquakes/water", route: "fema_disaster_declarations (earthquake/flood declarations), fema_nfip_claims (flood insurance claims)" },
    { question: "spending/budget", route: "fema_public_assistance, fema_housing_assistance (federal disaster spending)" },
    { question: "presidential comparison", route: "fema_disaster_declarations (disaster responses across administrations)" },
  ],
  reference: { datasets: DATASETS },
} satisfies ModuleMeta;
