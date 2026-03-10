"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { YearlyTcoData } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/mock-data";
import styles from "./Charts.module.css";

interface TcoYearlyChartProps {
  data: YearlyTcoData[];
  currency?: string;
}

export default function TcoYearlyChart({ data, currency = "USD" }: TcoYearlyChartProps) {
  return (
    <div className={`card-static ${styles.chartCard}`}>
      <h4 className={styles.chartTitle}>Cumulative TCO Over Time</h4>
      <p className={styles.chartSubtitle}>Year-over-year total cost comparison</p>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-ev)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--chart-ev)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="iceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-ice)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--chart-ice)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: "var(--text-light)" }}
              tickFormatter={(v) => `Yr ${v}`}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--text-light)" }}
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value, currency)}
              labelFormatter={(label) => `Year ${label}`}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-md)",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="evCumulative"
              name="EV Cumulative"
              stroke="var(--chart-ev)"
              fill="url(#evGrad)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "var(--chart-ev)" }}
            />
            <Area
              type="monotone"
              dataKey="iceCumulative"
              name="ICE Cumulative"
              stroke="var(--chart-ice)"
              fill="url(#iceGrad)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "var(--chart-ice)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
