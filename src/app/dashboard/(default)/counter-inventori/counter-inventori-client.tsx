"use client"

import { useState, useEffect } from "react"
import { useQurban } from "@/contexts/qurban-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { Counter, PengirimanStatus } from "@prisma/client"
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
import { receiveShipment, updateErrorLogNote } from "./actions"

type ProdukDikirim = {
  id: string
  produkId: number
  jumlah: number
  produk: {
    id: number
    nama: string
  }
}

type Shipment = {
  id: number
  statusPengiriman: PengirimanStatus
  daftarProdukHewan: ProdukDikirim[]
  waktuPengiriman: Date
  waktuDiterima: Date | null
  catatan: string | null
}

export type ErrorLog = {
  id: number
  produkId: number
  event: string
  note: string
  timestamp: Date
  produk: {
    id: number
    nama: string
  }
}

export default function CounterInventori() {
  const { productsQuery, errorLogsQuery, isConnected, updateProduct, getProductLogsByPlace } = useQurban()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [pendingShipments, setPendingShipments] = useState<Shipment[]>([])
  const [shipmentsPage, setShipmentsPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // Shipment receiving state
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [receivedProducts, setReceivedProducts] = useState<{ produkId: number; jumlah: number }[]>([])
  const [isReceivingShipment, setIsReceivingShipment] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)

  // Discrepancy resolution state
  const [showDiscrepancyDialog, setShowDiscrepancyDialog] = useState(false)
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<{
    produkId: number
    expected: number
    received: number
    actual: number
    productName: string
  } | null>(null)

  // Product history state
  const [showProductHistory, setShowProductHistory] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<number | null>(null)

  // Product update state
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState("")
  const [operation, setOperation] = useState<"add" | "decrease">("add")

  // Get product logs for the Counter.INVENTORY place
  const productLogs = getProductLogsByPlace(Counter.INVENTORY)

  useEffect(() => {
    // Fetch pending shipments on mount
    fetchPendingShipments()
    // Fetch all shipments on mount
    fetchShipmentsPage(1)
  }, [])

  const fetchPendingShipments = async () => {
    try {
      const res = await fetch("/api/shipments?pending=true")
      if (!res.ok) throw new Error("Failed to fetch pending shipments")
      const data = await res.json()
      setPendingShipments(data)
    } catch (error) {
      console.error("Error fetching pending shipments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch pending shipments",
        variant: "destructive",
      })
    }
  }

  const fetchShipmentsPage = async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/shipments?page=${page}&pageSize=10`)
      if (!res.ok) throw new Error("Failed to fetch shipments")
      const data = await res.json()
      setShipments(data.shipments)
      setShipmentsPage(page)
    } catch (error) {
      console.error("Error fetching shipments data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch shipments data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

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

        // If there were discrepancies, show a warning
        if (result.discrepancies && result.discrepancies.length > 0) {
          toast({
            title: "Discrepancies Detected",
            description: `${result.discrepancies.length} discrepancies were found and logged`,
            variant: "destructive",
          })

          // Refresh error logs
          errorLogsQuery.refetch()
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to receive shipment",
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

  const handleUpdateErrorNote = async (id: number, note: string) => {
    try {
      await updateErrorLogNote(id, note)
      // Refresh error logs
      errorLogsQuery.refetch()

      toast({
        title: "Success",
        description: "Error note updated",
      })
    } catch (error) {
      console.error("Error updating error note:", error)
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      })
    }
  }

  const handleOpenDiscrepancyDialog = (errorLog: ErrorLog) => {
    const product = productsQuery.data.find((p) => p.id === errorLog.produkId)
    if (!product) return

    setSelectedDiscrepancy({
      produkId: errorLog.produkId,
      expected: 0, // We'll parse this from the note if possible
      received: 0, // We'll parse this from the note if possible
      actual: 0,
      productName: product.nama,
    })

    // Try to parse expected and received values from the note
    const noteMatch = errorLog.note.match(/expected (\d+), received (\d+)/)
    if (noteMatch && noteMatch.length >= 3) {
      setSelectedDiscrepancy((prev) => ({
        ...prev!,
        expected: Number.parseInt(noteMatch[1]),
        received: Number.parseInt(noteMatch[2]),
        actual: Number.parseInt(noteMatch[2]), // Default to received amount
      }))
    }

    setShowDiscrepancyDialog(true)
  }

  const handleSolveDiscrepancy = async () => {
    if (!selectedDiscrepancy) return

    try {
      // Update the inventory with the actual amount
      await updateProduct({
        productId: selectedDiscrepancy.produkId,
        operation: "add",
        place: Counter.INVENTORY,
        value: selectedDiscrepancy.actual,
        note: `Corrected from discrepancy resolution (expected: ${selectedDiscrepancy.expected}, received: ${selectedDiscrepancy.received}, corrected to: ${selectedDiscrepancy.actual})`,
      })

      toast({
        title: "Discrepancy Resolved",
        description: `Inventory updated with actual quantity: ${selectedDiscrepancy.actual}`,
      })

      setShowDiscrepancyDialog(false)
      setSelectedDiscrepancy(null)

      // Refresh error logs
      errorLogsQuery.refetch()
    } catch (error) {
      console.error("Error resolving discrepancy:", error)
      toast({
        title: "Error",
        description: "Failed to resolve discrepancy",
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

      // Reset form
      setQuantity(1)
      setNote("")
      toast({
        title: "Success",
        description: `Product ${operation === "add" ? "added to" : "removed from"} inventory`,
      })
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      })
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

  if (productsQuery.isLoading) {
    return <div>Loading...</div>
  }

  if (productsQuery.isError) {
    return <div>Error loading products</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      <Tabs defaultValue="pengiriman">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pengiriman">Pengiriman</TabsTrigger>
          <TabsTrigger value="inventori">Inventori</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="error-logs">Error Logs</TabsTrigger>
        </TabsList>

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

        <TabsContent value="inventori">
          <Card>
            <CardHeader>
              <CardTitle>Update Inventory</CardTitle>
              <CardDescription>Add or remove products from inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product">Product</Label>
                    <select
                      id="product"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedProduct || ""}
                      onChange={(e) => setSelectedProduct(Number(e.target.value))}
                    >
                      <option value="">Select a product</option>
                      {productsQuery.data.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.nama} ({product.diInventori} in inventory)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="operation">Operation</Label>
                  <select
                    id="operation"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={operation}
                    onChange={(e) => setOperation(e.target.value as "add" | "decrease")}
                  >
                    <option value="add">Add</option>
                    <option value="decrease">Remove</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    placeholder="Add a note about this operation"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProduct} disabled={!selectedProduct || quantity <= 0}>
                    Update Inventory
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Produk di Inventori</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {productsQuery.data.map((product) => (
                  <div key={product.id} className="flex flex-col items-center p-4 border rounded-md">
                    <span className="text-lg mb-2">{product.nama}</span>
                    <span className="text-3xl font-bold">{product.diInventori}</span>
                    <div className="text-xs mt-1">
                      Timbang: {product.diTimbang} | Diserahkan: {product.sdhDiserahkan}
                    </div>
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={() => handleShowProductHistory(product.id)}>
                        History
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
                  productLogs.map((log) => (
                    <div key={log.id} className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <div className="font-medium">{log.produk.nama}</div>
                        <div className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            log.event === "add" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.event === "add" ? "Added" : "Removed"}
                        </span>
                        <span>{log.value} units</span>
                      </div>
                      {log.note && <div className="mt-2 text-sm">{log.note}</div>}
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4">No history available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="error-logs">
          <Card>
            <CardHeader>
              <CardTitle>Error Log</CardTitle>
              <CardDescription>Catatan ketidaksesuaian dan error dalam sistem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errorLogsQuery.data.map((log) => (
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
                      <Button size="sm" variant="outline" onClick={() => handleOpenDiscrepancyDialog(log)}>
                        Solve
                      </Button>
                    </div>
                  </div>
                ))}
                {errorLogsQuery.data.length === 0 && <div className="text-center p-4">No errors logged</div>}
              </div>
            </CardContent>
          </Card>
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
            <DialogTitle>Resolve Discrepancy</DialogTitle>
            <DialogDescription>Update the actual quantity for {selectedDiscrepancy?.productName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expected Quantity</Label>
                <Input type="number" value={selectedDiscrepancy?.expected || 0} disabled />
              </div>
              <div>
                <Label>Received Quantity</Label>
                <Input type="number" value={selectedDiscrepancy?.received || 0} disabled />
              </div>
            </div>

            <div>
              <Label htmlFor="actual-quantity">Actual Quantity</Label>
              <Input
                id="actual-quantity"
                type="number"
                min="0"
                value={selectedDiscrepancy?.actual || 0}
                onChange={(e) =>
                  setSelectedDiscrepancy((prev) =>
                    prev ? { ...prev, actual: Number.parseInt(e.target.value) || 0 } : null,
                  )
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscrepancyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSolveDiscrepancy}>Resolve Discrepancy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product History Dialog */}
      <Dialog open={showProductHistory} onOpenChange={setShowProductHistory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Product History - {productsQuery.data.find((p) => p.id === selectedProductForHistory)?.nama}
            </DialogTitle>
            <DialogDescription>History of operations for this product</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-4 my-4">
            {productLogs
              .filter((log) => log.produkId === selectedProductForHistory)
              .map((log) => (
                <div key={log.id} className="border rounded-md p-3">
                  <div className="flex justify-between">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        log.event === "add" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {log.event === "add" ? "Added" : "Removed"}
                    </span>
                    <div className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="mt-2">
                    <span className="font-medium">Quantity:</span> {log.value} units
                  </div>
                  {log.note && (
                    <div className="mt-1">
                      <span className="font-medium">Note:</span> {log.note}
                    </div>
                  )}
                </div>
              ))}

            {productLogs.filter((log) => log.produkId === selectedProductForHistory).length === 0 && (
              <div className="text-center p-4">No history available for this product</div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowProductHistory(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
