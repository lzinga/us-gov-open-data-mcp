/**
 * GSA CALC+ Ceiling Rates API module.
 *
 * CALC+ API: https://api.gsa.gov/acquisition/calc/v3/api/ceilingrates/
 * Docs: https://open.gsa.gov/api/dx-calc-api/
 */

import type { ApiModule } from "../../shared/types.js";
import meta from "./meta.js";
import { tools } from "./tools.js";
import { clearCache } from "./sdk.js";

export default { ...meta, tools, clearCache } satisfies ApiModule;
