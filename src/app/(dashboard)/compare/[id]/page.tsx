import Link from "next/link";
import { notFound } from "next/navigation";

import EarningsSimulator from "@/components/calculator/EarningsSimulator";
import {
  fetchReportDetails,
  getCanonicalComparisonOutput,
  getRawComparisonInput,
  type ComparisonFormPayload,
} from "@/lib/comparisons";
import { formatCurrencyValue } from "@/lib/currency";
import { parseAlgoOutput, type ComparisonOutput } from "@/lib/parseAlgoOutput";
import { getVehicleUseCaseProfile } from "@/lib/vehicle-use-cases";

import resultStyles from "../../new/results.module.css";

// ----- Legacy client-side fallback -----
// Used ONLY when json.output is null (old reports created before backend integration).
// No new reports should hit this path.

type LegacyScenarioCost = {
  label: string;
  accent: string;
  tag?: string;
  energy: number;
  maintenance: number;
  capex: number;
  infrastructure: number | null;
  residual: number;
  total: number;
  rsKm: number;
};

function computeLegacyScenarios(input: ComparisonFormPayload) {
  if (!input) return null;

  const ev = input.evVehicles[0];
  const fleetSize = input.evVehicles.reduce((total, vehicle) => total + vehicle.count, 0);
  const annualKm = input.annualDrive;
  const contractYears = input.contractYears;
  const loc = input.location;

  const efficiency = ev.batteryCapacity / ev.range;
  const onsiteRate = loc.electricityPrice;
  const publicRate = onsiteRate * 2;
  const evCapex = ev.price / contractYears;
  const evResidual = (ev.price * (ev.resalePercent / 100)) / contractYears;
  const evMaintenance = ev.maintenanceCost > 0 ? ev.maintenanceCost : annualKm * 0.52;
  const evPublicEnergy = annualKm * efficiency * publicRate;
  const evOnsiteEnergy = annualKm * efficiency * onsiteRate;

  const chargerRatio = 0.4;
  const chargerUnitCost = 120_000 + 30_000;
  const chargerInfraPerVehicle =
    (Math.ceil(fleetSize * chargerRatio) * chargerUnitCost) / fleetSize / contractYears;

  const fuelPrice =
    input.iceConfig.fuelType === "diesel" ? loc.fuelCostDiesel : loc.fuelCostPetrol;
  const iceFuel = (annualKm / input.iceConfig.mileage) * fuelPrice;
  const iceCapex = input.iceConfig.cost / contractYears;
  const iceResidual =
    (input.iceConfig.cost * (input.iceConfig.depreciationPercent / 100)) / contractYears;
  const iceMaintenance =
    input.iceConfig.cost * (input.iceConfig.maintenancePercent / 100);

  const scenarios: LegacyScenarioCost[] = [
    {
      label: `ICE (${input.iceConfig.name})`,
      accent: "#D84C3F",
      energy: iceFuel,
      maintenance: iceMaintenance,
      capex: iceCapex,
      infrastructure: null,
      residual: iceResidual,
      total: iceFuel + iceMaintenance + iceCapex - iceResidual,
      rsKm: 0,
    },
    {
      label: "EV (as-is)",
      accent: "#E39A23",
      energy: evPublicEnergy,
      maintenance: evMaintenance,
      capex: evCapex,
      infrastructure: null,
      residual: evResidual,
      total: evPublicEnergy + evMaintenance + evCapex - evResidual,
      rsKm: 0,
    },
    {
      label: "EV (optimized)",
      accent: "#3FA66B",
      energy: evOnsiteEnergy,
      maintenance: evMaintenance,
      capex: evCapex,
      infrastructure: chargerInfraPerVehicle,
      residual: evResidual,
      total: evOnsiteEnergy + evMaintenance + evCapex + chargerInfraPerVehicle - evResidual,
      rsKm: 0,
    },
  ].map((s) => ({ ...s, rsKm: s.total / annualKm }));

  return { scenarios, fleetSize, annualKm, evDisplayName: ev.name };
}

// ----- Page component -----

