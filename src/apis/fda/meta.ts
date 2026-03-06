/**
 * fda module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "fda",
  displayName: "FDA (OpenFDA)",
  category: "Health",
  description: "Drug adverse events, drug labels, food recalls, medical device reports from the FDA",
  workflow: "fda_drug_events to search adverse reactions → fda_drug_counts to aggregate → fda_food_recalls for food safety",
  tips:
    "Search syntax: 'field:value' e.g. 'patient.drug.openfda.brand_name:aspirin'. Use '+AND+' to combine: 'patient.drug.openfda.brand_name:aspirin+AND+serious:1'. Count fields: 'patient.reaction.reactionmeddrapt.exact' (reactions), 'patient.drug.openfda.brand_name.exact' (drug names).",
  reference: {
  drugEventFields: {
    "patient.drug.openfda.brand_name": "Drug brand name",
    "patient.drug.openfda.generic_name": "Generic drug name",
    "patient.reaction.reactionmeddrapt": "Adverse reaction term",
    "serious": "1=serious, 2=not serious",
    "seriousnessdeath": "1=resulted in death",
    "receivedate": "Date FDA received report (YYYYMMDD)",
  },
  foodRecallFields: {
    "classification": "Class I (most serious), Class II, Class III",
    "reason_for_recall": "Text description of reason",
    "recalling_firm": "Company name",
    "state": "State of recalling firm",
    "status": "Ongoing, Complete, Terminated",
  },
  docs: {
    "OpenFDA": "https://open.fda.gov/",
    "Drug Events API": "https://open.fda.gov/apis/drug/event/",
    "Food Recalls API": "https://open.fda.gov/apis/food/enforcement/",
    "Device Events API": "https://open.fda.gov/apis/device/event/",
  },
},
} satisfies ModuleMeta;
