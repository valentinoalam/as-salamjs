"use client"
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
    diTimbang: number
    diInventori: number
    productName: string
    errorLogId: number
  } | null>(null)
  const [adjustmentPlace, setAdjustmentPlace] = useState<Counter>(Counter.INVENTORY);

  // Memoize shipments data with proper dependency
  const shipments = useMemo(() => {
    return shipmentsQuery.data || []
  }, [shipmentsQuery.data]);
  
  // Memoize pending shipments
  const pendingShipments = useMemo(() => {
    return shipments.filter((s: Shipment) => s.statusPengiriman === "DIKIRIM")
  }, [shipments]);

  // Memoize received shipments
  const receivedShipments = useMemo(() => {
    return shipments.filter((s: Shipment) => s.statusPengiriman === "DITERIMA")
  }, [shipments]);

  // Fix the unsolvedErrorLogs memoization
  const unsolvedErrorLogs = useMemo(() => {
    if (!errorLogsQuery.data || !Array.isArray(errorLogsQuery.data)) {
      return [];
    }
    return errorLogsQuery.data.filter(e => !e.selesai)
  }, [errorLogsQuery.data]);

  const handlePrepareReceiveShipment = useCallback((shipment: Shipment) => {
    setSelectedShipment(shipment)
    setReceivedProducts(
      shipment.daftarProdukHewan.map(item => ({
        produkId: item.produkId,
        jumlah: item.jumlah,
      }))
    )
    setShowReceiveDialog(true)
  }, [])

  const handleUpdateReceivedQuantity = useCallback((produkId: number, jumlah: number) => {
    setReceivedProducts(prev => 
      prev.map(item => item.produkId === produkId ? { ...item, jumlah } : item)
    )
  }, [])

  const handleReceiveShipment = useCallback(async () => {
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
  }, [selectedShipment, receivedProducts, receiveShipment])

  const handleOpenDiscrepancyDialog = useCallback((errorLog: ErrorLog) => {
    const product = getProductById(errorLog.produkId)
    if (!product) return

    setSelectedDiscrepancy({
      produkId: errorLog.produkId,
      diTimbang: errorLog.diTimbang,
      diInventori: errorLog.diInventori,
      productName: product.nama,
      errorLogId: errorLog.id, // Simpan ID errorLog untuk update
    })
    setAdjustmentPlace(Counter.INVENTORY);
    setShowDiscrepancyDialog(true)
  }, [getProductById])

  const handleSolveDiscrepancy = useCallback(async () => {
    if (!selectedDiscrepancy) return

    try {
      // Hitung selisih berdasarkan tempat yang dipilih
      const discrepancyValue = adjustmentPlace === Counter.TIMBANG
        ? selectedDiscrepancy.diInventori - selectedDiscrepancy.diTimbang
        : selectedDiscrepancy.diTimbang - selectedDiscrepancy.diInventori;

      // Update produk berdasarkan tempat penyesuaian
      await updateProduct({
        produkId: selectedDiscrepancy.produkId,
        event: "mengkoreksi",
        place: adjustmentPlace,
        value: discrepancyValue,
        note: `Koreksi ketidaksesuaian: ${selectedDiscrepancy.diTimbang} di timbang vs ${selectedDiscrepancy.diInventori} di inventori (disesuaikan di ${adjustmentPlace})`,
      })

      // Tandai errorLog sebagai selesai
      await updateErrorLogNote({ 
        id: selectedDiscrepancy.errorLogId, 
        selesai: true,
        note: `Penyesuaian sebesar ${discrepancyValue} untuk ${selectedDiscrepancy.productName} pada pengiriman ke ${selectedShipment?.id} dilakukan di ${adjustmentPlace}`
      });

      toast({
        title: "Ketidaksesuaian Diselesaikan",
        description: `Penyesuaian sebesar ${discrepancyValue} dilakukan di ${adjustmentPlace}`,
      })

      setShowDiscrepancyDialog(false)
      setSelectedDiscrepancy(null)
      
      // Refetch data
      setTimeout(() => {
        errorLogsQuery.refetch()
        productsQuery.refetch()
      }, 500)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Gagal menyelesaikan ketidaksesuaian",
        variant: "destructive",
      })
    }
  }, [selectedDiscrepancy, adjustmentPlace, updateProduct, updateErrorLogNote, errorLogsQuery, productsQuery])

  const handleUpdateErrorNote = useCallback(async (id: number, note: string) => {
    if (note.trim() === '') return; // Don't update with empty notes
    try {
      await updateErrorLogNote({ id, note })
    } catch (error) {
      console.error('Error updating note:', error)
    }
  }, [updateErrorLogNote])

  const getShipmentStatusBadge = useCallback((status: PengirimanStatus) => {
    switch (status) {
      case "DIKIRIM":
        return <Badge variant="secondary">Dikirim</Badge>;
      case "DITERIMA":
        return <Badge variant="default">Diterima</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }, []);

  // Add error boundary for queries
  if (productsQuery.isError || shipmentsQuery.isError || errorLogsQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading data. Please refresh the page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (productsQuery.isLoading || shipmentsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
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
                    key={`note-${log.id}`}
                    placeholder="Tambahkan catatan"
                    defaultValue={log.note}
                    onBlur={e => {
                      if (e.target.value !== log.note) {
                        handleUpdateErrorNote(log.id, e.target.value)
                      }
                    }}
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
            <Button 
              onClick={() => {
                setShowErrorLogsDialog(false)
                // Small delay to ensure state is updated before any refetch
                setTimeout(() => {
                  // Any cleanup if needed
                }, 100)
              }}
            >
              Tutup
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
            Atur ketidaksesuaian untuk {selectedDiscrepancy?.productName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Di Timbang</Label>
              <Input value={selectedDiscrepancy?.diTimbang || 0} disabled />
            </div>
            <div>
              <Label>Di Inventori</Label>
              <Input value={selectedDiscrepancy?.diInventori || 0} disabled />
            </div>
          </div>

          <div>
            <Label>Selisih</Label>
            <Input 
              value={
                selectedDiscrepancy 
                  ? (selectedDiscrepancy.diInventori - selectedDiscrepancy.diTimbang) 
                  : 0
              } 
              disabled 
            />
          </div>

          <div className="space-y-2">
            <Label>Pilih Penyesuaian:</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="adjust-inventory"
                  name="adjustmentPlace"
                  value={Counter.INVENTORY}
                  checked={adjustmentPlace === Counter.INVENTORY}
                  onChange={() => setAdjustmentPlace(Counter.INVENTORY)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="adjust-inventory" className="block text-sm font-medium text-gray-700">
                  Sesuaikan di Inventori (tambahkan selisih ke inventori)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="adjust-weight"
                  name="adjustmentPlace"
                  value={Counter.TIMBANG}
                  checked={adjustmentPlace === Counter.TIMBANG}
                  onChange={() => setAdjustmentPlace(Counter.TIMBANG)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="adjust-weight" className="block text-sm font-medium text-gray-700">
                  Sesuaikan di Timbang (tambahkan selisih ke timbang)
                </label>
              </div>
            </div>
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

/**
 * Logika Penyelesaian Ketidaksesuaian
1. Analisis Otomatis

diTimbang Inventori = Kumulatif - DiTimbang
Selisih Inventori = DiInventori - diTimbang Inventori
Total Terakumulasi = DiTimbang + DiInventori
Selisih Kumulatif = Total Terakumulasi - Kumulatif

2. Opsi Penyelesaian Berdasarkan Prioritas
Opsi 1: Sesuaikan Inventori (Paling Umum)

Asumsi: Kumulatif dan DiTimbang benar
Action: Update DiInventori = Kumulatif - DiTimbang
Cocok untuk: Kesalahan pencatatan inventori

Opsi 2: Sesuaikan DiTimbang

Asumsi: Kumulatif dan DiInventori benar
Action: Update DiTimbang = Kumulatif - DiInventori
Cocok untuk: Kesalahan pencatatan timbang

Opsi 3: Sesuaikan Kumulatif

Asumsi: DiTimbang dan DiInventori benar
Action: Update Kumulatif = DiTimbang + DiInventori
Cocok untuk: Kesalahan pencatatan penerimaan awal

Opsi 4: Recount/Audit

Action: Hitung ulang fisik semua nilai
Cocok untuk: Ketidakpastian tinggi, butuh verifikasi fisik

Opsi 5: Penyesuaian Manual

Action: Set nilai custom dengan justifikasi
Cocok untuk: Kasus kompleks yang butuh penanganan khusus

3. Fitur Keamanan

Preview hasil sebelum commit
Audit trail lengkap dengan alasan
Validasi konsistensi otomatis
Catatan wajib untuk dokumentasi
 */