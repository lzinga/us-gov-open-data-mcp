/**
 * USPTO Open Data Portal API module.
 *
 * ODP API: https://api.uspto.gov
 * Docs: https://data.uspto.gov/apis/getting-started
 */

import type { ApiModule } from "../../shared/types.js";
import meta from "./meta.js";
import { tools } from "./tools.js";
import { clearCache } from "./sdk.js";

export default { ...meta, tools, clearCache } satisfies ApiModule;