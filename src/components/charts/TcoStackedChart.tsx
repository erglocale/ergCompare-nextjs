"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { TcoStackedData } from "@/lib/mock-data";
import styles from "./Charts.module.css";

interface TcoStackedChartProps {
  data: TcoStackedData;
}

const COLORS = ["#1f77b4", "#22c55e", "#17becf", "#9467bd"];

function sumSeries(values: Array<number | undefined>) {
  let total = 0;
  for (const value of values) {
    total += value ?? 0;
  }
  return total;
}

export default function TcoStackedChart({ data }: TcoStackedChartProps) {
  const tcoEvTotal = sumSeries([...data.tcoEv]);
  const tcoIceTotal = sumSeries([...data.tcoIce]);
  const savingsPercent =
    tcoIceTotal !== 0
      ? (100 * (tcoIceTotal - tcoEvTotal)) / tcoIceTotal
      : 0;

  const chartData = [
    {
      name: `EV Fleet (${tcoEvTotal.toFixed(4)})`,
      purchasePrice: data.tcoEv[0],
      fuelPrice: data.tcoEv[1],
      maintenanceCost: data.tcoEv[2],
      residueValue: data.tcoEv[3],
    },
    {
      name: `ICE Fleet (${tcoIceTotal.toFixed(4)})`,
      purchasePrice: data.tcoIce[0],
      fuelPrice: data.tcoIce[1],
      maintenanceCost: data.tcoIce[2],
      residueValue: data.tcoIce[3],
    },
  ];

  return (
    <div className={`card-static ${styles.chartCard}`}>
      <h4 className={styles.chartTitle}>
        Total Cost of Ownership (TCO) Comparison — EV versus ICE
      </h4>
      <p
        className={styles.chartSubtitle}
        style={{
          color: savingsPercent > 0 ? "var(--success)" : "var(--danger)",
          fontWeight: 700,
          fontSize: "15px",
        }}
      >
        {savingsPercent.toFixed(2)}% lower TCO —{" "}
        {savingsPercent > 0
          ? "significant cost savings when transitioning to an electric fleet"
          : "EV fleet is currently more expensive"}
      </p>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart
            data={chartData}
            stackOffset="sign"
            margin={{ top: 20, right: 20, left: 8, bottom: 15 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 13, fill: "var(--text)" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--text-light)" }}
              tickFormatter={(v) => v.toFixed(2)}
              label={{
                value: `TCO (${data.currencyCode}/km)`,
                angle: -90,
                position: "insideLeft",
                offset: 4,
                fontSize: 13,
                fill: "var(--text-light)",
              }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (typeof value !== "number") return "N/A";
                const seriesName = typeof name === "string" ? name : "Value";
                const labelMap: Record<string, string> = {
                  purchasePrice: "CapEx",
                  fuelPrice: "Fuel",
                  maintenanceCost: "Maintenance",
                  residueValue: "Fleet Residue Value",
                };
                return [value.toFixed(4), labelMap[seriesName] || seriesName];
              }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-md)",
              }}
            />
            <Legend
              formatter={(value) => {
                const seriesName = typeof value === "string" ? value : "Value";
                const labelMap: Record<string, string> = {
                  purchasePrice: "CapEx",
                  fuelPrice: "Fuel",
                  maintenanceCost: "Maintenance",
                  residueValue: "Fleet Residue Value",
                };
                return labelMap[seriesName] || seriesName;
              }}
              iconType="rect"
              iconSize={18}
            />
            <ReferenceLine y={0} stroke="#959797" strokeDasharray="5 5" />
            <Bar
              dataKey="purchasePrice"
              fill={COLORS[0]}
              stackId="stack"
              barSize={140}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="fuelPrice"
              fill={COLORS[1]}
              stackId="stack"
              barSize={140}
            />
            <Bar
              dataKey="maintenanceCost"
              fill={COLORS[2]}
              stackId="stack"
              barSize={140}
            />
            <Bar
              dataKey="residueValue"
              fill={COLORS[3]}
              stackId="stack"
              barSize={140}
              radius={[10, 10, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
