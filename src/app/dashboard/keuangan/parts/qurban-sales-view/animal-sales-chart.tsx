'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import type { ChartDataResponse } from'@/types/keuangan'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300']

export default function ChartComponent({ chartData }: { chartData: ChartDataResponse }) {
  // const valueFormatter = (value: number) => value.toString()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Weekly Progress Qurban Registration
        </CardTitle>
        <CardDescription>
          Stacked bar chart showing qurban registration comparison of each animal by week till Idul Adha
        </CardDescription>
      </CardHeader>
      <CardContent className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData.data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 12 }}
                className="text-xs"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-xs"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                // tickFormatter={valueFormatter}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium mb-2">{label}</p>
                        {payload.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div 
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.dataKey}: {entry.value}</span>
                          </div>
                        ))}
                        <div className="border-t border-border mt-2 pt-2 text-sm font-medium">
                          Total: {payload.reduce((sum, entry) => sum + (entry.value as number), 0)}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
                // formatter={(value) => valueFormatter(Number(value))}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
                formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()}
              />
              
              {/* Generate Bar components for each animal type */}
              {chartData.animalTypes.map((animalType, index) => (
                <Bar
                  key={animalType}
                  dataKey={animalType}
                  stackId="sales"
                  fill={COLORS[index % COLORS.length]}
                  name={animalType}
                  radius={index === chartData.animalTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}