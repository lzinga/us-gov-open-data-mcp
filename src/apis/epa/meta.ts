/**
 * epa module metadata.
 */

import { AIR_TABLES, UV_INDEX_SCALE } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "epa",
  displayName: "EPA (Environmental Protection Agency)",
  category: "Environment",
  description: "Air quality data, facility environmental compliance/violations, UV index forecasts",
  workflow: "epa_air_quality for pollution data → epa_facilities for compliance violations → epa_uv for UV forecasts",
  tips: "Air quality tables: AIR_QUALITY_MEASURES (county-level AQI), MONITORING_SITE (station locations). UV index: 0-2 Low, 3-5 Moderate, 6-7 High, 8-10 Very High, 11+ Extreme.",
  reference: {
  airTables: AIR_TABLES,
  uvScale: UV_INDEX_SCALE,
  docs: {
    "Envirofacts": "https://enviro.epa.gov/",
    "ECHO": "https://echo.epa.gov/",
    "Air Quality System": "https://www.epa.gov/aqs",
  },
},
} satisfies ModuleMeta;
