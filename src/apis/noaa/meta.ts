/**
 * noaa module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "noaa",
  displayName: "NOAA Climate Data Online",
  category: "Environment",
  description: "Weather observations, temperature, precipitation, climate normals from NOAA stations across the U.S.",
  auth: { envVar: "NOAA_API_KEY", signup: "https://www.ncei.noaa.gov/cdo-web/token" },
  workflow: "noaa_stations to find a station → noaa_climate_data to get observations",
  tips: "Datasets: GHCND (daily), GSOM (monthly summary), GSOY (annual summary). Location IDs: FIPS:36 (NY), FIPS:06 (CA)",
  domains: ["environment"],
  crossRef: [
    { question: "energy/climate", route: "noaa_climate_data (temperature, precipitation trends)" },
    { question: "agriculture", route: "noaa_climate_data (weather data for crop yield context)" },
    { question: "disasters", route: "noaa_climate_data (weather conditions during disasters)" },
    { question: "earthquakes/water", route: "noaa_climate_data (precipitation data for flood/water context)" },
    { question: "state-level", route: "noaa_stations, noaa_climate_data (weather/climate data by state FIPS location)" },
  ],
  reference: {
  docs: {
    "API Docs": "https://www.ncei.noaa.gov/cdo-web/webservices/v2",
    "Get Key": "https://www.ncei.noaa.gov/cdo-web/token",
    "Dataset List": "https://www.ncei.noaa.gov/cdo-web/datasets",
  },
},
} satisfies ModuleMeta;
