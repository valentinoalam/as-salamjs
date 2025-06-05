"use client"

import { useState, useEffect } from "react"
import { useSocket } from "@/contexts/socket-context"
import { useQurban } from "@/contexts/qurban-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { updateMudhohiReceived, updateErrorLogNote, receiveShipment } from "./actions"
import { PengirimanStatus, JenisDistribusi, PaymentStatus, type ErrorLog } from "@prisma/client"
import { Download } from "lucide-react"
import { exportToExcel } from "@/lib/excel"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Distribusi, Mudhohi, Penerima, ProdukHewan, Shipment } from "@/types/qurban"
import { getMudhohi } from "@/services/mudhohi"
import { getPenerima } from "@/services/qurban"
import { useQuery } from "@tanstack/react-query"


export function useMudhohiQuery(page: number, pageSize = 10, status?: PaymentStatus, searchTerm?: string) {
  return useQuery({
    queryKey: ['mudhohi', page, pageSize, status, searchTerm],
    queryFn: () => getMudhohi(page, pageSize, status, searchTerm),
  })
}

export function usePenerimaQuery(distribusiId?: string) {
  return useQuery({
    queryKey: ['penerima', distribusiId],
    queryFn: () => getPenerima(distribusiId),
  })
}

export default function CounterInventoriPage() {
  const {
    productsQuery,
    shipmentsQuery,
    errorLogsQuery,
    createPenerima
  } = useQurban();
  
  const [mudhohiPage, setMudhohiPage] = useState(1)
  const [penerimaPage, setPenerimaPage] = useState(1) // Only needed if penerima is paginated
  const mudhohiQuery = useMudhohiQuery(mudhohiPage)
  const penerimaQuery = usePenerimaQuery()


  const mudhohi = mudhohiQuery.data
  const penerima = penerimaQuery.data
  const [loading, setLoading] = useState(false)

  // Get data from context
  const products = productsQuery.data || []
  const shipments = shipmentsQuery.data || []
  const errorLogs = errorLogsQuery.data || []
  
  const pendingShipments = shipments.filter(
    (s) => s.statusPengiriman === PengirimanStatus.DIKIRIM
  )

  // Form states
  const [formData, setFormData] = useState({
    receivedBy: "",
    institusi: "",
    distribusiId: "",
    selectedProducts: [] as number[],
    jumlahPaket: 1,
  })

  // Shipment receiving state
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [receivedProducts, setReceivedProducts] = useState<{ produkId: number; jumlah: number }[]>([])

  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!socket) return

    const handleUpdateProduct = (data: { products: ProdukHewan[] }) => {
      productsQuery.refetch()
    }

    const handleUpdateMudhohi = (data: { mudhohi: Mudhohi[] }) => {
      setMudhohi(data.mudhohi)
    }

    const handleUpdatePenerima = (data: { penerima: Penerima[] }) => {
      setPenerima(data.penerima)
    }

    const handleErrorLogs = (data: { errorLogs: ErrorLog[] }) => {
      errorLogsQuery.refetch()
    }

    const handleNewShipment = (data: { shipment: Shipment }) => {
      shipmentsQuery.refetch()
      toast({
        title: "New Shipment",
        description: `Shipment #${data.shipment.id} has arrived from Counter Timbang`,
      })
    }

    const handleUpdateShipment = (data: { shipment: Shipment }) => {
      shipmentsQuery.refetch()
    }
    
    socket.on("update-product", handleUpdateProduct)
    socket.on("update-mudhohi", handleUpdateMudhohi)
    socket.on("update-penerima", handleUpdatePenerima)
    socket.on("error-logs", handleErrorLogs)
    socket.on("new-shipment", handleNewShipment)
    socket.on("update-shipment", handleUpdateShipment)
    
    return () => {
      socket.off("update-product", handleUpdateProduct)
      socket.off("update-mudhohi", handleUpdateMudhohi)
      socket.off("update-penerima", handleUpdatePenerima)
      socket.off("error-logs", handleErrorLogs)
      socket.off("new-shipment", handleNewShipment)
      socket.off("update-shipment", handleUpdateShipment)
    }
  }, [socket])

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
    if (!formData.receivedBy || !formData.distribusiId || formData.selectedProducts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      await createPenerima({
        distribusiId: formData.distribusiId,
        nama: formData.institusi || formData.receivedBy,
        diterimaOleh: formData.receivedBy,
        jenis: formData.institusi ? JenisDistribusi.KELOMPOK : JenisDistribusi.INDIVIDU,
        produkDistribusi: formData.selectedProducts.map((productId) => ({
          produkId: productId,
          jumlah: formData.jumlahPaket,
        })),
      })

      toast({
        title: "Success",
        description: "Distribution recorded successfully",
      })

      // Reset form
      setFormData({
        receivedBy: "",
        institusi: "",
        distribusiId: distributions[0]?.id || "",
        selectedProducts: [],
        jumlahPaket: 1,
      })

      // Refresh data
      productsQuery.refetch()
    } catch (error) {
      console.error("Error creating distribution:", error)
      toast({
        title: "Error",
        description: "Failed to record distribution. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleMudhohiReceived = async (hewanId: string, received: boolean) => {
    try {
      await updateMudhohiReceived(hewanId, received)

      // Update local state
      setMudhohi((prev) =>
        prev.map((m) => ({
          ...m,
          hewan: m.hewan.map((h) => (h.hewanId === hewanId ? { ...h, receivedByMdhohi: received } : h)),
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

  const handleUpdateErrorNote = async (id: number, note: string) => {
    try {
      await updateErrorLogNote(id, note)
      errorLogsQuery.refetch()
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
  
  // Shipment handling functions
  const handlePrepareReceiveShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment)
    setReceivedProducts(
      shipment.daftarProdukHewan.map((item) => ({
        produkId: item.produkId,
        jumlah: item.jumlah,
      })),
    )
    setShowReceiveDialog(true)
  }

  const handleUpdateReceivedQuantity = (produkId: number, jumlah: number) => {
    setReceivedProducts((prev) => prev.map((item) => (item.produkId === produkId ? { ...item, jumlah } : item)))
  }

  const handleReceiveShipment = async () => {
    if (!selectedShipment) return

    setIsReceivingShipment(true)

    try {
      const result = await receiveShipment(selectedShipment.id, receivedProducts)

      if (result.success) {
        toast({
          title: "Shipment Received",
          description: "The shipment has been successfully received",
        })

        // Close dialog
        setShowReceiveDialog(false)
        setSelectedShipment(null)
        setReceivedProducts([])

        // Refresh data
        shipmentsQuery.refetch()
        productsQuery.refetch()

        // If there were discrepancies, show a warning
        if (result.discrepancies && result.discrepancies.length > 0) {
          toast({
            title: "Discrepancies Detected",
            description: `${result.discrepancies.length} discrepancies were found and logged`,
            variant: "destructive",
          })
        }
      } 
    } catch (error) {
      console.error("Error receiving shipment:", error)
      toast({
        title: "Error",
        description: "Failed to receive shipment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsReceivingShipment(false)
    }
  }

  const getShipmentStatusBadge = (status: PengirimanStatus) => {
    switch (status) {
      case PengirimanStatus.PENDING:
        return <Badge variant="outline">Pending</Badge>
      case PengirimanStatus.DIKIRIM:
        return <Badge variant="secondary">Dikirim</Badge>
      case PengirimanStatus.DITERIMA:
        return <Badge variant="default">Diterima</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Add these functions inside the component
  const handleExportProductsToExcel = () => {
    const data = products.map((product) => ({
      ID: product.id,
      Nama: product.nama,
      Tipe: product.tipe_hewan?.nama || "-",
      Jenis: product.JenisProduk,
      Berat: product.berat || 0,
      "Target Paket": product.targetPaket,
      "Paket Asal": product.diTimbang,
      "Paket Diterima": product.diInventori,
      "Paket Didistribusi": product.sdhDiserahkan,
    }))

    exportToExcel(data, "inventori_products")
  }

  const handleExportMudhohiToExcel = () => {
    const data = mudhohi.map((m) => ({
      ID: m.id,
      "Nama Pengqurban": m.nama_pengqurban || "-",
      "Nama Peruntukan": m.nama_peruntukan || "-",
      Hewan: m.hewan.map((h) => `${h.hewanId}`).join(", "),
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
        Penerima: p.diterimaOleh || "-",
        Kategori: p.distribusi.kategori,
        Status: p.logDistribusi[0]?.diterima ? "Sudah Dikembalikan" : "Belum Dikembalikan",
      }))

    exportToExcel(data, "penerima_kupon")
  }

  if (mudhohiQuery.isLoading || penerimaQuery.isLoading) {
    return <div>Loading...</div>
  }

  if (mudhohiQuery.isError || penerimaQuery.isError) {
    return <div>Error loading data</div>
  }
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      <Tabs defaultValue="distribusi">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="distribusi">Distribusi</TabsTrigger>
          <TabsTrigger value="pengiriman">Pengiriman</TabsTrigger>
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
                  <Label htmlFor="distribusiId">Kategori Distribusi</Label>
                  <Select
                    value={formData.distribusiId}
                    onValueChange={(value) => handleFormChange("distribusiId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {distributions.map((dist) => (
                        <SelectItem key={dist.id} value={dist.id}>
                          {dist.kategori}
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
                          {product.nama} ({product.diInventori} tersedia)
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jumlahPaket">Jumlah Paket</Label>
                  <Input
                    id="jumlahPaket"
                    type="number"
                    min={1}
                    value={formData.jumlahPaket}
                    onChange={(e) => handleFormChange("jumlahPaket", Number.parseInt(e.target.value) || 1)}
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
                    <span className="text-3xl font-bold">{product.diInventori}</span>
                    <div className="text-xs mt-1">
                      Origin: {product.diTimbang} | Delivered: {product.sdhDiserahkan}
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

        <TabsContent value="pengiriman">
          <Card>
            <CardHeader>
              <CardTitle>Pengiriman Masuk</CardTitle>
              <CardDescription>Daftar pengiriman yang perlu diterima dari Counter Timbang</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingShipments.length > 0 ? (
                <div className="space-y-4">
                  {pendingShipments.map((shipment) => (
                    <div key={shipment.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="font-medium">Shipment #{shipment.id}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {new Date(shipment.waktuPengiriman).toLocaleString()}
                          </span>
                        </div>
                        {getShipmentStatusBadge(shipment.statusPengiriman)}
                      </div>

                      <div className="mt-2">
                        <h4 className="text-sm font-medium mb-1">Produk yang Dikirim:</h4>
                        <ul className="space-y-1">
                          {shipment.daftarProdukHewan.map((item) => (
                            <li key={item.id} className="text-sm">
                              {item.produk.nama}: {item.jumlah} paket
                            </li>
                          ))}
                        </ul>
                      </div>

                      {shipment.catatan && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Catatan:</span> {shipment.catatan}
                        </div>
                      )}

                      <div className="mt-4">
                        <Button
                          onClick={() => handlePrepareReceiveShipment(shipment)}
                          disabled={shipment.statusPengiriman === PengirimanStatus.DITERIMA}
                        >
                          Terima Pengiriman
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border rounded-md">
                  <p>Tidak ada pengiriman yang menunggu untuk diterima</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Riwayat Pengiriman</CardTitle>
                <CardDescription>Daftar semua pengiriman yang telah diterima</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShipmentsPage(shipmentsPage > 1 ? shipmentsPage - 1 : 1)}
                  disabled={shipmentsPage <= 1 || loading}
                >
                  Previous
                </Button>
                <span className="py-2 px-4 border rounded-md">Page {shipmentsPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShipmentsPage(shipmentsPage + 1)}
                  disabled={loading}
                >
                  Next
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {shipments.length > 0 ? (
                <div className="space-y-4">
                  {shipments
                    .filter((s) => s.statusPengiriman === PengirimanStatus.DITERIMA)
                    .map((shipment) => (
                      <div key={shipment.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-medium">Shipment #{shipment.id}</span>
                            <span className="ml-2 text-sm text-muted-foreground">
                              Dikirim: {new Date(shipment.waktuPengiriman).toLocaleString()}
                            </span>
                          </div>
                          {getShipmentStatusBadge(shipment.statusPengiriman)}
                        </div>

                        {shipment.waktuDiterima && (
                          <div className="text-sm text-muted-foreground mb-2">
                            Diterima: {new Date(shipment.waktuDiterima).toLocaleString()}
                          </div>
                        )}

                        <div className="mt-2">
                          <h4 className="text-sm font-medium mb-1">Produk yang Dikirim:</h4>
                          <ul className="space-y-1">
                            {shipment.daftarProdukHewan.map((item) => (
                              <li key={item.id} className="text-sm">
                                {item.produk.nama}: {item.jumlah} paket
                              </li>
                            ))}
                          </ul>
                        </div>

                        {shipment.catatan && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Catatan:</span> {shipment.catatan}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center p-8 border rounded-md">
                  <p>Belum ada riwayat pengiriman</p>
                </div>
              )}
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
                          <div key={h.hewanId} className="flex items-center gap-2">
                            <span>Hewan #{h.hewanId}</span>
                            <Button
                              size="sm"
                              variant={h.receivedByMdhohi ? "default" : "outline"}
                              onClick={() => handleMudhohiReceived(h.hewanId, !h.receivedByMdhohi)}
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


      </Tabs>
      
      
    </div>
  )
}


/**
 * /* eslint-disable @typescript-eslint/no-explicit-any */
 /* eslint-disable @typescript-eslint/no-unused-vars */
 "use client"
 
 import { useState, useEffect, useMemo, useCallback } from "react"
 import { useQurban} from "@/contexts/qurban-context"
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
 import { Button } from "@/components/ui/button"
 import { Input } from "@/components/ui/input"
 import { Label } from "@/components/ui/label"
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
 import { toast } from "@/hooks/use-toast"
 import { Counter, JenisDistribusi, PaymentStatus} from "@prisma/client"
 import { Badge } from "@/components/ui/badge"
 import { Textarea } from "@/components/ui/textarea"
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog"
 import { updateErrorLogNote } from "./actions"
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
 import type { ErrorLog, Penerima, PengirimanStatus, Shipment } from "@/types/qurban"
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
 import { Download, Minus, Plus } from "lucide-react"
 import { getMudhohi } from "@/services/mudhohi"
 import { getPenerima } from "@/services/qurban"
 import { useQuery } from "@tanstack/react-query"
 import { exportToExcel } from "@/lib/excel"
 
 export default function CounterInventoriPage() {
   const {
     productsQuery,
     errorLogsQuery,
     shipmentsQuery,
     penerimaQuery,
     isConnected,
     updateProduct,
     getProductLogsByPlace,
     getProductById,
     receiveShipment,
     createDistribusi,
     createPenerima,
     getPenerimaByJenis,
     getAvailableProducts,
     updateMudhohi,
     updateKuponReceived,
     updateLogDistribusi
     // submitGroupProposal,
     // getGroupProposals
   } = useQurban()
   // State variables
   const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
   const [receivedProducts, setReceivedProducts] = useState<{ produkId: number; jumlah: number }[]>([])
   const [isReceivingShipment, setIsReceivingShipment] = useState(false)
   const [showReceiveDialog, setShowReceiveDialog] = useState(false)
   const [showDiscrepancyDialog, setShowDiscrepancyDialog] = useState(false)
   const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<{
     produkId: number
     expected: number
     received: number
     actual: number
     productName: string
   } | null>(null)
   const [showProductHistory, setShowProductHistory] = useState(false)
   const [selectedProductForHistory, setSelectedProductForHistory] = useState<number | null>(null)
   const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
   const [quantity, setQuantity] = useState(1)
   const [note, setNote] = useState("")
   const [operation, setOperation] = useState<"menambahkan" | "memindahkan" | "mengkoreksi">("menambahkan")
 
   // Distribution form state
   const [kategoriDistribusi, setKategoriDistribusi] = useState("Pengqurban Sapi");
   const [targetKupon, setTargetKupon] = useState(0);
   const [namaPenerima, setNamaPenerima] = useState("");
   const [diterimaOleh, setDiterimaOleh] = useState("");
   const [noIdentitas, setNoIdentitas] = useState("");
   const [alamat, setAlamat] = useState("");
   const [telepon, setTelepon] = useState("");
   const [keterangan, setKeterangan] = useState("");
   const [jenisPenerima, setJenisPenerima] = useState<JenisDistribusi>(JenisDistribusi.KELOMPOK);
   const [distribusiProduk, setDistribusiProduk] = useState<{ produkId: number; jumlah: number }[]>([]);
   const [isSubmitting, setIsSubmitting] = useState(false);
   // Form states
   const [formData, setFormData] = useState({
     receivedBy: "",
     institusi: "",
     distribusiId: "",
     selectedProducts: [] as number[],
     jumlahPaket: 1,
   })
   // Group proposal state
   const [selectedKelompok, setSelectedKelompok] = useState<string>("");
   const [groupProposalData, setGroupProposalData] = useState({
     distribusiId: "",
     namaKelompok: "",
     penanggungJawab: "",
     produkDistribusi: [] as { produkId: number; jumlah: number }[],
     alamat: "",
     telepon: "",
     keterangan: ""
   });
 
   // Get penerima data
   const penerimaInstitusi = useMemo(() => 
     getPenerimaByJenis(JenisDistribusi.KELOMPOK), 
     [getPenerimaByJenis]
   );
   
   const penerimaIndividu = useMemo(() => 
     getPenerimaByJenis(JenisDistribusi.INDIVIDU), 
     [getPenerimaByJenis]
   );
   // State for coupons
   const [selectedPersepuluh, setSelectedPersepuluh] = useState<string>("");
   const [showCouponDialog, setShowCouponDialog] = useState(false);
   const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
 
   // Get kelompok options
   const kelompokOptions = useMemo(() => {
     const groups = new Set<string>();
     penerimaIndividu.forEach(p => p.noKupon && groups.add(p.noKupon.substring(0, 2)));
     return Array.from(groups).sort();
   }, [penerimaIndividu]);
 
   // Get group proposals
   // const groupProposals = useMemo(() => 
   //   getGroupProposals(), 
   //   [getGroupProposals]
   // );
 
   // Get available products for distribution
   const availableProducts = useMemo(() => 
     getAvailableProducts(), 
     [getAvailableProducts]
   );
 
   // Add product to distribution form
   const addProdukDistribusi = () => {
     setDistribusiProduk([...distribusiProduk, { produkId: 0, jumlah: 1 }]);
   };
 
   // Update product in distribution form
   const updateProdukDistribusi = (index: number, field: string, value: any) => {
     const updated = [...distribusiProduk];
     updated[index] = { ...updated[index], [field]: value };
     setDistribusiProduk(updated);
   };
 
   // Remove product from distribution form
   const removeProdukDistribusi = (index: number) => {
     const updated = [...distribusiProduk];
     updated.splice(index, 1);
     setDistribusiProduk(updated);
   };
 
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
   // Handle distribution submission
 const handleSubmitDistribusi = async () => {
     if (!kategoriDistribusi || !namaPenerima || distribusiProduk.length === 0) {
       toast({
         title: "Data Tidak Lengkap",
         description: "Harap isi semua field yang diperlukan",
         variant: "destructive",
       });
       return;
     }
 
     setIsSubmitting(true);
     try {
       // Create distribution
       const distribusi = await createDistribusi({
         kategori: kategoriDistribusi,
         target: targetKupon
       });
 
       // Create recipient
       await createPenerima({
         distribusiId: distribusi.id,
         nama: namaPenerima,
         diterimaOleh,
         noIdentitas,
         alamat,
         telepon,
         keterangan,
         jenis: jenisPenerima,
         noKupon: jenisPenerima === JenisDistribusi.INDIVIDU ? `IND-${Date.now()}` : `GRP-${Date.now()}`,
         produkDistribusi: distribusiProduk
       });
 
       // Reset form
       setNamaPenerima("");
       setDiterimaOleh("");
       setNoIdentitas("");
       setAlamat("");
       setTelepon("");
       setKeterangan("");
       setDistribusiProduk([]);
 
       toast({
         title: "Distribusi Berhasil",
         description: "Pencatatan distribusi berhasil disimpan",
       });
     } catch (error) {
       console.error(error)
       toast({
         title: "Error",
         description: "Gagal mencatat distribusi",
         variant: "destructive",
       });
     } finally {
       setIsSubmitting(false);
     }
   };
 
   // Handle group proposal submission
   // const handleSubmitGroupProposal = async () => {
   //   if (!groupProposalData.namaKelompok || !groupProposalData.penanggungJawab || 
   //       groupProposalData.produkDistribusi.length === 0) {
   //     toast({
   //       title: "Data Tidak Lengkap",
   //       description: "Harap isi semua field yang diperlukan",
   //       variant: "destructive",
   //     });
   //     return;
   //   }
 
   //   try {
   //     await submitGroupProposal({
   //       distribusiId: groupProposalData.distribusiId,
   //       namaKelompok: groupProposalData.namaKelompok,
   //       penanggungJawab: groupProposalData.penanggungJawab,
   //       produkDistribusi: groupProposalData.produkDistribusi,
   //       alamat: groupProposalData.alamat,
   //       telepon: groupProposalData.telepon,
   //       keterangan: groupProposalData.keterangan
   //     });
 
   //     // Reset form
   //     setGroupProposalData({
   //       distribusiId: "",
   //       namaKelompok: "",
   //       penanggungJawab: "",
   //       produkDistribusi: [],
   //       alamat: "",
   //       telepon: "",
   //       keterangan: ""
   //     });
 
   //     toast({
   //       title: "Proposal Berhasil",
   //       description: "Proposal kelompok berhasil diajukan",
   //     });
   //   } catch (error) {
   //     console.error(error)
   //     toast({
   //       title: "Error",
   //       description: "Gagal mengajukan proposal kelompok",
   //       variant: "destructive",
   //     });
   //   }
   // };
   // Handle mudhohi received status update
   const handleMudhohiReceived = (hewanId: string, received: boolean) => {
     updateMudhohi({hewanId, received});
   };
 
   // Handle kupon received status update
   const handleKuponReceived = async (penerimaId: string, received: boolean) => {
     updateKuponReceived({ penerimaId, diterima: received })
   }
   
   // Handle mudhohi distribution
   const handleUpdateDistribusi = async (penerimaId: string) => {
     const produk = distribusiProduk.filter(item => item.jumlah > 0);
     if (produk.length === 0) return;
 
     try {
       await updateLogDistribusi(penerimaId, produk);
       toast({
         title: "Berhasil Dicatat",
         description: "Pengambilan jatah mudhohi berhasil dicatat",
       });
     } catch (error) {
       console.error(error)
       toast({
         title: "Error",
         description: "Gagal mencatat pengambilan jatah",
         variant: "destructive",
       });
     }
   };
 
   // Filtered penerima data
   const filteredPenerima = useMemo(() => {
     return selectedKelompok
       ? penerimaIndividu.filter(p => 
           p.noKupon && p.noKupon.startsWith(selectedKelompok))
       : penerimaIndividu;
   }, [penerimaIndividu, selectedKelompok]);
   
   // Get shipments and filter pending ones
   const shipments = useMemo(() => shipmentsQuery.data || [], [shipmentsQuery.data]);
   
   // Memoized pending shipments
   const pendingShipments = useMemo(() => 
     shipments.filter(s => s.statusPengiriman === "DIKIRIM"),
   [shipments]);
 
   // Memoized product logs
   const productLogs = useMemo(() => 
     getProductLogsByPlace(Counter.INVENTORY),
   [getProductLogsByPlace]);
 
   // Optimized product lookup
   const getProductName = useMemo(() => (id: number) => {
     const product = getProductById(id);
     return product ? product.nama : "Unknown Product";
   }, [getProductById]);
   // Refresh data on mount
   useEffect(() => {
     shipmentsQuery.refetch()
     errorLogsQuery.refetch()
     penerimaQuery.refetch()
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [])
 
   const handlePrepareReceiveShipment = (shipment: Shipment) => {
     setSelectedShipment(shipment)
     setReceivedProducts(
       shipment.daftarProdukHewan.map(item => ({
         produkId: item.produkId,
         jumlah: item.jumlah,
       }))
     )
     setShowReceiveDialog(true)
   }
 
   const handleUpdateReceivedQuantity = (produkId: number, jumlah: number) => {
     setReceivedProducts(prev => 
       prev.map(item => item.produkId === produkId ? { ...item, jumlah } : item))
   }
 
   const handleReceiveShipment = async () => {
     if (!selectedShipment) return
     setIsReceivingShipment(true)
 
     try {
       const result = await receiveShipment(
         selectedShipment.id, 
         receivedProducts
       )
 
       if (result.success) {
         toast({
           title: "Pengiriman Diterima",
           description: "Pengiriman telah berhasil diterima",
         })
 
         if (result.discrepancies && result.discrepancies.length > 0) {
           toast({
             title: "Ketidaksesuaian Ditemukan",
             description: `${result.discrepancies.length} ketidaksesuaian ditemukan dan dicatat`,
             variant: "destructive",
           })
         }
 
         setShowReceiveDialog(false)
         setSelectedShipment(null)
         setReceivedProducts([])
       } else {
         throw new Error("Gagal mencatat penerimaan pengiriman")
       }
     } catch (error) {
       console.error(error)
       toast({
         title: "Error",
         description: "Gagal mencatat penerimaan pengiriman",
         variant: "destructive",
       })
     } finally {
       setIsReceivingShipment(false)
     }
   }
 
   const handleOpenDiscrepancyDialog = (errorLog: ErrorLog) => {
     const product = getProductById(errorLog.produkId)
     if (!product) return
 
     // Extract expected and received from note
     const noteMatch = errorLog.note.match(/diharapkan: (\d+), diterima: (\d+)/i)
     const expected = noteMatch ? parseInt(noteMatch[1]) : 0
     const received = noteMatch ? parseInt(noteMatch[2]) : 0
 
     setSelectedDiscrepancy({
       produkId: errorLog.produkId,
       expected,
       received,
       actual: received,
       productName: product.nama,
     })
 
     setShowDiscrepancyDialog(true)
   }
 
   const handleSolveDiscrepancy = async () => {
     if (!selectedDiscrepancy) return
 
     try {
       await updateProduct({
         productId: selectedDiscrepancy.produkId,
         operation: "mengkoreksi",
         place: Counter.INVENTORY,
         value: selectedDiscrepancy.actual,
         note: `Dikoreksi dari penyelesaian ketidaksesuaian (diharapkan: ${selectedDiscrepancy.expected}, diterima: ${selectedDiscrepancy.received}, dikoreksi menjadi: ${selectedDiscrepancy.actual})`,
       })
 
       toast({
         title: "Ketidaksesuaian Diselesaikan",
         description: `Inventori diperbarui dengan jumlah aktual: ${selectedDiscrepancy.actual}`,
       })
 
       setShowDiscrepancyDialog(false)
       errorLogsQuery.refetch()
     } catch (error) {
       console.error(error)
       toast({
         title: "Error",
         description: "Gagal menyelesaikan ketidaksesuaian",
         variant: "destructive",
       })
     }
   }
 
   const handleUpdateErrorNote = async (id: number, note: string) => {
     try {
       await updateErrorLogNote(id, note)
       errorLogsQuery.refetch()
       toast({ title: "Success", description: "Error note updated" })
     } catch (error) {
       console.error(error)
       toast({
         title: "Error",
         description: "Failed to update note",
         variant: "destructive",
       })
     }
   }
 
   const handleShowProductHistory = (produkId: number) => {
     setSelectedProductForHistory(produkId)
     setShowProductHistory(true)
   }
 
   const handleUpdateProduct = async () => {
     if (!selectedProduct || quantity <= 0) return
 
     try {
       await updateProduct({
         productId: selectedProduct,
         operation,
         place: Counter.INVENTORY,
         value: quantity,
         note,
       })
 
       setQuantity(1)
       setNote("")
       toast({
         title: "Success",
         description: `Product ${operation === "menambahkan" ? "added to" : "removed from"} inventory`,
       })
     } catch (error) {
       console.error(error)
       toast({
         title: "Error",
         description: "Failed to update product",
         variant: "destructive",
       })
     }
   }
 
   const getShipmentStatusBadge = useCallback((status: PengirimanStatus) => {
     switch (status) {
       case "PENDING":
         return <Badge variant="outline">Menunggu</Badge>;
       case "DIKIRIM":
         return <Badge variant="secondary">Dikirim</Badge>;
       case "DITERIMA":
         return <Badge variant="default">Diterima</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   }, []);
 
 
   // Add these functions inside the component
   const handleExportProductsToExcel = () => {
     const data = productsQuery.data.map((product) => ({
       ID: product.id,
       Nama: product.nama,
       Tipe: product.tipe_hewan?.nama || "-",
       Jenis: product.JenisProduk,
       Berat: product.berat || 0,
       "Target Paket": product.targetPaket,
       "Paket Asal": product.diTimbang,
       "Paket Diterima": product.diInventori,
       "Paket Didistribusi": product.sdhDiserahkan,
     }))
 
     exportToExcel(data, "inventori_products")
   }
 
   // const handleExportMudhohiToExcel = () => {
   //   const data = mudhohi.map((m) => ({
   //     ID: m.id,
   //     "Nama Pengqurban": m.nama_pengqurban || "-",
   //     "Nama Peruntukan": m.nama_peruntukan || "-",
   //     Hewan: m.hewan.map((h) => `${h.hewanId}`).join(", "),
   //     "Jatah Diambil": m.hewan.map((h) => (h.receivedByMdhohi ? "Ya" : "Tidak")).join(", "),
   //   }))
 
   //   exportToExcel(data, "mudhohi_data")
   // }
 
   const handleExportPenerimaToExcel = () => {
     const data = penerimaQuery.data
       .filter((p: Penerima) => p.noKupon)
       .map((p: Penerima) => ({
         ID: p.id,
         "No Kupon": p.noKupon || "-",
         Penerima: p.diterimaOleh || "-",
         Kategori: p.distribusi.kategori,
         Status: p.logDistribusi?.sudahMenerima ? "Sudah Dikembalikan" : "Belum Dikembalikan",
       }))
 
     exportToExcel(data, "penerima_kupon")
   }
 
   if (penerimaQuery.isLoading ) return <div>Loading...</div>
   if (penerimaQuery.isError ) return <div>Error loading data</div>
   if (productsQuery.isLoading) return <div>Loading products...</div>
   if (productsQuery.isError) return <div>Error loading products</div>
   if (shipmentsQuery.isLoading) return <div>Loading shipments...</div>
   if (shipmentsQuery.isError) return <div>Error loading shipments</div>
   return (
     <div className="space-y-8">
       <div className="flex items-center gap-2">
         <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
         <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
       </div>
 
       <Tabs defaultValue="pengiriman">
         <TabsList className="grid w-full grid-cols-4">
           <TabsTrigger value="pengiriman">Pengiriman</TabsTrigger>
           <TabsTrigger value="history">Riwayat</TabsTrigger>
           <TabsTrigger value="error-logs">Log Kesalahan</TabsTrigger>
         </TabsList>
 
         <TabsContent value="pengiriman">
           <Card>
             <CardHeader>
               <CardTitle>Pengiriman Masuk</CardTitle>
               <CardDescription>Daftar pengiriman yang perlu diterima</CardDescription>
             </CardHeader>
             <CardContent>
               {pendingShipments.length > 0 ? (
                 <div className="space-y-4">
                   {pendingShipments.map(shipment => (
                     <div key={shipment.id} className="border rounded-md p-4">
                       <div className="flex justify-between items-center mb-2">
                         <div>
                           <span className="font-medium">Putaran #{shipment.id}</span>
                           <span className="ml-2 text-sm text-muted-foreground">
                             {new Date(shipment.waktuPengiriman).toLocaleString()}
                           </span>
                         </div>
                         {getShipmentStatusBadge(shipment.statusPengiriman)}
                       </div>
 
                       <div className="mt-2">
                         <h4 className="text-sm font-medium mb-1">Produk:</h4>
                         <ul className="space-y-1">
                           {shipment.daftarProdukHewan.map(item => (
                             <li key={item.id} className="text-sm">
                               {item.produk.nama}: {item.jumlah} paket
                             </li>
                           ))}
                         </ul>
                       </div>
 
                       {shipment.catatan && (
                         <div className="mt-2 text-sm">
                           <span className="font-medium">Catatan:</span> {shipment.catatan}
                         </div>
                       )}
 
                       <div className="mt-4">
                         <Button onClick={() => handlePrepareReceiveShipment(shipment)}>
                           Terima Pengiriman
                         </Button>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center p-8 border rounded-md">
                   <p>Tidak ada pengiriman yang menunggu</p>
                 </div>
               )}
             </CardContent>
           </Card>
 
           <Card className="mt-4">
             <CardHeader>
               <CardTitle>Riwayat Pengiriman</CardTitle>
               <CardDescription>Daftar semua pengiriman yang telah diterima</CardDescription>
             </CardHeader>
             <CardContent>
               {shipments.filter(s => s.statusPengiriman === "DITERIMA").length > 0 ? (
                 <div className="space-y-4">
                   {shipments
                     .filter(s => s.statusPengiriman === "DITERIMA")
                     .map(shipment => (
                       <div key={shipment.id} className="border rounded-md p-4">
                         <div className="flex justify-between items-center mb-2">
                           <div>
                             <span className="font-medium">Putaran #{shipment.id}</span>
                             <span className="ml-2 text-sm text-muted-foreground">
                               Dikirim: {new Date(shipment.waktuPengiriman).toLocaleString()}
                             </span>
                           </div>
                           {getShipmentStatusBadge(shipment.statusPengiriman)}
                         </div>
 
                         {shipment.waktuDiterima && (
                           <div className="text-sm text-muted-foreground mb-2">
                             Diterima: {new Date(shipment.waktuDiterima).toLocaleString()}
                           </div>
                         )}
 
                         <div className="mt-2">
                           <h4 className="text-sm font-medium mb-1">Produk:</h4>
                           <ul className="space-y-1">
                             {shipment.daftarProdukHewan.map(item => (
                               <li key={item.id} className="text-sm">
                                 {item.produk.nama}: {item.jumlah} paket
                               </li>
                             ))}
                           </ul>
                         </div>
 
                         {shipment.catatan && (
                           <div className="mt-2 text-sm">
                             <span className="font-medium">Catatan:</span> {shipment.catatan}
                           </div>
                         )}
                       </div>
                     ))}
                 </div>
               ) : (
                 <div className="text-center p-8 border rounded-md">
                   <p>Belum ada riwayat pengiriman</p>
                 </div>
               )}
             </CardContent>
           </Card>
         </TabsContent>
 
 
         <TabsContent value="history">
           <Card>
             <CardHeader>
               <CardTitle>Operation History</CardTitle>
               <CardDescription>Recent inventory operations</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 {productLogs.length > 0 ? (
                   productLogs.map(log => (
                     <div key={log.id} className="border rounded-md p-4">
                       <div className="flex justify-between">
                         <div className="font-medium">
                           {getProductById(log.produkId)?.nama || `Product ${log.produkId}`}
                         </div>
                         <div className="text-sm text-muted-foreground">
                           {new Date(log.timestamp).toLocaleString()}
                         </div>
                       </div>
                       <div className="mt-1 flex items-center gap-2">
                         <span className={`px-2 py-1 rounded-full text-xs ${
                           log.event === "menambahkan" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                         }`}>
                           {log.event === "menambahkan" ? "Menambah" : "Menyerahkan"}
                         </span>
                         <span>{log.value} units</span>
                       </div>
                       {log.note && <div className="mt-2 text-sm">{log.note}</div>}
                     </div>
                   ))
                 ) : (
                   <div className="text-center p-4">Belum ada riwayat</div>
                 )}
               </div>
             </CardContent>
           </Card>
         </TabsContent>
 
         <TabsContent value="error-logs">
           <Card>
             <CardHeader>
               <CardTitle>Log Ketidaksesuaian</CardTitle>
               <CardDescription>Catatan ketidaksesuaian selama penerimaan produk</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 {errorLogsQuery.data.map(log => (
                   <div key={log.id} className="p-4 border rounded-md bg-yellow-50 dark:bg-yellow-900/20">
                     <div className="flex justify-between">
                       <div className="font-medium">
                         {getProductById(log.produkId)?.nama || `Produk ${log.produkId}`}
                       </div>
                       <div className="text-sm text-muted-foreground">
                         {new Date(log.timestamp).toLocaleString()}
                       </div>
                     </div>
                     <div className="mt-2">{log.note}</div>
                     <div className="mt-2 flex items-end gap-2">
                       <Input
                         placeholder="Add note"
                         defaultValue={log.note}
                         onBlur={e => handleUpdateErrorNote(log.id, e.target.value)}
                       />
                       <Button 
                         size="sm"
                         variant="outline" 
                         onClick={() => handleOpenDiscrepancyDialog(log)}
                         className="w-full"
                       >
                         Selesaikan Ketidaksesuaian
                       </Button>
                     </div>
                   </div>
                 ))}
                 {errorLogsQuery.data.length === 0 && <div className="text-center p-4">Tidak ada ketidaksesuaian</div>}
               </div>
             </CardContent>
           </Card>
         </TabsContent>
       </Tabs>
 
       <Tabs defaultValue="distribusi">
         <TabsList className="grid w-full grid-cols-3">
           <TabsTrigger value="distribusi">Distribusi</TabsTrigger>
           <TabsTrigger value="mudhohi">Pengambilan Mudhohi</TabsTrigger>
           <TabsTrigger value="kupon">Kupon</TabsTrigger>
         </TabsList>
 
         {/* DISTRIBUSI TAB */}
         <TabsContent value="distribusi">
           <Card>
             <CardHeader>
               <CardTitle>Distribusi ke Penerima</CardTitle>
               <CardDescription>Form pencatatan distribusi ke pihak penerima</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid gap-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="kategori">Kategori Distribusi</Label>
                     <Select
                       value={kategoriDistribusi}
                       onValueChange={setKategoriDistribusi}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Pilih Kategori" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Pengqurban Sapi">Pengqurban Sapi</SelectItem>
                         <SelectItem value="Pengqurban Domba">Pengqurban Domba</SelectItem>
                         <SelectItem value="Panitia">Panitia</SelectItem>
                         <SelectItem value="Mustahik">Mustahik</SelectItem>
                         <SelectItem value="Lainnya">Lainnya</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div>
                     <Label htmlFor="target">Target Kupon</Label>
                     <Input
                       id="target"
                       type="number"
                       min="0"
                       value={targetKupon}
                       onChange={(e) => setTargetKupon(parseInt(e.target.value) || 0)}
                       placeholder="Jumlah kupon yang akan dibagikan"
                     />
                   </div>
                 </div>
                 
                 <div className="border-t pt-4">
                   <h3 className="text-lg font-medium mb-4">Data Penerima</h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label htmlFor="jenisPenerima">Jenis Penerima</Label>
                       <Select
                         value={jenisPenerima}
                         onValueChange={(value) => setJenisPenerima(value as JenisDistribusi)}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Pilih Jenis Penerima" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value={JenisDistribusi.KELOMPOK}>Institusi/Kelompok</SelectItem>
                           <SelectItem value={JenisDistribusi.INDIVIDU}>Individu</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     
                     <div>
                       <Label htmlFor="noKupon">Nomor Kupon</Label>
                       <Input
                         id="noKupon"
                         value={noKupon}
                         onChange={(e) => setNoKupon(e.target.value)}
                         placeholder="Nomor kupon penerima"
                       />
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                     <div>
                       <Label htmlFor="namaPenerima">Nama {jenisPenerima === JenisDistribusi.KELOMPOK ? "Institusi" : "Penerima"}</Label>
                       <Input
                         id="namaPenerima"
                         value={namaPenerima}
                         onChange={(e) => setNamaPenerima(e.target.value)}
                         placeholder={
                           jenisPenerima === JenisDistribusi.KELOMPOK 
                             ? "Nama institusi" 
                             : "Nama lengkap penerima"
                         }
                       />
                     </div>
                     
                     <div>
                       <Label htmlFor="diterimaOleh">Diterima Oleh</Label>
                       <Input
                         id="diterimaOleh"
                         value={diterimaOleh}
                         onChange={(e) => setDiterimaOleh(e.target.value)}
                         placeholder="Nama penerima aktual"
                       />
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                     <div>
                       <Label htmlFor="noIdentitas">Nomor Identitas</Label>
                       <Input
                         id="noIdentitas"
                         value={noIdentitas}
                         onChange={(e) => setNoIdentitas(e.target.value)}
                         placeholder="NIK/KTP/SIM"
                       />
                     </div>
                     
                     <div>
                       <Label htmlFor="telepon">Telepon</Label>
                       <Input
                         id="telepon"
                         value={telepon}
                         onChange={(e) => setTelepon(e.target.value)}
                         placeholder="Nomor telepon"
                       />
                     </div>
                   </div>
                   
                   <div className="mt-4">
                     <Label htmlFor="alamat">Alamat</Label>
                     <Input
                       id="alamat"
                       value={alamat}
                       onChange={(e) => setAlamat(e.target.value)}
                       placeholder="Alamat lengkap"
                     />
                   </div>
                   
                   <div className="mt-4">
                     <Label htmlFor="keterangan">Keterangan</Label>
                     <Textarea
                       id="keterangan"
                       value={keterangan}
                       onChange={(e) => setKeterangan(e.target.value)}
                       placeholder="Catatan tambahan"
                     />
                   </div>
                 </div>
                 
                 <div className="border-t pt-4">
                   <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-medium">Produk yang Didistribusikan</h3>
                     <Button size="sm" variant="outline" onClick={addProdukDistribusi}>
                       <Plus size={16} className="mr-1" /> Tambah Produk
                     </Button>
                   </div>
                   
                   <div className="border rounded-lg overflow-hidden">
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Produk</TableHead>
                           <TableHead className="w-32">Jumlah</TableHead>
                           <TableHead className="w-24">Aksi</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {distribusiProduk.map((item, index) => (
                           <TableRow key={index}>
                             <TableCell>
                               <Select
                                 value={item.produkId.toString()}
                                 onValueChange={(value) => 
                                   updateProdukDistribusi(index, "produkId", parseInt(value))
                                 }
                               >
                                 <SelectTrigger>
                                   <SelectValue placeholder="Pilih Produk" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="0">-- Pilih Produk --</SelectItem>
                                   {productsQuery.data.map(product => (
                                     <SelectItem 
                                       key={product.id} 
                                       value={product.id.toString()}
                                     >
                                       {product.nama}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                             </TableCell>
                             <TableCell>
                               <div className="flex items-center gap-2">
                                 <Button 
                                   variant="outline" 
                                   size="icon" 
                                   onClick={() => 
                                     updateProdukDistribusi(index, "jumlah", Math.max(1, item.jumlah - 1))
                                   }
                                 >
                                   <Minus size={16} />
                                 </Button>
                                 <Input
                                   type="number"
                                   min="1"
                                   value={item.jumlah}
                                   onChange={(e) => 
                                     updateProdukDistribusi(index, "jumlah", parseInt(e.target.value) || 1)
                                   }
                                   className="text-center"
                                 />
                                 <Button 
                                   variant="outline" 
                                   size="icon" 
                                   onClick={() => 
                                     updateProdukDistribusi(index, "jumlah", item.jumlah + 1)
                                   }
                                 >
                                   <Plus size={16} />
                                 </Button>
                               </div>
                             </TableCell>
                             <TableCell>
                               <Button 
                                 variant="destructive" 
                                 size="icon"
                                 onClick={() => removeProdukDistribusi(index)}
                               >
                                 <Minus size={16} />
                               </Button>
                             </TableCell>
                           </TableRow>
                         ))}
                         
                         {distribusiProduk.length === 0 && (
                           <TableRow>
                             <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                               Belum ada produk yang ditambahkan
                             </TableCell>
                           </TableRow>
                         )}
                       </TableBody>
                     </Table>
                   </div>
                 </div>
                 
                 <div className="flex justify-end">
                   <Button 
                     onClick={handleSubmitDistribusi}
                     disabled={isSubmitting}
                   >
                     {isSubmitting ? "Menyimpan..." : "Simpan Distribusi"}
                   </Button>
                 </div>
               </div>
             </CardContent>
           </Card>
           
           {/* DAFTAR DISTRIBUSI */}
           {/* <Card className="mt-6">
             <CardHeader>
               <CardTitle>Daftar Distribusi</CardTitle>
               <CardDescription>Riwayat distribusi yang telah dicatat</CardDescription>
             </CardHeader>
             <CardContent>
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Kategori</TableHead>
                     <TableHead>Penerima</TableHead>
                     <TableHead>Jenis</TableHead>
                     <TableHead>No Kupon</TableHead>
                     <TableHead>Jumlah Produk</TableHead>
                     <TableHead>Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {penerimaInstitusi.map(penerima => (
                     <TableRow key={penerima.id}>
                       <TableCell>{penerima.distribusi.kategori}</TableCell>
                       <TableCell className="font-medium">{penerima.nama}</TableCell>
                       <TableCell>
                         <Badge variant="secondary">
                           {penerima.jenis === JenisDistribusi.KELOMPOK ? "Institusi" : "Individu"}
                         </Badge>
                       </TableCell>
                       <TableCell>{penerima.noKupon || "-"}</TableCell>
                       <TableCell>
                         {penerima.logDistribusi?.reduce((sum, log) => sum + log.jumlahPaket, 0)} paket
                       </TableCell>
                       <TableCell>
                         <Badge variant={penerima.logDistribusi.some(log => log.diterima) ? "default" : "outline"}>
                           {penerima.logDistribusi?.some(log => log.diterima) ? "Terverifikasi" : "Belum Diverifikasi"}
                         </Badge>
                       </TableCell>
                     </TableRow>
                   ))}
                   
                   {penerimaInstitusi.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                         Belum ada data distribusi
                       </TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </CardContent>
           </Card> */}
         </TabsContent>
 
         {/* MUDHOHI TAB */}
         <TabsContent value="mudhohi">
           {/* <Card>
             <CardHeader>
               <CardTitle>Pengambilan Jatah Mudhohi</CardTitle>
               <CardDescription>Pencatatan pengambilan jatah oleh pemilik hewan</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid gap-6">
                 <div className="flex items-center gap-4">
                   <Label>Filter Kelompok:</Label>
                   <Select
                     value={selectedKelompok}
                     onValueChange={setSelectedKelompok}
                   >
                     <SelectTrigger className="w-48">
                       <SelectValue placeholder="Semua Kelompok" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="">Semua Kelompok</SelectItem>
                       {kelompokOptions.map(group => (
                         <SelectItem key={group} value={group}>
                           Kelompok {group}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 
                 <div className="space-y-6">
                   {filteredPenerima.map((penerima: Penerima) => {
                     const logDistribusi = penerima.logDistribusi;
                     const produkList = logDistribusi?.listProduk || [];
                     
                     return (
                       <Card key={penerima.id}>
                         <CardHeader className="pb-3">
                           <div className="flex justify-between items-start">
                             <div>
                               <CardTitle>{penerima.nama}</CardTitle>
                               <CardDescription>
                                 Kupon: {penerima.noKupon}
                               </CardDescription>
                             </div>
                             <Badge variant="secondary">
                               {penerima.jenis === JenisDistribusi.KELOMPOK ? "Institusi" : "Individu"}
                             </Badge>
                           </div>
                         </CardHeader>
                         <CardContent>
                           <div className="space-y-4">
                             <div className="font-medium">Produk yang Diambil:</div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {productsQuery.data
                                 .filter(product => 
                                   logDistribusi && logDistribusi?.some(log => 
                                     JSON.parse(log.produkQurban).some((p: any) => p.produkId === product.id)
                                   )
                                 )
                                 .map(product => {
                                   const logItem = logDistribusi?
                                     .flatMap(log => JSON.parse(log.produkQurban))
                                     .find((p: any) => p.produkId === product.id);
                                   
                                   const currentQty = logItem?.jumlah || 0;
                                   
                                   return (
                                     <div key={product.id} className="border rounded-lg p-4">
                                       <div className="flex justify-between items-center mb-2">
                                         <span className="font-medium">{product.nama}</span>
                                         <span className="text-sm text-muted-foreground">
                                           Tersedia: {product.sdhDiserahkan}
                                         </span>
                                       </div>
                                       
                                       <div className="flex items-center gap-2">
                                         <Button 
                                           variant="outline" 
                                           size="icon" 
                                           onClick={() => {
                                             // Update logic would go here
                                           }}
                                         >
                                           <Minus size={16} />
                                         </Button>
                                         
                                         <Input
                                           type="number"
                                           min="0"
                                           max={product.sdhDiserahkan}
                                           value={currentQty}
                                           readOnly
                                           className="text-center"
                                         />
                                         
                                         <Button 
                                           variant="outline" 
                                           size="icon" 
                                           onClick={() => {
                                             // Update logic would go here
                                           }}
                                         >
                                           <Plus size={16} />
                                         </Button>
                                       </div>
                                     </div>
                                   );
                                 })}
                             </div>
                             
                             <div className="flex justify-end">
                               <Button
                                 onClick={() => handleUpdateDistribusi(penerima.id)}
                                 disabled={logDistribusi.length === 0}
                               >
                                 Konfirmasi Pengambilan
                               </Button>
                             </div>
                           </div>
                         </CardContent>
                       </Card>
                     );
                   })}
                   
                   {filteredPenerima.length === 0 && (
                     <div className="text-center py-8 text-muted-foreground">
                       Tidak ada data penerima untuk kelompok ini
                     </div>
                   )}
                 </div>
               </div>
             </CardContent>
           </Card> */}
         </TabsContent>
 
         {/* KUPON TAB */}
         <TabsContent value="kupon">
           {/* <Card>
             <CardHeader>
               <CardTitle>Pengembalian Kupon</CardTitle>
               <CardDescription>Pencatatan pengembalian kupon oleh mudhohi</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid gap-6">
                 <div className="flex items-center gap-4">
                   <Label>Filter Persepuluh:</Label>
                   <Select
                     value={selectedPersepuluh}
                     onValueChange={setSelectedPersepuluh}
                   >
                     <SelectTrigger className="w-48">
                       <SelectValue placeholder="Semua Persepuluh" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="">Semua Persepuluh</SelectItem>
                       <SelectItem value="1-10">1-10</SelectItem>
                       <SelectItem value="11-20">11-20</SelectItem>
                       <SelectItem value="21-30">21-30</SelectItem>
                       <SelectItem value="31-40">31-40</SelectItem>
                       <SelectItem value="41-50">41-50</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 
                 <div className="border rounded-lg overflow-hidden">
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Nomor Kupon</TableHead>
                         <TableHead>Penerima</TableHead>
                         <TableHead>Persepuluh</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead className="text-right">Aksi</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {penerimaIndividu
                         .filter(p => 
                           !selectedPersepuluh || 
                           (p.noKupon && p.noKupon.startsWith(selectedPersepuluh.split('-')[0]))
                         )
                         .map(penerima => (
                           <TableRow key={penerima.id}>
                             <TableCell className="font-medium">{penerima.noKupon}</TableCell>
                             <TableCell>{penerima.nama}</TableCell>
                             <TableCell>
                               {penerima.noKupon 
                                 ? `${Math.floor(parseInt(penerima.noKupon)/10)*10+1}-${Math.floor(parseInt(penerima.noKupon)/10)*10+10}`
                                 : '-'}
                             </TableCell>
                             <TableCell>
                               <Badge 
                                 variant={penerima?.logDistribusi.some(log => log.diterima) 
                                   ? "default" 
                                   : "outline"}
                               >
                                 {penerima.logDistribusi.some(log => log.diterima) 
                                   ? "Terverifikasi" 
                                   : "Belum Diverifikasi"}
                               </Badge>
                             </TableCell>
                             <TableCell className="text-right">
                               {!penerima.logDistribusi.some(log => log.diterima) && (
                                 <Button
                                   variant="secondary"
                                   size="sm"
                                   onClick={() => handleKuponReceived(penerima.id, true)}
                                 >
                                   Tandai Dikembalikan
                                 </Button>
                               )}
                             </TableCell>
                           </TableRow>
                         ))}
                       
                       {penerimaIndividu.length === 0 && (
                         <TableRow>
                           <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                             Tidak ada data kupon
                           </TableCell>
                         </TableRow>
                       )}
                     </TableBody>
                   </Table>
                 </div>
               </div>
             </CardContent>
           </Card> */}
 
         </TabsContent>
       </Tabs>
       {/* Receive Shipment Dialog */}
       <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>Terima Pengiriman #{selectedShipment?.id}</DialogTitle>
             <DialogDescription>Verifikasi jumlah produk yang diterima dari Counter Timbang</DialogDescription>
           </DialogHeader>
 
           <div className="space-y-4 my-4">
             {selectedShipment?.daftarProdukHewan.map((item) => {
               const receivedItem = receivedProducts.find((p) => p.produkId === item.produkId)
               return (
                 <div key={item.id} className="space-y-2">
                   <Label htmlFor={`received-${item.produkId}`}>{item.produk.nama}</Label>
                   <div className="flex items-center gap-2">
                     <Input
                       id={`received-${item.produkId}`}
                       type="number"
                       min="0"
                       value={receivedItem?.jumlah || 0}
                       onChange={(e) =>
                         handleUpdateReceivedQuantity(item.produkId, Number.parseInt(e.target.value) || 0)
                       }
                     />
                     <span className="text-sm text-muted-foreground">/ {item.jumlah} dikirim</span>
                   </div>
                 </div>
               )
             })}
           </div>
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
               Batal
             </Button>
             <Button onClick={handleReceiveShipment} disabled={isReceivingShipment}>
               {isReceivingShipment ? "Menerima..." : "Terima Pengiriman"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Discrepancy Resolution Dialog */}
       <Dialog open={showDiscrepancyDialog} onOpenChange={setShowDiscrepancyDialog}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>Selesaikan Ketidaksesuaian</DialogTitle>
             <DialogDescription>
               Perbarui jumlah aktual untuk {selectedDiscrepancy?.productName}
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-4 my-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label>Diharapkan</Label>
                 <Input value={selectedDiscrepancy?.expected || 0} disabled />
               </div>
               <div>
                 <Label>Diterima</Label>
                 <Input value={selectedDiscrepancy?.received || 0} disabled />
               </div>
             </div>
 
             <div>
               <Label>Jumlah Aktual</Label>
               <Input
                 type="number"
                 min="0"
                 value={selectedDiscrepancy?.actual || 0}
                 onChange={e => setSelectedDiscrepancy(prev => 
                   prev ? { ...prev, actual: parseInt(e.target.value) || 0 } : null
                 )}
               />
             </div>
           </div>
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowDiscrepancyDialog(false)}>
               Batal
             </Button>
             <Button onClick={handleSolveDiscrepancy}>Simpan Perubahan</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Product History Dialog */}
       <Dialog open={showProductHistory} onOpenChange={setShowProductHistory}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>
               Produk Histori - {getProductById(selectedProductForHistory!)?.nama}
             </DialogTitle>
             <DialogDescription>Log riwayat produk ini</DialogDescription>
           </DialogHeader>
 
           <div className="max-h-[60vh] overflow-y-auto space-y-4 my-4">
             {productLogs
               .filter(log => log.produkId === selectedProductForHistory)
               .map(log => (
                 <div key={log.id} className="border rounded-md p-3">
                   <div className="flex justify-between">
                     <span className={`px-2 py-1 rounded-full text-xs ${
                       log.event === "menambahkan" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                     }`}>
                       {log.event === "menambahkan" ? "Added" : "Removed"}
                     </span>
                     <div className="text-sm text-muted-foreground">
                       {new Date(log.timestamp).toLocaleString()}
                     </div>
                   </div>
                   <div className="mt-2">
                     <span className="font-medium">Jumlah:</span> {log.value}
                   </div>
                   {log.note && (
                     <div className="mt-1">
                       <span className="font-medium">Catatan:</span> {log.note}
                     </div>
                   )}
                 </div>
               ))}
 
             {!productLogs.some(log => log.produkId === selectedProductForHistory) && (
               <div className="text-center p-4">Belum ada riwayat</div>
             )}
           </div>
 
           <DialogFooter>
             <Button onClick={() => setShowProductHistory(false)}>Tutup</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   )
 }
 */