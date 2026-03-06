/**
 * nhtsa module metadata.
 */

import { type Complaint } from "./sdk.js";
import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "nhtsa",
  displayName: "NHTSA",
  category: "Safety",
  description:
    "National Highway Traffic Safety Administration — vehicle recalls, consumer complaints, VIN decoding, vehicle specifications. No API key required.",
  workflow:
    "Use nhtsa_recalls to search for recalls by make/model/year → nhtsa_complaints for consumer complaints → nhtsa_decode_vin to decode a specific VIN → nhtsa_models to browse available models for a make.",
  tips:
    "Use common make names like 'honda', 'toyota', 'ford', 'chevrolet', 'tesla'. Model names should match official names: 'civic', 'camry', 'f-150', 'model 3'. VINs are 17 characters.",
} satisfies ModuleMeta;
