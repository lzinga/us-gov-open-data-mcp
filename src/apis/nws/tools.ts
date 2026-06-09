/**
 * nws MCP tools.
 */

import { z } from "zod";
import type { Tool } from "fastmcp";
import {
  getPointInfo,
  getForecast,
  getForecastHourly,
  getZoneForecast,
  getActiveAlerts,
  getAlert,
  getAlertTypes,
  getStationsNear,
  getLatestObservation,
  getGlossary,
} from "./sdk.js";
import { listResponse, recordResponse, emptyResponse } from "../../shared/response.js";

const lat = z.number().min(-90).max(90).describe("Latitude in decimal degrees (e.g. 38.8894)");
const lon = z.number().min(-180).max(180).describe("Longitude in decimal degrees (e.g. -77.0352)");

export const tools: Tool<any, any>[] = [
  {
    name: "nws_point_info",
    description:
      "Resolve a lat/lon to its NWS forecast gridpoint, office, time zone, forecast zone, county zone, and nearest radar station. " +
      "Useful for debugging or when you need the zone ID for nws_zone_forecast. Most callers can skip this and use nws_forecast directly.",
    annotations: { title: "NWS: Point Info", readOnlyHint: true },
    parameters: z.object({ lat, lon }),
    execute: async ({ lat, lon }) => {
      const info = await getPointInfo({ lat, lon });
      return recordResponse(
        `${info.relativeLocation?.city ?? "Point"}, ${info.relativeLocation?.state ?? ""} — office ${info.forecastOffice}, grid ${info.gridId}/${info.gridX},${info.gridY}, zone ${info.forecastZoneId ?? "?"}`,
        info,
      );
    },
  },

  {
    name: "nws_forecast",
    description:
      "Get the 7-day NWS forecast for a lat/lon. Returns ~14 periods (Today / Tonight / Tomorrow / Tomorrow Night / …) with temperature, wind, precipitation probability, and a detailed text forecast. Forecasts use US units (°F, mph).",
    annotations: { title: "NWS: 7-Day Forecast", readOnlyHint: true },
    parameters: z.object({ lat, lon }),
    execute: async ({ lat, lon }) => {
      const result = await getForecast({ lat, lon });
      const loc = result.point.relativeLocation;
      if (!result.periods.length) return emptyResponse(`No forecast available for ${lat},${lon}.`);
      return listResponse(
        `Forecast for ${loc?.city ?? `${lat},${lon}`}${loc ? `, ${loc.state}` : ""} — ${result.periods.length} periods, generated ${result.generatedAt}`,
        {
          items: result.periods,
          meta: { units: result.units, gridpoint: `${result.point.gridId}/${result.point.gridX},${result.point.gridY}` },
        },
      );
    },
  },

  {
    name: "nws_forecast_hourly",
    description:
      "Get the hourly forecast (next ~156 hours / ~6.5 days) for a lat/lon. Each period is one hour with temperature, wind, precip probability, and short forecast. Large response — consider nws_forecast for daily summaries.",
    annotations: { title: "NWS: Hourly Forecast", readOnlyHint: true },
    parameters: z.object({ lat, lon }),
    execute: async ({ lat, lon }) => {
      const result = await getForecastHourly({ lat, lon });
      const loc = result.point.relativeLocation;
      if (!result.periods.length) return emptyResponse(`No hourly forecast available for ${lat},${lon}.`);
      return listResponse(
        `Hourly forecast for ${loc?.city ?? `${lat},${lon}`}${loc ? `, ${loc.state}` : ""} — ${result.periods.length} hours`,
        {
          items: result.periods,
          meta: { gridpoint: `${result.point.gridId}/${result.point.gridX},${result.point.gridY}` },
        },
      );
    },
  },

  {
    name: "nws_zone_forecast",
    description:
      "Get the public text-based forecast for an NWS forecast zone (e.g. 'CAZ006'). Find the zone ID via nws_point_info.",
    annotations: { title: "NWS: Zone Forecast", readOnlyHint: true },
    parameters: z.object({
      zone_id: z.string().describe("Forecast zone ID, e.g. 'CAZ006', 'DCZ001'"),
    }),
    execute: async ({ zone_id }) => {
      const result = await getZoneForecast(zone_id);
      if (!result.periods.length) return emptyResponse(`No zone forecast for ${zone_id}.`);
      return listResponse(
        `Zone ${zone_id} forecast — ${result.periods.length} periods (updated ${result.updated})`,
        { items: result.periods },
      );
    },
  },

  {
    name: "nws_alerts_active",
    description:
      "Get currently-active NWS weather alerts (tornado warnings, flood watches, winter storm advisories, etc.) " +
      "filtered by area (state), zone, or point. Pass at most one of area/zone/point. Severity and urgency filters are optional.\n" +
      "Without a geographic filter this returns ALL active U.S. alerts (often hundreds) — capped to `limit`.",
    annotations: { title: "NWS: Active Alerts", readOnlyHint: true },
    parameters: z.object({
      area: z.string().length(2).optional().describe("Two-letter state/territory code (e.g. 'CA', 'TX', 'PR')"),
      zone: z.string().optional().describe("Forecast zone ID (e.g. 'CAZ006')"),
      point: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/).optional().describe("'lat,lon' string (e.g. '38.89,-77.04')"),
      status: z.enum(["actual", "exercise", "system", "test", "draft"]).optional(),
      message_type: z.enum(["alert", "update", "cancel"]).optional(),
      severity: z.enum(["Extreme", "Severe", "Moderate", "Minor", "Unknown"]).optional(),
      urgency: z.enum(["Immediate", "Expected", "Future", "Past", "Unknown"]).optional(),
      limit: z.number().int().min(1).max(500).default(50).describe("Max alerts to return (default 50)"),
    }),
    execute: async (args) => {
      const alerts = await getActiveAlerts({
        area: args.area,
        zone: args.zone,
        point: args.point,
        status: args.status,
        messageType: args.message_type,
        severity: args.severity,
        urgency: args.urgency,
      });
      if (!alerts.length) return emptyResponse("No active alerts match the filter.");
      const filterDesc = args.area ? `area=${args.area}` : args.zone ? `zone=${args.zone}` : args.point ? `point=${args.point}` : "all areas";
      const shown = alerts.slice(0, args.limit);
      return listResponse(
        `${alerts.length} active alert(s) — ${filterDesc}${shown.length < alerts.length ? `, showing ${shown.length}` : ""}`,
        { items: shown, total: alerts.length },
      );
    },
  },

  {
    name: "nws_alert",
    description: "Get a single NWS alert by its URN (e.g. 'urn:oid:2.49.0.1.840…'). Use the `id` from nws_alerts_active; full URLs are also accepted.",
    annotations: { title: "NWS: Alert Detail", readOnlyHint: true },
    parameters: z.object({
      id: z.string().describe("Alert URN from nws_alerts_active (e.g. 'urn:oid:2.49.0.1.840…')"),
    }),
    execute: async ({ id }) => {
      const alert = await getAlert(id);
      if (!alert) return emptyResponse(`Alert ${id} not found.`);
      return recordResponse(`${alert.event} — ${alert.areaDesc}`, alert);
    },
  },

  {
    name: "nws_alert_types",
    description: "List all valid NWS alert event types (e.g. 'Tornado Warning', 'Flood Watch'). Reference data — cached aggressively.",
    annotations: { title: "NWS: Alert Types", readOnlyHint: true },
    parameters: z.object({}),
    execute: async () => {
      const types = await getAlertTypes();
      return listResponse(`${types.length} NWS alert event types`, {
        items: types.map((t) => ({ event: t })),
      });
    },
  },

  {
    name: "nws_stations_near",
    description: "List NWS observation stations near a lat/lon. Use the resulting stationIdentifier with nws_observation_latest.",
    annotations: { title: "NWS: Nearby Stations", readOnlyHint: true },
    parameters: z.object({
      lat,
      lon,
      limit: z.number().int().min(1).max(500).default(10).describe("Max stations to return"),
    }),
    execute: async ({ lat, lon, limit }) => {
      const stations = await getStationsNear({ lat, lon, limit });
      if (!stations.length) return emptyResponse(`No NWS stations found near ${lat},${lon}.`);
      return listResponse(`${stations.length} stations near ${lat},${lon}`, { items: stations });
    },
  },

  {
    name: "nws_observation_latest",
    description:
      "Get the latest observation from an NWS observation station (e.g. 'KDCA' for Reagan National Airport). " +
      "Returns SI units: temperature/dewpoint in °C, wind speed in km/h, pressure in Pa, visibility in m.",
    annotations: { title: "NWS: Latest Observation", readOnlyHint: true },
    parameters: z.object({
      station_id: z.string().describe("Station identifier (e.g. 'KDCA', 'KLAX'). Find via nws_stations_near."),
    }),
    execute: async ({ station_id }) => {
      const obs = await getLatestObservation(station_id);
      if (!obs) return emptyResponse(`No observation for station ${station_id}.`);
      return recordResponse(`${station_id} at ${obs.timestamp}: ${obs.textDescription}`, obs);
    },
  },

  {
    name: "nws_glossary",
    description: "Get the full NWS weather glossary (term → definition). Useful for explaining technical terms in forecasts.",
    annotations: { title: "NWS: Glossary", readOnlyHint: true },
    parameters: z.object({}),
    execute: async () => {
      const entries = await getGlossary();
      return listResponse(`${entries.length} NWS glossary entries`, { items: entries });
    },
  },
];
