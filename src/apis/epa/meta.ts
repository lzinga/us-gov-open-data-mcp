/**
 * EPA module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "epa",
  displayName: "EPA (Environmental Protection Agency)",
  category: "Environment",
  description:
    "EPA environmental data: facility compliance and violations via ECHO, enforcement cases (civil/criminal), " +
    "Superfund (CERCLA) contaminated sites, RCRA hazardous waste facilities, UV index forecasts, " +
    "Toxics Release Inventory (TRI), Greenhouse Gas emissions (GHGRP), and Safe Drinking Water systems (SDWIS). " +
    "No API key required. For air quality monitoring data (AQS), see the epa-aqs module.",
  workflow:
    "Use epa_facilities for compliance search -> epa_facility_detail for drill-down -> epa_enforcement for penalties/outcomes -> " +
    "epa_superfund for contaminated sites -> epa_rcra for hazardous waste -> epa_toxic_releases for TRI -> " +
    "epa_greenhouse_gas for GHG emissions -> epa_drinking_water for water systems -> epa_uv_index for UV forecasts.",
  tips:
    "ECHO media types: air (Clean Air Act), water (Clean Water Act). Enforcement: filter by law (CAA, CWA, RCRA, CERCLA). " +
    "Superfund NPL statuses: F=Final, P=Proposed, D=Deleted. " +
    "TRI covers 700+ chemicals from 20K+ facilities. GHG covers large emitters (25K+ tons CO2e/year). " +
    "SDWIS system types: CWS (community), NTNCWS (non-transient), TNCWS (transient). " +
    "UV index: 0-2 Low, 3-5 Moderate, 6-7 High, 8-10 Very High, 11+ Extreme.",
  reference: {
    docs: {
      "ECHO Web Services": "https://echo.epa.gov/tools/web-services",
      "Envirofacts (DMAP)": "https://data.epa.gov/dmapservice",
      "TRI": "https://www.epa.gov/toxics-release-inventory-tri-program",
      "GHGRP": "https://www.epa.gov/ghgreporting",
      "SDWIS": "https://www.epa.gov/ground-water-and-drinking-water/safe-drinking-water-information-system-sdwis-federal-reporting",
    },
  },
} satisfies ModuleMeta;
