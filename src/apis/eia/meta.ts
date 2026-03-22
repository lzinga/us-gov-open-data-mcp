/**
 * eia module metadata.
 */

import { sedsMsnCodes, routes } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "eia",
  displayName: "Energy Information Administration",
  category: "Economic",
  description: "Petroleum, electricity, natural gas prices; state energy profiles; total energy overview; international energy data; petroleum stocks & SPR",
  auth: { envVar: "EIA_API_KEY", signup: "https://www.eia.gov/opendata/register.php" },
  workflow: "Pick energy type (petroleum/electricity/gas/state/total/international/stocks) → query with optional filters",
  tips: "Energy prices drive inflation (BLS CPI energy component), affect policy (Federal Register EOs), and vary hugely by state. Key advantage: granular energy data by fuel, sector, and state.",
  domains: ["energy"],
  crossRef: [
    { question: "energy/climate", route: "eia_petroleum, eia_electricity, eia_natural_gas, eia_state_energy, eia_petroleum_stocks (US SPR and commercial stocks)" },
    { question: "agriculture", route: "eia_petroleum (fuel/transport cost for agriculture)" },
    { question: "transportation", route: "eia_petroleum (fuel prices)" },
    { question: "state-level", route: "eia_state_energy (state-level energy production, consumption, prices, and expenditures)" },
    { question: "economy", route: "eia_petroleum, eia_total_energy (energy prices as economic driver/inflation factor)" },
    { question: "international", route: "eia_international (country-level production, consumption, imports, exports, proved reserves by country)" },
  ],
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
