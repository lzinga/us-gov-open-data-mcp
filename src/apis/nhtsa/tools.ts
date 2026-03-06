/**
 * nhtsa MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  getRecalls,
  getComplaints,
  decodeVin,
  getModelsForMake,
  getSafetyRatingVehicles,
  getSafetyRatingDetail,
  clearCache as sdkClearCache,
  type Recall,
  type Complaint,
} from "./sdk.js";
import { listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

function recallToRecord(r: Recall): Record<string, unknown> {
  const record: Record<string, unknown> = {
    campaignNumber: r.NHTSACampaignNumber ?? null,
    modelYear: r.ModelYear ?? null,
    make: r.Make ?? null,
    model: r.Model ?? null,
    component: r.Component ?? null,
    summary: r.Summary ?? null,
    consequence: r.Consequence ?? null,
    remedy: r.Remedy ?? null,
  };
  if (r.parkIt) record.parkIt = true;
  return record;
}

function complaintToRecord(c: Complaint): Record<string, unknown> {
  const product = c.products?.[0];
  return {
    odiNumber: c.odiNumber ?? null,
    dateOfIncident: c.dateOfIncident ?? c.dateComplaintFiled ?? null,
    vehicle: product ? `${product.productYear ?? ""} ${product.productMake ?? ""} ${product.productModel ?? ""}`.trim() : null,
    components: c.components ?? null,
    summary: c.summary ?? null,
    crash: c.crash ?? false,
    fire: c.fire ?? false,
    numberOfInjuries: c.numberOfInjuries ?? 0,
    numberOfDeaths: c.numberOfDeaths ?? 0,
  };
}

export const tools: Tool<any, any>[] = [
  {
    name: "nhtsa_recalls",
    description:
      "Search NHTSA vehicle recalls by make, model, and model year. Returns campaign numbers, affected components, consequences, and remedies.",
    annotations: { title: "NHTSA: Vehicle Recalls", readOnlyHint: true },
    parameters: z.object({
      make: z.string().describe("Vehicle make (e.g. 'honda', 'toyota', 'ford', 'tesla')"),
      model: z.string().describe("Vehicle model (e.g. 'civic', 'camry', 'f-150', 'model 3')"),
      model_year: z.number().describe("Model year (e.g. 2020, 2023)"),
    }),
    execute: async (args) => {
      const data = await getRecalls({
        make: args.make,
        model: args.model,
        modelYear: args.model_year,
      });
      if (!data.length) return emptyResponse("No recalls found for this vehicle.");
      return listResponse(`${data.length} recall(s) found`, { items: data.map(recallToRecord), total: data.length });
    },
  },
  {
    name: "nhtsa_complaints",
    description:
      "Search NHTSA consumer complaints about vehicles. Shows crash/fire/injury/death counts, affected components, and complaint summaries.",
    annotations: { title: "NHTSA: Vehicle Complaints", readOnlyHint: true },
    parameters: z.object({
      make: z.string().describe("Vehicle make (e.g. 'honda', 'toyota', 'ford', 'tesla')"),
      model: z.string().describe("Vehicle model (e.g. 'civic', 'camry', 'f-150', 'model 3')"),
      model_year: z.number().describe("Model year (e.g. 2020, 2023)"),
    }),
    execute: async (args) => {
      const data = await getComplaints({
        make: args.make,
        model: args.model,
        modelYear: args.model_year,
      });
      if (!data.length) return emptyResponse("No complaints found for this vehicle.");
      const stats = {
        crashes: data.filter((c) => c.crash).length,
        fires: data.filter((c) => c.fire).length,
        injuries: data.reduce((sum, c) => sum + (c.numberOfInjuries ?? 0), 0),
        deaths: data.reduce((sum, c) => sum + (c.numberOfDeaths ?? 0), 0),
      };
      return listResponse(
        `${data.length} complaint(s) — ${stats.crashes} crash(es), ${stats.fires} fire(s), ${stats.injuries} injury(ies), ${stats.deaths} death(s)`,
        { items: data.map(complaintToRecord), total: data.length },
      );
    },
  },
  {
    name: "nhtsa_decode_vin",
    description:
      "Decode a Vehicle Identification Number (VIN) to get vehicle specifications: make, model, year, engine, body class, drive type, fuel type, manufacturer, plant location.",
    annotations: { title: "NHTSA: VIN Decoder", readOnlyHint: true },
    parameters: z.object({
      vin: z.string().min(11).max(17).describe("Vehicle Identification Number (VIN), 11-17 characters"),
    }),
    execute: async (args) => {
      const result = await decodeVin(args.vin);
      if (result.ErrorCode && result.ErrorCode !== "0") {
        return emptyResponse(`VIN decode error: ${result.ErrorText ?? "Unknown error"}`);
      }
      const record: Record<string, unknown> = {
        Make: result.Make,
        Model: result.Model,
        Year: result.ModelYear,
        Manufacturer: result.Manufacturer,
        VehicleType: result.VehicleType,
        BodyClass: result.BodyClass,
        DriveType: result.DriveType,
        FuelType: result.FuelTypePrimary,
        Engine: result.EngineModel,
        Cylinders: result.EngineCylinders,
        DisplacementL: result.DisplacementL,
        Transmission: result.TransmissionStyle,
        PlantCity: result.PlantCity,
        PlantCountry: result.PlantCountry,
      };
      // Remove undefined/null fields
      for (const key of Object.keys(record)) {
        if (record[key] == null) delete record[key];
      }
      if (!Object.keys(record).length) return emptyResponse("No data returned for this VIN.");
      return recordResponse(`VIN ${args.vin}: ${record.Year ?? ""} ${record.Make ?? ""} ${record.Model ?? ""}`.trim(), record);
    },
  },
  {
    name: "nhtsa_models",
    description:
      "Get all models available for a given vehicle make, optionally filtered by model year. Useful for discovering valid model names before searching recalls/complaints.",
    annotations: { title: "NHTSA: Vehicle Models", readOnlyHint: true },
    parameters: z.object({
      make: z.string().describe("Vehicle make (e.g. 'honda', 'toyota', 'ford')"),
      model_year: z.number().optional().describe("Optional model year filter"),
    }),
    execute: async (args) => {
      const data = await getModelsForMake({
        make: args.make,
        modelYear: args.model_year,
      });
      if (!data.length) return emptyResponse(`No models found for make '${args.make}'.`);
      const items = data.map((m) => ({ Model_Name: m.Model_Name }));
      return listResponse(
        `${data.length} model(s) for ${args.make}${args.model_year ? ` (${args.model_year})` : ""}`,
        { items, total: data.length },
      );
    },
  },

  {
    name: "nhtsa_safety_ratings",
    description:
      "Get NHTSA 5-star safety ratings for a vehicle.\n" +
      "Shows overall rating, frontal crash, side crash, rollover risk, and safety technology (ESC, forward collision warning, lane departure warning).\n" +
      "Also shows complaint, recall, and investigation counts for the vehicle.",
    annotations: { title: "NHTSA: Safety Ratings", readOnlyHint: true },
    parameters: z.object({
      make: z.string().describe("Vehicle make: 'honda', 'toyota', 'ford', 'tesla'"),
      model: z.string().describe("Vehicle model: 'civic', 'camry', 'f-150', 'model 3'"),
      model_year: z.number().describe("Model year: 2020, 2023, 2024"),
    }),
    execute: async (args) => {
      const vehicles = await getSafetyRatingVehicles({ make: args.make, model: args.model, modelYear: args.model_year });
      if (!vehicles.length) return emptyResponse(`No safety ratings found for ${args.model_year} ${args.make} ${args.model}. Try different spelling or year.`);

      // Get detailed ratings for each variant
      const details = [];
      for (const v of vehicles.slice(0, 5)) {
        if (v.VehicleId) {
          const rating = await getSafetyRatingDetail(v.VehicleId);
          if (rating) details.push(rating);
        }
      }

      if (!details.length) {
        const items = vehicles.map(v => ({ VehicleDescription: v.VehicleDescription, VehicleId: v.VehicleId }));
        return listResponse(
          `${vehicles.length} variant(s) found, no detailed ratings available yet`,
          { items, total: vehicles.length },
        );
      }

      const items = details.map(r => ({
        VehicleDescription: r.VehicleDescription ?? null,
        OverallRating: r.OverallRating ?? null,
        FrontCrashDriverside: r.FrontCrashDriversideRating ?? null,
        FrontCrashPassengerside: r.FrontCrashPassengersideRating ?? null,
        OverallFrontCrash: r.OverallFrontCrashRating ?? null,
        SideCrashDriverside: r.SideCrashDriversideRating ?? null,
        SideCrashPassengerside: r.SideCrashPassengersideRating ?? null,
        OverallSideCrash: r.OverallSideCrashRating ?? null,
        RolloverRating: r.RolloverRating ?? null,
        RolloverPossibility: r.RolloverPossibility ?? null,
        SidePoleCrash: r.SidePoleCrashRating ?? null,
        ESC: r.NHTSAElectronicStabilityControl ?? null,
        ForwardCollisionWarning: r.NHTSAForwardCollisionWarning ?? null,
        LaneDepartureWarning: r.NHTSALaneDepartureWarning ?? null,
        ComplaintsCount: r.ComplaintsCount ?? null,
        RecallsCount: r.RecallsCount ?? null,
        InvestigationCount: r.InvestigationCount ?? null,
      }));

      return listResponse(
        `NHTSA Safety Ratings for ${args.model_year} ${args.make} ${args.model}: ${details.length} variant(s)`,
        { items, total: details.length },
      );
    },
  },
];
