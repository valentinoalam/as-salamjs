import React from 'react';
import { 
  Users, 
  CircleDollarSign, 
  Package 
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getHewanQurban, getProdukHewan, getDistribution, getPenerima, getDistribusiLog } from '@/lib/db';
import { jenisProduk } from '@prisma/client';
import { Progress } from '@/components/ui/progress';

export default async function DashboardPage() {
  const sapiData = await getHewanQurban("Sapi")
  const dombaData = await getHewanQurban("Domba")
  const produkDaging = await getProdukHewan(jenisProduk.DAGING)
  const produkLainnya = await getProdukHewan()
  const distribution = await getDistribution()
  const penerima = await getPenerima()
  const distribusiLog = await getDistribusiLog()

  // Filter non-meat products
  const nonMeatProducts = produkLainnya.filter((p) => p.jenisProduk !== jenisProduk.DAGING)

  // Calculate coupon stats
  const totalKupon = penerima.filter((p) => p.noKupon).length
  const returnedKupon = penerima.filter((p) => p.noKupon && p.isDiterima).length

  // In a real app, this data would come from the database
  const stats = {
    totalPekurban: 128,
    totalHewan: 85,
    danaTerkumpul: 350000000,
    paketDidistribusikan: 1250,
  };
  
  const areaChartData = [
    { name: '1 Dzulhijjah', jumlah: 35 },
    { name: '2 Dzulhijjah', jumlah: 40 },
    { name: '3 Dzulhijjah', jumlah: 52 },
    { name: '4 Dzulhijjah', jumlah: 68 },
    { name: '5 Dzulhijjah', jumlah: 75 },
    { name: '6 Dzulhijjah', jumlah: 83 },
    { name: '7 Dzulhijjah', jumlah: 95 },
    { name: '8 Dzulhijjah', jumlah: 110 },
    { name: '9 Dzulhijjah', jumlah: 122 },
    { name: '10 Dzulhijjah', jumlah: 128 },
  ];

  const barChartData = [
    { name: 'Panti Asuhan', jumlah: 400 },
    { name: 'Masjid', jumlah: 300 },
    { name: 'Pesantren', jumlah: 250 },
    { name: 'Dhuafa', jumlah: 200 },
    { name: 'Lainnya', jumlah: 100 },
  ];

  const pieChartData = [
    { name: 'Domba', value: 45 },
    { name: 'Sapi Patungan', value: 30 },
    { name: 'Sapi Utuh', value: 10 },
  ];

  const COLORS = ['#0F766E', '#14b8a6', '#2dd4bf'];

  // Custom tooltip formatter
  const formatTooltipValue = (value: any, name: any, props: { payload: { name: string; }; }) => {
    if (props.payload.name === 'jumlah') {
      return [`${value} pekurban`, name];
    }
    return [`${value}%`, name];
  };

  return (
    <div className="space-y-6">
      <h1 className="ml-6 text-muted-foreground mt-2">
        Ringkasan informasi Sistem Manajemen Qurban
      </h1>
      <Tabs defaultValue="sapi" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sapi">Status Sapi</TabsTrigger>
          <TabsTrigger value="domba">Status Domba</TabsTrigger>
        </TabsList>
        <TabsContent value="sapi">
          <Card>
            <CardHeader>
              <CardTitle>Status Sapi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {sapiData.map((sapi) => (
                  <div key={sapi.id} className="flex flex-col items-center justify-center p-2 border rounded-md">
                    <span className="text-lg">🐮{sapi.animalId}</span>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">{sapi.slaughtered ? "✅" : "⬜️"}</span>
                      {sapi.slaughtered && (
                        <span className="text-xs mt-1">{sapi.receivedByMdhohi ? "🧑‍🤝‍🧑✓" : "🧑‍🤝‍🧑✗"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="domba">
          <Card>
            <CardHeader>
              <CardTitle>Status Domba</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {dombaData.map((domba) => (
                  <div key={domba.id} className="flex flex-col items-center justify-center p-2 border rounded-md">
                    <span className="text-lg">🐐{domba.animalId}</span>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">{domba.slaughtered ? "✅" : "⬜️"}</span>
                      {domba.slaughtered && (
                        <span className="text-xs mt-1">{domba.receivedByMdhohi ? "🧑‍🤝‍🧑✓" : "🧑‍🤝‍🧑✗"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Penerimaan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Status Kupon</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Kupon Kembali</span>
                  <span className="font-medium">
                    {returnedKupon} / {totalKupon}
                  </span>
                </div>
                <Progress value={(returnedKupon / totalKupon) * 100} className="h-2" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Produk di Inventori</h3>
              <div className="grid grid-cols-2 gap-4">
                {produkLainnya.map((produk) => (
                  <div key={produk.id} className="flex justify-between items-center p-2 border rounded-md">
                    <span>{produk.nama}</span>
                    <span className="font-medium">{produk.pkgReceived}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Komulatif Timbang</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {produkDaging.map((item) => (
              <div key={item.id} className="flex flex-col items-center p-4 border rounded-md">
                <span className="text-xl mb-2">
                  {item.tipeId === 1 ? "🐮" : "🐐"} {item.berat}kg
                </span>
                <span className="text-3xl font-bold">{item.pkgOrigin}</span>
                <div className="text-xs mt-1">Target: {item.targetPaket}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribusi Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Institusi/Lembaga</th>
                  <th className="text-left p-2">Kode Distribusi</th>
                  <th className="text-left p-2">Produk Diterima</th>
                  <th className="text-left p-2">Jumlah</th>
                  <th className="text-left p-2">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {distribusiLog.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="p-2">{log.penerima.institusi || "-"}</td>
                    <td className="p-2">{log.penerima.category.category}</td>
                    <td className="p-2">{log.produkQurban.map((p) => p.nama).join(", ")}</td>
                    <td className="p-2">{log.numberOfPackages}</td>
                    <td className="p-2">{new Date(log.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {distribusiLog.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-2 text-center">
                      Belum ada data distribusi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribusi per Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {produkLainnya.map((produk) => {
              const total = produk.pkgDelivered
              const percentage =
                produk.targetPaket > 0 ? Math.min(100, (produk.pkgDelivered / produk.targetPaket) * 100) : 0

              // Calculate distribution per category
              const categoryDistribution = distribution.map((cat) => {
                const catLogs = distribusiLog.filter(
                  (log) => log.penerima.distributionId === cat.id && log.produkQurban.some((p) => p.id === produk.id),
                )

                const count = catLogs.reduce((sum, log) => sum + log.numberOfPackages, 0)
                const catPercentage = total > 0 ? (count / total) * 100 : 0

                return {
                  category: cat.category,
                  count,
                  percentage: catPercentage,
                }
              })

              return (
                <div key={produk.id} className="space-y-2">
                  <div className="font-medium">{produk.nama}</div>
                  <Progress value={percentage} className="h-2" />
                  <div className="text-sm">
                    {produk.pkgDelivered} / {produk.targetPaket} ({percentage.toFixed(1)}%)
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {categoryDistribution.map((dist, idx) => (
                      <div key={idx} className="text-xs p-1 border rounded">
                        {dist.category}: {dist.count} ({dist.percentage.toFixed(1)}%)
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pekurban
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPekurban}</div>
            <p className="text-xs text-muted-foreground">
              +12% dibanding tahun lalu
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Hewan
            </CardTitle>
            <span className="text-xl text-muted-foreground" >🐐</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHewan}</div>
            <p className="text-xs text-muted-foreground">
              40 domba, 45 sapi
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
              }).format(stats.danaTerkumpul)}
            </div>
            <p className="text-xs text-muted-foreground">
              85% dari target
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
            <div className="text-2xl font-bold">{stats.paketDidistribusikan}</div>
            <p className="text-xs text-muted-foreground">
              95% dari total paket
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Ikhtisar</TabsTrigger>
          <TabsTrigger value="distributions">Distribusi</TabsTrigger>
          <TabsTrigger value="animals">Hewan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Jumlah Pekurban</CardTitle>
              <CardDescription>
                Jumlah pendaftaran pekurban hingga hari H
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={areaChartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorJumlah" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value) => [`${value} pekurban`, 'Jumlah']} 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))' 
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="jumlah" 
                    stroke="#0F766E" 
                    fillOpacity={1} 
                    fill="url(#colorJumlah)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="distributions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Paket Qurban</CardTitle>
              <CardDescription>
                Jumlah paket daging qurban berdasarkan tujuan distribusi
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70} 
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value) => [`${value} paket`, 'Jumlah']} 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))' 
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="jumlah" fill="#0F766E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="animals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Jenis Hewan Qurban</CardTitle>
              <CardDescription>
                Persentase jenis hewan qurban
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value}%`} 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))' 
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs> */}
    </div>
  );
}