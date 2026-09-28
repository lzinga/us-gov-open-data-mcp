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
    "Earthquake events (magnitude, location, depth, tsunami risk) and water resources monitoring (streamflow, water levels, temperature) from 13,000+ stations nationwide. Earthquakes need no key; water data works without a key at low volume.",
  toolPrefix: "usgs_",
  auth: { envVar: "DATA_GOV_API_KEY", signup: "https://api.waterdata.usgs.gov/signup/", optional: true },
  workflow:
    "Use usgs_earthquakes to search for earthquakes by magnitude/location/date → usgs_significant for recent notable events → usgs_water_data for streamflow and water levels at monitoring sites → usgs_water_sites to find stations.",
  tips:
    "Earthquake magnitudes: 2.5+ felt by people, 4.0+ moderate, 5.0+ significant, 7.0+ major. Water parameter codes: 00060=discharge, 00065=gage height, 00010=water temp. States can be given as codes (CA), names, or FIPS. Water data comes from the USGS Water Data APIs, which allow only a few anonymous requests per hour — an api.data.gov key (DATA_GOV_API_KEY) raises this to 1,000/hour.",
  domains: ["environment", "safety"],
  crossRef: [
    { question: "disasters", route: "usgs_earthquakes, usgs_significant (earthquake events)" },
    { question: "earthquakes/water", route: "usgs_earthquakes, usgs_water_data, usgs_water_sites, usgs_daily_water_data" },
    { question: "state-level", route: "usgs_water_sites, usgs_water_data (water monitoring stations and streamflow data by state)" },
    { question: "energy/climate", route: "usgs_water_data (water flow and drought monitoring for hydroelectric/energy context)" },
    { question: "agriculture", route: "usgs_water_data, usgs_water_sites (irrigation water availability and drought data)" },
  ],
  reference: {
  waterParams: WATER_PARAMS,
  alertLevels: ALERT_LEVELS,
  docs: {
    "Earthquake API": "https://earthquake.usgs.gov/fdsnws/event/1/",
    "Water Data APIs": "https://api.waterdata.usgs.gov/docs/ogcapi/",
    "Water Data API key": "https://api.waterdata.usgs.gov/signup/",
  },
},
} satisfies ModuleMeta;
