"use client"

import { useState, useEffect } from "react"
import { useSocket } from "@/contexts/socket-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { addProductLog, createDistribusi, updateMudhohiReceived, updateErrorLogNote } from "./actions"
import { Counter, type jenisProduk } from "@prisma/client"
import { Download } from "lucide-react"
import { exportToExcel } from "@/lib/excel"

type ProdukHewan = {
  id: number
  nama: string
  tipeId: number | null
  berat: number | null
  targetPaket: number
  pkgOrigin: number
  pkgReceived: number
  pkgDelivered: number
  jenisProduk: jenisProduk
  tipe_hewan: {
    id: number
    nama: string
    icon: string | null
  } | null
}

type Distribution = {
  id: string
  category: string
  target: number
  realized: number
}

type Mudhohi = {
  id: string
  nama_pengqurban: string | null
  nama_peruntukan: string | null
  hewan: {
    animalId: string
    receivedByMdhohi: boolean
  }[]
}

type Penerima = {
  id: string
  distributionId: string
  noKupon: string | null
  receivedBy: string | null
  isDiterima: boolean
  category: {
    category: string
  }
}

export type ErrorLog = {
  id: number
  produkId: number
  event: string
  note: string
  timestamp: Date
  produk: ProdukHewan
}

interface CounterInventoriProps {
  initialProducts: ProdukHewan[]
  distributions: Distribution[]
  initialMudhohi: Mudhohi[]
  initialPenerima: Penerima[]
  initialErrLogs: ErrorLog[]
}

