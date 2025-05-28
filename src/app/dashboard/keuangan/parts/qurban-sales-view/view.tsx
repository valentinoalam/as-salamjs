'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import QurbanSalesReport from "./qurban-sales-report"
import { useKeuangan } from "@/contexts/keuangan-context";
import { FinancialSummary } from "@/components/dashboard/summaries/financial-summary";

const QurbanSales = () => {
  const { qurbanSalesQuery } = useKeuangan();
  const { data: qSalesStats, isLoading, error} = qurbanSalesQuery
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-64 bg-muted rounded animate-pulse mb-2"></div>
          <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-11/12 animate-pulse"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </CardTitle>
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <>
      </>
    );
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Penjualan Hewan Qurban</CardTitle>
        </CardHeader>  
        <CardContent className="space-y-8">
          { !qSalesStats || qSalesStats.perTipeHewan.length === 0?
          <p className="text-muted-foreground">Belum ada transaksi penjualan hewan qurban</p> :
          <QurbanSalesReport stats={qSalesStats} />
          }
        </CardContent>
      </Card>
      <FinancialSummary qSales={qSalesStats?.totalSales || 0} />
    </>
  )
}

export default QurbanSales