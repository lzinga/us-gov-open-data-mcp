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
  reference: {
  datasets: {
    GHCND: "Global Historical Climatology Network - Daily (temp, precipitation, snow)",
    GSOM: "Global Summary of the Month",
    GSOY: "Global Summary of the Year",
    NORMAL_DLY: "Climate Normals Daily (1991–2020 averages)",
    NORMAL_MLY: "Climate Normals Monthly",
    NORMAL_ANN: "Climate Normals Annual",
  },
  commonDataTypes: {
    TMAX: "Maximum temperature (°F × 10)",
    TMIN: "Minimum temperature (°F × 10)",
    TAVG: "Average temperature (°F × 10)",
    PRCP: "Precipitation (inches × 100)",
    SNOW: "Snowfall (inches × 10)",
    SNWD: "Snow depth (inches)",
    AWND: "Average wind speed (mph × 10)",
  },
  docs: {
    "API Docs": "https://www.ncei.noaa.gov/cdo-web/webservices/v2",
    "Get Key": "https://www.ncei.noaa.gov/cdo-web/token",
    "Dataset List": "https://www.ncei.noaa.gov/cdo-web/datasets",
  },
},
} satisfies ModuleMeta;
