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
} from "recharts";
import type { TcoBreakdownItem } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/mock-data";
import styles from "./Charts.module.css";

interface TcoComparisonChartProps {
  ev: TcoBreakdownItem;
  ice: TcoBreakdownItem;
  currency?: string;
}

export default function TcoComparisonChart({
  ev,
  ice,
  currency = "USD",
}: TcoComparisonChartProps) {
  const data = [
    { name: "Vehicle Cost", ev: ev.vehicleCost, ice: ice.vehicleCost },
    { name: "Energy", ev: ev.energyCost, ice: ice.energyCost },
    { name: "Maintenance", ev: ev.maintenance, ice: ice.maintenance },
    { name: "Insurance", ev: ev.insurance, ice: ice.insurance },
    { name: "Infrastructure", ev: ev.infrastructure, ice: ice.infrastructure },
    { name: "Downtime Risk", ev: ev.downtimeRisk || 0, ice: ice.downtimeRisk || 0 },
  ];

  return (
    <div className={`card-static ${styles.chartCard}`}>
      <h4 className={styles.chartTitle}>TCO Breakdown — EV vs ICE</h4>
      <p className={styles.chartSubtitle}>Side-by-side cost comparison by category</p>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} barGap={4} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-light)" }} />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--text-light)" }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value, currency)}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-md)",
              }}
            />
            <Legend />
            <Bar dataKey="ev" name="EV Fleet" fill="var(--chart-ev)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ice" name="ICE Fleet" fill="var(--chart-ice)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
