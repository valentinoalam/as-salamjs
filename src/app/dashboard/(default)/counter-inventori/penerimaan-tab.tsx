import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Counter } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ErrorLog, PengirimanStatus, Shipment } from "@/types/qurban"
import { useQurban } from "@/contexts/qurban-context"

const PenerimaanContentTab = () => {
  const {
      productsQuery,
      errorLogsQuery,
      shipmentsQuery,
      getProductById,
      updateProduct,
      updateErrorLogNote,
      receiveShipment,
    } = useQurban()
    // State variables
    const [showErrorLogsDialog, setShowErrorLogsDialog] = useState(false);
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

  // Get shipments and filter pending ones
  const shipments = useMemo(() => shipmentsQuery.data || [], [shipmentsQuery.data]);
  
  // Pending shipments (DIKIRIM status)
  const pendingShipments = useMemo(() => 
    shipments.filter((s: Shipment) => s.statusPengiriman === "DIKIRIM"),
  [shipments]);
  const unsolvedErrorLogs = useMemo(() => {
    if (!Array.isArray(errorLogsQuery.data) || errorLogsQuery.data.length === 0) {
      return [];
    }

    return errorLogsQuery.data
      .filter(e => !e.selesai)
  }, [errorLogsQuery.data]);

  // Received shipments (DITERIMA status)
  const receivedShipments = useMemo(() => 
    shipments.filter(s => s.statusPengiriman === "DITERIMA"),
  [shipments]);
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

  const handleUpdateErrorNote = async (id: number, note: string) => await updateErrorLogNote({id, note})
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
  
  if (productsQuery.isLoading || shipmentsQuery.isLoading) {
    return <div>Loading...</div>
  }
  
  if (productsQuery.isError || shipmentsQuery.isError) {
    return <div>Error loading data</div>
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full h-full">
        <Card>
          <CardHeader>
            <CardTitle>Pengiriman Masuk</CardTitle>
            <div className="flex justify-between">
              <CardDescription>Daftar pengiriman yang perlu diterima</CardDescription>
              {/* Error logs notification badge */}
              {unsolvedErrorLogs.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowErrorLogsDialog(true)}
                  className="flex items-center gap-2"
                >
                  <span>Ketidaksesuaian</span>
                  <Badge variant="secondary" className="bg-white text-destructive">
                    {unsolvedErrorLogs.length}
                  </Badge>
                </Button>
              )}
            </div>
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
            {receivedShipments.length > 0 ? (
              <div className="space-y-4">
                {receivedShipments.map(shipment => (
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
      </div>
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
      {/* Error Logs Dialog */}
      <Dialog open={showErrorLogsDialog} onOpenChange={setShowErrorLogsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Ketidaksesuaian</DialogTitle>
            <DialogDescription>
              {unsolvedErrorLogs.length} masalah belum terselesaikan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {unsolvedErrorLogs.map(log => (
              <div key={log.id} className="p-4 border rounded-md bg-red-50 dark:bg-red-900/20">
                <div className="flex justify-between">
                  <div className="font-medium">
                    {log.produk?.nama || `Produk ${log.produkId}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="mt-2">{log.note}</div>
                <div className="mt-4 flex gap-2">
                  <Input
                    placeholder="Tambahkan catatan"
                    defaultValue={log.note}
                    onBlur={e => handleUpdateErrorNote(log.id, e.target.value)}
                  />
                  <Button 
                    variant="destructive"
                    onClick={() => handleOpenDiscrepancyDialog(log)}
                  >
                    Selesaikan
                  </Button>
                </div>
              </div>
            ))}
            
            {unsolvedErrorLogs.length === 0 && (
              <div className="text-center p-8 border rounded-md">
                <p>Tidak ada ketidaksesuaian yang perlu ditangani</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowErrorLogsDialog(false)}>Tutup</Button>
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
    </div>
  )
}

export default PenerimaanContentTab