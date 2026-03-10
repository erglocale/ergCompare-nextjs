"use client";

import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import type { FinancialReturnPoint } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/mock-data";
import styles from "./Charts.module.css";

interface FinancialReturnChartProps {
  data: FinancialReturnPoint[];
  currency?: string;
}

export default function FinancialReturnChart({
  data,
  currency = "USD",
}: FinancialReturnChartProps) {
  return (
    <div className={`card-static ${styles.chartCard}`}>
      <h4 className={styles.chartTitle}>Financial Return Analysis</h4>
      <p className={styles.chartSubtitle}>IRR, NPV and Payback Period</p>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis
              dataKey="irr"
              tick={{ fontSize: 12, fill: "var(--text-light)" }}
              tickFormatter={(v) => `${v}%`}
              label={{
                value: "IRR (%)",
                position: "bottom",
                offset: 10,
                fontSize: 13,
                fill: "var(--text-muted)",
              }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: "var(--text-light)" }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{
                value: "NPV",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                fontSize: 12,
                fill: "var(--text-muted)",
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: "var(--text-light)" }}
              tickFormatter={(v) => `${v}y`}
              label={{
                value: "Payback (years)",
                angle: 90,
                position: "insideRight",
                offset: 10,
                fontSize: 12,
                fill: "var(--text-muted)",
              }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (value === undefined) return "N/A";
                if (name === "NPV" && typeof value === "number") {
                  return formatCurrency(value, currency);
                }
                if (name === "Payback Period") {
                  return typeof value === "number" && value ? `${value} years` : "N/A";
                }
                return value;
              }}
              labelFormatter={(label) => `IRR: ${label}%`}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-md)",
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 8, fontSize: 13 }}
            />
            <Bar
              yAxisId="left"
              dataKey="npv"
              name="NPV"
              fill="var(--chart-ev)"
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="payback"
              name="Payback Period"
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
