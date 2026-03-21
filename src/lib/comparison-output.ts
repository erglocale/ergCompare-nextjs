export type CostPerKmEntry = {
  value: number;
  label: string;
};

export type TcoBreakup = {
  energy: number;
  maintenance: number;
  capital: number;
  infrastructure: number;
  battery_replacement: number;
  resale: number;
  total: number;
};

export type ScenarioResult = {
  per_km_cost_final_year: number;
  annual_cost_per_vehicle: number;
  breakup: TcoBreakup;
};

export type EmissionsResult = {
  co2_ice: number;
  co2_ev: number;
  trees_saved: number;
};

export type FinanceResult = {
  irr: number;
  npv: number;
  payback_year: number | null;
  cashflow: number[];
};

export type ChartsResult = {
  years: number[];
  ice_per_km_over_years: number[];
  ev_per_km_over_years: number[];
  ev_with_utility_per_km_over_years: number[];
};

export type AssumptionsResult = {
  energy_source: string;
  ice_source: string;
  legacy_algo: string;
};

export type SummaryResult = {
  fleet_size: number;
  annual_drive_km: number;
  contract_years: number;
  currency: string;
};

export type ComparisonOutputContract = {
  summary: SummaryResult;
  cost_per_km: {
    ice?: CostPerKmEntry;
    ev_as_is: CostPerKmEntry;
    ev_on_site: CostPerKmEntry;
  };
  tco_breakdown: {
    ice?: TcoBreakup;
    ev_as_is: TcoBreakup;
    ev_on_site: TcoBreakup;
  };
  ice: ScenarioResult | null;
  ev: ScenarioResult;
  ev_with_utility: ScenarioResult;
  annual_savings: {
    vs_ice?: number;
    vs_ev_as_is: number;
  };
  emissions: EmissionsResult;
  finance: FinanceResult;
  charts: ChartsResult;
  beta_sections?: {
    ev_optimized?: unknown;
    estimated_fleet_earnings?: unknown;
  };
  assumptions: AssumptionsResult;
  yearly_electricity_cost: number;
  charge_feasibility: string;
};

export function isComparisonOutputContract(value: unknown): value is ComparisonOutputContract {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ComparisonOutputContract>;
  return (
    typeof candidate.summary === "object" &&
    typeof candidate.cost_per_km === "object" &&
    typeof candidate.tco_breakdown === "object" &&
    typeof candidate.ev === "object" &&
    typeof candidate.ev_with_utility === "object" &&
    typeof candidate.annual_savings === "object"
  );
}