export default function CounterInventori({
  initialProducts,
  distributions,
  initialMudhohi,
  initialPenerima,
  initialErrLogs
}: CounterInventoriProps) {
  const [products, setProducts] = useState<ProdukHewan[]>(initialProducts)
  const [mudhohi, setMudhohi] = useState<Mudhohi[]>(initialMudhohi)
  const [penerima, setPenerima] = useState<Penerima[]>(initialPenerima)
  const [mudhohiPage, setMudhohiPage] = useState(1)
  const [penerimaPage, setPenerimaPage] = useState(1)
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>(initialErrLogs)
  const [loading, setLoading] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    receivedBy: "",
    institusi: "",
    distributionId: distributions[0]?.id || "",
    selectedProducts: [] as number[],
    numberOfPackages: 1,
  })

  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!socket) return

    const handleUpdateProduct = (data: { products: ProdukHewan[] }) => {
      setProducts((prev) =>
        prev.map((item) => {
          const updated = data.products.find((p) => p.id === item.id)
          return updated ? { ...item, ...updated } : item
        }),
      )
    }

    const handleUpdateMudhohi = (data: { mudhohi: Mudhohi[] }) => {
      setMudhohi(data.mudhohi)
    }

    const handleUpdatePenerima = (data: { penerima: Penerima[] }) => {
      setPenerima(data.penerima)
    }

    const handleErrorLogs = (data: { errorLogs: ErrorLog[] }) => {
      setErrorLogs(data.errorLogs)
    }

    socket.on("update-product", handleUpdateProduct)
    socket.on("update-mudhohi", handleUpdateMudhohi)
    socket.on("update-penerima", handleUpdatePenerima)
    socket.on("error-logs", handleErrorLogs)

    // Fetch error logs on mount
    fetchErrorLogs()

    return () => {
      socket.off("update-product", handleUpdateProduct)
      socket.off("update-mudhohi", handleUpdateMudhohi)
      socket.off("update-penerima", handleUpdatePenerima)
      socket.off("error-logs", handleErrorLogs)
    }
  }, [socket])

  const fetchErrorLogs = async () => {
    try {
      const res = await fetch("/api/error-logs")
      const data = await res.json()
      setErrorLogs(data)
    } catch (error) {
      console.error("Error fetching error logs:", error)
    }
  }

  const fetchMudhohiPage = async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mudhohi?page=${page}&pageSize=10`)
      const data = await res.json()
      setMudhohi(data)
      setMudhohiPage(page)
    } catch (error) {
      console.error("Error fetching mudhohi data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch mudhohi data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPenerimaPage = async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/penerima?page=${page}&pageSize=10`)
      const data = await res.json()
      setPenerima(data)
      setPenerimaPage(page)
    } catch (error) {
      console.error("Error fetching penerima data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch penerima data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleProductSelection = (productId: number, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        selectedProducts: [...prev.selectedProducts, productId],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedProducts: prev.selectedProducts.filter((id) => id !== productId),
      }))
    }
  }

  const handleSubmitDistribusi = async () => {
    if (!formData.receivedBy || !formData.distributionId || formData.selectedProducts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      // Create new penerima
      const penerimaData = {
        distributionId: formData.distributionId,
        receivedBy: formData.receivedBy,
        institusi: formData.institusi || undefined,
      }

      const res = await fetch("/api/penerima", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(penerimaData),
      })

      const newPenerima = await res.json()

      // Create distribusi
      await createDistribusi(newPenerima.id, formData.selectedProducts, formData.numberOfPackages)

      // Update products in inventory
      for (const productId of formData.selectedProducts) {
        await addProductLog(
          productId,
          "decrease",
          Counter.INVENTORY,
          formData.numberOfPackages,
          `Distributed to ${formData.receivedBy} (${formData.institusi || "Individual"})`,
        )
      }

      toast({
        title: "Success",
        description: "Distribution recorded successfully",
      })

      // Reset form
      setFormData({
        receivedBy: "",
        institusi: "",
        distributionId: distributions[0]?.id || "",
        selectedProducts: [],
        numberOfPackages: 1,
      })

      // Refresh data
      const productsRes = await fetch("/api/products")
      const productsData = await productsRes.json()
      setProducts(productsData)
    } catch (error) {
      console.error("Error creating distribution:", error)
      toast({
        title: "Error",
        description: "Failed to record distribution. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleMudhohiReceived = async (animalId: string, received: boolean) => {
    try {
      await updateMudhohiReceived(animalId, received)

      // Update local state
      setMudhohi((prev) =>
        prev.map((m) => ({
          ...m,
          hewan: m.hewan.map((h) => (h.animalId === animalId ? { ...h, receivedByMdhohi: received } : h)),
        })),
      )

      toast({
        title: "Success",
        description: `Mudhohi portion ${received ? "marked as received" : "unmarked"}`,
      })
    } catch (error) {
      console.error("Error updating mudhohi received status:", error)
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleKuponReceived = async (penerimaId: string, received: boolean) => {
    try {
      // Update penerima
      await fetch(`/api/penerima/${penerimaId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isDiterima: received }),
      })

      // Update local state
      setPenerima((prev) => prev.map((p) => (p.id === penerimaId ? { ...p, isDiterima: received } : p)))

      toast({
        title: "Success",
        description: `Kupon ${received ? "marked as received" : "unmarked"}`,
      })
    } catch (error) {
      console.error("Error updating kupon received status:", error)
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateErrorNote = async (id: number, note: string) => {
    try {
      await updateErrorLogNote(id, note)

      // Update local state
      setErrorLogs((prev) => prev.map((log) => (log.id === id ? { ...log, note } : log)))

      toast({
        title: "Success",
        description: "Error note updated",
      })
    } catch (error) {
      console.error("Error updating error note:", error)
      toast({
        title: "Error",
        description: "Failed to update note. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Add these functions inside the component
  const handleExportProductsToExcel = () => {
    const data = products.map((product) => ({
      ID: product.id,
      Nama: product.nama,
      Tipe: product.tipe_hewan?.nama || "-",
      Jenis: product.jenisProduk,
      Berat: product.berat || 0,
      "Target Paket": product.targetPaket,
      "Paket Asal": product.pkgOrigin,
      "Paket Diterima": product.pkgReceived,
      "Paket Didistribusi": product.pkgDelivered,
    }))

    exportToExcel(data, "inventori_products")
  }

  const handleExportMudhohiToExcel = () => {
    const data = mudhohi.map((m) => ({
      ID: m.id,
      "Nama Pengqurban": m.nama_pengqurban || "-",
      "Nama Peruntukan": m.nama_peruntukan || "-",
      Hewan: m.hewan.map((h) => `${h.animalId}`).join(", "),
      "Jatah Diambil": m.hewan.map((h) => (h.receivedByMdhohi ? "Ya" : "Tidak")).join(", "),
    }))

    exportToExcel(data, "mudhohi_data")
  }

  const handleExportPenerimaToExcel = () => {
    const data = penerima
      .filter((p) => p.noKupon)
      .map((p) => ({
        ID: p.id,
        "No Kupon": p.noKupon || "-",
        Penerima: p.receivedBy || "-",
        Kategori: p.category.category,
        Status: p.isDiterima ? "Sudah Dikembalikan" : "Belum Dikembalikan",
      }))

    exportToExcel(data, "penerima_kupon")
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      <Tabs defaultValue="distribusi">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="distribusi">Distribusi</TabsTrigger>
          <TabsTrigger value="mudhohi">Pengambilan Mudhohi</TabsTrigger>
          <TabsTrigger value="kupon">Kupon</TabsTrigger>
        </TabsList>

        <TabsContent value="distribusi">
          <Card>
            <CardHeader>
              <CardTitle>Form Distribusi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receivedBy">Nama Penerima</Label>
                    <Input
                      id="receivedBy"
                      value={formData.receivedBy}
                      onChange={(e) => handleFormChange("receivedBy", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="institusi">Nama Institusi (opsional)</Label>
                    <Input
                      id="institusi"
                      value={formData.institusi}
                      onChange={(e) => handleFormChange("institusi", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distributionId">Kategori Distribusi</Label>
                  <Select
                    value={formData.distributionId}
                    onValueChange={(value) => handleFormChange("distributionId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {distributions.map((dist) => (
                        <SelectItem key={dist.id} value={dist.id}>
                          {dist.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pilih Produk</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-4 rounded-md max-h-60 overflow-y-auto">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={formData.selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleProductSelection(product.id, checked as boolean)}
                        />
                        <Label htmlFor={`product-${product.id}`} className="cursor-pointer">
                          {product.nama} ({product.pkgReceived} tersedia)
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfPackages">Jumlah Paket</Label>
                  <Input
                    id="numberOfPackages"
                    type="number"
                    min={1}
                    value={formData.numberOfPackages}
                    onChange={(e) => handleFormChange("numberOfPackages", Number.parseInt(e.target.value) || 1)}
                  />
                </div>

                <Button onClick={handleSubmitDistribusi} className="w-full">
                  Submit
                </Button>
                <Button variant="outline" onClick={handleExportProductsToExcel} className="w-full md:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Produk di Inventori</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="flex flex-col items-center p-4 border rounded-md">
                    <span className="text-lg mb-2">{product.nama}</span>
                    <span className="text-3xl font-bold">{product.pkgReceived}</span>
                    <div className="text-xs mt-1">
                      Origin: {product.pkgOrigin} | Delivered: {product.pkgDelivered}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Error Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errorLogs.map((log) => (
                  <div key={log.id} className="p-4 border rounded-md bg-red-50 dark:bg-red-900/20">
                    <div className="flex justify-between">
                      <div className="font-medium">{log.produk.nama}</div>
                      <div className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="mt-2">{log.note}</div>
                    <div className="mt-2 flex items-end gap-2">
                      <Input
                        placeholder="Add note"
                        defaultValue={log.note}
                        onBlur={(e) => handleUpdateErrorNote(log.id, e.target.value)}
                      />
                      <Button size="sm" variant="outline">
                        Update
                      </Button>
                    </div>
                  </div>
                ))}
                {errorLogs.length === 0 && <div className="text-center p-4">No errors logged</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mudhohi">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pengambilan Jatah Mudhohi</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMudhohiPage(mudhohiPage > 1 ? mudhohiPage - 1 : 1)}
                  disabled={mudhohiPage <= 1 || loading}
                >
                  Previous
                </Button>
                <span className="py-2 px-4 border rounded-md">Page {mudhohiPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMudhohiPage(mudhohiPage + 1)}
                  disabled={loading}
                >
                  Next
                </Button>
                <Button variant="outline" onClick={handleExportMudhohiToExcel} className="w-full md:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mudhohi.map((m) => (
                  <div key={m.id} className="p-4 border rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{m.nama_pengqurban || "Unnamed"}</div>
                        <div className="text-sm text-muted-foreground">{m.nama_peruntukan || "No designation"}</div>
                      </div>
                      <div className="space-y-2">
                        {m.hewan.map((h) => (
                          <div key={h.animalId} className="flex items-center gap-2">
                            <span>Hewan #{h.animalId}</span>
                            <Button
                              size="sm"
                              variant={h.receivedByMdhohi ? "default" : "outline"}
                              onClick={() => handleMudhohiReceived(h.animalId, !h.receivedByMdhohi)}
                            >
                              {h.receivedByMdhohi ? "Sudah Diambil" : "Belum Diambil"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {mudhohi.length === 0 && <div className="text-center p-4">No mudhohi data found</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kupon">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pengembalian Kupon</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPenerimaPage(penerimaPage > 1 ? penerimaPage - 1 : 1)}
                  disabled={penerimaPage <= 1 || loading}
                >
                  Previous
                </Button>
                <span className="py-2 px-4 border rounded-md">Page {penerimaPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPenerimaPage(penerimaPage + 1)}
                  disabled={loading}
                >
                  Next
                </Button>
                <Button variant="outline" onClick={handleExportPenerimaToExcel} className="w-full md:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {penerima
                  .filter((p) => p.noKupon)
                  .map((p) => (
                    <div key={p.id} className="p-4 border rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">Kupon: {p.noKupon}</div>
                          <div className="text-sm text-muted-foreground">
                            {p.receivedBy || "No name"} ({p.category.category})
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={p.isDiterima ? "default" : "outline"}
                          onClick={() => handleKuponReceived(p.id, !p.isDiterima)}
                        >
                          {p.isDiterima ? "Sudah Dikembalikan" : "Belum Dikembalikan"}
                        </Button>
                      </div>
                    </div>
                  ))}
                {penerima.filter((p) => p.noKupon).length === 0 && (
                  <div className="text-center p-4">No kupon data found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
