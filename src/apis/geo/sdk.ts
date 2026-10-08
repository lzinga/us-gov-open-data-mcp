/**
 * Geo SDK — turn an address, a coordinate or a ZIP code into the Census
 * geographies (state, county, tract, place, congressional district) that the
 * other modules ask for.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { geocodeAddress, listCounties } from "us-gov-open-data-mcp/sdk/geo";
 *
 * No API key required.
 * Docs: https://geocoding.geo.census.gov/geocoder/ and https://tigerweb.geo.census.gov/arcgis/rest/services
 */

import { createClient, qp } from "../../shared/client.js";
import { findState, resolveState } from "../../shared/geo.js";

// ─── Clients ─────────────────────────────────────────────────────────

/**
 * Address matching changes only when the Census updates its address ranges,
 * so results keep for a day.
 */
const geocoder = createClient({
  baseUrl: "https://geocoding.geo.census.gov/geocoder",
  name: "geo-geocoder",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 24 * 60 * 60 * 1000,
  checkError: data => {
    const errors = (data as { errors?: unknown[] })?.errors;
    return Array.isArray(errors) && errors.length ? `Census Geocoder: ${String(errors[0])}` : null;
  },
});

/** Boundary files are published once a year, so these keep for a week. */
const tiger = createClient({
  baseUrl: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb",
  name: "geo-tigerweb",
  rateLimit: { perSecond: 5, burst: 10 },
  cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  checkError: data => {
    const err = (data as { error?: { code?: number; message?: string } })?.error;
    return err ? `TIGERweb error ${err.code ?? ""}: ${err.message ?? "request failed"}`.trim() : null;
  },
});

/**
 * The benchmark (address ranges) and vintage (geography year) the geocoder
 * should use. "Current" tracks whatever the Census has published latest.
 */
const BENCHMARK = "Public_AR_Current";
const VINTAGE = "Current_Current";

// ─── Types ───────────────────────────────────────────────────────────

/** A named geography with its FIPS/GEOID code. */
export interface Area {
  /** GEOID: 2 digits for a state, 5 for a county, 11 for a tract, 15 for a block. */
  fips: string;
  name: string;
}

/** A state, with all three of the forms different APIs ask for. */
export interface StateArea extends Area {
  /** Two-letter USPS code, e.g. "WA". */
  usps?: string;
}

/** A congressional district, which is numbered per Congress rather than by FIPS. */
export interface DistrictArea extends Area {
  /** Congress the district belongs to, e.g. "120". */
  session?: string;
}

/** The Census geographies a point falls in. Layers the Census didn't return are omitted. */
export interface GeoAreas {
  state?: StateArea;
  /** 5-digit county FIPS — what fema_*, usgs_water_sites, bls_* and bea_* call for. */
  county?: Area;
  /** 11-digit census tract GEOID. */
  tract?: Area;
  /** 15-digit census block GEOID. */
  block?: Area;
  /** Incorporated place (city or town). */
  place?: Area;
  /** County subdivision (township, borough). */
  countySubdivision?: Area;
  congressionalDistrict?: DistrictArea;
  stateLegislativeUpper?: Area;
  stateLegislativeLower?: Area;
  /** Combined Statistical Area — the broad metro region. */
  combinedStatisticalArea?: Area;
  urbanArea?: Area;
}

/** One address the Census matched, with its coordinate and geographies. */
export interface GeocodedAddress {
  /** The address as the Census normalized it. */
  matchedAddress: string;
  latitude: number;
  longitude: number;
  zip?: string;
  areas: GeoAreas;
}

/** A coordinate and the geographies it falls in. */
export interface LocatedPoint {
  latitude: number;
  longitude: number;
  areas: GeoAreas;
}

/** A ZIP Code Tabulation Area and the geographies at its center. */
export interface ZipLocation {
  zip: string;
  /** A point guaranteed to be inside the ZIP area (the Census "internal point"). */
  latitude: number;
  longitude: number;
  /** Geographies at that internal point — the county here is the ZIP's primary county. */
  areas: GeoAreas;
  /**
   * Counties overlapping the ZIP's bounding box, so it includes the primary
   * county and can include neighbours the ZIP only comes close to.
   */
  nearbyCounties: Area[];
}

/** A county with the codes each API expects. */
export interface County extends Area {
  /** 2-digit state FIPS. */
  stateFips: string;
  /** Two-letter USPS state code. */
  stateUsps?: string;
  /** 3-digit county code within the state, as EPA AQS and USGS use. */
  countyCode: string;
  latitude?: number;
  longitude?: number;
}

// ─── Geography parsing ───────────────────────────────────────────────

type Layer = Record<string, unknown>;
type Geographies = Record<string, Layer[] | undefined>;

/**
 * Find a geography layer by pattern.
 *
 * The Census renames layers as new data lands — "120th Congressional
 * Districts" and "2026 State Legislative Districts - Upper" both carry a
 * number that changes — so layers are matched by pattern, not exact name.
 */
