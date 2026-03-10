"use client";

import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import type { CashflowPoint } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/mock-data";
import styles from "./Charts.module.css";

interface CashflowChartProps {
  data: CashflowPoint[];
  currency?: string;
}

export default function CashflowChart({ data, currency = "USD" }: CashflowChartProps) {
  return (
    <div className={`card-static ${styles.chartCard}`}>
      <h4 className={styles.chartTitle}>Cashflow Analysis</h4>
      <p className={styles.chartSubtitle}>
        Annual cost impact and cumulative savings over the contract period
      </p>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: "var(--text-light)" }}
              tickFormatter={(v) => `Yr ${v}`}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--text-light)" }}
              tickFormatter={(v) =>
                `${v >= 0 ? "" : "-"}${Math.abs(v / 1000).toFixed(0)}k`
              }
            />
            <Tooltip
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  annualCost: "Annual Cost/Savings",
                  cumulativeSavings: "Cumulative Savings",
                };
                const seriesName = typeof name === "string" ? name : "Value";
                if (typeof value !== "number") {
                  return ["N/A", labels[seriesName] || seriesName];
                }
                return [formatCurrency(value, currency), labels[seriesName] || seriesName];
              }}
              labelFormatter={(label) => `Year ${label}`}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-md)",
              }}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#959797" strokeDasharray="5 5" />
            <Bar
              dataKey="annualCost"
              name="Annual Cost/Savings"
              fill="var(--chart-ev)"
              radius={[4, 4, 0, 0]}
              barSize={36}
            />
            <Line
              type="monotone"
              dataKey="cumulativeSavings"
              name="Cumulative Savings"
              stroke="var(--chart-green)"
              strokeWidth={2.5}
              dot={{ r: 5, fill: "var(--chart-green)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
