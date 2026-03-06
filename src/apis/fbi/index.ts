/**
 * fbi API module.
 */

import type { ApiModule } from "../../shared/types.js";
import meta from "./meta.js";
import { tools } from "./tools.js";
import { prompts } from "./prompts.js";
import { clearCache } from "./sdk.js";

export default { ...meta, tools, prompts, clearCache } satisfies ApiModule;
