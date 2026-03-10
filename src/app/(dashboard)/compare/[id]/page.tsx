import Link from "next/link";
import { notFound } from "next/navigation";
import EarningsSimulator from "@/components/calculator/EarningsSimulator";
import { fetchReportDetails } from "@/lib/comparisons";
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

function formatCurrency(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatRsPerKm(value: number) {
  return `₹${value.toFixed(2)}`;
}

export default async function CompareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const backendDetails = await fetchReportDetails(resolvedParams.id).catch(() => null);

  const input = backendDetails?.json.input;
  if (!input) {
    notFound();
  }

  const reportName = backendDetails?.report.name ?? input.comparisonName;
  const reportDate = new Date(backendDetails?.report.created ?? Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // ── Pull everything from the user's saved input ──
  const ev = input.evVehicles[0];
  const fleetSize = input.evVehicles.reduce((t, v) => t + v.count, 0);
  const annualKm = input.annualDrive;
  const contractYears = input.contractYears;
  const loc = input.location;

  // EV calculations — from the actual vehicle the user selected
  const efficiency = ev.batteryCapacity / ev.range; // kWh/km
  const onsiteRate = loc.electricityPrice; // user's configured electricity price
  const publicRate = onsiteRate * 2; // public charging ~2× commercial rate
  const evCapex = ev.price / contractYears;
  const evResidual = (ev.price * (ev.resalePercent / 100)) / contractYears;
  const evMaintenance = ev.maintenanceCost > 0 ? ev.maintenanceCost : annualKm * 0.52;
  const evPublicEnergy = annualKm * efficiency * publicRate;
  const evOnsiteEnergy = annualKm * efficiency * onsiteRate;

  // Charger infra (smart ratio: 1 charger per 2.5 vehicles)
  const chargerRatio = 0.4;
  const chargerUnitCost = 120_000 + 30_000;
  const chargerInfraPerVehicle =
    (Math.ceil(fleetSize * chargerRatio) * chargerUnitCost) / fleetSize / contractYears;

  // ICE calculations — from the user's configured ICE vehicle
  const fuelPrice =
    input.iceConfig.fuelType === "diesel" ? loc.fuelCostDiesel : loc.fuelCostPetrol;
  const iceFuel = (annualKm / input.iceConfig.mileage) * fuelPrice;
  const iceCapex = input.iceConfig.cost / contractYears;
  const iceResidual = (input.iceConfig.cost * (input.iceConfig.depreciationPercent / 100)) / contractYears;
  const iceMaintenance = input.iceConfig.cost * (input.iceConfig.maintenancePercent / 100);

  const scenarios: ScenarioCost[] = [
    {
      label: `ICE Fleet (${input.iceConfig.name})`,
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
      label: "EV + Public Charging",
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
      label: "EV + On-site Charging",
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

  // Add savings tag to on-site scenario
  const [iceScenario, publicScenario, onsiteScenario] = scenarios;
  const savingsPct = Math.round(
    ((iceScenario.total - onsiteScenario.total) / iceScenario.total) * 100
  );
  if (savingsPct > 0) {
    onsiteScenario.tag = `${savingsPct}% lower`;
  }

  const maxRsKm = Math.max(...scenarios.map((s) => s.rsKm));
  const annualFleetSavingsVsIce = (iceScenario.total - onsiteScenario.total) * fleetSize;
  const annualFleetSavingsVsPublic = (publicScenario.total - onsiteScenario.total) * fleetSize;

  const evDisplayName = ev.name;
  const locationName = input.locationName;

  return (
    <div className={resultStyles.pageShell}>
      <div className={resultStyles.resultsWrap}>
        <div className={resultStyles.backRow}>
          <Link href="/" className={resultStyles.backButton}>
            ← Back to dashboard
          </Link>
        </div>

        <header className={resultStyles.reportHeader}>
          <div className={resultStyles.reportEyebrow}>Fleet Transition Report</div>
          <h1 className={resultStyles.reportTitle}>{reportName}</h1>
          <p className={resultStyles.reportMeta}>
            {fleetSize} × {evDisplayName} · {locationName} · {input.iceConfig.name} comparison · Created {reportDate}
          </p>
        </header>

        <section className={resultStyles.resultCard}>
          <div className={resultStyles.resultCardHeader}>
            Cost per kilometer
          </div>
          <div className={resultStyles.barsWrap}>
            {scenarios.map((scenario) => (
              <div key={scenario.label} className={resultStyles.barRow}>
                <div className={resultStyles.barMeta}>
                  <span className={resultStyles.barLabel}>{scenario.label}</span>
                  <div className={resultStyles.barValueWrap}>
                    {scenario.tag ? <span className={resultStyles.savingsTag}>{scenario.tag}</span> : null}
                    <span className={resultStyles.barValue} style={{ color: scenario.accent }}>{formatRsPerKm(scenario.rsKm)}</span>
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
            <div className={`${resultStyles.savingsValue} ${resultStyles.savingsValuePositive}`}>
              {formatCurrency(annualFleetSavingsVsIce)}
            </div>
            <div className={resultStyles.savingsMeta}>{fleetSize} vehicles</div>
          </article>
          <article className={resultStyles.savingsCard}>
            <div className={resultStyles.savingsLabel}>Savings vs public charging</div>
            <div className={`${resultStyles.savingsValue} ${resultStyles.savingsValueAccent}`}>
              {formatCurrency(annualFleetSavingsVsPublic)}
            </div>
            <div className={resultStyles.savingsMeta}>with on-site setup</div>
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
                  <th className={resultStyles.thRight} style={{ color: iceScenario.accent }}>ICE</th>
                  <th className={resultStyles.thRight} style={{ color: publicScenario.accent }}>EV + Public</th>
                  <th className={resultStyles.thRight} style={{ color: onsiteScenario.accent }}>EV + On-site</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Fuel / Energy", values: [iceScenario.energy, publicScenario.energy, onsiteScenario.energy] },
                  { label: "Vehicle maintenance", values: [iceScenario.maintenance, publicScenario.maintenance, onsiteScenario.maintenance] },
                  { label: "Vehicle capex (amortized)", values: [iceScenario.capex, publicScenario.capex, onsiteScenario.capex] },
                  { label: "Charging infra (amortized)", values: [null, null, onsiteScenario.infrastructure] },
                  { label: "Residual value (credit)", values: [-iceScenario.residual, -publicScenario.residual, -onsiteScenario.residual] },
                ].map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    {row.values.map((value, index) => (
                      <td
                        key={`${row.label}-${index}`}
                        className={resultStyles.tdRight}
                        style={{ color: value === null ? "var(--text-muted)" : index === 2 ? onsiteScenario.accent : undefined }}
                      >
                        {value === null ? "—" : value < 0 ? `(${formatCurrency(Math.abs(value))})` : formatCurrency(value)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className={resultStyles.totalRow}>
                  <td>Total annual operating cost</td>
                  {[iceScenario, publicScenario, onsiteScenario].map((scenario) => (
                    <td key={`${scenario.label}-total`} className={resultStyles.tdRight} style={{ color: scenario.accent }}>
                      {formatCurrency(scenario.total)}
                    </td>
                  ))}
                </tr>
                <tr className={resultStyles.totalRow}>
                  <td>₹ / km</td>
                  {[iceScenario, publicScenario, onsiteScenario].map((scenario) => (
                    <td key={`${scenario.label}-rskm`} className={resultStyles.tdRight} style={{ color: scenario.accent }}>
                      {formatRsPerKm(scenario.rsKm)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className={resultStyles.tableFooter}>
            On-site charging TCO shows infrastructure and energy costs only. Fleet management platform pricing is excluded from this report.
          </div>
        </section>

        <EarningsSimulator
          monthlyOpCost={onsiteScenario.total / 12}
          fleetSize={fleetSize}
          cityName={locationName}
        />
      </div>
    </div>
  );
}