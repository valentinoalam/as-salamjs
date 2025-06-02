"use client"

import { useMemo } from "react"
import { 
  Users, 
  CircleDollarSign, 
  Package 
} from 'lucide-react';
import { HewanStatus } from '@prisma/client';
import { formatCurrency } from '@/lib/formatters';
// import { Badge } from '@/components/ui/badge';
import FinancialCharts from './financial-charts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useQurban, type ProdukHewan, type Shipment } from "@/contexts/qurban-context"
import HewanStatusDisplay from "./hewan-status-display"
import { useKeuangan } from "@/contexts/keuangan-context";

export default function DashboardPage() {
  const { 
    meta, 
    productsQuery, 
    shipmentsQuery,
    getProductsByType ,
    sapiQuery,
    dombaQuery
  } = useQurban()
  const {
    qurbanSalesQuery
  } = useKeuangan()
  
  // Get Qurban sales data
  const { data: salesReport } = qurbanSalesQuery;
  const { data: sapiData } = sapiQuery;
  const { data: dombaData } = dombaQuery;
  // Get animal counts
  const { total: totalSapi } = meta.sapi
  const { total: totalDomba } = meta.domba
  // Get financial data
  // const [sapiData, dombaData, produkDaging, produkLainnya, distribution, penerima, distribusiLog] = await Promise.all([

  // Calculate financial stats
  const financialStats = {
    totalPekurban: salesReport?.totalCount,
    totalHewan: totalSapi + totalDomba,
    danaTerkumpul: salesReport?.totalSales,
    paketDidistribusikan: sapiData.reduce((sum, hewan) => sum + hewan.meatPackageCount, 0) +
      dombaData.reduce((sum, hewan) => sum + hewan.meatPackageCount, 0)
  };
  // Memoize expensive calculations to prevent unnecessary re-renders
  const memoizedData = useMemo(() => {
    if (!productsQuery.data) return null

    const produkDaging = getProductsByType("daging")
    const produkLainnya = getProductsByType("all")
    const nonMeatProducts = produkLainnya.filter(p => 
      !p.JenisProduk?.toLowerCase().includes("daging")
    )

    return {
      produkDaging,
      nonMeatProducts,
      allProducts: productsQuery.data
    }
  }, [productsQuery.data, getProductsByType])

  // Memoize shipments data
  const shipmentsData = useMemo(() => {
    return shipmentsQuery.data || []
  }, [shipmentsQuery.data])

  // Early return for loading state
  if (productsQuery.isLoading || sapiQuery.isLoading || dombaQuery.isLoading || qurbanSalesQuery.isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center p-8">Loading dashboard data...</div>
      </div>
    )
  }

  // Early return if no data
  if (!memoizedData) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-center p-8">No data available</div>
      </div>
    )
  }

  const { produkDaging, nonMeatProducts, allProducts } = memoizedData

  return (
    <div className="space-y-8">
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
              {salesReport?.perTipeHewan.map((t: { count: number; nama: string; }) => `${t.count} ${t.nama}`).join(', ')}
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
              }).format(financialStats.danaTerkumpul!)}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesReport?.perTipeHewan.map((t: { nama: string; totalAmount: number; }) => 
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
      
      <FinancialCharts salesReport={salesReport!} />

      {/* Animal Status Tabs */}
      <AnimalStatusTabs meta={meta} />

      <Tabs defaultValue="inventori">
        <TabsList>
          <TabsTrigger value="inventori">Inventori</TabsTrigger>
          <TabsTrigger value="timbang">Timbang</TabsTrigger>
          <TabsTrigger value="pindahan-paket">Pindahan paket</TabsTrigger>
          <TabsTrigger value="distribusi">Distribusi</TabsTrigger>
        </TabsList>
        <TabsContent value="inventori">
          {/* Products in Inventory */}
          <ProductsInventoryCard 
            products={nonMeatProducts}
            isLoading={productsQuery.isLoading}
          />
        </TabsContent>
        <TabsContent value="timbang">
          {/* Kumulatif Timbang (Meat Products) */}
          <MeatProductsCard 
            products={produkDaging}
            isLoading={productsQuery.isLoading}
          />
        </TabsContent>
        <TabsContent value="pindahan-paket">
          {/* Shipments Log */}
          <ShipmentsLogCard 
            shipments={shipmentsData}
            products={allProducts}
            isLoading={shipmentsQuery.isLoading}
          />
        </TabsContent>
        <TabsContent value="distribusi">
          {/* Product Distribution Overview */}
          <ProductDistributionCard 
            products={allProducts}
            isLoading={productsQuery.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Separate components to prevent unnecessary re-renders
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimalStatusTabs = ({ meta }: {meta: any}) => (
  <Tabs defaultValue="sapi" className="w-full">
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="sapi">
        Status Sapi ({meta.sapi.slaughtered}/{meta.sapi.total})
      </TabsTrigger>
      <TabsTrigger value="domba">
        Status Domba ({meta.domba.slaughtered}/{meta.domba.total})
      </TabsTrigger>
    </TabsList>
    
    <TabsContent value="sapi">
      <AnimalStatusCard type="sapi" data={meta.sapi} />
    </TabsContent>
    
    <TabsContent value="domba">
      <AnimalStatusCard type="domba" data={meta.domba} />
    </TabsContent>
  </Tabs>
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimalStatusCard = ({ type, data }: {type: "sapi" | "domba"; data: any}) => {
  const progressValue = useMemo(() => 
    data.total > 0 ? (data.slaughtered / data.total) * 100 : 0, 
    [data.slaughtered, data.total]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Status {type === 'sapi' ? 'Sapi' : 'Domba'}
          <div className="text-sm font-normal text-muted-foreground">
            Target: {data.target} | Total: {data.total} | Disembelih: {data.slaughtered}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <StatusLegend />
        
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress Penyembelihan</span>
            <span>{data.slaughtered}/{data.total}</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        <HewanStatusDisplay type={type} />
      </CardContent>
    </Card>
  )
}

const StatusLegend = () => (
  //   <div className="p-4 border rounded-lg bg-muted flex gap-6">
//     <div className="flex items-center gap-2">
//       <div className="w-3 h-3 bg-green-500 rounded-full" />
//       <span className="text-sm">Sudah Disembelih</span>
//     </div>
//     <div className="flex items-center gap-2">
//       <div className="w-3 h-3 bg-blue-500 rounded-full" />
//       <span className="text-sm">Tersedia di Inventori</span>
//     </div>
//     <div className="flex items-center gap-2">
//       <div className="w-3 h-3 bg-purple-500 rounded-full" />
//       <span className="text-sm">Sudah Diambil</span>
//     </div>
//   </div>🐄🐑🦴🔪
  <div className="mb-4 text-sm text-muted-foreground">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xl">🏷️</span>
      <span>Belum Disembelih</span>
    </div>
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xl">🥩✅</span>
      <span>Sudah Disembelih</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xl">🎁✓</span>
      <span>Sudah Tersedia di Inventori</span>
    </div>
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xl">👤✓</span>
      <span>Sudah Diambil Mudhohi</span>
    </div>
  </div>
)

const ProductsInventoryCard = ({ products, isLoading }: {products:ProdukHewan[], isLoading: boolean}) => (
  <Card>
    <CardHeader>
      <CardTitle>Produk di Inventori</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="text-center p-4">Loading products...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((produk: ProdukHewan) => (
            <ProductInventoryItem key={produk.id} produk={produk} />
          ))}
        </div>
      )}
    </CardContent>
  </Card>
)

