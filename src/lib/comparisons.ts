import "server-only";

import { backendFetch } from "@/lib/backend";
import {
  isComparisonOutputContract,
  type ComparisonOutputContract,
} from "@/lib/comparison-output";

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
    modelId?: number | string;
    segment?: string;
    name: string;
    count: number;
    price: number;
    batteryCapacity: number;
    range: number;
    chargeCyclesPerDay: number;
    maintenanceCost: number;
    resalePercent: number;
    effectivePowerAc?: number;
    effectivePowerDc?: number;
    operatingTime?: [string, string];
  }>;
  iceConfig: {
    name: string;
    cost: number;
    mileage: number;
    fuelType: string;
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
    input?:
      | ComparisonFormPayload
      | {
          raw_user_input?: ComparisonFormPayload;
          normalized_input?: Record<string, unknown>;
        };
    output?: unknown;
    report_metadata?: Record<string, unknown>;
  };
};

export type DashboardComparison = {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  status: "completed" | "pending" | "in-progress";
  fleetSize: number;
  contractYears: number;
};

function isWrappedInput(
  input: BackendReportDetails["json"]["input"]
): input is {
  raw_user_input?: ComparisonFormPayload;
  normalized_input?: Record<string, unknown>;
} {
  return Boolean(
    input &&
      typeof input === "object" &&
      ("raw_user_input" in input || "normalized_input" in input)
  );
}

export function getRawComparisonInput(details: BackendReportDetails): ComparisonFormPayload | null {
  const input = details.json.input;
  if (!input) {
    return null;
  }

  if (isWrappedInput(input)) {
    return input.raw_user_input ?? null;
  }

  return input;
}

export function getNormalizedComparisonInput(details: BackendReportDetails): Record<string, unknown> | null {
  const input = details.json.input;
  if (!isWrappedInput(input)) {
    return null;
  }

  return input.normalized_input ?? null;
}

export function getCanonicalComparisonOutput(
  details: BackendReportDetails
): ComparisonOutputContract | null {
  const output = details.json.output;
  if (!isComparisonOutputContract(output)) {
    return null;
  }

  return output;
}

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
  const input = getRawComparisonInput(details);
  const fleetSize = input?.evVehicles?.reduce((total, vehicle) => total + vehicle.count, 0) ?? 0;

  const canonicalOutput = getCanonicalComparisonOutput(details);
  const output = details.json.output;
  const hasValidOutput = canonicalOutput !== null || (output !== null && output !== undefined);

  return {
    id: String(details.report.id),
    name: details.report.name,
    location: input?.locationName ?? "Custom location",
    createdAt: details.report.created ?? new Date().toISOString(),
    status: hasValidOutput ? "completed" : "pending",
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
  const [newResponse, legacyResponse] = await Promise.all([
    backendFetch("/v1/report?type=comparison_report"),
    backendFetch("/v1/report?type=comparison"),
  ]);

  if (newResponse.status === 401 || newResponse.status === 403) {
    return [];
  }
  if (!newResponse.ok) {
    throw new Error("Failed to load comparison reports");
  }
  if (!legacyResponse.ok && legacyResponse.status !== 401 && legacyResponse.status !== 403) {
    throw new Error("Failed to load legacy reports");
  }

  const newReports = (await newResponse.json()) as BackendReportMetadata[];
  const legacyReports = legacyResponse.ok
    ? ((await legacyResponse.json()) as BackendReportMetadata[])
    : [];

  const reports = [...newReports, ...legacyReports].reduce<BackendReportMetadata[]>((acc, report) => {
    if (!acc.some((existing) => existing.id === report.id)) {
      acc.push(report);
    }
    return acc;
  }, []);

  const details = await Promise.all(
    reports.map(async (report) => fetchReportDetails(String(report.id)))
  );

  return details
    .filter((detail): detail is BackendReportDetails => Boolean(detail))
    .map(buildDashboardComparison);
}