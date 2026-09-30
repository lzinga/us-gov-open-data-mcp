/**
 * geo module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "geo",
  displayName: "Geo (Census Geocoder)",
  category: "Demographics",
  toolPrefix: "geo_",
  description:
    "Census Geocoder and TIGERweb — turn an address, coordinate, ZIP code or county name into the FIPS codes " +
    "and latitude/longitude other tools require: state, county, census tract, block, place and congressional " +
    "district. No API key required.",
  workflow:
    "Start here whenever a question names a place but a tool needs a code. " +
    "geo_locate for an address, geo_point for a coordinate, geo_zip for a ZIP, " +
    "geo_counties for a county name → then pass the codes to the data tool.",
  tips:
    "county fips is the 5-digit code fema_nfip_claims, bls_series_data and bea_gdp_by_state want; " +
    "epa_air_quality and usgs_water_sites take the 2-digit state plus the 3-digit countyCode instead. " +
    "geo_locate needs a street number and name; for a bare ZIP use geo_zip. " +
    "A ZIP can span counties: geo_zip returns the county at its center plus nearbyCounties.",
  // Every domain below has modules that take a state or county code, so geo has
  // to come along whenever one of them is selected. "international" is left out
  // because the Census only covers US geographies.
  domains: [
    "economy", "health", "legislation", "finance", "energy", "environment", "education",
    "housing", "spending", "safety", "agriculture", "justice", "transportation",
  ],
  crossRef: [
    { question: "state-level", route: "geo_counties (county FIPS for a state), geo_locate (address → state and county FIPS)" },
    { question: "housing", route: "geo_zip, geo_locate (ZIP or address → county FIPS for hud_fair_market_rents)" },
    { question: "disasters", route: "geo_locate, geo_zip (address or ZIP → county FIPS for fema_nfip_claims)" },
  ],
  reference: {
    docs: {
      "Census Geocoder": "https://geocoding.geo.census.gov/geocoder/",
      "Geocoder API guide": "https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html",
      "TIGERweb REST services": "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb",
      "FIPS codes explained": "https://www.census.gov/library/reference/code-lists/ansi.html",
    },
    codeLengths: {
      state: "2 digits (53 = Washington)",
      county: "5 digits: state + county (53033 = King County, WA)",
      tract: "11 digits: county + 6 (53033008200)",
      block: "15 digits: tract + 4 (530330082003006)",
    },
  },
} satisfies ModuleMeta;
