/**
 * EPA AQS module metadata.
 *
 * Separated from the main EPA module because AQS requires its own API credentials
 * (AQS_API_KEY + AQS_EMAIL), while the other EPA data sources (ECHO, Envirofacts/DMAP)
 * are entirely keyless. Keeping them as separate modules means each has a single,
 * clean auth model — no mixed auth, no toolNames, no special-casing.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "epa-aqs",
  displayName: "EPA Air Quality System (AQS)",
  category: "Environment",
  description:
    "Ambient air sample data from EPA's Air Quality System (AQS) — thousands of monitors nationwide. " +
    "Criteria pollutants (ozone, PM2.5, PM10, SO2, CO, NO2, lead), annual/daily/quarterly summaries, " +
    "and monitor metadata. Historical data only (6+ month lag). " +
    "Requires AQS_API_KEY and AQS_EMAIL.",
  auth: { envVar: ["AQS_API_KEY", "AQS_EMAIL"], signup: "https://aqs.epa.gov/aqsweb/documents/data_api.html" },
  workflow:
    "Use epa_air_quality for annual/quarterly summaries by state -> epa_aqs_daily for daily data -> epa_aqs_monitors to find monitoring stations.",
  tips:
    "States use 2-digit FIPS codes (with leading zero): '01'=AL, '06'=CA, '37'=NC, '48'=TX. " +
    "Parameters: 44201=Ozone, 88101=PM2.5, 42401=SO2, 42101=CO, 42602=NO2, 14129=Lead. " +
    "bdate/edate must be in same year (YYYYMMDD). Max 5 param codes per request. " +
    "Rate limit: 10 req/min with 5s pause. Cross-reference with epa_facilities (ECHO) for compliance data.",
  domains: ["environment", "health"],
  crossRef: [
    { question: "energy/climate", route: "epa_air_quality, epa_aqs_daily, epa_aqs_monitors (criteria pollutant monitoring)" },
    { question: "state-level", route: "epa_air_quality, epa_aqs_monitors (air quality monitoring data by state FIPS code)" },
    { question: "health", route: "epa_air_quality, epa_aqs_daily (air pollution data linked to respiratory health outcomes)" },
  ],
  reference: {
    docs: {
      "AQS API": "https://aqs.epa.gov/aqsweb/documents/data_api.html",
      "Signup": "https://aqs.epa.gov/data/api/signup",
      "About AQS Data": "https://aqs.epa.gov/aqsweb/documents/about_aqs_data.html",
    },
  },
} satisfies ModuleMeta;
