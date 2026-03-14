/**
 * nrel module metadata.
 */

import { FUEL_TYPES } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "nrel",
  displayName: "NREL (Clean Energy)",
  category: "Environment",
  description: "EV charging stations, alt fuel stations, electricity rates, solar resource data from the National Renewable Energy Laboratory",
  auth: { envVar: "DATA_GOV_API_KEY", signup: "https://api.data.gov/signup/" },
  workflow: "nrel_fuel_stations to find EV chargers/alt fuel → nrel_utility_rates for electricity costs → nrel_solar for solar potential",
  tips: "Fuel types: ELEC (EV), E85 (ethanol), CNG (natural gas), LPG (propane), BD (biodiesel), HY (hydrogen). Status: E=open, P=planned, T=temporarily unavailable.",
  domains: ["energy", "environment", "transportation"],
  crossRef: [
    { question: "energy/climate", route: "nrel_fuel_stations, nrel_utility_rates, nrel_solar" },
    { question: "vehicle safety", route: "nrel_fuel_stations (ELEC — EV charger locations)" },
    { question: "transportation", route: "nrel_fuel_stations (alt fuel station infrastructure)" },
  ],
  reference: {
  fuelTypes: FUEL_TYPES,
  docs: {
    "NREL Developer": "https://developer.nrel.gov/",
    "Alt Fuel Stations API": "https://developer.nrel.gov/docs/transportation/alt-fuel-stations-v1/",
    "Utility Rates API": "https://developer.nrel.gov/docs/electricity/utility-rates-v3/",
    "Solar Resource API": "https://developer.nrel.gov/docs/solar/solar-resource-v1/",
  },
},
} satisfies ModuleMeta;
