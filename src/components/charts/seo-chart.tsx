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
} from "recharts";

interface DataPoint {
  date: string;
  clicks: number;
  impressions: number;
  position: number;
}

interface SeoChartProps {
  data: DataPoint[];
}

export function SeoChart({ data }: SeoChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickLine={{ stroke: "#334155" }}
          axisLine={{ stroke: "#334155" }}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickLine={{ stroke: "#334155" }}
          axisLine={{ stroke: "#334155" }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickLine={{ stroke: "#334155" }}
          axisLine={{ stroke: "#334155" }}
          reversed
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
        />
        <Legend
          wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="clicks"
          stroke="#2dd4bf"
          strokeWidth={2}
          dot={false}
          name="Clicks"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="impressions"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={false}
          name="Impressions"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="position"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          name="Avg Position"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
