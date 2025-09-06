"use client";

import { Cell, Label, Legend, Pie, PieChart } from "recharts";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

import { TrendingUp } from "lucide-react";
import { formatCurrency } from "#@/lib/utils/formatters.ts";
import { useFinancialData } from "@/hooks/qurban/use-keuangan";

// Define chart configuration for different categories
const chartConfig = {
  amount: {
    label: "Amount",
  },
  pemasukan: {
    label: "Pemasukan",
    color: "hsl(var(--chart-1))",
  },
  pengeluaran: {
    label: "Pengeluaran", 
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig
export function Overview() {
  const { overviewData: data } = useFinancialData()
  console.log(data)
  if (!data) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="mx-auto aspect-square max-h-[250px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const netAmount = data.totalPemasukan - data.totalPengeluaran
  const isPositive = netAmount >= 0

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>Income vs Expenses by Category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px] w-full"
        >
          <PieChart>
            <ChartTooltip 
              formatter={(value: number, name: string) => `${name}: ${formatCurrency(value)}`}
              content={
                <ChartTooltipContent
                  nameKey="name"
                  labelFormatter={(label) => label}
                  // formatter={(value: number) => formatCurrency(value)}
                />
              }
            />
            
            {/* Inner Circle - Pemasukan (Income) */}
            <Pie
              data={data.pemasukanData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={60}
              strokeWidth={2}
            >
              {data.pemasukanData.map((entry, index) => {
                // Vibrant income colors - greens and blues for positive income
                const incomeColors = ['#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0', '#0EA5E9', '#0284C7', '#38BDF8'];
                return <Cell key={`cell-pemasukan-${index}`} fill={entry.color || incomeColors[index % incomeColors.length]} />
              })}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-black text-xs font-medium"
                        >
                          Pemasukan
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 16}
                          className="fill-emerald-500 text-xs"
                        >
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            notation: 'compact'
                          }).format(data.totalPemasukan)}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
            
            {/* Outer Ring - Pengeluaran (Expenses) */}
            <Pie
              data={data.pengeluaranData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              strokeWidth={2}
              label={({ cx, cy, midAngle, outerRadius, name, value }) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius * 1.25; // Slightly outside for visibility
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                const amount = formatCurrency(value);

                return (
                  <text
                    x={x}
                    y={y}
                    fill="#1F2937"
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    fontSize="12px"
                    fontWeight="500"
                    className="wrapp"
                  >
                  <tspan x={x} dy={0}>{name}</tspan><tspan x={x} dy={16} className="font-semibold">{amount}</tspan>
                  </text>
                );
              }}>
                {data.pengeluaranData.map((entry, index) => {
                  // Vibrant expense colors - warm colors, oranges, reds, purples
                  const expenseColors = [
                    '#EF4444', // Red
                    '#F97316', // Orange
                    '#F59E0B', // Amber
                    '#8B5CF6', // Violet
                    '#EC4899', // Pink
                    '#06B6D4', // Cyan
                    '#84CC16', // Lime
                    '#F472B6', // Pink-400
                    '#A855F7', // Purple
                    '#3B82F6', // Blue
                    '#10B981', // Emerald
                    '#F87171'  // Red-400
                  ];
                  return <Cell key={`cell-pengeluaran-${index}`} fill={entry.color || expenseColors[index % expenseColors.length]} />
                })}
                <Label
                  position="insideTop"
                  x="50%"
                  y="50%" // Start from the center Y
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      const labelY = viewBox.cy! - 80; // Average of (70+100)/2 = 85, subtracted from center Y
                      return (
                        <text
                          x={viewBox.cx}
                          y={labelY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#DC2626" 
                          className="text-xs font-medium"
                        >
                          Pengeluaran
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
              <Legend
                layout="horizontal"
                verticalAlign="middle"
                wrapperStyle={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '25%',
                  paddingLeft: '20px',
                  boxSizing: 'border-box'
                }}
              />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          <span className={isPositive ? "text-emerald-600" : "text-red-500"}>
            Net {isPositive ? "Income" : "Loss"}: {" "}
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR'
            }).format(Math.abs(netAmount))}
          </span>
          <TrendingUp className={`h-4 w-4 ${isPositive ? "text-emerald-600" : "text-red-500 rotate-180"}`} />
        </div>
        <div className="leading-none text-muted-foreground">
          Inner circle shows income categories, outer ring shows expense categories
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="text-emerald-600 font-medium">Total Income: {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            notation: 'compact'
          }).format(data.totalPemasukan)}</span>
          <span className="text-red-500 font-medium">Total Expenses: {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            notation: 'compact'
          }).format(data.totalPengeluaran)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