function layer(geographies: Geographies, pattern: RegExp): Layer | undefined {
  for (const [name, entries] of Object.entries(geographies ?? {})) {
    if (pattern.test(name) && entries?.length) return entries[0];
  }
  return undefined;
}

function str(source: Layer | undefined, field: string): string | undefined {
  const value = source?.[field];
  return typeof value === "string" && value ? value : undefined;
}

/** A layer as an Area, or undefined when the Census didn't return it. */
function area(source: Layer | undefined): Area | undefined {
  const fips = str(source, "GEOID");
  if (!fips) return undefined;
  return { fips, name: str(source, "NAME") ?? str(source, "BASENAME") ?? fips };
}

/** Normalize the geocoder's geography layers into the codes tools ask for. */
export function toAreas(geographies: Geographies): GeoAreas {
  const state = area(layer(geographies, /^States$/));
  const districtLayer = layer(geographies, /Congressional Districts$/);
  const district = area(districtLayer);

  const areas: GeoAreas = {
    state: state ? { ...state, usps: findState(state.fips)?.usps } : undefined,
    county: area(layer(geographies, /^Counties$/)),
    tract: area(layer(geographies, /^Census Tracts$/)),
    block: area(layer(geographies, /Census Blocks$/)),
    place: area(layer(geographies, /^Incorporated Places$/)),
    countySubdivision: area(layer(geographies, /^County Subdivisions$/)),
    congressionalDistrict: district
      ? { ...district, session: str(districtLayer, "CDSESSN") }
      : undefined,
    stateLegislativeUpper: area(layer(geographies, /State Legislative Districts - Upper$/)),
    stateLegislativeLower: area(layer(geographies, /State Legislative Districts - Lower$/)),
    combinedStatisticalArea: area(layer(geographies, /^Combined Statistical Areas$/)),
    urbanArea: area(layer(geographies, /^Urban Areas$/)),
  };

  // Drop the layers this location has no value for, so the result stays small.
  for (const key of Object.keys(areas) as (keyof GeoAreas)[]) {
    if (areas[key] === undefined) delete areas[key];
  }
  return areas;
}

/**
 * Parse a coordinate. TIGERweb writes them as zero-padded, signed strings
 * ("+47.61", "-095.66"); the geocoder returns plain numbers.
 */
function coord(value: unknown): number | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

// ─── Address → geographies ───────────────────────────────────────────

interface GeocoderMatch {
  matchedAddress?: string;
  coordinates?: { x?: number; y?: number };
  addressComponents?: { zip?: string };
  geographies?: Geographies;
}

/**
 * Geocode a street address and return the Census geographies it falls in.
 *
 * The address is matched against Census address ranges, so it needs a street
 * number and street name; a ZIP or a city on its own returns no matches (use
 * {@link lookupZip} for a ZIP).
 *
 * @param address - one-line address, e.g. "1600 Pennsylvania Ave NW, Washington, DC"
 * @param opts.limit - most matches to return (default 5)
 */
export async function geocodeAddress(
  address: string,
  opts: { limit?: number } = {},
): Promise<GeocodedAddress[]> {
  const query = address.trim();
  if (!query) throw new Error("address is required, e.g. \"1600 Pennsylvania Ave NW, Washington, DC\".");

  const res = await geocoder.get<{ result?: { addressMatches?: GeocoderMatch[] } }>(
    "/geographies/onelineaddress",
    qp({ address: query, benchmark: BENCHMARK, vintage: VINTAGE, format: "json" }),
  );

  const matches = res?.result?.addressMatches ?? [];
  const limit = Math.max(1, opts.limit ?? 5);
  const results: GeocodedAddress[] = [];

  for (const match of matches) {
    if (results.length === limit) break;
    // A match without a coordinate can't be handed to a mapping or point tool,
    // so skip it rather than emit NaN.
    const latitude = coord(match.coordinates?.y);
    const longitude = coord(match.coordinates?.x);
    if (latitude === undefined || longitude === undefined) continue;

    const zip = match.addressComponents?.zip;
    results.push({
      matchedAddress: match.matchedAddress ?? query,
      latitude,
      longitude,
      ...(zip ? { zip } : {}),
      areas: toAreas(match.geographies ?? {}),
    });
  }
  return results;
}

// ─── Coordinate → geographies ────────────────────────────────────────

/**
 * Look up the Census geographies containing a coordinate.
 *
 * @param latitude - degrees north, -90 to 90
 * @param longitude - degrees east, -180 to 180 (negative in the US)
 */
