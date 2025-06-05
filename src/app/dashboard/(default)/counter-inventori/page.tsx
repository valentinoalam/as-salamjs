"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useQurban} from "@/contexts/qurban-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { Counter, JenisDistribusi } from "@prisma/client"
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
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ErrorLog, Penerima, PengirimanStatus, Shipment } from "@/types/qurban"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Minus, Plus } from "lucide-react"
import { exportToExcel } from "@/lib/excel"
import ProductCard from "@/components/product-card"
import DistributionContentTab from "./distribution-tab"

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
    updateKuponReceived
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
  
  // Group proposal state
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
  
  // Get available products for distribution
  const availableProducts = useMemo(() => 
    getAvailableProducts(), 
    [getAvailableProducts]
  );

  // Get shipments and filter pending ones
  const shipments = useMemo(() => shipmentsQuery.data || [], [shipmentsQuery.data]);
  
  // Pending shipments (DIKIRIM status)
  const pendingShipments = useMemo(() => 
    shipments.filter(s => s.statusPengiriman === "DIKIRIM"),
  [shipments]);

  // Received shipments (DITERIMA status)
  const receivedShipments = useMemo(() => 
    shipments.filter(s => s.statusPengiriman === "DITERIMA"),
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

  // Add product to group proposal
  const addProductToGroupProposal = (produkId: number) => {
    setGroupProposalData(prev => ({
      ...prev,
      produkDistribusi: [...prev.produkDistribusi, { produkId, jumlah: 1 }]
    }));
  };

  // Update product quantity in group proposal
  const updateGroupProductQuantity = (index: number, jumlah: number) => {
    setGroupProposalData(prev => {
      const newProdukDistribusi = [...prev.produkDistribusi];
      newProdukDistribusi[index] = { 
        ...newProdukDistribusi[index], 
        jumlah: Math.max(1, jumlah)
      };
      return { ...prev, produkDistribusi: newProdukDistribusi };
    });
  };

  // Remove product from group proposal
  const removeProductFromGroupProposal = (index: number) => {
    setGroupProposalData(prev => {
      const newProdukDistribusi = [...prev.produkDistribusi];
      newProdukDistribusi.splice(index, 1);
      return { ...prev, produkDistribusi: newProdukDistribusi };
    });
  };

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

  // Handle kupon received status update
  const handleKuponReceived = async (penerimaId: string) => {
    updateKuponReceived({ penerimaId, diterima: true })
    toast({
      title: "Kupon Dikembalikan",
      description: "Status kupon telah diperbarui",
    });
  }
  
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

  // Export penerima data to Excel
  const handleExportPenerimaToExcel = () => {
    const data = penerimaQuery.data
      .filter((p: Penerima) => p.noKupon)
      .map((p: Penerima) => ({
        ID: p.id,
        "No Kupon": p.noKupon || "-",
        Penerima: p.diterimaOleh || "-",
        Kategori: p.distribusi?.kategori || "-",
        Status: p.logDistribusi ? "Sudah Dikembalikan" : "Belum Dikembalikan",
      }))

    exportToExcel(data, "penerima_kupon")
  }

  if (penerimaQuery.isLoading || productsQuery.isLoading || shipmentsQuery.isLoading) {
    return <div>Loading...</div>
  }
  
  if (penerimaQuery.isError || productsQuery.isError || shipmentsQuery.isError) {
    return <div>Error loading data</div>
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      <Tabs defaultValue="pengiriman">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pengiriman">Pengiriman</TabsTrigger>
          <TabsTrigger value="distribusi">Distribusi</TabsTrigger>
          <TabsTrigger value="kupon">Kupon</TabsTrigger>
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
        </TabsContent>

        <TabsContent value="distribusi">
          <DistributionContentTab />
        </TabsContent>

        <TabsContent value="kupon">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Pengembalian Kupon</CardTitle>
                  <CardDescription>Pencatatan pengembalian kupon oleh penerima</CardDescription>
                </div>
                <Button variant="outline" onClick={handleExportPenerimaToExcel}>
                  <Download size={16} className="mr-2" /> Ekspor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nomor Kupon</TableHead>
                      <TableHead>Penerima</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {penerimaIndividu.map(penerima => (
                      <TableRow key={penerima.id}>
                        <TableCell className="font-medium">{penerima.noKupon || "-"}</TableCell>
                        <TableCell>{penerima.nama}</TableCell>
                        <TableCell>{penerima.distribusi?.kategori || "-"}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={penerima.logDistribusi ? "default" : "outline"}
                          >
                            {penerima.logDistribusi ? "Terverifikasi" : "Belum Diverifikasi"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!penerima.logDistribusi && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleKuponReceived(penerima.id)}
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