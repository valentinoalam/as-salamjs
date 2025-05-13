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
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { PaymentStatus, CaraBayar } from "@prisma/client"
import { getMudhohiList, updatePaymentStatus, createMudhohi } from "./actions"
import { exportToExcel } from "@/lib/excel"
import { CheckCircle, XCircle, Clock, AlertCircle, Search, Plus, RefreshCw, Download } from "lucide-react"
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
  } | null
  hewan: {
    id: string
    animalId: string
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

type TipeHewan = {
  id: number
  nama: string
  icon: string | null
  harga: number
  note: string
}

interface MudhohiManagementProps {
  initialStats: MudhohiStats
  initialMudhohi: Mudhohi[]
}

export default function MudhohiManagement({ initialStats, initialMudhohi }: MudhohiManagementProps) {
  const [stats, setStats] = useState<MudhohiStats>(initialStats)
  const [mudhohi, setMudhohi] = useState<Mudhohi[]>(initialMudhohi)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    nama_pengqurban: "",
    nama_peruntukan: "",
    email: "",
    phone: "",
    pesan_khusus: "",
    keterangan: "",
    potong_sendiri: false,
    mengambilDaging: false,
    tipeHewanId: "1", // Default to Sapi
    cara_bayar: CaraBayar.TRANSFER,
    paymentStatus: PaymentStatus.BELUM_BAYAR,
    dibayarkan: 0,
  })

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

  const handleUpdatePaymentStatus = async (mudhohiId: string, newStatus: PaymentStatus, amount?: number) => {
    try {
      const result = await updatePaymentStatus(mudhohiId, newStatus, amount)

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

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmitMudhohi = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createMudhohi({
        ...formData,
        tipeHewanId: Number.parseInt(formData.tipeHewanId),
      })

      if (result.success) {
        toast({
          title: "Pengqurban Added",
          description: "The new pengqurban has been added successfully.",
        })

        // Close dialog and reset form
        setAddDialogOpen(false)
        setFormData({
          nama_pengqurban: "",
          nama_peruntukan: "",
          email: "",
          phone: "",
          pesan_khusus: "",
          keterangan: "",
          potong_sendiri: false,
          mengambilDaging: false,
          tipeHewanId: "1",
          cara_bayar: CaraBayar.TRANSFER,
          paymentStatus: PaymentStatus.BELUM_BAYAR,
          dibayarkan: 0,
        })

        // Refresh data
        refreshData()
      } else {
        throw new Error(result.error || "Failed to add pengqurban")
      }
    } catch (error) {
      console.error("Error adding pengqurban:", error)
      toast({
        title: "Error",
        description: "Failed to add pengqurban. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
      Hewan: m.hewan.map((h) => `${h.tipe.nama} #${h.animalId}`).join(", "),
      "Ambil Daging": m.mengambilDaging ? "Ya" : "Tidak",
      "Saksikan Penyembelihan": m.potong_sendiri ? "Ya" : "Tidak",
      "Tanggal Daftar": new Date(m.createdAt).toLocaleDateString(),
    }))

    exportToExcel(data, "pengqurban_data")
  }
  return (
    <div className="space-y-8">
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Form Tambah Mudhohi</DialogTitle>
                <DialogDescription>Enter the details of the new pengqurban and their qurban.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitMudhohi}>
                <Tabs defaultValue="personal" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="personal">Personal Info</TabsTrigger>
                    <TabsTrigger value="qurban">Qurban Details</TabsTrigger>
                    <TabsTrigger value="payment">Payment</TabsTrigger>
                  </TabsList>
                  <TabsContent value="personal" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nama_pengqurban">Nama Pengqurban</Label>
                        <Input
                          id="nama_pengqurban"
                          value={formData.nama_pengqurban}
                          onChange={(e) => handleFormChange("nama_pengqurban", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nama_peruntukan">Nama Peruntukan</Label>
                        <Input
                          id="nama_peruntukan"
                          value={formData.nama_peruntukan}
                          onChange={(e) => handleFormChange("nama_peruntukan", e.target.value)}
                          placeholder="Atas nama siapa qurban ini (opsional)"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleFormChange("email", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Nomor Telepon</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleFormChange("phone", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pesan_khusus">Pesan Khusus</Label>
                      <Textarea
                        id="pesan_khusus"
                        value={formData.pesan_khusus}
                        onChange={(e) => handleFormChange("pesan_khusus", e.target.value)}
                        placeholder="Pesan khusus dari pengqurban (opsional)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="keterangan">Keterangan</Label>
                      <Textarea
                        id="keterangan"
                        value={formData.keterangan}
                        onChange={(e) => handleFormChange("keterangan", e.target.value)}
                        placeholder="Keterangan tambahan (opsional)"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="qurban" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipeHewanId">Jenis Hewan</Label>
                      <Select
                        value={formData.tipeHewanId}
                        onValueChange={(value) => handleFormChange("tipeHewanId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis hewan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">🐮 Sapi</SelectItem>
                          <SelectItem value="2">🐐 Domba</SelectItem>
                          <SelectItem value="3">🐮 Sapi Kolektif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-4 mt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="potong_sendiri"
                          checked={formData.potong_sendiri}
                          onCheckedChange={(checked) => handleFormChange("potong_sendiri", checked)}
                        />
                        <Label htmlFor="potong_sendiri">Ingin menyaksikan penyembelihan</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="mengambilDaging"
                          checked={formData.mengambilDaging}
                          onCheckedChange={(checked) => handleFormChange("mengambilDaging", checked)}
                        />
                        <Label htmlFor="mengambilDaging">Ingin mengambil daging qurban</Label>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="payment" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="cara_bayar">Metode Pembayaran</Label>
                      <Select
                        value={formData.cara_bayar}
                        onValueChange={(value) => handleFormChange("cara_bayar", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih metode pembayaran" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CaraBayar.TRANSFER}>Transfer Bank</SelectItem>
                          <SelectItem value={CaraBayar.TUNAI}>Tunai</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Status Pembayaran</Label>
                      <Select
                        value={formData.paymentStatus}
                        onValueChange={(value) => handleFormChange("paymentStatus", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status pembayaran" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PaymentStatus.BELUM_BAYAR}>Belum Bayar</SelectItem>
                          <SelectItem value={PaymentStatus.MENUNGGU_KONFIRMASI}>Menunggu Konfirmasi</SelectItem>
                          <SelectItem value={PaymentStatus.LUNAS}>Lunas</SelectItem>
                          <SelectItem value={PaymentStatus.BATAL}>Batal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dibayarkan">Jumlah Dibayarkan</Label>
                      <Input
                        id="dibayarkan"
                        type="number"
                        value={formData.dibayarkan}
                        onChange={(e) => handleFormChange("dibayarkan", Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Pengqurban"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                            {h.tipe.icon} {h.tipe.nama} #{h.animalId}
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
                              onClick={() =>
                                handleUpdatePaymentStatus(m.id, PaymentStatus.LUNAS, m.payment?.dibayarkan)
                              }
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
    </div>
  )
}
