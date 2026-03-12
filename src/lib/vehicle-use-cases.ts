export type VehicleUseCaseId = "delivery" | "rental" | "logistics";

export interface VehicleUseCaseOption {
  id: VehicleUseCaseId;
  label: string;
  shortLabel: string;
  description: string;
  benchmarkTitle: string;
  benchmarkSubtitle: string;
}

export interface VehicleUseCaseProfile {
  vehicleSegment: "cargo" | "passenger" | "mixed";
  vehicleSegmentLabel: string;
  allowedUseCases: VehicleUseCaseId[];
  defaultUseCase: VehicleUseCaseId;
  rationale: string;
}

const USE_CASE_OPTIONS: Record<VehicleUseCaseId, VehicleUseCaseOption> = {
  delivery: {
    id: "delivery",
    label: "Last-Mile Delivery",
    shortLabel: "Delivery",
    description: "Fixed retainer plus variable waybill earnings for urban delivery fleets.",
    benchmarkTitle: "Market benchmark: ₹60K–80K per vehicle/month",
    benchmarkSubtitle: "Typical for e-commerce last-mile fleets using fixed retainers and variable waybills.",
  },
  rental: {
    id: "rental",
    label: "Corporate / Rental",
    shortLabel: "Rental",
    description: "Hour-based deployment model for passenger, shuttle, and rental programs.",
    benchmarkTitle: "Market benchmark: ₹45K–65K per vehicle/month",
    benchmarkSubtitle: "Typical for corporate mobility, staff transport, and rental deployment.",
  },
  logistics: {
    id: "logistics",
    label: "General Logistics",
    shortLabel: "Logistics",
    description: "Trip-based revenue model for intra-city cargo and general logistics rotations.",
    benchmarkTitle: "Market benchmark: ₹50K–75K per vehicle/month",
    benchmarkSubtitle: "Typical for short-haul cargo movement and general logistics operations.",
  },
};

const PASSENGER_KEYWORDS = [
  "suv",
  "sedan",
  "hatchback",
  "passenger",
  "taxi",
  "cab",
  "shuttle",
  "rental",
  "mg zs",
  "zs ev",
  "comet",
  "kona",
  "atto",
];

const CARGO_KEYWORDS = [
  "cargo",
  "truck",
  "pickup",
  "pick-up",
  "loader",
  "delivery",
  "mini truck",
  "3w",
  "ace",
  "hiload",
  "hi load",
  "zeo",
  "ape",
  "bolero",
];

function includesAnyKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function getVehicleUseCaseOption(useCase: VehicleUseCaseId) {
  return USE_CASE_OPTIONS[useCase];
}

export function getVehicleUseCaseProfile(vehicleName: string): VehicleUseCaseProfile {
  const normalizedName = vehicleName.trim().toLowerCase();

  if (includesAnyKeyword(normalizedName, CARGO_KEYWORDS)) {
    return {
      vehicleSegment: "cargo",
      vehicleSegmentLabel: "Cargo fleet",
      allowedUseCases: ["delivery", "logistics"],
      defaultUseCase: "delivery",
      rationale:
        "Cargo-oriented EVs are best framed around last-mile delivery and general logistics economics, not corporate rental utilization.",
    };
  }

  if (includesAnyKeyword(normalizedName, PASSENGER_KEYWORDS)) {
    return {
      vehicleSegment: "passenger",
      vehicleSegmentLabel: "Passenger fleet",
      allowedUseCases: ["rental"],
      defaultUseCase: "rental",
      rationale:
        "Passenger-oriented EVs are best positioned for corporate transport and rental-style utilization rather than cargo delivery benchmarks.",
    };
  }

  return {
    vehicleSegment: "mixed",
    vehicleSegmentLabel: "Mixed utility fleet",
    allowedUseCases: ["delivery", "rental", "logistics"],
    defaultUseCase: "delivery",
    rationale:
      "This vehicle does not map cleanly to one business model, so the report keeps multiple operating profiles available.",
  };
}