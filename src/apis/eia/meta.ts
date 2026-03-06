/**
 * eia module metadata.
 */

import { sedsMsnCodes, routes } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "eia",
  displayName: "Energy Information Administration",
  category: "Economic",
  description: "Petroleum, electricity, natural gas prices; state energy profiles; total energy overview",
  auth: { envVar: "EIA_API_KEY", signup: "https://www.eia.gov/opendata/register.php" },
  workflow: "Pick energy type (petroleum/electricity/gas/state/total) → query with optional state/sector filters",
  tips: "Energy prices drive inflation (BLS CPI energy component), affect policy (Federal Register EOs), and vary hugely by state. Key advantage: granular energy data by fuel, sector, and state.",
  reference: {
  sedsMsnCodes: sedsMsnCodes as Record<string, string>,
  routes: routes.map(r => ({ path: r.path, description: r.description, frequency: r.frequency })),
  docs: {
    "API Docs": "https://www.eia.gov/opendata/commands.php",
    "API Browser": "https://www.eia.gov/opendata/browser/",
    "Registration": "https://www.eia.gov/opendata/register.php",
  },
},
} satisfies ModuleMeta;
