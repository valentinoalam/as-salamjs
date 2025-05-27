// components/ui/bar-chart.tsx
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
} from "recharts"
import { cn } from "@/lib/utils";

interface BarChartProps {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  stack?: boolean;
  showLegend?: boolean;
  className?: string;
  xAxisProps?: object;
  yAxisProps?: object;
}

export function SalesChart({
  data,
  index,
  categories,
  colors = ["#8884d8"],
  valueFormatter = (value) => value.toString(),
  stack = false,
  showLegend = true,
  className,
  xAxisProps = {},
  yAxisProps = {}
}: BarChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={index}
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            {...xAxisProps}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={valueFormatter}
            {...yAxisProps}
          />
          <Tooltip
            formatter={(value) => valueFormatter(Number(value))}
            contentStyle={{
              backgroundColor: "#fff",
              border: "none",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()}
            />
          )}
          {categories.map((category, idx) => (
            <Bar
              key={category}
              dataKey={category}
              name={category}
              fill={colors[idx % colors.length]}
              stackId={stack ? "stack" : undefined}
              radius={4}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}