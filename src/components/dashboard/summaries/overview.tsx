"use client";

import { useEffect, useState } from "react";
import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ProcessedData } from "@/types/keuangan";
import { getOverviewData } from "@/services/keuangan";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

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

  const [data, setData] = useState<ProcessedData>({
    pemasukanData: [],
    pengeluaranData: [],
    totalPemasukan: 0,
    totalPengeluaran: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const rawData = await getOverviewData()
        
        // Separate and process the data
        const pemasukanItems = rawData.filter(item => 
          item.name.startsWith('Pemasukan')
        )
        const pengeluaranItems = rawData.filter(item => 
          item.name.startsWith('Pengeluaran')
        )

        // Calculate totals
        const totalPemasukan = pemasukanItems.reduce((sum, item) => sum + item.value, 0)
        const totalPengeluaran = pengeluaranItems.reduce((sum, item) => sum + item.value, 0)

        // Format data for charts
        const pemasukanData = pemasukanItems.map(item => ({
          name: item.name.replace('Pemasukan - ', ''),
          value: item.value,
          fill: item.color,
        }))

        const pengeluaranData = pengeluaranItems.map(item => ({
          name: item.name.replace('Pengeluaran - ', ''),
          value: item.value,
          fill: item.color,
        }))

        setData({
          pemasukanData,
          pengeluaranData,
          totalPemasukan,
          totalPengeluaran,
        })
      } catch (err) {
        setError('Failed to load financial data')
        console.error('Error loading financial data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
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

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="mx-auto aspect-square max-h-[250px] flex items-center justify-center">
            <div className="text-destructive">{error}</div>
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
                          className="fill-foreground text-xs font-medium"
                        >
                          Pemasukan
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 16}
                          className="fill-muted-foreground text-xs"
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
                    fill="#333"
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    fontSize="12px"
                    className="wrapp"
                  >
                  <tspan x={x} dy={0}>{name}</tspan><tspan x={x} dy={16}>{amount}</tspan>
                  </text>
                );
              }}>
                {data.pengeluaranData.map((entry, index) => (
                  <Cell key={`cell-pengeluaran-${index}`} fill={entry.fill || '#8884d8'} />
                ))}
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
                          fill="red" 
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
          <span className={isPositive ? "text-green-600" : "text-red-600"}>
            Net {isPositive ? "Income" : "Loss"}: {" "}
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR'
            }).format(Math.abs(netAmount))}
          </span>
          <TrendingUp className={`h-4 w-4 ${isPositive ? "text-green-600" : "text-red-600 rotate-180"}`} />
        </div>
        <div className="leading-none text-muted-foreground">
          Inner circle shows income categories, outer ring shows expense categories
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Total Income: {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            notation: 'compact'
          }).format(data.totalPemasukan)}</span>
          <span>Total Expenses: {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            notation: 'compact'
          }).format(data.totalPengeluaran)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
