"use client"

import { useState, useEffect } from "react"
import { useSocket } from "@/lib/socket"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { ProductCardSelection } from "@/components/product-card-selection"
import { addProductLog, createDistribusi, updateMudhohiReceived, updateErrorLogNote, receiveShipment } from "./actions"
import { Counter, type jenisProduk, PengirimanStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ProdukHewan = {
  id: number
  nama: string
  tipeId: number | null
  berat: number | null
  targetPaket: number
  pkgOrigin: number
  diInventori: number
  sdhDiserahkan: number
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
    hewanId: number
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

type ErrorLog = {
  id: number
  produkId: number
  event: string
  note: string
  timestamp: Date
  produk: ProdukHewan
}

type ProdukDikirim = {
  id: string
  produkId: number
  jumlah: number
  produk: ProdukHewan
}

type Shipment = {
  id: number
  statusPengiriman: PengirimanStatus
  daftarProdukHewan: ProdukDikirim[]
  waktuPengiriman: Date
  waktuDiterima: Date | null
  catatan: string | null
}

interface CounterInventoriProps {
  initialProducts: ProdukHewan[]
  distributions: Distribution[]
  initialMudhohi: Mudhohi[]
  initialPenerima: Penerima[]
  initialShipments: Shipment[]
}

export default function CounterInventori({
  initialProducts,
  distributions,
  initialMudhohi,
  initialPenerima,
  initialShipments,
}: CounterInventoriProps) {
  const [products, setProducts] = useState<ProdukHewan[]>(initialProducts)
  const [mudhohi, setMudhohi] = useState<Mudhohi[]>(initialMudhohi)
  const [penerima, setPenerima] = useState<Penerima[]>(initialPenerima)
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments)
  const [pendingShipments, setPendingShipments] = useState<Shipment[]>(
    initialShipments.filter((s) => s.statusPengiriman === PengirimanStatus.DIKIRIM),
  )
  const [mudhohiPage, setMudhohiPage] = useState(1)
  const [penerimaPage, setPenerimaPage] = useState(1)
  const [shipmentsPage, setShipmentsPage] = useState(1)
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    receivedBy: "",
    institusi: "",
    distributionId: distributions[0]?.id || "",
    selectedProducts: [] as number[],
    numberOfPackages: 1,
  })

  // Shipment receiving state
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [receivedProducts, setReceivedProducts] = useState<{ produkId: number; jumlah: number }[]>([])
  const [isReceivingShipment, setIsReceivingShipment] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)

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

    const handleNewShipment = (data: { shipment: Shipment }) => {
      setShipments((prev) => [data.shipment, ...prev])
      if (data.shipment.statusPengiriman === PengirimanStatus.DIKIRIM) {
        setPendingShipments((prev) => [data.shipment, ...prev])
      }

      toast({
        title: "New Shipment",
        description: `Shipment #${data.shipment.id} has arrived from Counter Timbang`,
      })
    }

    const handleUpdateShipment = (data: { shipment: Shipment }) => {
      setShipments((prev) => prev.map((s) => (s.id === data.shipment.id ? data.shipment : s)))

      if (data.shipment.statusPengiriman === PengirimanStatus.DITERIMA) {
        setPendingShipments((prev) => prev.filter((s) => s.id !== data.shipment.id))
      }
    }

    socket.on("update-product", handleUpdateProduct)
    socket.on("update-mudhohi", handleUpdateMudhohi)
    socket.on("update-penerima", handleUpdatePenerima)
    socket.on("error-logs", handleErrorLogs)
    socket.on("new-shipment", handleNewShipment)
    socket.on("update-shipment", handleUpdateShipment)

    // Fetch error logs on mount
    fetchErrorLogs()
    // Fetch pending shipments on mount
    fetchPendingShipments()

    return () => {
      socket.off("update-product", handleUpdateProduct)
      socket.off("update-mudhohi", handleUpdateMudhohi)
      socket.off("update-penerima", handleUpdatePenerima)
      socket.off("error-logs", handleErrorLogs)
      socket.off("new-shipment", handleNewShipment)
      socket.off("update-shipment", handleUpdateShipment)
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

  const fetchPendingShipments = async () => {
    try {
      const res = await fetch("/api/shipments?pending=true")
      const data = await res.json()
      setPendingShipments(data)
    } catch (error) {
      console.error("Error fetching pending shipments:", error)
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

  const fetchShipmentsPage = async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/shipments?page=${page}&pageSize=10`)
      const data = await res.json()
      setShipments(data.shipments)
      setShipmentsPage(page)
    } catch (error) {
      console.error("Error fetching shipments data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch shipments data. Please try again.",
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

  const handleProductSelection = (productIds: number[]) => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: productIds,
    }))
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

  const handleMudhohiReceived = async (hewanId: number, received: boolean) => {
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

  // Shipment handling functions
  const handlePrepareReceiveShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment)
    // Initialize received products with the same quantities as shipped
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

        // Update local state
        setShipments((prev) =>
          prev.map((s) =>
            s.id === selectedShipment.id
              ? { ...s, statusPengiriman: PengirimanStatus.DITERIMA, waktuDiterima: new Date() }
              : s,
          ),
        )
        setPendingShipments((prev) => prev.filter((s) => s.id !== selectedShipment.id))

        // Close dialog
        setShowReceiveDialog(false)
        setSelectedShipment(null)
        setReceivedProducts([])

        // Emit socket event if needed
        if (socket && isConnected) {
          socket.emit("shipment-received", {
            shipmentId: selectedShipment.id,
            products: receivedProducts,
          })
        }

        // If there were discrepancies, show a warning
        if (result.discrepancies && result.discrepancies.length > 0) {
          toast({
            title: "Discrepancies Detected",
            description: `${result.discrepancies.length} discrepancies were found and logged`,
            variant: "warning",
          })
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to receive shipment",
          variant: "destructive",
        })
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
        return <Badge variant="success">Diterima</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
              <CardDescription>Pilih produk untuk didistribusikan kepada penerima</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
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
                  <Label>Pilih Produk untuk Distribusi</Label>
                  <ProductCardSelection
                    products={products}
                    selectedProductIds={formData.selectedProducts}
                    onSelectionChange={handleProductSelection}
                    showQuantity={true}
                    className="border rounded-lg p-4"
                  />
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
                  Submit Distribusi
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
                      Origin: {product.pkgOrigin} | Delivered: {product.sdhDiserahkan}
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
                  onClick={() => fetchShipmentsPage(shipmentsPage > 1 ? shipmentsPage - 1 : 1)}
                  disabled={shipmentsPage <= 1 || loading}
                >
                  Previous
                </Button>
                <span className="py-2 px-4 border rounded-md">Page {shipmentsPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchShipmentsPage(shipmentsPage + 1)}
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
              <div>
                <CardTitle>Pengambilan Mudhohi</CardTitle>
                <CardDescription>Daftar mudhohi yang mengambil jatah daging</CardDescription>
              </div>
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mudhohi.map((m) => (
                  <div key={m.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{m.nama_pengqurban}</div>
                        {m.nama_peruntukan && (
                          <div className="text-sm text-muted-foreground">Untuk: {m.nama_peruntukan}</div>
                        )}
                      </div>
                      <div className="space-x-2">
                        {m.hewan.map((h) => (
                          <div key={h.hewanId} className="flex items-center space-x-2">
                            <Checkbox
                              checked={h.receivedByMdhohi}
                              onCheckedChange={(checked) => handleMudhohiReceived(h.hewanId, checked as boolean)}
                            />
                            <Label>Animal #{h.hewanId}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {mudhohi.length === 0 && <div className="text-center p-4">No mudhohi data available</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kupon">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Kupon Distribusi</CardTitle>
                <CardDescription>Daftar kupon yang telah dibagikan</CardDescription>
              </div>
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {penerima.map((p) => (
                  <div key={p.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{p.receivedBy}</div>
                        <div className="text-sm text-muted-foreground">
                          {p.category.category} - Kupon: {p.noKupon || "N/A"}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={p.isDiterima}
                          onCheckedChange={(checked) => handleKuponReceived(p.id, checked as boolean)}
                        />
                        <Label>Diterima</Label>
                      </div>
                    </div>
                  </div>
                ))}
                {penerima.length === 0 && <div className="text-center p-4">No kupon data available</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Receive Shipment Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Terima Pengiriman #{selectedShipment?.id}</DialogTitle>
            <DialogDescription>
              Verifikasi jumlah produk yang diterima. Sesuaikan jika ada perbedaan dengan yang dikirim.
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Dikirim pada: {new Date(selectedShipment.waktuPengiriman).toLocaleString()}
              </div>

              <div className="space-y-3">
                {selectedShipment.daftarProdukHewan.map((item) => {
                  const receivedItem = receivedProducts.find((rp) => rp.produkId === item.produkId)
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">{item.produk.nama}</div>
                        <div className="text-sm text-muted-foreground">Dikirim: {item.jumlah} paket</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`received-${item.produkId}`}>Diterima:</Label>
                        <Input
                          id={`received-${item.produkId}`}
                          type="number"
                          min={0}
                          value={receivedItem?.jumlah || 0}
                          onChange={(e) =>
                            handleUpdateReceivedQuantity(item.produkId, Number.parseInt(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedShipment.catatan && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="font-medium text-sm">Catatan Pengiriman:</div>
                  <div className="text-sm">{selectedShipment.catatan}</div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)} disabled={isReceivingShipment}>
              Batal
            </Button>
            <Button onClick={handleReceiveShipment} disabled={isReceivingShipment}>
              {isReceivingShipment ? "Memproses..." : "Terima Pengiriman"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