const ProductInventoryItem = ({ produk }: {produk: ProdukHewan}) => {
  const progressValue = useMemo(() => 
    produk.targetPaket > 0 ? (produk.diInventori / produk.targetPaket) * 100 : 0,
    [produk.diInventori, produk.targetPaket]
  )

  return (
    <div className="flex flex-col items-center p-4 border rounded-md">
      <span className="font-medium text-center mb-2">{produk.nama}</span>
      <div className="text-center">
        <div className="text-2xl font-bold">{produk.diInventori}</div>
        <div className="text-xs text-muted-foreground mt-1">
          Target: {produk.targetPaket}
        </div>
        <div className="text-xs text-muted-foreground">
          Diserahkan: {produk.sdhDiserahkan}
        </div>
      </div>
      {produk.targetPaket > 0 && (
        <Progress value={progressValue} className="h-1 mt-2 w-full" />
      )}
    </div>
  )
}

const MeatProductsCard = ({ products, isLoading }: {products: ProdukHewan[]; isLoading: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle>Kumulatif Timbang</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="text-center p-4">Loading meat products...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {products.map((item: ProdukHewan) => (
            <MeatProductItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </CardContent>
  </Card>
)

const MeatProductItem = ({ item }:{item:ProdukHewan}) => {
  const progressValue = useMemo(() => 
    item.targetPaket > 0 ? (item.diTimbang / item.targetPaket) * 100 : 0,
    [item.diTimbang, item.targetPaket]
  )

  return (
    <div className="flex flex-col items-center p-4 border rounded-md">
      <span className="text-xl mb-2">
        {item.tipeId === 1 ? "🐮" : "🐐"} {item.berat}kg
      </span>
      <span className="text-3xl font-bold">{item.diTimbang}</span>
      <div className="text-xs mt-1">Target: {item.targetPaket}</div>
      <div className="text-xs text-muted-foreground mt-1">
        Kumulatif: {item.kumulatif}
      </div>
      {item.targetPaket > 0 && (
        <Progress value={progressValue} className="h-1 mt-2 w-full" />
      )}
    </div>
  )
}

const ShipmentsLogCard = ({ shipments, products, isLoading }: {shipments: Shipment[]; products: ProdukHewan[], isLoading: boolean}) => (
  <Card>
    <CardHeader>
      <CardTitle>Log Pengiriman</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="text-center p-4">Loading shipments...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">ID Pengiriman</th>
                <th className="text-left p-2">Produk</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Catatan</th>
                <th className="text-left p-2">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {shipments.length > 0 ? (
                shipments.map((shipment: Shipment) => (
                  <ShipmentRow 
                    key={shipment.id} 
                    shipment={shipment} 
                    products={products} 
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-2 text-center text-muted-foreground">
                    Belum ada data pengiriman
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
)

const ShipmentRow = ({ shipment, products }: {shipment: Shipment; products: ProdukHewan[]}) => {
  const productNames = useMemo(() => 
    shipment.products.map(p => {
      const product = products?.find((prod: ProdukHewan) => prod.id === p.produkId)
      return `${product?.nama || 'Unknown'} (${p.jumlah})`
    }).join(', '),
    [shipment.products, products]
  )

  const formattedDate = useMemo(() => 
    new Date(shipment.createdAt).toLocaleDateString('id-ID'),
    [shipment.createdAt]
  )

  return (
    <tr className="border-b">
      <td className="p-2">#{shipment.id}</td>
      <td className="p-2">{productNames}</td>
      <td className="p-2">
        <span className={`px-2 py-1 rounded text-xs ${
          shipment.status === 'completed' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {shipment.status}
        </span>
      </td>
      <td className="p-2">{shipment.note || "-"}</td>
      <td className="p-2">{formattedDate}</td>
    </tr>
  )
}

const ProductDistributionCard = ({ products, isLoading }: { products: ProdukHewan[], isLoading:boolean}) => (
  <Card>
    <CardHeader>
      <CardTitle>Overview Distribusi Produk</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="text-center p-4">Loading distribution data...</div>
      ) : (
        <div className="space-y-6">
          {products?.map((produk: ProdukHewan) => (
            <ProductDistributionItem key={produk.id} produk={produk} />
          ))}
        </div>
      )}
    </CardContent>
  </Card>
)

const ProductDistributionItem = ({ produk }: {produk: ProdukHewan}) => {
  const deliveryPercentage = useMemo(() => 
    produk.targetPaket > 0 
      ? Math.min(100, (produk.sdhDiserahkan / produk.targetPaket) * 100) 
      : 0,
    [produk.sdhDiserahkan, produk.targetPaket]
  )

  return (
    <div className="space-y-2">
      <div className="font-medium">{produk.nama}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Ditimbang</div>
          <div className="text-2xl font-bold">{produk.diTimbang}</div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Di Inventori</div>
          <div className="text-2xl font-bold">{produk.diInventori}</div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Diserahkan</div>
          <div className="text-2xl font-bold">{produk.sdhDiserahkan}</div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Progress Distribusi</span>
          <span>{produk.sdhDiserahkan} / {produk.targetPaket} ({deliveryPercentage.toFixed(1)}%)</span>
        </div>
        <Progress value={deliveryPercentage} className="h-2" />
      </div>
    </div>
  )
}


// Helper function remains the same
export function getPaginationSize(totalCount: number): number {
  if (totalCount <= 50) return 10;
  if (totalCount <= 60) return 15;
  if (totalCount <= 100) return 20;
  return 10;
}
