/**
 * USDA FoodData Central SDK — typed API client for the FDC API.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { searchFoods, getFood, listFoods } from "us-gov-open-data-mcp/sdk/usda-fooddata";
 *
 *   const results = await searchFoods({ query: "cheddar cheese", pageSize: 5 });
 *   console.log(results.foods);
 *
 *   const food = await getFood(167782);
 *   console.log(food.description, food.foodNutrients);
 *
 * Requires DATA_GOV_API_KEY env var. Get one at https://api.data.gov/signup/
 * Docs: https://fdc.nal.usda.gov/api-guide
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.nal.usda.gov/fdc/v1",
  name: "usda-fooddata",
  auth: { type: "query", envParams: { api_key: "DATA_GOV_API_KEY" } },
  rateLimit: { perSecond: 3, burst: 10 }, // 1000 req/hour
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours — nutrition data is static
});

// ─── Types ───────────────────────────────────────────────────────────

/** Food Nutrient. */
export interface FoodNutrient {
  nutrientId?: number;
  nutrientName?: string;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  [key: string]: unknown;
}

/** Food Search Item. */
export interface FoodSearchItem {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  ingredients?: string;
  publishedDate?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodCategory?: string;
  score?: number;
  foodNutrients?: FoodNutrient[];
  [key: string]: unknown;
}

/** Food Search Result. */
export interface FoodSearchResult {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: FoodSearchItem[];
}

/** Food Detail. */
export interface FoodDetail {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodCategory?: { description: string; id: number };
  foodNutrients: FoodNutrient[];
  publishedDate?: string;
  [key: string]: unknown;
}

/** Food List Item. */
export interface FoodListItem {
  fdcId: number;
  description: string;
  dataType: string;
  publishedDate?: string;
  foodCode?: string;
  foodNutrients?: FoodNutrient[];
  [key: string]: unknown;
}

// ─── Reference Data ──────────────────────────────────────────────────

/** USDA FoodData data type codes. */
export const DATA_TYPES = {
  Foundation: "Foundation Foods — minimally processed, nutrient-dense foods",
  "SR Legacy": "Standard Reference Legacy — historical USDA reference data",
  Survey: "FNDDS — Food and Nutrient Database for Dietary Studies",
  Branded: "Branded Foods — from food manufacturers (largest dataset)",
  Experimental: "Experimental Foods — research data",
} as const;

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search for foods by keyword.
 *
 * Example:
 *   const results = await searchFoods({ query: "chicken breast", dataType: ["Foundation", "SR Legacy"] });
 */
export async function searchFoods(opts: {
  query: string;
  dataType?: string[];
  pageSize?: number;
  pageNumber?: number;
  sortBy?: string;
  sortOrder?: string;
  brandOwner?: string;
}): Promise<FoodSearchResult> {
  return api.get<FoodSearchResult>("/foods/search", {
    query: opts.query,
    dataType: opts.dataType,
    pageSize: opts.pageSize,
    pageNumber: opts.pageNumber,
    sortBy: opts.sortBy,
    sortOrder: opts.sortOrder,
    brandOwner: opts.brandOwner,
  });
}

/**
 * Get detailed food information by FDC ID.
 *
 * Example:
 *   const food = await getFood(167782);
 */
export async function getFood(fdcId: number): Promise<FoodDetail> {
  return api.get<FoodDetail>(`/food/${fdcId}`);
}

/**
 * Get a paged list of foods (abridged format).
 *
 * Example:
 *   const list = await listFoods({ dataType: ["Foundation"], pageSize: 25 });
 */
export async function listFoods(opts: {
  dataType?: string[];
  pageSize?: number;
  pageNumber?: number;
  sortBy?: string;
  sortOrder?: string;
} = {}): Promise<FoodListItem[]> {
  return api.get<FoodListItem[]>("/foods/list", {
    dataType: opts.dataType,
    pageSize: opts.pageSize,
    pageNumber: opts.pageNumber,
    sortBy: opts.sortBy,
    sortOrder: opts.sortOrder,
  });
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
