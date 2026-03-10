export interface FleetComparison {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  status: "completed" | "in-progress";
  fleetSize: number;
  evVehicle: string;
  iceVehicle: string;
  contractYears: number;
  currency: string;
  summary: {
    tcoSavingsPercent: number;
    tcoEvTotal: number;
    tcoIceTotal: number;
    co2ReductionKg: number;
    treesEquivalent: number;
    capex: number;
    monthlyElectricityCost: number;
    monthlySavingsVsIce: number;
    paybackYears: number;
    irr: number;
    npv: number;
  };
  tcoBreakdown: {
    ev: TcoBreakdownItem;
    ice: TcoBreakdownItem;
  };
  tcoStacked: TcoStackedData;
  yearlyTco: YearlyTcoData[];
  financialReturn: FinancialReturnPoint[];
  cashflow: CashflowPoint[];
  benchmarkContext?: {
    cityId: string;
    modelId: string;
    cityName: string;
    evDisplayName: string;
    annualKm: number;
  };
}

export interface TcoBreakdownItem {
  vehicleCost: number;
  energyCost: number;
  maintenance: number;
  insurance: number;
  infrastructure: number;
  residualValue: number;
  downtimeRisk?: number;
}

export interface YearlyTcoData {
  year: number;
  ev: number;
  ice: number;
  evCumulative: number;
  iceCumulative: number;
}

export interface FinancialReturnPoint {
  irr: number;
  price: number;
  npv: number;
  payback: number | null;
}

// Stacked TCO data: 5 categories for EV (no battery replacement, plus downtime)
export interface TcoStackedData {
  tcoEv: [number, number, number, number, number?]; // [purchasePrice, fuel, maintenance, residualValue, downtimeRisk]
  tcoIce: [number, number, number, number, number?];
  currencyCode: string;
}

export interface CashflowPoint {
  year: number;
  annualCost: number;
  cumulativeSavings: number;
  netCashflow: number;
}

// ─── MOCK DATA ───

