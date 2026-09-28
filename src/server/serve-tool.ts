/**
 * How a data tool's result is prepared for the client: the upstream requests
 * it made are added as `meta.sources`, then the size budget is applied.
 * code_mode and other server features call tools through the registry and
 * get the raw result instead.
 */

import { trackSources } from "../shared/request-context.js";
import { budgetResult } from "./response-budget.js";
import { attachSources } from "./sources.js";

export function serveTool<T extends { execute: (args: any, ctx: any) => unknown }>(tool: T, maxResponseBytes: number): T {
  return {
    ...tool,
    execute: async (args: unknown, ctx: unknown) => {
      const { result, sources } = await trackSources(async () => tool.execute(args, ctx));
      const withSources = attachSources(result, sources);
      return maxResponseBytes > 0 ? budgetResult(withSources, maxResponseBytes) : withSources;
    },
  };
}
