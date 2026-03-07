/**
 * SDK barrel export — import any SDK function without running the MCP server.
 *
 * Usage:
 *   import { searchBills, getBillDetails } from "us-gov-open-data-mcp/sdk/congress";
 *   import { searchFilings } from "us-gov-open-data-mcp/sdk/senate-lobbying";
 *
 * Or import everything:
 *   import * as sdk from "us-gov-open-data-mcp/sdk";
 *   const bills = await sdk.congress.searchBills({ congress: 118 });
 *
 * Each sub-module is a standalone typed client with caching, retry, and rate limiting.
 * No MCP or Zod dependency required — just set the relevant API key env var.
 */

export * as bea from "../apis/bea/sdk.js";
export * as bls from "../apis/bls/sdk.js";
export * as bts from "../apis/bts/sdk.js";
export * as cdc from "../apis/cdc/sdk.js";
export * as census from "../apis/census/sdk.js";
export * as cfpb from "../apis/cfpb/sdk.js";
export * as clinicalTrials from "../apis/clinical-trials/sdk.js";
export * as cms from "../apis/cms/sdk.js";
export * as collegeScorecard from "../apis/college-scorecard/sdk.js";
export * as congress from "../apis/congress/sdk.js";
export * as dojNews from "../apis/doj-news/sdk.js";
export * as dol from "../apis/dol/sdk.js";
export * as eia from "../apis/eia/sdk.js";
export * as epa from "../apis/epa/sdk.js";
export * as epaAqs from "../apis/epa-aqs/sdk.js";
export * as fbi from "../apis/fbi/sdk.js";
export * as fda from "../apis/fda/sdk.js";
export * as fdic from "../apis/fdic/sdk.js";
export * as fec from "../apis/fec/sdk.js";
export * as federalRegister from "../apis/federal-register/sdk.js";
export * as fema from "../apis/fema/sdk.js";
export * as fred from "../apis/fred/sdk.js";
export * as govinfo from "../apis/govinfo/sdk.js";
export * as hud from "../apis/hud/sdk.js";
export * as naep from "../apis/naep/sdk.js";
export * as nhtsa from "../apis/nhtsa/sdk.js";
export * as nih from "../apis/nih/sdk.js";
export * as noaa from "../apis/noaa/sdk.js";
export * as nrel from "../apis/nrel/sdk.js";
export * as openPayments from "../apis/open-payments/sdk.js";
export * as regulations from "../apis/regulations/sdk.js";
export * as sec from "../apis/sec/sdk.js";
export * as senateLobbying from "../apis/senate-lobbying/sdk.js";
export * as treasury from "../apis/treasury/sdk.js";
export * as usaspending from "../apis/usaspending/sdk.js";
export * as usdaFooddata from "../apis/usda-fooddata/sdk.js";
export * as usdaNass from "../apis/usda-nass/sdk.js";
export * as usgs from "../apis/usgs/sdk.js";
export * as uspto from "../apis/uspto/sdk.js";
export * as worldBank from "../apis/world-bank/sdk.js";
