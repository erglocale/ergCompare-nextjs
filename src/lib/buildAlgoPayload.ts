/**
 * buildAlgoPayload.ts
 *
 * Transforms the new wizard's ComparisonFormPayload into the legacy
 * backend algo payload shape expected by POST /v1/fleets/algo.
 *
 * See: docs/new frontend/backend_owned_comparison_report_implementation_plan.md
 */

import type { ComparisonFormPayload } from "@/lib/comparisons";

// ----- Currency record shape from /v1/currency -----

export interface CurrencyRecord {
  id: string;        // e.g. "INR"
  name: string;      // e.g. "Indian Rupee"
  value: number;     // exchange rate relative to USD (1 USD = value)
  date: string | null;
  provider: string | null;
}

// ----- Legacy algo payload types -----

interface LegacyEvRow {
  Name: string;
  Number: number;
  Price: number;
  Capacity: number;
  Range: number;
  Charge_Cycle_Per_day: number; // NOTE: algo recomputes sessions_per_day from Annual_Drive / (365 × Capacity)
  Battery_Cost: number;
  Repair_Cost: number;
  Required_Number_of_Battery_Replacement_Per_10_Year: number;
  Maintainance_Cost: number;
  Resale: number;
  Incentive: number;
  autoCalculateChargeCycle: boolean;
  route: unknown[];
  Battery_Life: number;
}

interface LegacyChargerRow {
  Name: string;
  Power_Capacity_In_Kw: number;
  Price_per_Charger: number;
  Instllation_cost: number;
  Insurance: number;
  Maintainace_Per_year_per_Charger_Percenatge: number;
  Number: number;
  Is_DC: boolean;
  efficiency: number;
}

interface LegacyCustomMarket {
  Annual_Drive: number;
  EV_Lifespan: number;
  Electricity_Price_Per_Kwh: number;
  Fixed_Electricity_Monthly_Retal_Cost: number;
  EV_Fleet_Growth_Yearly: number;
  Charger_Host_Commission: number;
  Other_Electrical_Cost: number;
  Land_Lease_Cost: number;
  Charger_Location_Screening_Cost: number;
  Charger_Maintainance_Cost: number;
  Saas_Cost: number;
  road_tax: number;
  Incentive: number;
  Resale_rate: number;
}

interface LegacyCustomTraditionalVehicle {
  Cost?: number;
  Mileage?: number;
  Fuel_type?: string;
  Maintenance?: number;
  Resale_Rate?: number;
  Fuel_cost?: number;
  Incentive?: number;
}

interface LegacyCustomConfig {
  Cost_range: { Start_Price: number; End_Price: number };
  Delta: number;
  UnitFlag: string;
  Model: string;
}

export interface LegacyFleetAlgoPayload {
  location: string;
  custom_ev_dict: LegacyEvRow[];
  custom_charger_dict: LegacyChargerRow[];
  custom_config: LegacyCustomConfig;
  custom_market: LegacyCustomMarket;
  custom_traditional_vehicle: LegacyCustomTraditionalVehicle;
  operator_mode: string;
  currency: CurrencyRecord;
}

// ----- Temporary charger defaults (USD base) -----
// These are deliberate temporary defaults. They should be replaced by
// backend-owned charger defaults or a wizard charger selection step.

const CHARGER_DEFAULTS_USD = {
  name: "Default AC Charger",
  powerKw: 3.3,
  pricePerCharger: 365,
  installationCost: 100,
  insurance: 0,
  maintenancePercent: 1,
  isDC: false,
  efficiency: 100,
  fleetRatio: 0.4, // chargers = ceil(fleetSize * ratio)
};

// SaaS cost in USD base
const SAAS_COST_USD = 5;

// ----- Builder -----

