/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Download,
  Package,
  Truck,
  Home,
  Ticket,
  Check,
  Plus,
  Minus,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Search,
  MapPin,
  Clock,
  Beef,
} from "lucide-react"
import type { Mudhohi, Penerima } from "@/types/qurban"
import { exportToExcel } from "#@/lib/utils/excel.ts"
import { useStores } from "@/hooks/qurban/use-stores"
import { useProduct } from "#@/hooks/qurban/use-produk.tsx"
import { useDistribusi } from "#@/hooks/qurban/use-distribusi.tsx"
import type { Kupon } from "@prisma/client"

const ITEMS_PER_PAGE = 10

const JatahMudhohiTab = () => {
  const { productsQuery } = useProduct()
  // Get data from context
  const {
    distribusiQuery,
    penerimaQuery,
    updateMudhohi,
    mudhohiQuery,
  } = useDistribusi()

  // Get UI state from context
  const { tabs, setActiveTab, forms, updateFormField, resetForm } = useStores().ui

  // Local state
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true)
  const [mudhohiSearchFilter, setMudhohiSearchFilter] = useState("")
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE)
  const [isLoading, setIsLoading] = useState(false)

  // Get data from queries
  const products = productsQuery.data || []
  const distributions = distribusiQuery.data
  const penerima = penerimaQuery.data || []

  // Initialize form data
  useEffect(() => {
    if (distributions.length > 0 && !forms.distribusiForm?.distribusiId) {
      updateFormField("distribusiForm", "distribusiId", distributions[0]?.id || "")
    }
  }, [distributions, forms.distribusiForm?.distribusiId, updateFormField])

  // Filtered and processed data
  const filteredMudhohi = useMemo(() => {
    if (!mudhohiQuery.data) return []
    
    return mudhohiQuery.data.filter((mudhohi: any) => {
      // Filter by search term
      const matchesSearch =
        !mudhohiSearchFilter ||
        mudhohi.nama_pengqurban?.toLowerCase().includes(mudhohiSearchFilter.toLowerCase()) ||
        mudhohi.dash_code?.toLowerCase().includes(mudhohiSearchFilter.toLowerCase()) ||
        (mudhohi.alamat && mudhohi.alamat.toLowerCase().includes(mudhohiSearchFilter.toLowerCase()))

      // Filter by availability if toggle is on
      if (showOnlyAvailable) {
        const hasAvailableProducts = mudhohi.hewan.some(
          (h: any) => (h.status === "SIAP_AMBIL" || h.onInventory) && !h.receivedByMdhohi,
        )
        return matchesSearch && hasAvailableProducts
      }

      return matchesSearch
    })
  }, [mudhohiQuery.data, mudhohiSearchFilter, showOnlyAvailable])

  // Reset displayed items when filters change
  useEffect(() => {
    setDisplayedItems(ITEMS_PER_PAGE)
  }, [mudhohiSearchFilter, showOnlyAvailable])

  // Load more items
  const loadMoreItems = useCallback(() => {
    if (isLoading || displayedItems >= filteredMudhohi.length) return
    
    setIsLoading(true)
    // Simulate loading delay
    setTimeout(() => {
      setDisplayedItems(prev => Math.min(prev + ITEMS_PER_PAGE, filteredMudhohi.length))
      setIsLoading(false)
    }, 300)
  }, [isLoading, displayedItems, filteredMudhohi.length])

  // Handle scroll event
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100
    
    if (isNearBottom && !isLoading && displayedItems < filteredMudhohi.length) {
      loadMoreItems()
    }
  }, [loadMoreItems, isLoading, displayedItems, filteredMudhohi.length])

  const handleExportData = (type: string) => {
    let data: any[] = []
    let filename = ""

    switch (type) {
      case "products":
        data = products.map((product) => ({
          ID: product.id,
          Nama: product.nama,
          Hewan: product.JenisHewan || "-",
          Produk: product.JenisProduk,
          "Di Inventori": product.diInventori,
          "Sudah Diserahkan": product.sdhDiserahkan,
          "Target Paket": product.targetPaket,
        }))
        filename = "inventori_products"
        break
      case "penerima":
        data = penerima.map((p: Penerima) => ({
          ID: p.id,
          Nama: p.nama || "-",
          "Diterima Oleh": p.diterimaOleh || "-",
          Kategori: p.distribusi?.kategori || "-",
          Status: p.sudahMenerima ? "Sudah Menerima" : "Belum Menerima",
        }))
        filename = "penerima_data"
        break
      // case "kupons":
      //   data = penerima
      //     .filter((p: Penerima) => p.kupon.map((kuponItem: Kupon) => kuponItem.id))
      //     .map((p: Penerima) => ({
      //       "No Kupon": p.kupon.map((kuponItem: Kupon) => kuponItem.id).join(', '),
      //       Penerima: p.diterimaOleh || p.nama || "-",
      //       Kategori: p.distribusi?.kategori || "-",
      //       Status: p.sudahMenerima ? "Sudah DiRETURNEDkan" : "Belum DiRETURNEDkan",
      //     }))
      //   filename = "kupon_data"
      //   break
      case "mudhohi":
        data = filteredMudhohi.map((mudhohi: any) => ({
          ID: mudhohi.id,
          "Nama Pengqurban": mudhohi.nama_pengqurban,
          "Nama Peruntukan": mudhohi.nama_peruntukan || "-",
          "Kode Dash": mudhohi.dash_code,
          Alamat: mudhohi.alamat || "-",
          "Pesan Khusus": mudhohi.pesan_khusus || "-",
          "Jumlah Hewan": mudhohi.hewan.length,
          "Sudah Diambil": mudhohi.hewan.filter((h: any) => h.receivedByMdhohi).length,
          "Siap Diambil": mudhohi.hewan.filter((h: any) => (h.status === "SIAP_AMBIL" || h.onInventory) && !h.receivedByMdhohi).length,
        }))
        filename = "mudhohi_data"
        break
    }

    exportToExcel(data, filename)
  }

  // Mudhohi Card Component
  const MudhohiCard = ({ mudhohi }: { mudhohi: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <CardTitle className="text-xl">{mudhohi.nama_pengqurban}</CardTitle>
              <Badge variant="outline" className="font-mono">
                {mudhohi.dash_code}
              </Badge>
            </div>

            {mudhohi.nama_peruntukan && (
              <p className="text-sm text-gray-600 flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>Untuk: {mudhohi.nama_peruntukan}</span>
              </p>
            )}

            {mudhohi.alamat && (
              <p className="text-sm text-gray-600 flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{mudhohi.alamat}</span>
              </p>
            )}

            <p className="text-sm text-gray-600 flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(mudhohi.createdAt).toLocaleDateString("id-ID")}</span>
            </p>

            {mudhohi.pesan_khusus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-800 mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">Pesan Khusus:</span>
                </div>
                <p className="text-blue-700 text-sm">{mudhohi.pesan_khusus}</p>
              </div>
            )}
          </div>

          <div className="text-right space-y-2">
            {mudhohi.hewan.map((hewan: any) => (
              <div key={hewan.hewanId} className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {hewan.tipe?.jenis === "KAMBING" || hewan.tipe?.jenis === "DOMBA"
                    ? hewan.hewanId
                    : hewan.tipe?.nama || "Unknown"}
                </span>
                <div
                  className={`w-3 h-3 rounded-full ${
                    hewan.status === "TERDAFTAR"
                      ? "bg-blue-500"
                      : hewan.status === "SIAP_SEMBELIH"
                        ? "bg-yellow-500"
                        : hewan.status === "DISEMBELIH"
                          ? "bg-orange-500"
                          : hewan.status === "SIAP_AMBIL"
                            ? "bg-green-500"
                            : hewan.status === "DIAMBIL"
                              ? "bg-gray-500"
                              : "bg-gray-400"
                  }`}
                />
                <Badge variant="secondary" className="text-xs">
                  {hewan.status}
                </Badge>
                {(hewan.onInventory || hewan.status === "SIAP_AMBIL") && (
                  <Badge className="bg-green-100 text-green-800 text-xs">Sudah di Inventori</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 mb-3">Status Pengambilan</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mudhohi.hewan.map((hewan: any) => {
              const canPickup =
                (hewan.status === "SIAP_AMBIL" || hewan.onInventory) && !hewan.receivedByMdhohi
              const isPickedUp = hewan.receivedByMdhohi

              return (
                <Card
                  key={hewan.hewanId}
                  className={`border-2 ${
                    isPickedUp
                      ? "border-gray-200 bg-gray-50"
                      : canPickup
                        ? "border-green-200 bg-green-50"
                        : "border-yellow-200 bg-yellow-50"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {hewan.tipe?.jenis === "KAMBING" || hewan.tipe?.jenis === "DOMBA"
                              ? hewan.hewanId
                              : `${hewan.tipe?.nama || "Unknown"} #${hewan.hewanId}`}
                          </h5>
                          <Badge
                            className={
                              hewan.status === "TERDAFTAR"
                                ? "bg-blue-100 text-blue-800"
                                : hewan.status === "SIAP_SEMBELIH"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : hewan.status === "DISEMBELIH"
                                    ? "bg-orange-100 text-orange-800"
                                    : hewan.status === "SIAP_AMBIL"
                                      ? "bg-green-100 text-green-800"
                                      : hewan.status === "DIAMBIL"
                                        ? "bg-gray-100 text-gray-800"
                                        : "bg-gray-100 text-gray-800"
                            }
                          >
                            {hewan.status}
                          </Badge>
                        </div>
                        {hewan.slaughteredAt && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(hewan.slaughteredAt).toLocaleDateString("id-ID")}</span>
                          </div>
                        )}
                      </div>

                      {hewan.meatPackageCount > 0 && (
                        <div className="text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Paket Daging:</span>
                            <span className="font-medium">{hewan.meatPackageCount}</span>
                          </div>
                        </div>
                      )}

                      {isPickedUp ? (
                        <Button disabled className="w-full bg-gray-400" size="sm">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Sudah Diambil
                        </Button>
                      ) : canPickup ? (
                        <Button
                          onClick={() => updateMudhohi({ hewanId: hewan.hewanId, received: true })}
                          className="w-full bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Tandai Diambil
                        </Button>
                      ) : (
                        <Button disabled variant="outline" className="w-full" size="sm">
                          <Clock className="w-4 h-4 mr-2" />
                          Belum Siap
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">🏠 Pengambilan Jatah Mudhohi</h3>
        <div className="flex gap-2">
          <Button
            variant={showOnlyAvailable ? "default" : "outline"}
            onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
            size="sm"
          >
            {showOnlyAvailable ? "Semua Mudhohi" : "Hanya Tersedia"}
          </Button>
          <Button variant="outline" onClick={() => handleExportData("mudhohi")}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Beef className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {mudhohiQuery.data?.filter((m: Mudhohi) => m.hewan.some((h: any) => h.tipe?.jenis === "SAPI")).length ||
                    0}
                </p>
                <p className="text-sm text-gray-600">Total Sapi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {mudhohiQuery.data?.filter((m: Mudhohi) =>
                    m.hewan.some((h: any) => h.tipe?.jenis === "DOMBA" || h.tipe?.jenis === "KAMBING"),
                  ).length || 0}
                </p>
                <p className="text-sm text-gray-600">Total Domba/Kambing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {mudhohiQuery.data?.filter((m: Mudhohi) =>
                    m.hewan.some((h: any) => h.status === "SIAP_AMBIL" && !h.receivedByMdhohi),
                  ).length || 0}
                </p>
                <p className="text-sm text-gray-600">Siap Diambil</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">
                  {mudhohiQuery.data?.filter((m: Mudhohi) => m.hewan.every((h) => h.receivedByMdhohi)).length || 0}
                </p>
                <p className="text-sm text-gray-600">Sudah Diambil</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={mudhohiSearchFilter}
              onChange={(e) => setMudhohiSearchFilter(e.target.value)}
              placeholder="Cari nama mudhohi, kode dash, atau alamat..."
              className="pl-10"
            />
          </div>
          {mudhohiSearchFilter && (
            <p className="text-sm text-gray-600 mt-2">
              Menampilkan hasil pencarian: <strong>{mudhohiSearchFilter}</strong>
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Menampilkan {Math.min(displayedItems, filteredMudhohi.length)} dari {filteredMudhohi.length} mudhohi
          </p>
        </CardContent>
      </Card>

      {/* Mudhohi List with Lazy Loading */}
      {!mudhohiQuery.data || mudhohiQuery.data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Home className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Belum Ada Data Mudhohi</h3>
            <p className="text-gray-600">Belum ada data mudhohi yang tersedia dalam sistem</p>
          </CardContent>
        </Card>
      ) : filteredMudhohi.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Tidak Ada Hasil</h3>
            <p className="text-gray-600">Tidak ditemukan mudhohi yang sesuai dengan filter pencarian</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[800px] w-full" onScrollCapture={handleScroll}>
              <div className="space-y-4 p-6">
                {filteredMudhohi.slice(0, displayedItems).map((mudhohi: any) => (
                  <MudhohiCard key={mudhohi.id} mudhohi={mudhohi} />
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Memuat data...</span>
                  </div>
                )}
                
                {/* Load more button (fallback) */}
                {!isLoading && displayedItems < filteredMudhohi.length && (
                  <div className="flex justify-center py-4">
                    <Button variant="outline" onClick={loadMoreItems}>
                      Muat Lebih Banyak ({filteredMudhohi.length - displayedItems} tersisa)
                    </Button>
                  </div>
                )}
                
                {/* End of list indicator */}
                {displayedItems >= filteredMudhohi.length && filteredMudhohi.length > ITEMS_PER_PAGE && (
                  <div className="text-center py-4 text-gray-500 text-sm border-t">
                    Semua data telah dimuat ({filteredMudhohi.length} mudhohi)
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default JatahMudhohiTab