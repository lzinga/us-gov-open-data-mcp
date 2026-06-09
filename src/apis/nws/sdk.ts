/**
 * NWS (National Weather Service) SDK — real-time U.S. weather forecasts,
 * alerts, and station observations.
 *
 * API docs: https://www.weather.gov/documentation/services-web-api
 * OpenAPI spec: https://api.weather.gov/openapi.json
 * Rate limit: not formally documented; designed for real-time public use. Be polite.
 * Auth: none. NWS requires a descriptive User-Agent header per their guidelines.
 *
 * Usage:
 *   import { getForecast, getActiveAlerts } from "us-gov-open-data-mcp/sdk/nws";
 *   const fc = await getForecast({ lat: 38.89, lon: -77.04 });
 *   const alerts = await getActiveAlerts({ area: "CA" });
 */

import { createClient } from "../../shared/client.js";

const USER_AGENT =
  process.env.NWS_USER_AGENT?.trim() ||
  "us-gov-open-data-mcp (https://github.com/lzinga/us-gov-open-data-mcp)";

const api = createClient({
  baseUrl: "https://api.weather.gov",
  name: "nws",
  defaultHeaders: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
  rateLimit: { perSecond: 5, burst: 10 },
  // Forecasts update hourly; alerts more often. 60s default keeps things fresh
  // while still absorbing tool-chains that hit /points + /forecast back-to-back.
  cacheTtlMs: 60 * 1000,
});

// ─── Types ───────────────────────────────────────────────────────────

/** Gridpoint + zone metadata for a lat/lon, returned by /points. */
export interface PointInfo {
  gridId: string;
  gridX: number;
  gridY: number;
  forecastOffice: string;
  timeZone: string;
  radarStation: string | null;
  forecastZoneId: string | null;
  countyZoneId: string | null;
  fireWeatherZoneId: string | null;
  observationStationsUrl: string;
  relativeLocation: { city: string; state: string } | null;
}

/** One period of a forecast (typically 12 hours daytime / 12 hours overnight). */
export interface ForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend: string | null;
  probabilityOfPrecipitation: number | null;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
}

/** Active weather alert (subset of GeoJSON Feature properties). */
export interface Alert {
  id: string;
  event: string;
  severity: string;
  certainty: string;
  urgency: string;
  status: string;
  messageType: string;
  sent: string;
  effective: string;
  onset: string | null;
  expires: string;
  ends: string | null;
  senderName: string;
  headline: string | null;
  description: string;
  instruction: string | null;
  areaDesc: string;
  category: string;
}

/** Observation station (subset of GeoJSON Feature properties). */
export interface Station {
  stationIdentifier: string;
  name: string;
  elevationMeters: number | null;
  timeZone: string;
  latitude: number;
  longitude: number;
}