export function buildAlgoPayload(
  input: ComparisonFormPayload,
  currency: CurrencyRecord
): LegacyFleetAlgoPayload {
  const rate = currency.value ?? 1; // USD to target currency

  // --- 1.1 Map ALL EV vehicles ---
  const custom_ev_dict: LegacyEvRow[] = input.evVehicles.map((ev) => ({
    Name: ev.name,
    Number: ev.count,
    Price: ev.price,
    Capacity: ev.batteryCapacity,
    Range: ev.range,
    // NOTE: algo ignores this field. It recomputes sessions_per_day as
    // Annual_Drive / (365 × Capacity). Included for schema compliance only.
    Charge_Cycle_Per_day: ev.chargeCyclesPerDay ?? 1,
    Battery_Cost: 0,
    Repair_Cost: 0,
    Required_Number_of_Battery_Replacement_Per_10_Year: 0,
    Maintainance_Cost: ev.maintenanceCost ?? 0,
    Resale: ev.resalePercent ?? 10,
    Incentive: 0,
    autoCalculateChargeCycle: false,
    route: [],
    Battery_Life: 8,
  }));

  // --- 1.2 Charger defaults (USD-base, converted) ---
  const totalFleetSize = input.evVehicles.reduce((sum, ev) => sum + ev.count, 0);
  const chargerCount = Math.max(1, Math.ceil(totalFleetSize * CHARGER_DEFAULTS_USD.fleetRatio));

  const custom_charger_dict: LegacyChargerRow[] = [
    {
      Name: CHARGER_DEFAULTS_USD.name,
      Power_Capacity_In_Kw: CHARGER_DEFAULTS_USD.powerKw,
      Price_per_Charger: CHARGER_DEFAULTS_USD.pricePerCharger * rate,
      Instllation_cost: CHARGER_DEFAULTS_USD.installationCost * rate,
      Insurance: CHARGER_DEFAULTS_USD.insurance,
      Maintainace_Per_year_per_Charger_Percenatge: CHARGER_DEFAULTS_USD.maintenancePercent,
      Number: chargerCount,
      Is_DC: CHARGER_DEFAULTS_USD.isDC,
      efficiency: CHARGER_DEFAULTS_USD.efficiency,
    },
  ];

  // --- 1.3 custom_market ---
  const custom_market: LegacyCustomMarket = {
    Annual_Drive: input.annualDrive,
    EV_Lifespan: input.contractYears,
    Electricity_Price_Per_Kwh: input.location.electricityPrice,
    Fixed_Electricity_Monthly_Retal_Cost: input.location.fixedMonthlyElectricity ?? 0,
    EV_Fleet_Growth_Yearly: 0,
    Charger_Host_Commission: 0,
    Other_Electrical_Cost: 0,
    Land_Lease_Cost: 0,
    Charger_Location_Screening_Cost: 0,
    Charger_Maintainance_Cost: 0,
    Saas_Cost: SAAS_COST_USD * rate,
    road_tax: 0,
    Incentive: 0,
    Resale_rate: 0,
    // NOTE: discount_rate is NOT sent here. The legacy algo resolves it
    // internally via get_discount_rate_from_country(). Submitted value
    // has no effect on backend output.
  };

  // --- 1.4 custom_traditional_vehicle (conditional on includeIce) ---
  let custom_traditional_vehicle: LegacyCustomTraditionalVehicle = {};

  if (input.includeIce) {
    const fuelCost =
      input.iceConfig.fuelType === "diesel"
        ? input.location.fuelCostDiesel
        : input.location.fuelCostPetrol;

    custom_traditional_vehicle = {
      Cost: input.iceConfig.cost,
      Mileage: input.iceConfig.mileage,
      Fuel_type: input.iceConfig.fuelType,
      Maintenance: input.iceConfig.maintenancePercent,
      Resale_Rate: input.iceConfig.depreciationPercent,
      Fuel_cost: fuelCost,
      Incentive: 0,
    };
  }

  // --- 1.5 custom_config ---
  const custom_config: LegacyCustomConfig = {
    Cost_range: { Start_Price: 0, End_Price: 0.1 },
    Delta: 0.1,
    // UnitFlag must reflect the selected currency, not hardcoded to $/kWh
    UnitFlag: `${currency.id}/kWh`,
    Model: "price",
  };

  // --- 1.6 Top-level fields ---
  const location = `${input.mapCoords.latitude},${input.mapCoords.longitude}`;

  return {
    location,
    custom_ev_dict,
    custom_charger_dict,
    custom_config,
    custom_market,
    custom_traditional_vehicle,
    operator_mode: "fleet_operator",
    currency,
  };
}