export const mockComparisons: FleetComparison[] = [
  {
    id: "fleet-001",
    name: "Delhi Last-Mile Pilot",
    location: "Delhi NCR",
    createdAt: "2026-02-15",
    status: "completed",
    fleetSize: 25,
    evVehicle: "Tata Ace EV",
    iceVehicle: "Tata Ace Diesel",
    contractYears: 7,
    currency: "INR",
    summary: {
      tcoSavingsPercent: 36,
      tcoEvTotal: 2_325_000,
      tcoIceTotal: 3_635_000,
      co2ReductionKg: 118_000,
      treesEquivalent: 5_400,
      capex: 980_000,
      monthlyElectricityCost: 121_000,
      monthlySavingsVsIce: 15_600,
      paybackYears: 2.9,
      irr: 26.2,
      npv: 1_310_000,
    },
    tcoBreakdown: {
      ev: {
        vehicleCost: 750_000,
        energyCost: 235_000,
        maintenance: 95_000,
        insurance: 130_000,
        infrastructure: 85_000,
        residualValue: -50_000,
        downtimeRisk: 72_000, // Added based on spec: 2.4 * 2500 * 12
      },
      ice: {
        vehicleCost: 550_000,
        energyCost: 520_000,
        maintenance: 280_000,
        insurance: 148_000,
        infrastructure: 0,
        residualValue: -80_000,
        downtimeRisk: 72_000,
      },
    },
    tcoStacked: {
      tcoEv: [0.1285, 0.0447, 0.0204, -0.0085, 0.0123],
      tcoIce: [0.0943, 0.0990, 0.0601, -0.0137, 0.0123],
      currencyCode: "INR",
    },
    cashflow: [
      { year: 1, annualCost: -620_000, cumulativeSavings: -620_000, netCashflow: -620_000 },
      { year: 2, annualCost: 355_000, cumulativeSavings: -265_000, netCashflow: 355_000 },
      { year: 3, annualCost: 368_000, cumulativeSavings: 103_000, netCashflow: 368_000 },
      { year: 4, annualCost: 381_000, cumulativeSavings: 484_000, netCashflow: 381_000 },
      { year: 5, annualCost: 402_000, cumulativeSavings: 886_000, netCashflow: 402_000 },
      { year: 6, annualCost: 411_000, cumulativeSavings: 1_297_000, netCashflow: 411_000 },
      { year: 7, annualCost: 423_000, cumulativeSavings: 1_720_000, netCashflow: 423_000 },
    ],
    yearlyTco: [
      { year: 1, ev: 325_000, ice: 525_000, evCumulative: 325_000, iceCumulative: 525_000 },
      { year: 2, ev: 318_000, ice: 515_000, evCumulative: 643_000, iceCumulative: 1_040_000 },
      { year: 3, ev: 326_000, ice: 520_000, evCumulative: 969_000, iceCumulative: 1_560_000 },
      { year: 4, ev: 330_000, ice: 518_000, evCumulative: 1_299_000, iceCumulative: 2_078_000 },
      { year: 5, ev: 337_000, ice: 520_000, evCumulative: 1_636_000, iceCumulative: 2_598_000 },
      { year: 6, ev: 341_000, ice: 516_000, evCumulative: 1_977_000, iceCumulative: 3_114_000 },
      { year: 7, ev: 348_000, ice: 521_000, evCumulative: 2_325_000, iceCumulative: 3_635_000 },
    ],
    financialReturn: [
      { irr: 14, price: 28_000, npv: 410_000, payback: 4.3 },
      { irr: 18, price: 30_000, npv: 740_000, payback: 3.8 },
      { irr: 22, price: 32_500, npv: 1_020_000, payback: 3.2 },
      { irr: 26.2, price: 35_000, npv: 1_310_000, payback: 2.9 },
      { irr: 29, price: 38_000, npv: 1_580_000, payback: 2.6 },
    ],
    benchmarkContext: {
      cityId: "delhi",
      modelId: "ace-ev",
      cityName: "Delhi NCR",
      evDisplayName: "Tata Ace EV",
      annualKm: 30000,
    },
  },
  {
    id: "fleet-002",
    name: "Bengaluru Shuttle Expansion",
    location: "Bengaluru",
    createdAt: "2026-02-28",
    status: "completed",
    fleetSize: 12,
    evVehicle: "Mahindra Zeo",
    iceVehicle: "Ashok Leyland Dost",
    contractYears: 5,
    currency: "INR",
    summary: {
      tcoSavingsPercent: 19,
      tcoEvTotal: 1_145_000,
      tcoIceTotal: 1_412_000,
      co2ReductionKg: 56_000,
      treesEquivalent: 2_550,
      capex: 610_000,
      monthlyElectricityCost: 52_000,
      monthlySavingsVsIce: 6_300,
      paybackYears: 4.1,
      irr: 19.3,
      npv: 267_000,
    },
    tcoBreakdown: {
      ev: {
        vehicleCost: 540_000,
        energyCost: 155_000,
        maintenance: 62_000,
        insurance: 98_000,
        infrastructure: 55_000,
        residualValue: -20_000,
      },
      ice: {
        vehicleCost: 420_000,
        energyCost: 335_000,
        maintenance: 180_000,
        insurance: 110_000,
        infrastructure: 0,
        residualValue: -60_000,
      },
    },
    tcoStacked: {
      tcoEv: [0.1500, 0.0430, 0.0172, -0.0056],
      tcoIce: [0.1167, 0.0931, 0.0500, -0.0167],
      currencyCode: "INR",
    },
    cashflow: [
      { year: 1, annualCost: -250_000, cumulativeSavings: -250_000, netCashflow: -250_000 },
      { year: 2, annualCost: 82_000, cumulativeSavings: -168_000, netCashflow: 82_000 },
      { year: 3, annualCost: 88_000, cumulativeSavings: -80_000, netCashflow: 88_000 },
      { year: 4, annualCost: 101_000, cumulativeSavings: 21_000, netCashflow: 101_000 },
      { year: 5, annualCost: 126_000, cumulativeSavings: 147_000, netCashflow: 126_000 },
    ],
    yearlyTco: [
      { year: 1, ev: 235_000, ice: 302_000, evCumulative: 235_000, iceCumulative: 302_000 },
      { year: 2, ev: 221_000, ice: 276_000, evCumulative: 456_000, iceCumulative: 578_000 },
      { year: 3, ev: 225_000, ice: 279_000, evCumulative: 681_000, iceCumulative: 857_000 },
      { year: 4, ev: 229_000, ice: 276_000, evCumulative: 910_000, iceCumulative: 1_133_000 },
      { year: 5, ev: 235_000, ice: 279_000, evCumulative: 1_145_000, iceCumulative: 1_412_000 },
    ],
    financialReturn: [
      { irr: 11, price: 36_000, npv: 90_000, payback: 5.4 },
      { irr: 15, price: 40_000, npv: 165_000, payback: 4.8 },
      { irr: 19.3, price: 44_000, npv: 267_000, payback: 4.1 },
      { irr: 23, price: 47_000, npv: 334_000, payback: 3.7 },
    ],
    benchmarkContext: {
      cityId: "bangalore",
      modelId: "mahindra-zeo",
      cityName: "Bengaluru",
      evDisplayName: "Mahindra Zeo",
      annualKm: 28000,
    },
  },
  {
    id: "fleet-003",
    name: "Mumbai Logistics Hub",
    location: "Mumbai",
    createdAt: "2026-03-01",
    status: "in-progress",
    fleetSize: 40,
    evVehicle: "Euler HiLoad EV",
    iceVehicle: "Piaggio Ape Xtra",
    contractYears: 8,
    currency: "INR",
    summary: {
      tcoSavingsPercent: 24,
      tcoEvTotal: 3_420_000,
      tcoIceTotal: 4_470_000,
      co2ReductionKg: 228_000,
      treesEquivalent: 10_350,
      capex: 1_960_000,
      monthlyElectricityCost: 186_000,
      monthlySavingsVsIce: 10_900,
      paybackYears: 4.6,
      irr: 21.8,
      npv: 1_050_000,
    },
    tcoBreakdown: {
      ev: {
        vehicleCost: 1_400_000,
        energyCost: 380_000,
        maintenance: 140_000,
        insurance: 220_000,
        infrastructure: 160_000,
        residualValue: -200_000,
      },
      ice: {
        vehicleCost: 960_000,
        energyCost: 940_000,
        maintenance: 560_000,
        insurance: 256_000,
        infrastructure: 0,
        residualValue: -100_000,
      },
    },
    tcoStacked: {
      tcoEv: [0.1458, 0.0396, 0.0146, -0.0208],
      tcoIce: [0.1000, 0.0979, 0.0583, -0.0104],
      currencyCode: "INR",
    },
    cashflow: [
      { year: 1, annualCost: -860_000, cumulativeSavings: -860_000, netCashflow: -860_000 },
      { year: 2, annualCost: 210_000, cumulativeSavings: -650_000, netCashflow: 210_000 },
      { year: 3, annualCost: 228_000, cumulativeSavings: -422_000, netCashflow: 228_000 },
      { year: 4, annualCost: 246_000, cumulativeSavings: -176_000, netCashflow: 246_000 },
      { year: 5, annualCost: 262_000, cumulativeSavings: 86_000, netCashflow: 262_000 },
      { year: 6, annualCost: 285_000, cumulativeSavings: 371_000, netCashflow: 285_000 },
      { year: 7, annualCost: 312_000, cumulativeSavings: 683_000, netCashflow: 312_000 },
      { year: 8, annualCost: 367_000, cumulativeSavings: 1_050_000, netCashflow: 367_000 },
    ],
    yearlyTco: [
      { year: 1, ev: 438_000, ice: 572_000, evCumulative: 438_000, iceCumulative: 572_000 },
      { year: 2, ev: 402_000, ice: 551_000, evCumulative: 840_000, iceCumulative: 1_123_000 },
      { year: 3, ev: 408_000, ice: 554_000, evCumulative: 1_248_000, iceCumulative: 1_677_000 },
      { year: 4, ev: 416_000, ice: 556_000, evCumulative: 1_664_000, iceCumulative: 2_233_000 },
      { year: 5, ev: 423_000, ice: 557_000, evCumulative: 2_087_000, iceCumulative: 2_790_000 },
      { year: 6, ev: 429_000, ice: 558_000, evCumulative: 2_516_000, iceCumulative: 3_348_000 },
      { year: 7, ev: 444_000, ice: 560_000, evCumulative: 2_960_000, iceCumulative: 3_908_000 },
      { year: 8, ev: 460_000, ice: 562_000, evCumulative: 3_420_000, iceCumulative: 4_470_000 },
    ],
    financialReturn: [
      { irr: 13, price: 24_000, npv: 280_000, payback: 6.0 },
      { irr: 17, price: 27_000, npv: 520_000, payback: 5.3 },
      { irr: 21.8, price: 31_000, npv: 1_050_000, payback: 4.6 },
      { irr: 24, price: 34_000, npv: 1_220_000, payback: 4.2 },
      { irr: 27, price: 37_000, npv: 1_460_000, payback: 3.8 },
    ],
    benchmarkContext: {
      cityId: "mumbai",
      modelId: "euler-hiload",
      cityName: "Mumbai",
      evDisplayName: "Euler HiLoad EV",
      annualKm: 32000,
    },
  },
];

