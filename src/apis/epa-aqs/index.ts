/**
 * EPA AQS API module — Air Quality System (ambient air monitoring data).
 *
 * Separated from the main EPA module due to different auth requirements:
 * AQS requires AQS_API_KEY + AQS_EMAIL, while other EPA APIs are keyless.
 */

import type { ApiModule } from "../../shared/types.js";
import meta from "./meta.js";
import { tools } from "./tools.js";
import { clearCache } from "./sdk.js";

export default { ...meta, tools, clearCache } satisfies ApiModule;
