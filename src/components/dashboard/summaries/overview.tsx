"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface DataPoint {
  name: string;
  income: number;
  expense: number;
}

interface CategoryDistribution {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const mockBarData: DataPoint[] = [
  {
    name: "Jan",
    income: 0,
    expense: 0,
  },
  {
    name: "Feb",
    income: 0,
    expense: 0,
  },
  {
    name: "Mar",
    income: 0,
    expense: 0,
  },
  {
    name: "Apr",
    income: 0,
    expense: 0,
  },
  {
    name: "Mei",
    income: 0,
    expense: 0,
  },
  {
    name: "Jun",
    income: 5000000,
    expense: 3500000,
  },
  {
    name: "Jul",
    income: 15000000,
    expense: 12750000,
  },
];

const mockPieData: CategoryDistribution[] = [
  { name: "Pembelian Hewan - Sapi", value: 9000000, color: COLORS[0] },
  { name: "Biaya Distribusi", value: 1500000, color: COLORS[1] },
  { name: "Biaya Pemotongan", value: 1250000, color: COLORS[2] },
  { name: "Belanja Bumbu", value: 750000, color: COLORS[3] },
  { name: "Lain-lain", value: 250000, color: COLORS[4] },
];

export function Overview({ isDistributionChart = false }: { isDistributionChart?: boolean }) {
  const [data, setData] = useState<DataPoint[]>(mockBarData);
  const [distributionData, setDistributionData] = useState<CategoryDistribution[]>(mockPieData);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/overview');
        if (response.ok) {
          const result = await response.json();
          if (result.barData) setData(result.barData);
          if (result.pieData) setDistributionData(result.pieData);
        }
      } catch (error) {
        console.error('Failed to fetch overview data:', error);
        // Fallback to mock data
      }
    };

    fetchData();
  }, []);

  if (isDistributionChart) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={distributionData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={false}
          >
            {distributionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value / 1000000}jt`}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
        />
        <Bar dataKey="income" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Pemasukan" />
        <Bar dataKey="expense" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Pengeluaran" />
        <Legend />
      </BarChart>
    </ResponsiveContainer>
  );
}