import "server-only";

import { backendFetch } from "@/lib/backend";

export type ComparisonFormPayload = {
  comparisonName: string;
  mapCoords: {
    latitude: number;
    longitude: number;
  };
  locationName: string;
  includeIce: boolean;
  contractYears: number;
  annualDrive: number;
  currency: string;
  evVehicles: Array<{
    modelId?: number;
    name: string;
    count: number;
    price: number;
    batteryCapacity: number;
    range: number;
    chargeCyclesPerDay: number;
    maintenanceCost: number;
    resalePercent: number;
  }>;
  iceConfig: {
    name: string;
    cost: number;
    mileage: number;
    fuelType: "petrol" | "diesel";
    maintenancePercent: number;
    depreciationPercent: number;
  };
  location: {
    electricityPrice: number;
    fuelCostPetrol: number;
    fuelCostDiesel: number;
    discountRate: number;
    fixedMonthlyElectricity: number;
  };
};

export type BackendReportMetadata = {
  id: number;
  name: string;
  project: number;
  user: number;
  type?: string;
  created?: string;
  updated?: string;
};

export type BackendReportDetails = {
  report: BackendReportMetadata;
  json: {
    input?: ComparisonFormPayload;
    output?: unknown;
    report_metadata?: Record<string, unknown>;
  };
};

export type DashboardComparison = {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  status: "completed" | "in-progress";
  fleetSize: number;
  contractYears: number;
};

export function inferCityId(locationName: string) {
  const value = locationName.toLowerCase();
  if (value.includes("delhi")) {
    return "delhi";
  }
  if (value.includes("bengaluru") || value.includes("bangalore")) {
    return "bangalore";
  }
  if (value.includes("mumbai")) {
    return "mumbai";
  }
  return "delhi";
}

export function buildDashboardComparison(details: BackendReportDetails): DashboardComparison {
  const input = details.json.input;
  const fleetSize = input?.evVehicles?.reduce((total, vehicle) => total + vehicle.count, 0) ?? 0;

  return {
    id: String(details.report.id),
    name: details.report.name,
    location: input?.locationName ?? "Custom location",
    createdAt: details.report.created ?? new Date().toISOString(),
    status: "completed",
    fleetSize,
    contractYears: input?.contractYears ?? 0,
  };
}

export async function fetchReportDetails(id: string) {
  const response = await backendFetch(`/v1/report/${id}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load report ${id}`);
  }
  return (await response.json()) as BackendReportDetails;
}

export async function fetchDashboardComparisons() {
  const response = await backendFetch("/v1/report?type=comparison");
  if (response.status === 401 || response.status === 403) {
    return [];
  }
  if (!response.ok) {
    throw new Error("Failed to load reports");
  }

  const reports = (await response.json()) as BackendReportMetadata[];
  const details = await Promise.all(
    reports.map(async (report) => fetchReportDetails(String(report.id)))
  );

  return details
    .filter((detail): detail is BackendReportDetails => Boolean(detail))
    .map(buildDashboardComparison);
}