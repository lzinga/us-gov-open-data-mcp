/**
 * bts module metadata.
 */

import { TRANSPORT_FIELDS, BORDER_MEASURES, DATASETS } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "bts",
  displayName: "BTS (Bureau of Transportation Statistics)",
  category: "Transportation",
  description:
    "Monthly Transportation Statistics (50+ indicators): airline traffic & on-time %, transit ridership, rail freight, truck tonnage, fuel prices, vehicle sales, safety fatalities, Transportation Services Index, and border crossing data at U.S. ports of entry. No API key required.",
  workflow:
    "Use bts_transport_stats for national monthly transportation indicators (airlines, transit, rail, fuel, safety) → bts_border_crossings for port-of-entry volumes (trucks, vehicles, pedestrians).",
  tips:
    "Transport stats are monthly time series — use limit=24 for 2 years of trend data. Border crossing states use full names ('Texas', 'California'). Measures: 'Trucks', 'Personal Vehicles', 'Pedestrians'. Borders: 'US-Mexico Border', 'US-Canada Border'.",
  domains: ["transportation"],
  crossRef: [
    { question: "transportation", route: "bts_transport_stats (airlines, transit, rail, fuel, safety), bts_border_crossings (port-of-entry volumes)" },
    { question: "state-level", route: "bts_border_crossings (port-of-entry traffic by state)" },
    { question: "economy", route: "bts_transport_stats (Transportation Services Index as economic indicator)" },
    { question: "international", route: "bts_border_crossings (U.S.-Mexico and U.S.-Canada cross-border traffic volumes)" },
    { question: "energy/climate", route: "bts_transport_stats (fuel consumption and prices in transportation sector)" },
    { question: "presidential comparison", route: "bts_transport_stats (transportation activity trends across administrations)" },
  ],
  reference: {
  transportFields: TRANSPORT_FIELDS,
  borderMeasures: BORDER_MEASURES,
  datasets: DATASETS,
  docs: {
    "BTS Open Data": "https://data.bts.gov/",
    "Monthly Transportation Statistics": "https://data.bts.gov/d/crem-w557",
    "Border Crossing Data": "https://data.bts.gov/d/keg4-3bc2",
  },
},
} satisfies ModuleMeta;
