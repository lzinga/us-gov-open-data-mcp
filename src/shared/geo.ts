/**
 * U.S. state and territory lookups.
 *
 * APIs disagree on how a state is written: USPS codes ("MD"), full names
 * ("Maryland"), or FIPS codes ("24"). These helpers accept any of the three
 * so tools can normalize input before calling an API.
 */

/** A U.S. state, the District of Columbia, or a territory. */
export interface UsState {
  /** Two-letter USPS code, e.g. "MD". */
  usps: string;
  /** Two-digit FIPS code, e.g. "24". */
  fips: string;
  /** Full name, e.g. "Maryland". */
  name: string;
}

/** States, DC, and territories (FIPS per ANSI INCITS 38). */
export const US_STATES: readonly UsState[] = [
  { usps: "AL", fips: "01", name: "Alabama" },
  { usps: "AK", fips: "02", name: "Alaska" },
  { usps: "AZ", fips: "04", name: "Arizona" },
  { usps: "AR", fips: "05", name: "Arkansas" },
  { usps: "CA", fips: "06", name: "California" },
  { usps: "CO", fips: "08", name: "Colorado" },
  { usps: "CT", fips: "09", name: "Connecticut" },
  { usps: "DE", fips: "10", name: "Delaware" },
  { usps: "DC", fips: "11", name: "District of Columbia" },
  { usps: "FL", fips: "12", name: "Florida" },
  { usps: "GA", fips: "13", name: "Georgia" },
  { usps: "HI", fips: "15", name: "Hawaii" },
  { usps: "ID", fips: "16", name: "Idaho" },
  { usps: "IL", fips: "17", name: "Illinois" },
  { usps: "IN", fips: "18", name: "Indiana" },
  { usps: "IA", fips: "19", name: "Iowa" },
  { usps: "KS", fips: "20", name: "Kansas" },
  { usps: "KY", fips: "21", name: "Kentucky" },
  { usps: "LA", fips: "22", name: "Louisiana" },
  { usps: "ME", fips: "23", name: "Maine" },
  { usps: "MD", fips: "24", name: "Maryland" },
  { usps: "MA", fips: "25", name: "Massachusetts" },
  { usps: "MI", fips: "26", name: "Michigan" },
  { usps: "MN", fips: "27", name: "Minnesota" },
  { usps: "MS", fips: "28", name: "Mississippi" },
  { usps: "MO", fips: "29", name: "Missouri" },
  { usps: "MT", fips: "30", name: "Montana" },
  { usps: "NE", fips: "31", name: "Nebraska" },
  { usps: "NV", fips: "32", name: "Nevada" },
  { usps: "NH", fips: "33", name: "New Hampshire" },
  { usps: "NJ", fips: "34", name: "New Jersey" },
  { usps: "NM", fips: "35", name: "New Mexico" },
  { usps: "NY", fips: "36", name: "New York" },
  { usps: "NC", fips: "37", name: "North Carolina" },
  { usps: "ND", fips: "38", name: "North Dakota" },
  { usps: "OH", fips: "39", name: "Ohio" },
  { usps: "OK", fips: "40", name: "Oklahoma" },
  { usps: "OR", fips: "41", name: "Oregon" },
  { usps: "PA", fips: "42", name: "Pennsylvania" },
  { usps: "RI", fips: "44", name: "Rhode Island" },
  { usps: "SC", fips: "45", name: "South Carolina" },
  { usps: "SD", fips: "46", name: "South Dakota" },
  { usps: "TN", fips: "47", name: "Tennessee" },
  { usps: "TX", fips: "48", name: "Texas" },
  { usps: "UT", fips: "49", name: "Utah" },
  { usps: "VT", fips: "50", name: "Vermont" },
  { usps: "VA", fips: "51", name: "Virginia" },
  { usps: "WA", fips: "53", name: "Washington" },
  { usps: "WV", fips: "54", name: "West Virginia" },
  { usps: "WI", fips: "55", name: "Wisconsin" },
  { usps: "WY", fips: "56", name: "Wyoming" },
  { usps: "AS", fips: "60", name: "American Samoa" },
  { usps: "GU", fips: "66", name: "Guam" },
  { usps: "MP", fips: "69", name: "Northern Mariana Islands" },
  { usps: "PR", fips: "72", name: "Puerto Rico" },
  { usps: "VI", fips: "78", name: "U.S. Virgin Islands" },
];

const byUsps = new Map(US_STATES.map(s => [s.usps, s]));
const byFips = new Map(US_STATES.map(s => [s.fips, s]));
const byName = new Map(US_STATES.map(s => [s.name.toLowerCase(), s]));
byName.set("virgin islands", byUsps.get("VI")!);
byName.set("washington dc", byUsps.get("DC")!);
byName.set("washington, dc", byUsps.get("DC")!);
byName.set("washington d.c.", byUsps.get("DC")!);

/** Find a state by USPS code, full name, or FIPS code (case-insensitive). */
export function findState(input: string | number | undefined | null): UsState | undefined {
  if (input === undefined || input === null) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;
  if (/^\d{1,2}$/.test(raw)) return byFips.get(raw.padStart(2, "0"));
  if (/^[a-z]{2}$/i.test(raw)) return byUsps.get(raw.toUpperCase());
  return byName.get(raw.toLowerCase().replace(/\s+/g, " "));
}

/**
 * Resolve a state or throw an error the model can act on.
 * @param param - parameter name used in the error message
 */
export function resolveState(input: string | number, param = "state"): UsState {
  const state = findState(input);
  if (!state) {
    throw new Error(
      `Unknown ${param} "${input}". Use a two-letter code ("MD"), a full name ("Maryland"), or a FIPS code ("24").`,
    );
  }
  return state;
}

/**
 * A state in the form an API expects, from a name, USPS code or FIPS code.
 * Values that aren't a state (e.g. "United States", which some datasets
 * use for national rows) pass through trimmed but otherwise unchanged.
 */
export function stateAs(input: string | number, form: keyof UsState): string {
  return findState(input)?.[form] ?? String(input).trim();
}