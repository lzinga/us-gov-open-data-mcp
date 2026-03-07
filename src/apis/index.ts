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

export * as bea from "./bea/sdk.js";
export * as bls from "./bls/sdk.js";
export * as bts from "./bts/sdk.js";
export * as cdc from "./cdc/sdk.js";
export * as census from "./census/sdk.js";
export * as cfpb from "./cfpb/sdk.js";
export * as clinicalTrials from "./clinical-trials/sdk.js";
export * as cms from "./cms/sdk.js";
export * as collegeScorecard from "./college-scorecard/sdk.js";
export * as congress from "./congress/sdk.js";
export * as dojNews from "./doj-news/sdk.js";
export * as dol from "./dol/sdk.js";
export * as eia from "./eia/sdk.js";
export * as epa from "./epa/sdk.js";
export * as fbi from "./fbi/sdk.js";
export * as fda from "./fda/sdk.js";
export * as fdic from "./fdic/sdk.js";
export * as fec from "./fec/sdk.js";
export * as federalRegister from "./federal-register/sdk.js";
export * as fema from "./fema/sdk.js";
export * as fred from "./fred/sdk.js";
export * as govinfo from "./govinfo/sdk.js";
export * as gsaCalc from "./gsa-calc/sdk.js";
export * as hud from "./hud/sdk.js";
export * as naep from "./naep/sdk.js";
export * as nhtsa from "./nhtsa/sdk.js";
export * as nih from "./nih/sdk.js";
export * as noaa from "./noaa/sdk.js";
export * as nrel from "./nrel/sdk.js";
export * as openPayments from "./open-payments/sdk.js";
export * as regulations from "./regulations/sdk.js";
export * as sec from "./sec/sdk.js";
export * as senateLobbying from "./senate-lobbying/sdk.js";
export * as treasury from "./treasury/sdk.js";
export * as usaspending from "./usaspending/sdk.js";
export * as usdaFooddata from "./usda-fooddata/sdk.js";
export * as usdaNass from "./usda-nass/sdk.js";
export * as usgs from "./usgs/sdk.js";
export * as uspto from "./uspto/sdk.js";
export * as worldBank from "./world-bank/sdk.js";
