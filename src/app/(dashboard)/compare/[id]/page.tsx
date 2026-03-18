import Link from "next/link";
import { notFound } from "next/navigation";

import EarningsSimulator from "@/components/calculator/EarningsSimulator";
import { fetchReportDetails } from "@/lib/comparisons";
import { formatCurrencyValue } from "@/lib/currency";
import { getVehicleUseCaseProfile } from "@/lib/vehicle-use-cases";

import resultStyles from "../../new/results.module.css";

type ScenarioCost = {
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

export default async function CompareDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const backendDetails = await fetchReportDetails(resolvedParams.id).catch(() => null);

  const input = backendDetails?.json.input;
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
  const currencyCode = input.currency || "USD";

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

  const scenarios: ScenarioCost[] = [
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
  ].map((scenario) => ({ ...scenario, rsKm: scenario.total / annualKm }));

  const [iceScenario, publicScenario, onsiteScenario] = scenarios;
  const savingsPct = Math.round(
    ((iceScenario.total - onsiteScenario.total) / iceScenario.total) * 100
  );
  if (savingsPct > 0) {
    onsiteScenario.tag = `${savingsPct}% lower`;
  }

  const maxRsKm = Math.max(...scenarios.map((scenario) => scenario.rsKm));
  const annualFleetSavingsVsIce = (iceScenario.total - onsiteScenario.total) * fleetSize;
  const annualFleetSavingsVsPublic =
    (publicScenario.total - onsiteScenario.total) * fleetSize;

  const evDisplayName = ev.name;
  const locationName = input.locationName;
  const vehicleProfile = getVehicleUseCaseProfile(evDisplayName);
  const activeUseCase = vehicleProfile.defaultUseCase;

  return (
    <div className={resultStyles.pageShell}>
      <div className={resultStyles.resultsWrap}>
        <div className={resultStyles.backRow}>
          <Link href="/" className={resultStyles.backButton}>
            Back to dashboard
          </Link>
        </div>

        <header className={resultStyles.reportHeader}>
          <div className={resultStyles.reportEyebrow}>Fleet Transition Report</div>
          <h1 className={resultStyles.reportTitle}>{reportName}</h1>
          <p className={resultStyles.reportMeta}>
            {fleetSize} x {evDisplayName} | {locationName} | {input.iceConfig.name} comparison |
            {" "}Created {reportDate}
          </p>
        </header>

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

        <section className={resultStyles.savingsGrid}>
          <article className={resultStyles.savingsCard}>
            <div className={resultStyles.savingsLabel}>Annual savings vs ICE</div>
            <div
              className={`${resultStyles.savingsValue} ${resultStyles.savingsValuePositive}`}
            >
              {formatCurrencyValue(annualFleetSavingsVsIce, currencyCode)}
            </div>
            <div className={resultStyles.savingsMeta}>{fleetSize} vehicles</div>
          </article>
          <article className={resultStyles.savingsCard}>
            <div className={resultStyles.savingsLabel}>Savings vs EV (as-is)</div>
            <div
              className={`${resultStyles.savingsValue} ${resultStyles.savingsValueAccent}`}
            >
              {formatCurrencyValue(annualFleetSavingsVsPublic, currencyCode)}
            </div>
            <div className={resultStyles.savingsMeta}>optimized vs self-managed</div>
          </article>
        </section>

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
                  <th className={resultStyles.thRight} style={{ color: iceScenario.accent }}>
                    ICE
                  </th>
                  <th className={resultStyles.thRight} style={{ color: publicScenario.accent }}>
                    EV (as-is)
                  </th>
                  <th className={resultStyles.thRight} style={{ color: onsiteScenario.accent }}>
                    EV (optimized)
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Fuel / Energy",
                    values: [iceScenario.energy, publicScenario.energy, onsiteScenario.energy],
                  },
                  {
                    label: "Vehicle maintenance",
                    values: [
                      iceScenario.maintenance,
                      publicScenario.maintenance,
                      onsiteScenario.maintenance,
                    ],
                  },
                  {
                    label: "Vehicle capex (amortized)",
                    values: [iceScenario.capex, publicScenario.capex, onsiteScenario.capex],
                  },
                  {
                    label: "Charging infra (amortized)",
                    values: [null, null, onsiteScenario.infrastructure],
                  },
                  {
                    label: "Residual value (credit)",
                    values: [
                      -iceScenario.residual,
                      -publicScenario.residual,
                      -onsiteScenario.residual,
                    ],
                  },
                ].map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    {row.values.map((value, index) => (
                      <td
                        key={`${row.label}-${index}`}
                        className={resultStyles.tdRight}
                        style={{
                          color:
                            value === null
                              ? "var(--text-muted)"
                              : index === 2
                                ? onsiteScenario.accent
                                : undefined,
                        }}
                      >
                        {value === null
                          ? "-"
                          : value < 0
                            ? `(${formatCurrencyValue(Math.abs(value), currencyCode)})`
                            : formatCurrencyValue(value, currencyCode)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className={resultStyles.totalRow}>
                  <td>Total annual operating cost</td>
                  {[iceScenario, publicScenario, onsiteScenario].map((scenario) => (
                    <td
                      key={`${scenario.label}-total`}
                      className={resultStyles.tdRight}
                      style={{ color: scenario.accent }}
                    >
                      {formatCurrencyValue(scenario.total, currencyCode)}
                    </td>
                  ))}
                </tr>
                <tr className={resultStyles.totalRow}>
                  <td>{currencyCode} / km</td>
                  {[iceScenario, publicScenario, onsiteScenario].map((scenario) => (
                    <td
                      key={`${scenario.label}-rskm`}
                      className={resultStyles.tdRight}
                      style={{ color: scenario.accent }}
                    >
                      {formatCurrencyValue(scenario.rsKm, currencyCode, 2)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className={resultStyles.tableFooter}>
            EV (as-is) assumes self-managed charging. EV (optimized) uses fleet
            management defaults. Platform pricing discussed during consultation.
          </div>
        </section>

        <div className={resultStyles.confidenceBanner}>
          <span className={resultStyles.confidenceIcon}>OK</span>
          <div>
            <strong>Based on 4,200+ vehicle-days of real fleet data</strong>
            <span className={resultStyles.confidenceSub}> from ergOS deployments in India</span>
          </div>
        </div>

        <EarningsSimulator
          monthlyOpCost={onsiteScenario.total / 12}
          fleetSize={fleetSize}
          cityName={locationName}
          vehicleName={evDisplayName}
          useCase={activeUseCase}
          currencyCode={currencyCode}
        />

        <div className={resultStyles.ctaGroup}>
          <button className={resultStyles.ctaPrimary}>Talk to Our Team</button>
          <button className={resultStyles.ctaSecondary}>
            <span>Link</span> Share Comparison Link
          </button>
        </div>

        <footer className={resultStyles.reportFooter}>
          <span className={resultStyles.footerBrand}>
            erg<span className={resultStyles.footerAccent}>Locale</span>
          </span>
          <div className={resultStyles.footerSub}>
            Intelligence for EV Fleets and Energy | hello@ergLocale.com
          </div>
        </footer>
      </div>
    </div>
  );
}
