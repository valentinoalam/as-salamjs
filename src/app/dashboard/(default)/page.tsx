import React, { Suspense } from 'react';
import { 
  Users, 
  CircleDollarSign, 
  Package 
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

import { getHewanQurban, getProdukHewan, getDistribution, getPenerima, getDistribusiLog, countHewanQurban } from '@/services/qurban';
import { JenisProduk, HewanStatus } from '@prisma/client';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { RecentTransactions } from '@/components/dashboard/summaries/recent-transactions';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { getQurbanSalesStats } from '@/services/keuangan';
import FinancialCharts from './financial-charts';

const LegendProgress = () => (
  <div className="p-4 border rounded-lg bg-muted flex gap-6">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-green-500 rounded-full" />
      <span className="text-sm">Sudah Disembelih</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-blue-500 rounded-full" />
      <span className="text-sm">Tersedia di Inventori</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-purple-500 rounded-full" />
      <span className="text-sm">Sudah Diambil</span>
    </div>
  </div>
)

export default async function DashboardPage() {
  
  // Get Qurban sales data
  const salesReport = await getQurbanSalesStats();
  
  // Get animal counts
  const [totalSapi, totalDomba] = await Promise.all([
    countHewanQurban("sapi"),
    countHewanQurban("domba")
  ]);

  // Get financial data
  const [sapiData, dombaData, produkDaging, produkLainnya, distribution, penerima, distribusiLog] = await Promise.all([
    getHewanQurban("sapi", 1, getPaginationSize(totalSapi)),
    getHewanQurban("domba", 1, getPaginationSize(totalDomba)),
    getProdukHewan(JenisProduk.DAGING),
    getProdukHewan(),
    getDistribution(),
    getPenerima(),
    getDistribusiLog()
  ]);

  // Calculate financial stats
  const financialStats = {
    totalPekurban: salesReport.totalCount,
    totalHewan: totalSapi + totalDomba,
    danaTerkumpul: salesReport.totalSales,
    paketDidistribusikan: sapiData.reduce((sum, hewan) => sum + hewan.meatPackageCount, 0) +
      dombaData.reduce((sum, hewan) => sum + hewan.meatPackageCount, 0)
  };

  return (
    <div className="space-y-6">
      <h1 className="ml-6 text-muted-foreground mt-2">
        Ringkasan informasi Sistem Manajemen Qurban
      </h1>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pekurban
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialStats.totalPekurban}</div>
            <p className="text-xs text-muted-foreground">
              {salesReport.perTipeHewan.map((t: { count: any; nama: any; }) => `${t.count} ${t.nama}`).join(', ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Hewan
            </CardTitle>
            <span className="text-xl text-muted-foreground">🐐</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialStats.totalHewan}</div>
            <p className="text-xs text-muted-foreground">
              {totalDomba} domba, {totalSapi} sapi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dana Terkumpul
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
              }).format(financialStats.danaTerkumpul)}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesReport.perTipeHewan.map((t: { nama: any; totalAmount: any; }) => 
                `${t.nama}: ${formatCurrency(t.totalAmount)}`
              ).join(', ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Paket Didistribusikan
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialStats.paketDidistribusikan}</div>
            <p className="text-xs text-muted-foreground">
              {sapiData.filter(h => h.status === HewanStatus.DIDISTRIBUSI).length} sapi, 
              {dombaData.filter(h => h.status === HewanStatus.DIDISTRIBUSI).length} domba
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Animal Status Tabs */}
      
      <FinancialCharts salesReport={salesReport} />
      {/* Recent Transactions with Qurban Sales */}
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <RecentTransactions 
          // qurbanSales={salesReport.perTipeHewan.map((t: { tipeHewanId: any; totalSales: any; nama: any; }) => ({
          //   id: `qurban-${t.tipeHewanId}`,
          //   amount: t.totalSales,
          //   description: `Penjualan ${t.nama}`,
          //   date: new Date(),
          //   type: 'PEMASUKAN'
          // }))}
        />
      </Suspense>
    </div>
  );
}

// Helper function remains the same
export function getPaginationSize(totalCount: number): number {
  if (totalCount <= 50) return 10;
  if (totalCount <= 60) return 15;
  if (totalCount <= 100) return 20;
  return 10;
}