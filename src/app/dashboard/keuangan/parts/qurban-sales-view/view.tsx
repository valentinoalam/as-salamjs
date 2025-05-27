'use client';

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import QurbanSalesReport from "./qurban-sales-report"
import { getQurbanSalesStats } from "@/services/keuangan"
import type { QurbanSalesStats } from "@/types/qurban";



const QurbanSales = () => {
  const [stats, setStats] = useState<QurbanSalesStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const data = await getQurbanSalesStats()
        setStats(data)
      } catch (error) {
        console.error("Error fetching animal sales stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Penjualan Hewan Qurban</CardTitle>
          <CardDescription>Memuat data...</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-32 bg-muted rounded mb-4"></div>
            <div className="h-40 w-full bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
  if (!stats || stats.perTipeHewan.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Penjualan Hewan Qurban</CardTitle>
          <CardDescription>Tidak ada data penjualan</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Belum ada transaksi penjualan hewan qurban</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Penjualan Hewan Qurban</CardTitle>
      </CardHeader>  
      <CardContent className="space-y-8">
        <QurbanSalesReport stats={stats} />
      </CardContent>
    </Card>
  )
}

export default QurbanSales