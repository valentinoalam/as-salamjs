import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getHewanQurban, getProdukHewan, getDistribution, getPenerima, getDistribusiLog } from "@/lib/db"
import { jenisProduk } from "@prisma/client"

export default async function QurbanHome() {
  const sapiData = await getHewanQurban("sapi")
  const dombaData = await getHewanQurban("domba")
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

  return (
    <div className="space-y-8">
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
                    <span className="text-lg">🐮{sapi.hewanId}</span>
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
                    <span className="text-lg">🐐{domba.hewanId}</span>
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
    </div>
  )
}