export function getComparisonById(id: string): FleetComparison | undefined {
  return mockComparisons.find((c) => c.id === id);
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

// ── API Benchmarks (mock — replace with /v1/benchmarks API) ──────────
export interface BenchmarkResponse {
  model_id: string;
  city_id: string;
  vehicle_days: number;
  kwh_per_km: { median: number; p25: number; p75: number } | null;
  hub_charging_pct: number | null;
  hub_rate: number | null;
  public_rate: number | null;
  charger_vehicle_ratio: number | null;
  downtime_events_per_vehicle_month: number | null;
  daily_revenue_at_risk: number | null;
  last_updated: string;
}

export async function fetchBenchmarks(modelId: string, cityId: string): Promise<BenchmarkResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Real mock data matching the Phase 1 Spec for Ace EV in Delhi
  if (modelId === "ace-ev" && cityId.toLowerCase().includes("delhi")) {
    return {
      model_id: modelId,
      city_id: cityId,
      vehicle_days: 2400,
      kwh_per_km: { median: 0.165, p25: 0.148, p75: 0.182 },
      hub_charging_pct: 0.42,
      hub_rate: 8.5,
      public_rate: 17.2,
      charger_vehicle_ratio: 0.4,
      downtime_events_per_vehicle_month: 2.4,
      daily_revenue_at_risk: 2500,
      last_updated: "2026-03-01",
    };
  }

  // Partial validation example for Bengaluru + Mahindra Zeo
  if (modelId === "mahindra-zeo" && cityId.toLowerCase().includes("bangalore")) {
    return {
      model_id: modelId,
      city_id: cityId,
      vehicle_days: 640,
      kwh_per_km: { median: 0.152, p25: 0.145, p75: 0.168 },
      hub_charging_pct: null,
      hub_rate: 7.5,
      public_rate: 16,
      charger_vehicle_ratio: null,
      downtime_events_per_vehicle_month: 1.6,
      daily_revenue_at_risk: null,
      last_updated: "2026-02-20",
    };
  }

  // Fallback / null state for unknown cars
  return {
    model_id: modelId,
    city_id: cityId,
    vehicle_days: 0,
    kwh_per_km: null,
    hub_charging_pct: null,
    hub_rate: null,
    public_rate: null,
    charger_vehicle_ratio: null,
    downtime_events_per_vehicle_month: null,
    daily_revenue_at_risk: null,
    last_updated: new Date().toISOString().split("T")[0],
  };
}

