/**
 * usgs module metadata.
 */

import { WATER_PARAMS, ALERT_LEVELS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "usgs",
  displayName: "USGS (U.S. Geological Survey)",
  category: "Environment",
  description:
    "Earthquake events (magnitude, location, depth, tsunami risk) and water resources monitoring (streamflow, water levels, temperature) from 13,000+ stations nationwide. No API key required.",
  workflow:
    "Use usgs_earthquakes to search for earthquakes by magnitude/location/date → usgs_significant for recent notable events → usgs_water_data for streamflow and water levels at monitoring sites → usgs_water_sites to find stations.",
  tips:
    "Earthquake magnitudes: 2.5+ felt by people, 4.0+ moderate, 5.0+ significant, 7.0+ major. Water parameter codes: 00060=discharge, 00065=gage height, 00010=water temp. Use state codes (CA, TX) for water site searches.",
  domains: ["environment", "safety"],
  crossRef: [
    { question: "disasters", route: "usgs_earthquakes, usgs_significant (earthquake events)" },
    { question: "earthquakes/water", route: "usgs_earthquakes, usgs_water_data, usgs_water_sites, usgs_daily_water_data" },
    { question: "state-level", route: "usgs_water_sites, usgs_water_data (water monitoring stations and streamflow data by state)" },
  ],
  reference: {
  waterParams: WATER_PARAMS,
  alertLevels: ALERT_LEVELS,
  docs: {
    "Earthquake API": "https://earthquake.usgs.gov/fdsnws/event/1/",
    "Water Services": "https://waterservices.usgs.gov/",
  },
},
} satisfies ModuleMeta;
