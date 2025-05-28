'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, TrendingUp, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { TransactionList } from './transaction-list'
import type { ChartDataResponse } from'@/types/keuangan'
import ChartComponent from './qurban-sales-view/animal-sales-chart'
import { useKeuangan } from '@/contexts/keuangan-context'

export default function QurbanTransactionTab() {
  const { weeklySalesQuery } = useKeuangan()
  const { data:chartData, error, isLoading} = weeklySalesQuery

  // const fetchData = async () => {
  //   const year = 2025;
  //   const month = 5
  //   try {
  //     setLoading(true)
  //     const data = await getWeeklyAnimalSalesData(year, month)
  //     console.log(data)
  //     setChartData(data)
  //     setError(null)
  //   } catch (err) {
  //     setError('Failed to load sales data')
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // useEffect(() => {
  //   fetchData()
  // }, [])

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorCard error={error.message} />
  if (!chartData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Error Loading Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load qurban sales data.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-2xl font-bold">Qurban Sales by Week</h2>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards chartData={chartData} />

      {/* Chart */}
      <ChartComponent chartData={chartData} />

      {/* Data Table */}
      <DataTable chartData={chartData} />
      <TransactionList transactions={chartData.transactions} />
    </div>
  )
}

// Sub-components
export function LoadingSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Loading Qurban Sales Data...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96 flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ErrorCard({ error }: { error: string }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Error Loading Data</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{error}</p>
      </CardContent>
    </Card>
  )
}

function StatsCards({ chartData }: { chartData: ChartDataResponse }) {
  const averageSales = Math.round(chartData.totalSales / chartData.data.length)
  return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chartData.totalSales}</div>
            <p className="text-xs text-muted-foreground">
            Dzulqodah 1446 H
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(chartData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Total income
            </p>
          </CardContent>
        </Card> */}
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Animal Types</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chartData.animalTypes.length}</div>
            <p className="text-xs text-muted-foreground">
              {chartData.animalTypes.join(", ")}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chartData.transactions.length}</div>
            <p className="text-xs text-muted-foreground">
              Total mudhohi
            </p>
          </CardContent>
        </Card>
        <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Weekly Average</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageSales}</div>
        </CardContent>
      </Card>
    </div>
  )
}


function DataTable({ chartData }: { chartData: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Sales Data</CardTitle>
        <CardDescription>
          Detailed breakdown of sales by week and animal type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2">Week</th>
                {chartData.animalTypes.map((type: string) => (
                  <th key={type} className="text-right p-2">{type}</th>
                ))}
                <th className="text-right p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {chartData.data.map((week: any) => (
                <tr key={week.week}>
                  <td className="p-2">{week.week}</td>
                  {chartData.animalTypes.map((type: string) => (
                    <td key={type} className="text-right p-2">
                      {week[type]}
                    </td>
                  ))}
                  <td className="text-right p-2 font-medium">
                    {chartData.animalTypes.reduce(
                      (sum: number, type: string) => sum + (week[type] as number), 0
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
