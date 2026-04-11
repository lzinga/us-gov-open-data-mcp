/**
 * fbi module metadata.
 */

import { SUMMARIZED_OFFENSES, ARREST_OFFENSES, NIBRS_OFFENSES, SUPPLEMENTAL_OFFENSES, HATE_CRIME_BIAS_CODES, LESDC_CHART_TYPES } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "fbi",
  displayName: "FBI Crime Data Explorer",
  category: "Justice",
  description:
    "National/state/agency crime statistics, arrests, hate crimes, law enforcement employees, expanded homicide data, and use of force from the FBI CDE API",
  auth: { envVar: "DATA_GOV_API_KEY", signup: "https://api.data.gov/signup/" },
  workflow: "fbi_agencies → fbi_crime_summarized or fbi_arrest_data → fbi_hate_crime for detail",
  tips:
    "State codes: two-letter abbreviations (CA, TX, NY). Data typically available up to 1-2 years ago. Summarized offense codes: V (violent), P (property), HOM, RPE, ROB, ASS, BUR, LAR, MVT, ARS. Arrest offense codes are numeric: 'all', '11' (murder), '20' (rape), '30' (robbery), '50' (assault), '150' (drug abuse).",
  domains: ["justice", "safety"],
  crossRef: [
    { question: "state-level", route: "fbi_crime_summarized, fbi_arrest_data (state-level crime and arrest statistics)" },
    { question: "health", route: "fbi_expanded_homicide, fbi_crime_summarized (violence as public health indicator)" },
    { question: "drug investigation", route: "fbi_arrest_data (drug abuse arrests: offense code '150')" },
    { question: "presidential comparison", route: "fbi_crime_summarized (national crime trends across administrations)" },
    { question: "education", route: "fbi_hate_crime (hate crimes at educational institutions)" },
  ],
  reference: {
  summarizedOffenses: SUMMARIZED_OFFENSES,
  arrestOffenses: ARREST_OFFENSES,
  nibrsOffenses: NIBRS_OFFENSES,
  supplementalOffenses: SUPPLEMENTAL_OFFENSES,
  hateCrimeBiasCodes: HATE_CRIME_BIAS_CODES,
  lesdcChartTypes: LESDC_CHART_TYPES,
  docs: {
    "API Docs": "https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi",
    "Explorer": "https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/explorer/crime/crime-trend",
    "Get Key": "https://api.data.gov/signup/",
  },
},
} satisfies ModuleMeta;
