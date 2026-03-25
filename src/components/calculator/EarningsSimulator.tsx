"use client";

import { formatCurrencyValue } from "@/lib/currency";
import { getVehicleUseCaseOption, type VehicleUseCaseId } from "@/lib/vehicle-use-cases";

import styles from "./EarningsSimulator.module.css";

interface EarningsSimulatorProps {
  monthlyOpCost: number;
  fleetSize: number;
  cityName: string;
  vehicleName: string;
  useCase: VehicleUseCaseId;
  currencyCode?: string;
}

const EARNINGS_BY_USE_CASE: Record<
  VehicleUseCaseId,
  { perVehicleMonth: number; source: string }
> = {
  delivery: { perVehicleMonth: 65000, source: "e-commerce last-mile" },
  logistics: { perVehicleMonth: 55000, source: "regional logistics" },
  rental: { perVehicleMonth: 48000, source: "corporate fleet rental" },
};

const DOWNTIME = { ice: 21, evAsIs: 23, evOpt: 25 };

export default function EarningsSimulator({
  monthlyOpCost,
  fleetSize,
  cityName,
  vehicleName,
  useCase,
  currencyCode = "USD",
}: EarningsSimulatorProps) {
  const currentUseCase = getVehicleUseCaseOption(useCase);
  const earningData = EARNINGS_BY_USE_CASE[useCase];
  const optimizedPerVehicle = earningData.perVehicleMonth * (DOWNTIME.evOpt / 26);
  const optimizedFleetRevenue = optimizedPerVehicle * fleetSize;
  const marginPerVehicle = optimizedPerVehicle - monthlyOpCost;
  const fmt = (value: number) => formatCurrencyValue(value, currencyCode);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitleRow}>
            <div className={styles.headerTitle}>Estimated Fleet Earnings</div>
            <span className={styles.betaBadge}>Beta</span>
          </div>
          <div className={styles.headerSub}>
            <strong>{currentUseCase.label}</strong> - {earningData.source} for{" "}
            {vehicleName}
          </div>
        </div>
        <div className={styles.poweredBadge}>
          Powered by erg<strong>OS</strong>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.availabilityGrid}>
          {[
            { label: "ICE Fleet", days: DOWNTIME.ice, colorClass: styles.dangerText },
            { label: "EV (as-is)", days: DOWNTIME.evAsIs, colorClass: styles.accentText },
            { label: "EV (optimized)", days: DOWNTIME.evOpt, colorClass: styles.positive },
          ].map((item) => (
            <div key={item.label} className={styles.availabilityCard}>
              <div className={styles.availabilityLabel}>{item.label}</div>
              <div className={`${styles.availabilityValue} ${item.colorClass}`}>
                {item.days}
                <span className={styles.availabilityUnit}>/26 days</span>
              </div>
              <div className={styles.availabilityTrack}>
                <div
                  className={`${styles.availabilityFill} ${item.colorClass}`}
                  style={{ width: `${(item.days / 26) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.dashboard}>
          <div className={styles.dashboardHeader}>
            <div className={styles.dashboardLive}>
              <span className={styles.liveDot} />
              <span>Your Fleet on ergOS</span>
            </div>
            <span className={styles.dashboardMeta}>
              {fleetSize} vehicles - {cityName}
            </span>
          </div>

          <div className={styles.revenueGrid}>
            <div className={styles.revenueCard}>
              <div className={styles.revenueLabel}>Revenue / Vehicle / Month</div>
              <div className={styles.revenueValue}>{fmt(optimizedPerVehicle)}</div>
              <div className={styles.revenueSub}>{DOWNTIME.evOpt} earning days</div>
            </div>
            <div className={styles.revenueCardHighlight}>
              <div className={styles.revenueHighlightLabel}>Fleet Revenue / Month</div>
              <div className={styles.revenueHighlightValue}>{fmt(optimizedFleetRevenue)}</div>
              <div className={styles.revenueHighlightSub}>{fleetSize} vehicles</div>
            </div>
          </div>

          <div className={styles.marginSection}>
            <div className={styles.marginRow}>
              <span className={styles.marginLabel}>Vehicle operating cost</span>
              <span className={styles.marginCost}>- {fmt(monthlyOpCost)}</span>
            </div>
            <div className={styles.marginResult}>
              <span className={styles.marginResultLabel}>
                Margin per vehicle (before driver & overhead)
              </span>
              <span
                className={`${styles.marginResultValue} ${
                  marginPerVehicle > 0 ? styles.positive : styles.negative
                }`}
              >
                {fmt(marginPerVehicle)}
                <span className={styles.marginUnit}>/mo</span>
              </span>
            </div>
          </div>
        </div>

        <div className={styles.disclaimer}>
          Earnings based on {earningData.source} benchmarks. This section is still a
          placeholder and is not included in the backend-owned TCO totals. Actual
          revenue depends on contracts, routes, and utilization. ergOS provides fleet
          operations that logistics partners require for onboarding.
        </div>
      </div>
    </div>
  );
}
