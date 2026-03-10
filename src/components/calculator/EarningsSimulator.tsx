"use client";

import { useState } from "react";
import styles from "./EarningsSimulator.module.css";

interface EarningsSimulatorProps {
  monthlyOpCost: number;
  fleetSize: number;
  cityName: string;
}

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function Slider({
  value,
  onChange,
  min,
  max,
  step,
  label,
  display,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  display: string;
}) {
  return (
    <div className={styles.sliderWrap}>
      <div className={styles.sliderHeader}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderValue}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className={styles.slider}
      />
      <div className={styles.sliderRange}>
        <span>{min > 999 ? fmt(min) : min}</span>
        <span>{max > 999 ? fmt(max) : max}</span>
      </div>
    </div>
  );
}

export default function EarningsSimulator({
  monthlyOpCost,
  fleetSize,
  cityName,
}: EarningsSimulatorProps) {
  const [useCase, setUseCase] = useState("delivery");

  // Last-mile delivery
  const [fixedRetainer, setFixedRetainer] = useState(30000);
  const [waybillsMonth, setWaybillsMonth] = useState(625);
  const [ratePerWaybill, setRatePerWaybill] = useState(56);

  // Corporate / Rental
  const [hoursPerDay, setHoursPerDay] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(150);

  // General Logistics
  const [tripsPerDay, setTripsPerDay] = useState(8);
  const [tripRate, setTripRate] = useState(450);

  const calcEarnings = () => {
    if (useCase === "delivery") {
      const pv = fixedRetainer + waybillsMonth * ratePerWaybill;
      return { perVehicleMonth: pv, fleetMonth: pv * fleetSize };
    }
    if (useCase === "rental") {
      const pv = hoursPerDay * hourlyRate * 26;
      return { perVehicleMonth: pv, fleetMonth: pv * fleetSize };
    }
    const pv = tripsPerDay * tripRate * 26;
    return { perVehicleMonth: pv, fleetMonth: pv * fleetSize };
  };

  const earnings = calcEarnings();
  const marginPerVehicle = earnings.perVehicleMonth - monthlyOpCost;

  const useCases = [
    { id: "delivery", label: "Last-Mile Delivery" },
    { id: "rental", label: "Corporate / Rental" },
    { id: "logistics", label: "General Logistics" },
  ];

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>
            Estimate Your EV Fleet Earnings
          </div>
          <div className={styles.headerSub}>
            Adjust sliders to model revenue potential
          </div>
        </div>
        <div className={styles.poweredBadge}>
          Powered by erg<strong>OS</strong>
        </div>
      </div>

      <div className={styles.body}>
        {/* Use Case Selector */}
        <div className={styles.useCaseSection}>
          <div className={styles.sectionLabel}>Your Use Case</div>
          <div className={styles.useCaseGrid}>
            {useCases.map((uc) => (
              <button
                key={uc.id}
                onClick={() => setUseCase(uc.id)}
                className={`${styles.useCaseBtn} ${useCase === uc.id ? styles.useCaseBtnActive : ""}`}
              >
                {uc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Benchmark (delivery only) */}
        {useCase === "delivery" && (
          <div className={styles.benchmark}>
            <span className={styles.benchmarkIcon}>📊</span>
            <div>
              <div className={styles.benchmarkTitle}>
                Market benchmark: ₹60K–80K per vehicle/month
              </div>
              <div className={styles.benchmarkSub}>
                Typical for e-commerce last-mile (fixed retainer + variable
                waybills)
              </div>
            </div>
          </div>
        )}

        {/* Sliders */}
        {useCase === "delivery" && (
          <>
            <Slider
              value={fixedRetainer}
              onChange={setFixedRetainer}
              min={10000}
              max={50000}
              step={5000}
              label="Fixed Monthly Retainer"
              display={fmt(fixedRetainer)}
            />
            <Slider
              value={waybillsMonth}
              onChange={setWaybillsMonth}
              min={200}
              max={1200}
              step={25}
              label="Waybills per Month"
              display={waybillsMonth.toLocaleString("en-IN")}
            />
            <Slider
              value={ratePerWaybill}
              onChange={setRatePerWaybill}
              min={20}
              max={100}
              step={2}
              label="Rate per Waybill (₹)"
              display={`₹${ratePerWaybill}`}
            />
          </>
        )}
        {useCase === "rental" && (
          <>
            <Slider
              value={hoursPerDay}
              onChange={setHoursPerDay}
              min={4}
              max={16}
              step={1}
              label="Hours Deployed / Day"
              display={`${hoursPerDay} hrs`}
            />
            <Slider
              value={hourlyRate}
              onChange={setHourlyRate}
              min={80}
              max={350}
              step={10}
              label="Hourly Rate (₹)"
              display={`₹${hourlyRate}`}
            />
            <div className={styles.sliderNote}>
              Based on 26 working days/month
            </div>
          </>
        )}
        {useCase === "logistics" && (
          <>
            <Slider
              value={tripsPerDay}
              onChange={setTripsPerDay}
              min={2}
              max={20}
              step={1}
              label="Trips / Day"
              display={`${tripsPerDay} trips`}
            />
            <Slider
              value={tripRate}
              onChange={setTripRate}
              min={150}
              max={1500}
              step={50}
              label="Rate per Trip (₹)"
              display={`₹${tripRate}`}
            />
            <div className={styles.sliderNote}>
              Based on 26 working days/month
            </div>
          </>
        )}

        {/* Dark Dashboard */}
        <div className={styles.dashboard}>
          <div className={styles.dashboardHeader}>
            <div className={styles.dashboardLive}>
              <span className={styles.liveDot} />
              <span>Your Fleet on ergOS</span>
            </div>
            <span className={styles.dashboardMeta}>
              {fleetSize} vehicles · {cityName}
            </span>
          </div>

          {/* Delivery breakdown */}
          {useCase === "delivery" && (
            <div className={styles.breakdownGrid}>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>Fixed Retainer</div>
                <div className={styles.breakdownValue}>
                  {fmt(fixedRetainer)}
                  <span className={styles.breakdownUnit}>/mo</span>
                </div>
              </div>
              <div className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>
                  Variable ({waybillsMonth} × ₹{ratePerWaybill})
                </div>
                <div className={styles.breakdownValue}>
                  {fmt(waybillsMonth * ratePerWaybill)}
                  <span className={styles.breakdownUnit}>/mo</span>
                </div>
              </div>
            </div>
          )}

          {/* Revenue cards */}
          <div className={styles.revenueGrid}>
            <div className={styles.revenueCard}>
              <div className={styles.revenueLabel}>
                Revenue / Vehicle / Month
              </div>
              <div className={styles.revenueValue}>
                {fmt(earnings.perVehicleMonth)}
              </div>
            </div>
            <div className={styles.revenueCardHighlight}>
              <div className={styles.revenueHighlightLabel}>
                Fleet Revenue / Month
              </div>
              <div className={styles.revenueHighlightValue}>
                {fmt(earnings.fleetMonth)}
              </div>
              <div className={styles.revenueHighlightSub}>
                {fleetSize} vehicles
              </div>
            </div>
          </div>

          {/* Margin */}
          <div className={styles.marginSection}>
            <div className={styles.marginRow}>
              <span className={styles.marginLabel}>
                Vehicle operating cost (energy + maintenance + capex)
              </span>
              <span className={styles.marginCost}>– {fmt(monthlyOpCost)}</span>
            </div>
            <div className={styles.marginResult}>
              <span className={styles.marginResultLabel}>
                Margin per vehicle (before driver & overhead)
              </span>
              <span
                className={`${styles.marginResultValue} ${marginPerVehicle > 0 ? styles.positive : styles.negative}`}
              >
                {fmt(marginPerVehicle)}
                <span className={styles.marginUnit}>/mo</span>
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className={styles.disclaimer}>
          {useCase === "delivery"
            ? "Earnings based on e-commerce last-mile benchmarks. Actual revenue depends on contracts, route density, and partner terms. ergOS provides the fleet operations layer that logistics partners require."
            : "Earnings are indicative. Actual revenue depends on contracts, utilization, and market rates. ergOS provides fleet operations and visibility for your business."}
        </div>
      </div>
    </div>
  );
}