export default async function CompareDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const backendDetails = await fetchReportDetails(resolvedParams.id).catch(() => null);

  const input = backendDetails ? getRawComparisonInput(backendDetails) : null;
  if (!input) {
    notFound();
  }

  const reportName = backendDetails?.report.name ?? input.comparisonName;
  const reportDate = backendDetails?.report.created
    ? new Date(backendDetails.report.created).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Unknown date";
  // Primary path: canonical backend output.
  const canonicalOutput = backendDetails
    ? getCanonicalComparisonOutput(backendDetails)
    : null;

  const currencyCode = canonicalOutput?.summary.currency || input.currency || "USD";
  const fleetSize =
    canonicalOutput?.summary.fleet_size ??
    input.evVehicles.reduce((total, vehicle) => total + vehicle.count, 0);
  const annualKm = canonicalOutput?.summary.annual_drive_km ?? input.annualDrive;
  const contractYears = canonicalOutput?.summary.contract_years ?? input.contractYears;
  const evDisplayName = input.evVehicles[0]?.name ?? "EV";
  const locationName = input.locationName;
  const vehicleProfile = getVehicleUseCaseProfile(evDisplayName);
  const activeUseCase = vehicleProfile.defaultUseCase;

  // Fallback for legacy reports that still have raw algo output shape.
  const legacyParsedOutput: ComparisonOutput | null =
    !canonicalOutput && backendDetails?.json.output
    ? parseAlgoOutput(
        backendDetails.json.output,
        annualKm,
        contractYears,
        fleetSize,
        input.includeIce
      )
    : null;

  const parsed: ComparisonOutput | null = canonicalOutput
    ? {
        summary: {
          annualDriveKm: canonicalOutput.summary.annual_drive_km,
          contractYears: canonicalOutput.summary.contract_years,
          fleetSize: canonicalOutput.summary.fleet_size,
        },
        ice: canonicalOutput.ice
          ? {
              perKmCostFinalYear: canonicalOutput.ice.per_km_cost_final_year,
              annualCostPerVehicle: canonicalOutput.ice.annual_cost_per_vehicle,
              breakup: {
                capital: canonicalOutput.ice.breakup.capital,
                energy: canonicalOutput.ice.breakup.energy,
                maintenance: canonicalOutput.ice.breakup.maintenance,
                infrastructure: canonicalOutput.ice.breakup.infrastructure,
                batteryReplacement: canonicalOutput.ice.breakup.battery_replacement,
                resale: canonicalOutput.ice.breakup.resale,
                total: canonicalOutput.ice.breakup.total,
              },
            }
          : null,
        ev: {
          perKmCostFinalYear: canonicalOutput.ev.per_km_cost_final_year,
          annualCostPerVehicle: canonicalOutput.ev.annual_cost_per_vehicle,
          breakup: {
            capital: canonicalOutput.ev.breakup.capital,
            energy: canonicalOutput.ev.breakup.energy,
            maintenance: canonicalOutput.ev.breakup.maintenance,
            infrastructure: canonicalOutput.ev.breakup.infrastructure,
            batteryReplacement: canonicalOutput.ev.breakup.battery_replacement,
            resale: canonicalOutput.ev.breakup.resale,
            total: canonicalOutput.ev.breakup.total,
          },
        },
        evWithUtility: {
          perKmCostFinalYear: canonicalOutput.ev_with_utility.per_km_cost_final_year,
          annualCostPerVehicle: canonicalOutput.ev_with_utility.annual_cost_per_vehicle,
          breakup: {
            capital: canonicalOutput.ev_with_utility.breakup.capital,
            energy: canonicalOutput.ev_with_utility.breakup.energy,
            maintenance: canonicalOutput.ev_with_utility.breakup.maintenance,
            infrastructure: canonicalOutput.ev_with_utility.breakup.infrastructure,
            batteryReplacement: canonicalOutput.ev_with_utility.breakup.battery_replacement,
            resale: canonicalOutput.ev_with_utility.breakup.resale,
            total: canonicalOutput.ev_with_utility.breakup.total,
          },
        },
        emissions: {
          co2Ice: canonicalOutput.emissions.co2_ice,
          co2Ev: canonicalOutput.emissions.co2_ev,
          treesSaved: canonicalOutput.emissions.trees_saved,
        },
        finance: {
          irr: canonicalOutput.finance.irr,
          npv: canonicalOutput.finance.npv,
          paybackYearIndex: canonicalOutput.finance.payback_year,
          cashflow: canonicalOutput.finance.cashflow,
        },
        charts: {
          years: canonicalOutput.charts.years,
          icePerKmOverYears: canonicalOutput.charts.ice_per_km_over_years,
          evPerKmOverYears: canonicalOutput.charts.ev_per_km_over_years,
          evWithUtilityPerKmOverYears: canonicalOutput.charts.ev_with_utility_per_km_over_years,
        },
        yearlyElectricityCost: canonicalOutput.yearly_electricity_cost,
        chargeFeasibility: canonicalOutput.charge_feasibility,
      }
    : legacyParsedOutput;

  // --- Build rendering data ---
  type ScenarioBar = {
    label: string;
    accent: string;
    tag?: string;
    rsKm: number;
    annual: number;
    breakdownRows: { label: string; values: (number | null)[] }[];
  };

  let scenarios: ScenarioBar[];
  let legacyScenarioDetails: LegacyScenarioCost[] = [];
  let annualFleetSavingsVsIce: number;
  let annualFleetSavingsVsPublic: number;
  let monthlyOpCost: number;

  if (parsed) {
    // ----- BACKEND OUTPUT PATH -----
    const iceBar: ScenarioBar | null = parsed.ice
      ? {
          label: `ICE (${input.iceConfig.name})`,
          accent: "#D84C3F",
          rsKm: parsed.ice.perKmCostFinalYear,
          annual: parsed.ice.annualCostPerVehicle,
          breakdownRows: [],
        }
      : null;

    const evBar: ScenarioBar = {
      label: "EV (as-is)",
      accent: "#E39A23",
      rsKm: parsed.ev.perKmCostFinalYear,
      annual: parsed.ev.annualCostPerVehicle,
      breakdownRows: [],
    };

    const evUtilBar: ScenarioBar = {
      label: "EV (optimized)",
      accent: "#3FA66B",
      rsKm: parsed.evWithUtility.perKmCostFinalYear,
      annual: parsed.evWithUtility.annualCostPerVehicle,
      breakdownRows: [],
    };

    scenarios = [iceBar, evBar, evUtilBar].filter((s): s is ScenarioBar => s !== null);

    // Savings calculations
    const iceAnnual = parsed.ice?.annualCostPerVehicle ?? 0;
    const evUtilAnnual = parsed.evWithUtility.annualCostPerVehicle;
    const evAnnual = parsed.ev.annualCostPerVehicle;

    annualFleetSavingsVsIce = canonicalOutput?.annual_savings.vs_ice ?? (iceAnnual - evUtilAnnual) * fleetSize;
    annualFleetSavingsVsPublic = canonicalOutput?.annual_savings.vs_ev_as_is ?? (evAnnual - evUtilAnnual) * fleetSize;
    monthlyOpCost = evUtilAnnual / 12;

    // Tag the best scenario
    if (parsed.ice && iceAnnual > 0) {
      const savingsPct = Math.round(((iceAnnual - evUtilAnnual) / iceAnnual) * 100);
      if (savingsPct > 0) {
        evUtilBar.tag = `${savingsPct}% lower`;
      }
    }

    // Build TCO breakdown rows
    const iceBreakup = parsed.ice?.breakup;
    const evBreakup = parsed.ev.breakup;
    const evUtilBreakup = parsed.evWithUtility.breakup;

    const breakdownDefs = [
      { label: "Fuel / Energy", key: "energy" as const },
      { label: "Vehicle maintenance", key: "maintenance" as const },
      { label: "Vehicle capex", key: "capital" as const },
      { label: "Charging infra", key: "infrastructure" as const },
      { label: "Residual value (credit)", key: "resale" as const },
    ];

    for (const s of scenarios) {
      s.breakdownRows = breakdownDefs.map((def) => {
        const iceVal = iceBreakup ? iceBreakup[def.key] : null;
        const evVal = evBreakup[def.key];
        const evUtilVal = evUtilBreakup[def.key];

        if (s === iceBar) return { label: def.label, values: [iceVal, evVal, evUtilVal] };
        return { label: def.label, values: [iceVal, evVal, evUtilVal] };
      });
    }
  } else {
    // ----- LEGACY FALLBACK PATH (json.output = null) -----
    const legacy = computeLegacyScenarios(input);
    if (!legacy) notFound();

    const [iceS, publicS, onsiteS] = legacy.scenarios;

    const savingsPct = Math.round(((iceS.total - onsiteS.total) / iceS.total) * 100);
    if (savingsPct > 0) onsiteS.tag = `${savingsPct}% lower`;

    scenarios = legacy.scenarios.map((s) => ({
      label: s.label,
      accent: s.accent,
      tag: s.tag,
      rsKm: s.rsKm,
      annual: s.total,
      breakdownRows: [],
    }));
    legacyScenarioDetails = legacy.scenarios;

    annualFleetSavingsVsIce = (iceS.total - onsiteS.total) * legacy.fleetSize;
    annualFleetSavingsVsPublic = (publicS.total - onsiteS.total) * legacy.fleetSize;
    monthlyOpCost = onsiteS.total / 12;
  }

  const maxRsKm = Math.max(...scenarios.map((s) => s.rsKm));

  // TCO table data (only shown for backend output path)
  const showTcoTable = parsed !== null;
  const tcoTableScenarios = parsed
    ? [
        parsed.ice
          ? { label: "ICE", accent: "#D84C3F", breakup: parsed.ice.breakup, annual: parsed.ice.annualCostPerVehicle, rsKm: parsed.ice.perKmCostFinalYear }
          : null,
        { label: "EV (as-is)", accent: "#E39A23", breakup: parsed.ev.breakup, annual: parsed.ev.annualCostPerVehicle, rsKm: parsed.ev.perKmCostFinalYear },
        { label: "EV (optimized)", accent: "#3FA66B", breakup: parsed.evWithUtility.breakup, annual: parsed.evWithUtility.annualCostPerVehicle, rsKm: parsed.evWithUtility.perKmCostFinalYear },
      ].filter((s): s is NonNullable<typeof s> => s !== null)
    : [];
  const legacyTcoTableScenarios = !parsed
    ? legacyScenarioDetails.map((scenario) => ({
        label: scenario.label,
        accent: scenario.accent,
        annual: scenario.total,
        rsKm: scenario.rsKm,
        rows: [
          scenario.energy,
          scenario.maintenance,
          scenario.capex,
          scenario.infrastructure,
          -scenario.residual,
        ] as Array<number | null>,
      }))
    : [];

  return (
    <div className={resultStyles.pageShell}>
      <div className={resultStyles.resultsWrap}>
        <div className={resultStyles.backRow}>
          <Link href="/" className={resultStyles.backButton}>
            {"<- Back to dashboard"}
          </Link>
        </div>

        <header className={resultStyles.reportHeader}>
          <div className={resultStyles.reportEyebrow}>Fleet Transition Report</div>
          <h1 className={resultStyles.reportTitle}>{reportName}</h1>
          <p className={resultStyles.reportMeta}>
            {fleetSize} x {evDisplayName} | {locationName} | {input.iceConfig.name} comparison |{" "}
            Created {reportDate}
          </p>
        </header>

        {/* Cost per kilometer bars */}
        <section className={resultStyles.resultCard}>
          <div className={resultStyles.resultCardHeader}>Cost per kilometer</div>
          <div className={resultStyles.barsWrap}>
            {scenarios.map((scenario) => (
              <div key={scenario.label} className={resultStyles.barRow}>
                <div className={resultStyles.barMeta}>
                  <span className={resultStyles.barLabel}>{scenario.label}</span>
                  <div className={resultStyles.barValueWrap}>
                    {scenario.tag ? (
                      <span className={resultStyles.savingsTag}>{scenario.tag}</span>
                    ) : null}
                    <span className={resultStyles.barValue} style={{ color: scenario.accent }}>
                      {formatCurrencyValue(scenario.rsKm, currencyCode, 2)}
                    </span>
                    <span className={resultStyles.barUnit}>/km</span>
                  </div>
                </div>
                <div className={resultStyles.barTrack}>
                  <div
                    className={resultStyles.barFill}
                    style={{
                      width: `${Math.max((scenario.rsKm / maxRsKm) * 100, 10)}%`,
                      background: `linear-gradient(90deg, ${scenario.accent}, ${scenario.accent}CC)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Savings cards */}
        <section className={resultStyles.savingsGrid}>
          {parsed?.ice && (
            <article className={resultStyles.savingsCard}>
              <div className={resultStyles.savingsLabel}>Annual savings vs ICE</div>
              <div
                className={`${resultStyles.savingsValue} ${resultStyles.savingsValuePositive}`}
              >
                {formatCurrencyValue(annualFleetSavingsVsIce, currencyCode)}
              </div>
              <div className={resultStyles.savingsMeta}>{fleetSize} vehicles</div>
            </article>
          )}
          {!parsed && (
            <article className={resultStyles.savingsCard}>
              <div className={resultStyles.savingsLabel}>Annual savings vs ICE</div>
              <div
                className={`${resultStyles.savingsValue} ${resultStyles.savingsValuePositive}`}
              >
                {formatCurrencyValue(annualFleetSavingsVsIce, currencyCode)}
              </div>
              <div className={resultStyles.savingsMeta}>{fleetSize} vehicles</div>
            </article>
          )}
          <article className={resultStyles.savingsCard}>
            <div className={resultStyles.savingsLabel}>Savings vs EV (as-is)</div>
            <div
              className={`${resultStyles.savingsValue} ${resultStyles.savingsValueAccent}`}
            >
              {formatCurrencyValue(annualFleetSavingsVsPublic, currencyCode)}
            </div>
            <div className={resultStyles.savingsMeta}>optimized vs public charging</div>
          </article>
        </section>

        {/* TCO breakdown table — backend output only */}
        {showTcoTable && (
          <section className={resultStyles.resultCard}>
            <div className={resultStyles.resultCardHeader}>
              TCO breakdown
              <span className={resultStyles.resultCardSub}>Annual, per vehicle</span>
            </div>
            <div className={resultStyles.tableWrap}>
              <table className={resultStyles.tcoTable}>
                <thead>
                  <tr>
                    <th>Component</th>
                    {tcoTableScenarios.map((s) => (
                      <th key={s.label} className={resultStyles.thRight} style={{ color: s.accent }}>
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Fuel / Energy", key: "energy" as const },
                    { label: "Vehicle maintenance", key: "maintenance" as const },
                    { label: "Vehicle capex", key: "capital" as const },
                    { label: "Charging infra", key: "infrastructure" as const },
                    { label: "Residual value (credit)", key: "resale" as const },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {tcoTableScenarios.map((s) => {
                        const val = s.breakup[row.key];
                        const isResale = row.key === "resale";
                        return (
                          <td
                            key={`${row.label}-${s.label}`}
                            className={resultStyles.tdRight}
                          >
                            {val === 0
                              ? "-"
                              : isResale
                                ? `(${formatCurrencyValue(Math.abs(val), currencyCode)})`
                                : formatCurrencyValue(val, currencyCode)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className={resultStyles.totalRow}>
                    <td>Total annual operating cost</td>
                    {tcoTableScenarios.map((s) => (
                      <td
                        key={`${s.label}-total`}
                        className={resultStyles.tdRight}
                        style={{ color: s.accent }}
                      >
                        {formatCurrencyValue(s.annual, currencyCode)}
                      </td>
                    ))}
                  </tr>
                  <tr className={resultStyles.totalRow}>
                    <td>{currencyCode} / km</td>
                    {tcoTableScenarios.map((s) => (
                      <td
                        key={`${s.label}-annual`}
                        className={resultStyles.tdRight}
                        style={{ color: s.accent }}
                      >
                        {formatCurrencyValue(s.rsKm, currencyCode, 2)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={resultStyles.tableFooter}>
              EV (as-is) uses public charging only and excludes charger capex. EV
              (optimized) uses the regional electricity rate and includes charger
              infrastructure.
            </div>
          </section>
        )}

        {/* Legacy TCO table fallback */}
        {!showTcoTable && (
          <section className={resultStyles.resultCard}>
            <div className={resultStyles.resultCardHeader}>
              TCO breakdown
              <span className={resultStyles.resultCardSub}>Annual, per vehicle</span>
            </div>
            <div className={resultStyles.tableWrap}>
              <table className={resultStyles.tcoTable}>
                <thead>
                  <tr>
                    <th>Component</th>
                    {legacyTcoTableScenarios.map((s) => (
                      <th key={s.label} className={resultStyles.thRight} style={{ color: s.accent }}>
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Fuel / Energy", index: 0 },
                    { label: "Vehicle maintenance", index: 1 },
                    { label: "Vehicle capex (amortized)", index: 2 },
                    { label: "Charging infra (amortized)", index: 3 },
                    { label: "Residual value (credit)", index: 4 },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {legacyTcoTableScenarios.map((s) => {
                        const value = s.rows[row.index];
                        return (
                          <td key={`${row.label}-${s.label}`} className={resultStyles.tdRight}>
                            {value === null
                              ? "-"
                              : value < 0
                                ? `(${formatCurrencyValue(Math.abs(value), currencyCode)})`
                                : formatCurrencyValue(value, currencyCode)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className={resultStyles.totalRow}>
                    <td>Total annual operating cost</td>
                    {legacyTcoTableScenarios.map((s) => (
                      <td
                        key={`${s.label}-annual`}
                        className={resultStyles.tdRight}
                        style={{ color: s.accent }}
                      >
                        {formatCurrencyValue(s.annual, currencyCode)}
                      </td>
                    ))}
                  </tr>
                  <tr className={resultStyles.totalRow}>
                    <td>{currencyCode} / km</td>
                    {legacyTcoTableScenarios.map((s) => (
                      <td
                        key={`${s.label}-rskm`}
                        className={resultStyles.tdRight}
                        style={{ color: s.accent }}
                      >
                        {formatCurrencyValue(s.rsKm, currencyCode, 2)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={resultStyles.tableFooter}>
              This report was created before backend calculation was enabled.
              Numbers shown are estimated from page-level assumptions.
            </div>
          </section>
        )}

        {/* Emissions — backend output only */}
        {parsed && (
          <section className={resultStyles.resultCard}>
            <div className={resultStyles.resultCardHeader}>Environmental Impact</div>
            <div className={resultStyles.savingsGrid}>
              <article className={resultStyles.savingsCard}>
                <div className={resultStyles.savingsLabel}>CO₂ saved per year</div>
                <div className={`${resultStyles.savingsValue} ${resultStyles.savingsValuePositive}`}>
                  {Math.round(parsed.emissions.co2Ice - parsed.emissions.co2Ev).toLocaleString()} kg
                </div>
              </article>
              <article className={resultStyles.savingsCard}>
                <div className={resultStyles.savingsLabel}>Equivalent trees planted</div>
                <div className={`${resultStyles.savingsValue} ${resultStyles.savingsValueAccent}`}>
                  {Math.round(parsed.emissions.treesSaved).toLocaleString()}
                </div>
              </article>
            </div>
          </section>
        )}

        <div className={resultStyles.confidenceBanner}>
          <span className={resultStyles.confidenceIcon}>v</span>
          <div>
            <strong>Based on 4,200+ vehicle-days of real fleet data</strong>
            <span className={resultStyles.confidenceSub}> from ergOS deployments in India</span>
          </div>
        </div>

        <section className={resultStyles.resultCard}>
          <EarningsSimulator
            monthlyOpCost={monthlyOpCost}
            fleetSize={fleetSize}
            cityName={locationName}
            vehicleName={evDisplayName}
            useCase={activeUseCase}
            currencyCode={currencyCode}
          />
        </section>

        <div className={resultStyles.ctaGroup}>
          <button className={resultStyles.ctaPrimary}>Talk to Our Team {"->"}</button>
          <button className={resultStyles.ctaSecondary}>
            <span>[link]</span> Share Comparison Link
          </button>
        </div>

        <footer className={resultStyles.reportFooter}>
          <img src="/brand/ergCompare.png" alt="ergCompare" className={resultStyles.footerLogo} />
          <div className={resultStyles.footerSub}>
            Intelligence for EV Fleets and Energy | hello@ergLocale.com
          </div>
        </footer>
      </div>
    </div>
  );
}
