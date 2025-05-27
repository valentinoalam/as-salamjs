"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PaymentStatus, CaraBayar } from "@prisma/client"
import { getMudhohiList, updatePaymentStatus, createMudhohi } from "../../../services/mudhohi"
import { exportToExcel } from "@/lib/excel"
import { CheckCircle, XCircle, Clock, AlertCircle, Search, Plus, RefreshCw, Download } from "lucide-react"
import QurbanForm from "@/components/qurban/form-pemesanan-qurban"
import { Label } from "@/components/ui/label"
import type { TipeHewan } from "@/types/qurban"

type MudhohiStats = {
  totalMudhohi: number
  totalHewan: number
  statusCounts: {
    BELUM_BAYAR: number
    MENUNGGU_KONFIRMASI: number
    LUNAS: number
    BATAL: number
  }
}

type Mudhohi = {
  id: string
  nama_pengqurban: string | null
  nama_peruntukan: string | null
  pesan_khusus: string | null
  keterangan: string | null
  potong_sendiri: boolean
  ambil_daging: boolean | null
  mengambilDaging: boolean
  dash_code: string
  createdAt: Date
  payment: {
    id: string
    cara_bayar: CaraBayar
    paymentStatus: PaymentStatus
    dibayarkan: number
    urlTandaBukti: string | null
    kodeResi: string | null
  } | null
  hewan: {
    id: string
    hewanId: string
    tipeId: number
    status: string
    slaughtered: boolean
    tipe: {
      nama: string
      icon: string | null
    }
  }[]
  user: {
    name: string | null
    email: string | null
  }
}

interface MudhohiManagementProps {
  initialStats: MudhohiStats
  initialMudhohi: Mudhohi[]
  tipeHewan: TipeHewan[]
}