/** Latest observation from a station (SI units). */
export interface Observation {
  station: string;
  timestamp: string;
  textDescription: string;
  temperatureC: number | null;
  dewpointC: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  barometricPressurePa: number | null;
  visibilityM: number | null;
  relativeHumidityPct: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

interface FeatureCollection<P> {
  features?: Array<{ id: string; properties: P }>;
}
interface Feature<P> {
  id?: string;
  properties: P;
}

/** Extract a zone/county ID from a /zones/{type}/{id} URL. */
function zoneIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/zones\/[^/]+\/([^/?#]+)/);
  return m ? m[1] : null;
}

function num(v: { value?: number | null } | null | undefined): number | null {
  return v && typeof v.value === "number" ? v.value : null;
}

// ─── Public API ──────────────────────────────────────────────────────

/** Get gridpoint + zone metadata for a lat/lon. */
export async function getPointInfo(opts: { lat: number; lon: number }): Promise<PointInfo> {
  const data = await api.get<Feature<any>>(`/points/${opts.lat},${opts.lon}`);
  const p = data.properties;
  const rel = p.relativeLocation?.properties;
  return {
    gridId: p.gridId,
    gridX: p.gridX,
    gridY: p.gridY,
    forecastOffice: p.cwa,
    timeZone: p.timeZone,
    radarStation: p.radarStation ?? null,
    forecastZoneId: zoneIdFromUrl(p.forecastZone),
    countyZoneId: zoneIdFromUrl(p.county),
    fireWeatherZoneId: zoneIdFromUrl(p.fireWeatherZone),
    observationStationsUrl: p.observationStations,
    relativeLocation: rel ? { city: rel.city, state: rel.state } : null,
  };
}

/** Get the 7-day forecast for a lat/lon (resolves the gridpoint internally). */
export async function getForecast(opts: { lat: number; lon: number }): Promise<{
  updated: string;
  generatedAt: string;
  units: string;
  periods: ForecastPeriod[];
  point: PointInfo;
}> {
  const point = await getPointInfo(opts);
  const data = await api.get<Feature<any>>(
    `/gridpoints/${point.gridId}/${point.gridX},${point.gridY}/forecast`,
  );
  const p = data.properties;
  const periods: ForecastPeriod[] = (p.periods ?? []).map((x: any) => ({
    number: x.number,
    name: x.name,
    startTime: x.startTime,
    endTime: x.endTime,
    isDaytime: x.isDaytime,
    temperature: x.temperature,
    temperatureUnit: x.temperatureUnit,
    temperatureTrend: x.temperatureTrend ?? null,
    probabilityOfPrecipitation: num(x.probabilityOfPrecipitation),
    windSpeed: x.windSpeed,
    windDirection: x.windDirection,
    shortForecast: x.shortForecast,
    detailedForecast: x.detailedForecast,
  }));
  return {
    updated: p.updated,
    generatedAt: p.generatedAt,
    units: p.units,
    periods,
    point,
  };
}

/** Get the hourly forecast (next ~156 hours) for a lat/lon. */
export async function getForecastHourly(opts: { lat: number; lon: number }): Promise<{
  updated: string;
  periods: ForecastPeriod[];
  point: PointInfo;
}> {
  const point = await getPointInfo(opts);
  const data = await api.get<Feature<any>>(
    `/gridpoints/${point.gridId}/${point.gridX},${point.gridY}/forecast/hourly`,
  );
  const p = data.properties;
  const periods: ForecastPeriod[] = (p.periods ?? []).map((x: any) => ({
    number: x.number,
    name: x.name,
    startTime: x.startTime,
    endTime: x.endTime,
    isDaytime: x.isDaytime,
    temperature: x.temperature,
    temperatureUnit: x.temperatureUnit,
    temperatureTrend: x.temperatureTrend ?? null,
    probabilityOfPrecipitation: num(x.probabilityOfPrecipitation),
    windSpeed: x.windSpeed,
    windDirection: x.windDirection,
    shortForecast: x.shortForecast,
    detailedForecast: x.detailedForecast ?? "",
  }));
  return { updated: p.updated, periods, point };
}

/** Get the public zone forecast (text-based, by zone ID). */
export async function getZoneForecast(zoneId: string): Promise<{
  updated: string;
  periods: Array<{ number: number; name: string; detailedForecast: string }>;
}> {
  const data = await api.get<Feature<any>>(`/zones/forecast/${zoneId}/forecast`);
  const p = data.properties;
  return {
    updated: p.updated,
    periods: (p.periods ?? []).map((x: any) => ({
      number: x.number,
      name: x.name,
      detailedForecast: x.detailedForecast,
    })),
  };
}

/** Map a raw alert feature to our Alert type. */
function mapAlert(f: { id?: string; properties: any }): Alert {
  const p = f.properties || {};
  return {
    // properties.id is the bare URN (e.g. "urn:oid:2.49.0.1.840…") that
    // /alerts/{id} expects. feature.id is the full URL and is NOT round-trippable.
    id: p.id ?? f.id ?? "",
    event: p.event,
    severity: p.severity,
    certainty: p.certainty,
    urgency: p.urgency,
    status: p.status,
    messageType: p.messageType,
    sent: p.sent,
    effective: p.effective,
    onset: p.onset ?? null,
    expires: p.expires,
    ends: p.ends ?? null,
    senderName: p.senderName,
    headline: p.headline ?? null,
    description: p.description,
    instruction: p.instruction ?? null,
    areaDesc: p.areaDesc,
    category: p.category,
  };
}

/** Get currently-active alerts, optionally filtered by area, zone, or point. */
export async function getActiveAlerts(opts: {
  area?: string;        // state/territory code, e.g. "CA"
  zone?: string;        // forecast zone ID, e.g. "CAZ006"
  point?: string;       // "lat,lon"
  status?: string;      // actual | exercise | system | test | draft
  messageType?: string; // alert | update | cancel
  severity?: string;    // Extreme | Severe | Moderate | Minor | Unknown
  urgency?: string;     // Immediate | Expected | Future | Past | Unknown
} = {}): Promise<Alert[]> {
  const data = await api.get<FeatureCollection<any>>("/alerts/active", {
    area: opts.area,
    zone: opts.zone,
    point: opts.point,
    status: opts.status,
    message_type: opts.messageType,
    severity: opts.severity,
    urgency: opts.urgency,
  });
  return (data.features ?? []).map(mapAlert);
}

/** Get a single alert by its URN (e.g. "urn:oid:2.49.0.1.840…"). Full URLs are also accepted.
 *  Returns null if the alert is not found. */
export async function getAlert(id: string): Promise<Alert | null> {
  // Be forgiving: if a caller passes the full URL form, strip the prefix.
  const urn = id.replace(/^https?:\/\/api\.weather\.gov\/alerts\//, "");
  try {
    const data = await api.get<Feature<any>>(`/alerts/${encodeURIComponent(urn)}`);
    if (!data.properties) return null;
    return mapAlert({ id: data.id ?? urn, properties: data.properties });
  } catch (e) {
    if (e instanceof Error && /HTTP 404/.test(e.message)) return null;
    throw e;
  }
}

/** List all alert event types (e.g. "Tornado Warning", "Flood Watch"). */
export async function getAlertTypes(): Promise<string[]> {
  const data = await api.get<{ eventTypes?: string[] }>("/alerts/types");
  return data.eventTypes ?? [];
}

/** List observation stations near a lat/lon. `limit` is applied client-side
 *  (the upstream endpoint does not accept a query limit). */
export async function getStationsNear(opts: { lat: number; lon: number; limit?: number }): Promise<Station[]> {
  const data = await api.get<FeatureCollection<any>>(
    `/points/${opts.lat},${opts.lon}/stations`,
  );
  const all = (data.features ?? []).map((f) => {
    const p = f.properties;
    const coords = (f as any).geometry?.coordinates ?? [null, null];
    return {
      stationIdentifier: p.stationIdentifier,
      name: p.name,
      elevationMeters: num(p.elevation),
      timeZone: p.timeZone,
      latitude: coords[1] ?? 0,
      longitude: coords[0] ?? 0,
    };
  });
  return opts.limit !== undefined ? all.slice(0, opts.limit) : all;
}

/** Get the latest observation from a station (SI units). Returns null if the
 *  station is unknown or has no recent observations. */
export async function getLatestObservation(stationId: string): Promise<Observation | null> {
  let data: Feature<any>;
  try {
    data = await api.get<Feature<any>>(`/stations/${stationId}/observations/latest`);
  } catch (e) {
    if (e instanceof Error && /HTTP 404/.test(e.message)) return null;
    throw e;
  }
  const p = data.properties;
  if (!p) return null;
  return {
    station: p.station,
    timestamp: p.timestamp,
    textDescription: p.textDescription,
    temperatureC: num(p.temperature),
    dewpointC: num(p.dewpoint),
    windSpeedKmh: num(p.windSpeed),
    windDirectionDeg: num(p.windDirection),
    barometricPressurePa: num(p.barometricPressure),
    visibilityM: num(p.visibility),
    relativeHumidityPct: num(p.relativeHumidity),
  };
}

/** Get the NWS glossary (term → definition). */
export async function getGlossary(): Promise<Array<{ term: string; definition: string }>> {
  const data = await api.get<{ glossary?: Array<{ term: string; definition: string }> }>("/glossary");
  return data.glossary ?? [];
}

/**
 * Clear Cache.
 */
export function clearCache(): void { api.clearCache(); }