// ── EV Vehicle Catalog (fetched from /v1/ev via /api/ev-catalog) ─────
export interface EvCatalogItem {
  id: number;
  name: string;
  avg_cost: number;
  max_range: number;
  battery_capacity: number;
  effective_power_ac: number;
  effective_power_dc: number;
  make: string | null;
  model: string | null;
  year: number | null;
  currency_code: string;
  description: string;
  maintenance: number | null;
}

// ── Charger Catalog (mock — replace with /v1/charger_db API) ─────────
export interface ChargerCatalogItem {
  id: string;
  name: string;
  price: number;
  capacity: number;
  type: "AC" | "DC";
  vendor: string;
  vendorColor: string;
}

export const mockChargerCatalog: ChargerCatalogItem[] = [
  { id: "ergl-cupcake", name: "ergLocale Cupcake", price: 365, capacity: 3.3, type: "AC", vendor: "ergLocale", vendorColor: "#f97417" },
  { id: "ergl-donut", name: "ergLocale Donut", price: 550, capacity: 7.4, type: "AC", vendor: "ergLocale", vendorColor: "#f97417" },
  { id: "abb-terra-ac", name: "ABB Terra AC", price: 1200, capacity: 22, type: "AC", vendor: "ABB", vendorColor: "#e3000f" },
  { id: "delta-ac-mini", name: "Delta AC Mini Plus", price: 900, capacity: 7.4, type: "AC", vendor: "Delta", vendorColor: "#0072bc" },
  { id: "abb-terra-dc", name: "ABB Terra DC", price: 18000, capacity: 60, type: "DC", vendor: "ABB", vendorColor: "#e3000f" },
  { id: "delta-dc-wallbox", name: "Delta DC Wallbox", price: 12500, capacity: 25, type: "DC", vendor: "Delta", vendorColor: "#0072bc" },
];