export async function locatePoint(latitude: number, longitude: number): Promise<LocatedPoint> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error(`latitude must be between -90 and 90 (got ${latitude}).`);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`longitude must be between -180 and 180 (got ${longitude}). US longitudes are negative.`);
  }

  const res = await geocoder.get<{ result?: { geographies?: Geographies } }>(
    "/geographies/coordinates",
    qp({ x: longitude, y: latitude, benchmark: BENCHMARK, vintage: VINTAGE, format: "json" }),
  );
  return { latitude, longitude, areas: toAreas(res?.result?.geographies ?? {}) };
}

// ─── ZIP → geographies ───────────────────────────────────────────────

interface TigerFeature { attributes?: Record<string, unknown> }
interface TigerQuery { features?: TigerFeature[] }
interface TigerExtent {
  extent?: { xmin?: number; ymin?: number; xmax?: number; ymax?: number };
}

/** ZIP Code Tabulation Areas, which approximate USPS ZIP codes as polygons. */
const ZCTA_LAYER = "/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query";
const COUNTY_LAYER = "/State_County/MapServer/1/query";

/**
 * Locate a 5-digit ZIP code: its center point, the geographies there, and the
 * counties around it.
 *
 * Uses ZIP Code Tabulation Areas (ZCTAs), the Census approximation of USPS ZIP
 * codes. PO-box-only ZIPs have no ZCTA and return null.
 *
 * @param zip - 5-digit ZIP code, e.g. "98101"
 * @returns the location, or null when no ZCTA matches
 */
export async function lookupZip(zip: string): Promise<ZipLocation | null> {
  const code = String(zip).trim();
  if (!/^\d{5}$/.test(code)) throw new Error(`zip must be 5 digits (got ${JSON.stringify(zip)}).`);

  // Safe to interpolate: `code` is already known to be exactly five digits.
  const where = `GEOID='${code}'`;
  const found = await tiger.get<TigerQuery>(ZCTA_LAYER, qp({
    where,
    outFields: "GEOID,INTPTLAT,INTPTLON",
    returnGeometry: "false",
    f: "json",
  }));

  const attrs = found?.features?.[0]?.attributes;
  const latitude = coord(attrs?.INTPTLAT);
  const longitude = coord(attrs?.INTPTLON);
  if (latitude === undefined || longitude === undefined) return null;

  const [point, nearbyCounties] = await Promise.all([
    locatePoint(latitude, longitude),
    countiesNearZip(where),
  ]);

  return { zip: code, latitude, longitude, areas: point.areas, nearbyCounties };
}

/** Counties overlapping a ZCTA's bounding box. Returns [] if the lookup fails. */
async function countiesNearZip(where: string): Promise<Area[]> {
  const bounds = await tiger.get<TigerExtent>(ZCTA_LAYER, qp({
    where,
    returnExtentOnly: "true",
    outSR: "4326",
    f: "json",
  }));

  const { xmin, ymin, xmax, ymax } = bounds?.extent ?? {};
  if (![xmin, ymin, xmax, ymax].every(n => typeof n === "number" && Number.isFinite(n))) return [];

  const res = await tiger.get<TigerQuery>(COUNTY_LAYER, qp({
    geometry: `${xmin},${ymin},${xmax},${ymax}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "GEOID,NAME",
    returnGeometry: "false",
    f: "json",
  }));

  return (res?.features ?? [])
    .map(f => area(f.attributes))
    .filter((a): a is Area => a !== undefined)
    .sort((a, b) => a.fips.localeCompare(b.fips));
}

// ─── County lookup ───────────────────────────────────────────────────

/**
 * List the counties in a state, with the FIPS codes other tools need.
 *
 * @param state - state name, USPS code or FIPS code ("Texas", "TX" or "48")
 * @param opts.name - keep only counties whose name contains this text
 */
export async function listCounties(state: string, opts: { name?: string } = {}): Promise<County[]> {
  const { fips: stateFips, usps } = resolveState(state);

  // Safe to interpolate: resolveState only ever returns a 2-digit FIPS code.
  const res = await tiger.get<TigerQuery>(COUNTY_LAYER, qp({
    where: `STATE='${stateFips}'`,
    outFields: "GEOID,NAME,BASENAME,COUNTY,INTPTLAT,INTPTLON",
    returnGeometry: "false",
    orderByFields: "BASENAME",
    f: "json",
  }));

  const counties = (res?.features ?? []).flatMap(feature => {
    const attrs = feature.attributes;
    const base = area(attrs);
    if (!base) return [];
    const latitude = coord(attrs?.INTPTLAT);
    const longitude = coord(attrs?.INTPTLON);
    return [{
      ...base,
      stateFips,
      stateUsps: usps,
      countyCode: typeof attrs?.COUNTY === "string" ? attrs.COUNTY : base.fips.slice(2),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
    }];
  });

  const needle = opts.name?.trim().toLowerCase();
  if (!needle) return counties;
  return counties.filter(c => c.name.toLowerCase().includes(needle));
}

// ─── Cache ───────────────────────────────────────────────────────────

export function clearCache(): void {
  geocoder.clearCache();
  tiger.clearCache();
}