export default function MudhohiManagement({ 
  initialStats, 
  initialMudhohi, 
  tipeHewan 
}: MudhohiManagementProps) {
  const [stats, setStats] = useState<MudhohiStats>(initialStats)
  const [mudhohi, setMudhohi] = useState<Mudhohi[]>(initialMudhohi)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL")
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Now, add a state for kodeResi
  const [kodeResi, setKodeResi] = useState<string>("")

  // Add a dialog state for payment confirmation
  const [confirmPaymentDialogOpen, setConfirmPaymentDialogOpen] = useState(false)
  const [selectedMudhohiId, setSelectedMudhohiId] = useState<string | null>(null)
  const [confirmPaymentAmount, setConfirmPaymentAmount] = useState<number>(0)
  
  // Add a function to handle payment confirmation dialog
  const openConfirmPaymentDialog = (mudhohiId: string, currentAmount: number) => {
    setSelectedMudhohiId(mudhohiId)
    setConfirmPaymentAmount(currentAmount)
    setKodeResi("")
    setConfirmPaymentDialogOpen(true)
  }

  // Update the handleUpdatePaymentStatus function to include kodeResi
  const handleUpdatePaymentStatus = async (
    mudhohiId: string,
    newStatus: PaymentStatus,
    amount?: number,
    kodeResi?: string,
  ) => {
    try {
      const result = await updatePaymentStatus(mudhohiId, newStatus, amount, kodeResi)

      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Payment status has been updated to ${getStatusLabel(newStatus)}.`,
        })

        // Update the mudhohi in the list
        setMudhohi((prev) =>
          prev.map((m) =>
            m.id === mudhohiId
              ? {
                  ...m,
                  payment: {
                    ...m.payment!,
                    paymentStatus: newStatus,
                    dibayarkan: amount || m.payment?.dibayarkan || 0,
                    kodeResi: kodeResi || m.payment?.kodeResi || null,
                  },
                }
              : m,
          ),
        )

        // Refresh data to get updated stats
        refreshData()
      } else {
        throw new Error(result.error || "Failed to update payment status")
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
      toast({
        title: "Error",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  // Add a function to handle payment confirmation submission
  const handleConfirmPayment = () => {
    if (selectedMudhohiId) {
      handleUpdatePaymentStatus(selectedMudhohiId, PaymentStatus.LUNAS, confirmPaymentAmount, kodeResi || undefined)
      setConfirmPaymentDialogOpen(false)
      setSelectedMudhohiId(null)
    }
  }
  const refreshData = async () => {
    setLoading(true)
    try {
      const data = await getMudhohiList(statusFilter === "ALL" ? undefined : statusFilter)
      setMudhohi(data)
      // Recalculate stats
      const newStats = {
        ...stats,
        totalMudhohi: data.length,
        totalHewan: data.reduce((acc, curr) => acc + curr.hewan.length, 0),
      }
      setStats(newStats)
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = async (status: PaymentStatus | "ALL") => {
    setStatusFilter(status)
    setLoading(true)
    try {
      const data = await getMudhohiList(status === "ALL" ? undefined : status)
      setMudhohi(data)
    } catch (error) {
      console.error("Error filtering data:", error)
      toast({
        title: "Error",
        description: "Failed to filter data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    setLoading(true)
    try {
      const data = await getMudhohiList(statusFilter === "ALL" ? undefined : statusFilter, searchTerm)
      setMudhohi(data)
    } catch (error) {
      console.error("Error searching data:", error)
      toast({
        title: "Error",
        description: "Failed to search data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitMudhohi = async (formData: any) => {
    try {
      // Transform the form data to match the expected format
      const transformedData = {
        nama_pengqurban: formData.nama_pengqurban,
        nama_peruntukan: formData.nama_peruntukan || "",
        email: formData.email,
        phone: formData.phone,
        pesan_khusus: formData.pesan_khusus || "",
        keterangan: formData.keterangan || "",
        potong_sendiri: formData.potong_sendiri,
        mengambilDaging: formData.mengambilDaging,
        tipeHewanId: Number.parseInt(formData.tipeHewanId),
        quantity: formData.quantity,
        isKolektif: formData.isKolektif,
        cara_bayar: formData.cara_bayar,
        paymentStatus: formData.paymentStatus,
        dibayarkan: formData.dibayarkan,
        kodeResi: "",
      }

      const result = await createMudhohi(transformedData)

      if (result.success) {
        // Close dialog and refresh data
        setAddDialogOpen(false)
        refreshData()
        
        return { success: true, mudhohiId: result.mudhohiId }
      } else {
        return { success: false, error: result.error || "Failed to add pengqurban" }
      }
    } catch (error) {
      console.error("Error adding pengqurban:", error)
      return { success: false, error: "Failed to add pengqurban. Please try again." }
    }
  }

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.BELUM_BAYAR:
        return "Belum Bayar"
      case PaymentStatus.MENUNGGU_KONFIRMASI:
        return "Menunggu Konfirmasi"
      case PaymentStatus.LUNAS:
        return "Lunas"
      case PaymentStatus.BATAL:
        return "Batal"
      default:
        return status
    }
  }

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.BELUM_BAYAR:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case PaymentStatus.MENUNGGU_KONFIRMASI:
        return <Clock className="h-5 w-5 text-blue-500" />
      case PaymentStatus.LUNAS:
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case PaymentStatus.BATAL:
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.BELUM_BAYAR:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Belum Bayar
          </Badge>
        )
      case PaymentStatus.MENUNGGU_KONFIRMASI:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            Menunggu Konfirmasi
          </Badge>
        )
      case PaymentStatus.LUNAS:
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Lunas
          </Badge>
        )
      case PaymentStatus.BATAL:
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            Batal
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredMudhohi = mudhohi.filter((m) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        (m.nama_pengqurban && m.nama_pengqurban.toLowerCase().includes(searchLower)) ||
        (m.nama_peruntukan && m.nama_peruntukan.toLowerCase().includes(searchLower)) ||
        (m.user.email && m.user.email.toLowerCase().includes(searchLower)) ||
        m.dash_code.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const handleExportToExcel = () => {
    const data = filteredMudhohi.map((m) => ({
      ID: m.id,
      "Dash Code": m.dash_code,
      "Nama Pengqurban": m.nama_pengqurban || "-",
      "Nama Peruntukan": m.nama_peruntukan || "-",
      Email: m.user.email || "-",
      "Status Pembayaran": m.payment ? getStatusLabel(m.payment.paymentStatus) : "-",
      "Metode Pembayaran": m.payment ? (m.payment.cara_bayar === CaraBayar.TRANSFER ? "Transfer" : "Tunai") : "-",
      "Jumlah Dibayarkan": m.payment ? m.payment.dibayarkan : 0,
      Hewan: m.hewan.map((h) => `${h.tipe.nama} #${h.hewanId}`).join(", "),
      "Ambil Daging": m.mengambilDaging ? "Ya" : "Tidak",
      "Saksikan Penyembelihan": m.potong_sendiri ? "Ya" : "Tidak",
      "Tanggal Daftar": new Date(m.createdAt).toLocaleDateString(),
    }))

    exportToExcel(data, "pengqurban_data")
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Total Pengqurban</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalMudhohi}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Total Hewan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalHewan}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Lunas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.statusCounts.LUNAS}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Belum Bayar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.statusCounts.BELUM_BAYAR}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Input
              placeholder="Search pengqurban..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Select value={statusFilter} onValueChange={(value) => handleFilterChange(value as PaymentStatus | "ALL")}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value={PaymentStatus.BELUM_BAYAR}>Belum Bayar</SelectItem>
              <SelectItem value={PaymentStatus.MENUNGGU_KONFIRMASI}>Menunggu Konfirmasi</SelectItem>
              <SelectItem value={PaymentStatus.LUNAS}>Lunas</SelectItem>
              <SelectItem value={PaymentStatus.BATAL}>Batal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={refreshData} disabled={loading} className="w-full md:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportToExcel} className="w-full md:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Mudhohi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle>Tambah Pengqurban Baru</DialogTitle>
                <DialogDescription>
                  Gunakan form di bawah untuk menambahkan pengqurban baru ke dalam sistem.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 pb-6 max-h-[calc(95vh-120px)] overflow-y-auto">
                <QurbanForm
                  tipeHewan={tipeHewan}
                  onSubmit={handleSubmitMudhohi}
                  onCancel={() => setAddDialogOpen(false)}
                  mode="admin"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mudhohi List */}
      <div className="space-y-4">
        {filteredMudhohi.length > 0 ? (
          filteredMudhohi.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{m.nama_pengqurban || "Unnamed"}</h3>
                        {m.payment && getStatusBadge(m.payment.paymentStatus)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {m.nama_peruntukan ? `Untuk: ${m.nama_peruntukan}` : ""}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Kode:</span> {m.dash_code}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Email:</span> {m.user.email || "-"}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {m.hewan.map((h) => (
                          <Badge key={h.id} variant="secondary">
                            {h.tipe.icon} {h.tipe.nama} #{h.hewanId}
                          </Badge>
                        ))}
                      </div>
                      {m.mengambilDaging && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                          Ambil Daging
                        </Badge>
                      )}
                      {m.potong_sendiri && (
                        <Badge variant="outline" className="bg-teal-100 text-teal-800 border-teal-300">
                          Saksikan Penyembelihan
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Tanggal Daftar:</span>{" "}
                        {new Date(m.createdAt).toLocaleDateString()}
                      </div>
                      {m.payment && (
                        <>
                          <div className="text-sm">
                            <span className="font-medium">Metode Pembayaran:</span>{" "}
                            {m.payment.cara_bayar === CaraBayar.TRANSFER ? "Transfer" : "Tunai"}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Dibayarkan:</span> Rp{" "}
                            {m.payment.dibayarkan.toLocaleString("id-ID")}
                          </div>
                          {m.payment.kodeResi && (
                            <div className="text-sm">
                              <span className="font-medium">Kode Resi:</span> {m.payment.kodeResi}
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {m.payment?.paymentStatus === PaymentStatus.BELUM_BAYAR && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleUpdatePaymentStatus(
                                  m.id,
                                  PaymentStatus.MENUNGGU_KONFIRMASI,
                                  m.payment?.dibayarkan,
                                )
                              }
                            >
                              Konfirmasi Pembayaran
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdatePaymentStatus(m.id, PaymentStatus.BATAL)}
                            >
                              Batalkan
                            </Button>
                          </>
                        )}
                        {m.payment?.paymentStatus === PaymentStatus.MENUNGGU_KONFIRMASI && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openConfirmPaymentDialog(m.id, m.payment?.dibayarkan || 0)}
                            >
                              Terima Pembayaran
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdatePaymentStatus(m.id, PaymentStatus.BATAL)}
                            >
                              Tolak Pembayaran
                            </Button>
                          </>
                        )}
                        {m.payment?.paymentStatus === PaymentStatus.LUNAS && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdatePaymentStatus(m.id, PaymentStatus.BELUM_BAYAR)}
                          >
                            Batalkan Konfirmasi
                          </Button>
                        )}
                        {m.payment?.paymentStatus === PaymentStatus.BATAL && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdatePaymentStatus(m.id, PaymentStatus.BELUM_BAYAR)}
                          >
                            Aktifkan Kembali
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <p className="text-muted-foreground mb-4">No pengqurban found with the current filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("ALL")
                  refreshData()
                }}
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Payment Confirmation Dialog */}
      <Dialog open={confirmPaymentDialogOpen} onOpenChange={setConfirmPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
            <DialogDescription>Masukkan kode resi dan konfirmasi pembayaran.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kodeResi">Kode Resi</Label>
              <Input
                id="kodeResi"
                value={kodeResi}
                onChange={(e) => setKodeResi(e.target.value)}
                placeholder="Masukkan kode resi pembayaran"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah Dibayarkan</Label>
              <Input
                id="amount"
                type="number"
                value={confirmPaymentAmount}
                onChange={(e) => setConfirmPaymentAmount(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPaymentDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleConfirmPayment}>Konfirmasi Pembayaran</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}