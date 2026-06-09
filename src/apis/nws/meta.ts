/**
 * nws module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "nws",
  displayName: "NWS (National Weather Service)",
  category: "Environment",
  description: "Real-time U.S. weather forecasts (7-day and hourly), active weather alerts, and station observations from the National Weather Service. Complements the historical-only noaa module.",
  workflow: "nws_forecast or nws_forecast_hourly for a lat/lon (resolves the gridpoint automatically). For alerts use nws_alerts_active by state, zone, or point. For station observations use nws_stations_near → nws_observation_latest.",
  tips: "Lat/lon are decimal degrees. Forecasts use US units (°F, mph). Observations use SI units (°C, m/s, Pa). No API key required — a polite User-Agent is sent automatically; override with NWS_USER_AGENT env var.",
  domains: ["environment"],
  crossRef: [
    { question: "disasters", route: "nws_alerts_active (live tornado/flood/winter storm warnings by area=STATE)" },
    { question: "energy/climate", route: "nws_forecast (real-time forecast — pair with noaa for historical context)" },
    { question: "agriculture", route: "nws_forecast (precipitation/temperature outlook for crop planning)" },
    { question: "state-level", route: "nws_alerts_active (area=STATE_CODE for all active alerts in a state)" },
  ],
  reference: {
    docs: {
      "API Docs": "https://www.weather.gov/documentation/services-web-api",
      "OpenAPI Spec": "https://api.weather.gov/openapi.json",
      "Alert Types": "https://api.weather.gov/alerts/types",
    },
  },
} satisfies ModuleMeta;
