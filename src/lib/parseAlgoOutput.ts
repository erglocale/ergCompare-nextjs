/**
 * parseAlgoOutput.ts
 *
 * Transforms raw legacy backend algo output into a typed object that
 * matches the new compare page's rendering needs.
 *
 * IMPORTANT: The backend output arrays are indexed by pricing scenario
 * (costAnalysis_x). For fleet_operator mode with Cost_range [0, 0.1]
 * and Delta 0.1, there are 2 scenarios (index 0 and 1).
 *
 * The old frontend viewer used the LAST scenario index (length - 1)
 * and the LAST year within breakup matrices for fleet-operator display.
 * This adapter follows the same convention.
 *
 * See: fleets-frontend/src/Components/Projects/Reports/Report/Mode/
 *      ResultMode/FleetTemplate/index.jsx:385
 */

// ----- Raw backend algo output shape -----

export interface RawAlgoOutput {
  // Per-km cost arrays: [scenarioCount][yearCount]
  tco_ice: number[][];
  tco_ev: number[][];
  tco_ev_with_utility: number[][];
  tco_ev_zero_fuel: number[][];

  // TCO component breakup: [scenarioCount][yearCount][componentArray]
  tco_ice_breakup: number[][][];
  tco_ev_breakup: number[][][];
  tco_ev_with_utility_breakup: number[][][];
  tco_ev_zero_fuel_breakup: number[][][];

  // Individual EV TCO per vehicle type
  tco_ev_individual: number[][][];
  individual_tco_ev_zero_fuel: number[][][];
  individual_tco_ev_with_utility: number[][][];

  // Financial metrics arrays: [scenarioCount]
  irr: number;
  irr_array: number[];
  npv: number;
  npv_array: number[];
  sp: number;
  sp_array: number[];

  // Payback / cashflow: [scenarioCount][yearCount]
  pb: number[][];
  pb_array: number[][];
  cashflow_array: number[][];
  positive_payback_indexes: (number | null)[];

  // Cost analysis (pricing scenario series — NOT per-km bars)
  costAnalysis_x: number[];
  costAnalysis_y: number[];

  // Capex comparison across scenarios
  tco_ice_with_utility_last_capex: number[];
  tco_ev_with_utility_last_capex: number[];
  tco_ev_wrt_ice_capex: number[];

  // Time-series data
  years: number[];
  yearly_electricity_cost: number;

  // Emissions
  co2_emissions_ice: number;
  co2_emissions_ev: number;
  trees_saved: number;

  // Feasibility
  time_to_charge_feasibility: string;
  total_kwh_consumed: number;

  // File reference
  file_name: string;
}

// ----- Parsed output for the compare page -----

/**
 * TCO breakup component tuple.
 * The legacy algo returns breakup arrays as:
 * [ev_capital, ev_energy, ev_maintenance, ev_infrastructure, ev_battery_replacement, ev_resale]
 * for EV, and similar for ICE.
 */
export interface TcoBreakup {
  capital: number;
  energy: number;
  maintenance: number;
  infrastructure: number;
  batteryReplacement: number;
  resale: number;
  total: number;
}

export interface ComparisonOutput {
  // Summary metrics
  summary: {
    annualDriveKm: number;
    contractYears: number;
    fleetSize: number;
  };

  // ICE scenario (null if includeIce was false)
  ice: {
    perKmCostFinalYear: number;
    annualCostPerVehicle: number;
    breakup: TcoBreakup;
  } | null;

  // EV scenario (self-managed / zero-fuel / as-is)
  ev: {
    perKmCostFinalYear: number;
    annualCostPerVehicle: number;
    breakup: TcoBreakup;
  };

  // EV with utility/on-site charging
  evWithUtility: {
    perKmCostFinalYear: number;
    annualCostPerVehicle: number;
    breakup: TcoBreakup;
  };

  // Emissions
  emissions: {
    co2Ice: number;
    co2Ev: number;
    treesSaved: number;
  };

  // Financial
  finance: {
    irr: number;
    npv: number;
    paybackYearIndex: number | null;
    cashflow: number[];
  };

  // Chart data
  charts: {
    years: number[];
    icePerKmOverYears: number[];
    evPerKmOverYears: number[];
    evWithUtilityPerKmOverYears: number[];
  };

  // Meta
  yearlyElectricityCost: number;
  chargeFeasibility: string;
}

// ----- Helpers -----

function safeNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseBreakupArray(arr: number[] | undefined): TcoBreakup {
  if (!arr || !Array.isArray(arr)) {
    return { capital: 0, energy: 0, maintenance: 0, infrastructure: 0, batteryReplacement: 0, resale: 0, total: 0 };
  }
  const capital = safeNum(arr[0]);
  const energy = safeNum(arr[1]);
  const maintenance = safeNum(arr[2]);
  const infrastructure = safeNum(arr[3]);
  const batteryReplacement = safeNum(arr[4]);
  const resale = safeNum(arr[5]);
  const total = capital + energy + maintenance + infrastructure + batteryReplacement - resale;
  return { capital, energy, maintenance, infrastructure, batteryReplacement, resale, total };
}

/**
 * Determines the scenario index to use for display.
 *
 * The old frontend used the LAST scenario index (length - 1) for
 * fleet-operator mode. We follow the same convention, but validate
 * the index exists before accessing.
 */
function resolveScenarioIndex(output: RawAlgoOutput): number {
  const scenarioCount = output.costAnalysis_x?.length ?? 0;
  if (scenarioCount === 0) return 0;
  // Use last scenario — matches old frontend fleet-operator behavior
  return scenarioCount - 1;
}

// ----- Main parser -----

export function parseAlgoOutput(
  raw: unknown,
  annualDrive: number,
  contractYears: number,
  fleetSize: number,
  includeIce: boolean
): ComparisonOutput | null {
  if (!raw || typeof raw !== "object") return null;

  const output = raw as RawAlgoOutput;
  const si = resolveScenarioIndex(output);

  // Per-km cost arrays for chosen scenario
  const icePerKmOverYears = output.tco_ice?.[si] ?? [];
  const evPerKmOverYears = output.tco_ev?.[si] ?? [];
  const evWithUtilityPerKmOverYears = output.tco_ev_with_utility?.[si] ?? [];

  // Final year values (last element in per-km arrays)
  const icePerKmFinal = safeNum(icePerKmOverYears[icePerKmOverYears.length - 1]);
  const evPerKmFinal = safeNum(evPerKmOverYears[evPerKmOverYears.length - 1]);
  const evUtilPerKmFinal = safeNum(evWithUtilityPerKmOverYears[evWithUtilityPerKmOverYears.length - 1]);

  // Breakup arrays: [scenario][year][components] → use last scenario, last year
  const iceBreakupScenario = output.tco_ice_breakup?.[si];
  const iceBreakupFinalYear = iceBreakupScenario?.[iceBreakupScenario.length - 1];

  const evBreakupScenario = output.tco_ev_breakup?.[si];
  const evBreakupFinalYear = evBreakupScenario?.[evBreakupScenario.length - 1];

  const evUtilBreakupScenario = output.tco_ev_with_utility_breakup?.[si];
  const evUtilBreakupFinalYear = evUtilBreakupScenario?.[evUtilBreakupScenario.length - 1];

  // ICE scenario (null if excluded)
  const ice = includeIce
    ? {
        perKmCostFinalYear: icePerKmFinal,
        annualCostPerVehicle: icePerKmFinal * annualDrive,
        breakup: parseBreakupArray(iceBreakupFinalYear),
      }
    : null;

  return {
    summary: { annualDriveKm: annualDrive, contractYears, fleetSize },

    ice,

    ev: {
      perKmCostFinalYear: evPerKmFinal,
      annualCostPerVehicle: evPerKmFinal * annualDrive,
      breakup: parseBreakupArray(evBreakupFinalYear),
    },

    evWithUtility: {
      perKmCostFinalYear: evUtilPerKmFinal,
      annualCostPerVehicle: evUtilPerKmFinal * annualDrive,
      breakup: parseBreakupArray(evUtilBreakupFinalYear),
    },

    emissions: {
      co2Ice: safeNum(output.co2_emissions_ice),
      co2Ev: safeNum(output.co2_emissions_ev),
      treesSaved: safeNum(output.trees_saved),
    },

    finance: {
      irr: safeNum(output.irr),
      npv: safeNum(output.npv),
      paybackYearIndex: output.positive_payback_indexes?.[si] ?? null,
      cashflow: (output.cashflow_array?.[si] ?? []).map(safeNum),
    },

    charts: {
      years: output.years ?? [],
      icePerKmOverYears: icePerKmOverYears.map(safeNum),
      evPerKmOverYears: evPerKmOverYears.map(safeNum),
      evWithUtilityPerKmOverYears: evWithUtilityPerKmOverYears.map(safeNum),
    },

    yearlyElectricityCost: safeNum(output.yearly_electricity_cost),
    chargeFeasibility: output.time_to_charge_feasibility ?? "UNKNOWN",
  };
}
