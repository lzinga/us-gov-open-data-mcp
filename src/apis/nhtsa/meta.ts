/**
 * nhtsa module metadata.
 */

import type { ModuleMeta } from "../../shared/types.js";

export default {
  name: "nhtsa",
  displayName: "NHTSA",
  category: "Safety",
  description:
    "National Highway Traffic Safety Administration — vehicle recalls (1949–present), consumer complaints, " +
    "5-star safety ratings (NCAP), VIN decoding, product browsing, and car seat inspection station finder. " +
    "No API key required.",
  workflow:
    "nhtsa_models to discover models for a make → nhtsa_recalls for recalls → " +
    "nhtsa_recall_detail for campaign details → nhtsa_complaints for consumer complaints → " +
    "nhtsa_complaint_detail for ODI detail → nhtsa_safety_ratings + nhtsa_safety_rating_detail for crash test ratings → " +
    "nhtsa_decode_vin for VIN lookup → nhtsa_car_seat_stations for inspection locations",
  tips:
    "Use common make names: 'honda', 'toyota', 'ford', 'chevrolet', 'tesla'. " +
    "Model names match official names: 'civic', 'camry', 'f-150', 'model 3'. " +
    "Recalls/complaints require make + model + modelYear (all three). " +
    "Use nhtsa_models with issue_type='r' to find models that have recalls before querying. " +
    "VINs are 17 characters. Campaign numbers look like '23V838000'.",
  domains: ["safety", "transportation"],
  crossRef: [
    { question: "vehicle safety", route: "nhtsa_recalls, nhtsa_recall_detail, nhtsa_complaints, nhtsa_complaint_detail, nhtsa_safety_ratings, nhtsa_safety_rating_detail, nhtsa_decode_vin, nhtsa_models, nhtsa_car_seat_stations" },
    { question: "transportation", route: "nhtsa_recalls, nhtsa_complaints (vehicle safety data for transport analysis)" },
  ],
  reference: {
    docs: {
      "NHTSA Datasets & APIs": "https://www.nhtsa.gov/nhtsa-datasets-and-apis",
      "Recalls API": "https://api.nhtsa.gov/recalls/recallsByVehicle?make=acura&model=rdx&modelYear=2012",
      "Complaints API": "https://api.nhtsa.gov/complaints/complaintsByVehicle?make=acura&model=rdx&modelYear=2012",
      "Safety Ratings API": "https://api.nhtsa.gov/SafetyRatings",
      "VIN Decode (vPIC)": "https://vpic.nhtsa.dot.gov/api/",
      "Car Seat Stations": "https://api.nhtsa.gov/CSSIStation/state/CA",
    },
  },
} satisfies ModuleMeta;
