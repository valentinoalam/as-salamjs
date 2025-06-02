"use client"

import type React from "react"
import { useState } from "react"
import { z } from "zod"
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
import { 
  createMudhohi,
  getMudhohiList, 
  updatePaymentStatus, 
  // createMudhohi 
} from "@/services/mudhohi"
import { exportToExcel } from "@/lib/excel"
import { CheckCircle, XCircle, Clock, AlertCircle, Search, Plus, RefreshCw, Download, HandCoins, ListPlus } from "lucide-react"
import { Label } from "@/components/ui/label"
import type { TipeHewan } from "@/types/keuangan"
import type { AdminQurbanFormValues } from "@/lib/zod/qurban-form"
import { AdminQurbanForm } from "@/components/qurban/trx-admin/admin-qurban-form"
import Link from "next/link"

// Zod Schemas
const PaymentStatusEnum = z.nativeEnum(PaymentStatus)
const CaraBayarEnum = z.nativeEnum(CaraBayar)

const PaymentSchema = z.object({
  id: z.string(),
  cara_bayar: CaraBayarEnum,
  paymentStatus: PaymentStatusEnum,
  dibayarkan: z.number().min(0),
  urlTandaBukti: z.string().nullable(),
  kodeResi: z.string().nullable(),
})

const HewanTipeSchema = z.object({
  nama: z.string(),
  icon: z.string().nullable(),
})

const HewanSchema = z.object({
  id: z.string(),
  hewanId: z.string(),
  tipeId: z.number(),
  status: z.string(),
  slaughtered: z.boolean(),
  tipe: HewanTipeSchema,
})

const UserSchema = z.object({
  name: z.string().nullable(),
  email: z.string().email().nullable(),
})

const MudhohiSchema = z.object({
  id: z.string(),
  nama_pengqurban: z.string().nullable(),
  nama_peruntukan: z.string().nullable(),
  pesan_khusus: z.string().nullable(),
  keterangan: z.string().nullable(),
  potong_sendiri: z.boolean(),
  ambil_daging: z.boolean().nullable(),
  mengambilDaging: z.boolean(),
  dash_code: z.string(),
  createdAt: z.date(),
  payment: PaymentSchema.nullable(),
  hewan: z.array(HewanSchema),
  user: UserSchema,
})

const MudhohiStatsSchema = z.object({
  totalMudhohi: z.number().min(0),
  totalHewan: z.number().min(0),
  statusCounts: z.object({
    BELUM_BAYAR: z.number().min(0),
    MENUNGGU_KONFIRMASI: z.number().min(0),
    LUNAS: z.number().min(0),
    BATAL: z.number().min(0),
  }),
})

const PaymentConfirmationSchema = z.object({
  kodeResi: z.string().min(1, "Kode resi harus diisi"),
  amount: z.number().min(1, "Jumlah pembayaran harus lebih dari 0"),
})

const SearchFilterSchema = z.object({
  searchTerm: z.string(),
  statusFilter: z.union([PaymentStatusEnum, z.literal("ALL")]),
})

// Types
type MudhohiStats = z.infer<typeof MudhohiStatsSchema>
type Mudhohi = z.infer<typeof MudhohiSchema>
type PaymentConfirmation = z.infer<typeof PaymentConfirmationSchema>
type SearchFilter = z.infer<typeof SearchFilterSchema>

interface MudhohiManagementProps {
  initialStats: MudhohiStats
  initialMudhohi: Mudhohi[]
  tipeHewan: TipeHewan[]
}

interface PaymentUpdateParams {
  mudhohiId: string
  newStatus: PaymentStatus
  amount?: number
  kodeResi?: string
}

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  mudhohiId?: string
}

export default function MudhohiManagement({ 
  initialStats, 
  initialMudhohi, 
  tipeHewan 
}: MudhohiManagementProps) {
  // Validate initial props
  const validatedStats = MudhohiStatsSchema.parse(initialStats)
  const validatedMudhohi = z.array(MudhohiSchema).parse(initialMudhohi)

  const [stats, setStats] = useState<MudhohiStats>(validatedStats)
  const [mudhohi, setMudhohi] = useState<Mudhohi[]>(validatedMudhohi)
  const [loading, setLoading] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL")
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false)

  // Payment confirmation state
  const [kodeResi, setKodeResi] = useState<string>("")
  const [confirmPaymentDialogOpen, setConfirmPaymentDialogOpen] = useState<boolean>(false)
  const [selectedMudhohiId, setSelectedMudhohiId] = useState<string | null>(null)
  const [confirmPaymentAmount, setConfirmPaymentAmount] = useState<number>(0)
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validatePaymentConfirmation = (data: PaymentConfirmation): boolean => {
    try {
      PaymentConfirmationSchema.parse(data)
      setValidationErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message
          }
        })
        setValidationErrors(errors)
      }
      return false
    }
  }

  const validateSearchFilter = (data: SearchFilter): boolean => {
    try {
      SearchFilterSchema.parse(data)
      return true
    } catch (error) {
      console.error("Invalid search filter:", error)
      return false
    }
  }

  const openConfirmPaymentDialog = (mudhohiId: string, currentAmount: number): void => {
    setSelectedMudhohiId(mudhohiId)
    setConfirmPaymentAmount(currentAmount)
    setKodeResi("")
    setValidationErrors({})
    setConfirmPaymentDialogOpen(true)
  }

  const handleUpdatePaymentStatus = async ({
    mudhohiId,
    newStatus,
    amount,
    kodeResi,
  }: PaymentUpdateParams): Promise<void> => {
    try {
      const result: ApiResponse = await updatePaymentStatus(mudhohiId, newStatus, kodeResi, amount)

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
                  payment: m.payment ? {
                    ...m.payment,
                    paymentStatus: newStatus,
                    dibayarkan: amount || m.payment.dibayarkan,
                    kodeResi: kodeResi || m.payment.kodeResi,
                  } : null,
                }
              : m,
          ),
        )

        // Refresh data to get updated stats
        await refreshData()
      } else {
        throw new Error(result.error || "Failed to update payment status")
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update payment status. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  const handleConfirmPayment = (): void => {
    const isValid = validatePaymentConfirmation({
      kodeResi: kodeResi.trim(),
      amount: confirmPaymentAmount,
    })

    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before confirming payment.",
        variant: "destructive",
      })
      return
    }

    if (selectedMudhohiId) {
      handleUpdatePaymentStatus({
        mudhohiId: selectedMudhohiId,
        newStatus: PaymentStatus.LUNAS,
        amount: confirmPaymentAmount,
        kodeResi: kodeResi.trim() || undefined,
      })
      setConfirmPaymentDialogOpen(false)
      setSelectedMudhohiId(null)
    }
  }

  const refreshData = async (): Promise<void> => {
    setLoading(true)
    try {
      const data: Mudhohi[] = await getMudhohiList(statusFilter === "ALL" ? undefined : statusFilter)
      const validatedData = z.array(MudhohiSchema).parse(data)
      setMudhohi(validatedData)
      
      // Recalculate stats
      const newStats: MudhohiStats = {
        totalMudhohi: validatedData.length,
        totalHewan: validatedData.reduce((acc, curr) => acc + curr.hewan.length, 0),
        statusCounts: {
          BELUM_BAYAR: validatedData.filter(m => m.payment?.paymentStatus === PaymentStatus.BELUM_BAYAR).length,
          MENUNGGU_KONFIRMASI: validatedData.filter(m => m.payment?.paymentStatus === PaymentStatus.MENUNGGU_KONFIRMASI).length,
          LUNAS: validatedData.filter(m => m.payment?.paymentStatus === PaymentStatus.LUNAS).length,
          BATAL: validatedData.filter(m => m.payment?.paymentStatus === PaymentStatus.BATAL).length,
        },
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

  const handleFilterChange = async (status: PaymentStatus | "ALL"): Promise<void> => {
    const isValid = validateSearchFilter({ searchTerm, statusFilter: status })
    if (!isValid) return

    setStatusFilter(status)
    setLoading(true)
    try {
      const data: Mudhohi[] = await getMudhohiList(status === "ALL" ? undefined : status)
      const validatedData = z.array(MudhohiSchema).parse(data)
      setMudhohi(validatedData)
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

  const handleSearch = async (): Promise<void> => {
    const isValid = validateSearchFilter({ searchTerm, statusFilter })
    if (!isValid) return

    setLoading(true)
    try {
      const data: Mudhohi[] = await getMudhohiList(
        statusFilter === "ALL" ? undefined : statusFilter, 
        searchTerm.trim()
      )
      const validatedData = z.array(MudhohiSchema).parse(data)
      setMudhohi(validatedData)
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

  const handleSubmitMudhohi = async (data: AdminQurbanFormValues): Promise<ApiResponse> => {
    try {
      const result: ApiResponse = await createMudhohi({
          ...data,
          tipeHewanId: Number.parseInt(data.tipeHewanId),
        })

      if (result.success) {
        setAddDialogOpen(false)
        await refreshData()
        
        toast({
          title: "Success",
          description: "Pengqurban berhasil ditambahkan.",
        })
        
        return { success: true, mudhohiId: result.mudhohiId }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add pengqurban",
          variant: "destructive",
        })
        return { success: false, error: result.error || "Failed to add pengqurban" }
      }
    } catch (error) {
      console.error("Error adding pengqurban:", error)
      const errorMessage = "Failed to add pengqurban. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return { success: false, error: errorMessage }
    }
  }

  const getStatusLabel = (status: PaymentStatus): string => {
    const statusLabels: Record<PaymentStatus, string> = {
      [PaymentStatus.BELUM_BAYAR]: "Belum Bayar",
      [PaymentStatus.DOWN_PAYMENT]: "Down Payment",
      [PaymentStatus.MENUNGGU_KONFIRMASI]: "Menunggu Konfirmasi",
      [PaymentStatus.LUNAS]: "Lunas",
      [PaymentStatus.BATAL]: "Batal",
    }
    return statusLabels[status] || status
  }

  const getStatusIcon = (status: PaymentStatus): React.ReactElement | null => {
    const iconMap: Record<PaymentStatus, React.ReactElement> = {
      [PaymentStatus.BELUM_BAYAR]: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      [PaymentStatus.DOWN_PAYMENT]: <HandCoins  className="h-5 w-5 text-blue-500" />,
      [PaymentStatus.MENUNGGU_KONFIRMASI]: <Clock className="h-5 w-5 text-blue-500" />,
      [PaymentStatus.LUNAS]: <CheckCircle className="h-5 w-5 text-green-500" />,
      [PaymentStatus.BATAL]: <XCircle className="h-5 w-5 text-red-500" />,
    }
    return iconMap[status] || null
  }

  const getStatusBadge = (status: PaymentStatus): React.ReactElement => {
    const badgeConfig: Record<PaymentStatus, { className: string; label: string }> = {
      [PaymentStatus.BELUM_BAYAR]: {
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        label: "Belum Bayar",
      },
      [PaymentStatus.DOWN_PAYMENT]: {
        className: "bg-cyan-100 text-cyan-800 border-cyan-300",
        label: "Down Payment",
      },
      [PaymentStatus.MENUNGGU_KONFIRMASI]: {
        className: "bg-blue-100 text-blue-800 border-blue-300",
        label: "Menunggu Konfirmasi",
      },
      [PaymentStatus.LUNAS]: {
        className: "bg-green-100 text-green-800 border-green-300",
        label: "Lunas",
      },
      [PaymentStatus.BATAL]: {
        className: "bg-red-100 text-red-800 border-red-300",
        label: "Batal",
      },
    }

    const config = badgeConfig[status]
    return (
      <Badge variant="outline" className={config.className}>
        <div className="flex items-center gap-1">
          {getStatusIcon(status)}
          {config.label}
        </div>
      </Badge>
    )
  }

  const filteredMudhohi: Mudhohi[] = mudhohi.filter((m) => {
    if (searchTerm.trim()) {
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

  const handleExportToExcel = (): void => {
    try {
      const data = filteredMudhohi.map((m) => ({
        ID: m.id,
        "Dash Code": m.dash_code,
        "Nama Pengqurban": m.nama_pengqurban || "-",
        "Nama Peruntukan": m.nama_peruntukan || "-",
        Email: m.user.email || "-",
        "Status Pembayaran": m.payment ? getStatusLabel(m.payment.paymentStatus) : "-",
        "Metode Pembayaran": m.payment ? (m.payment.cara_bayar === CaraBayar.TRANSFER ? "Transfer" : "Tunai") : "-",
        "Jumlah Dibayarkan": m.payment ? m.payment.dibayarkan : 0,
        "Kode Resi": m.payment?.kodeResi || "-",
        Hewan: m.hewan.map((h) => `${h.tipe.nama} #${h.hewanId}`).join(", "),
        "Ambil Daging": m.mengambilDaging ? "Ya" : "Tidak",
        "Saksikan Penyembelihan": m.potong_sendiri ? "Ya" : "Tidak",
        "Tanggal Daftar": new Date(m.createdAt).toLocaleDateString("id-ID"),
      }))

      exportToExcel(data, "pengqurban_data")
      
      toast({
        title: "Export Successful",
        description: "Data berhasil diekspor ke Excel.",
      })
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      toast({
        title: "Export Failed",
        description: "Gagal mengekspor data ke Excel.",
        variant: "destructive",
      })
    }
  }

  const resetFilters = (): void => {
    setSearchTerm("")
    setStatusFilter("ALL")
    refreshData()
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
            <CardTitle className="text-xl flex items-center gap-2">
              {getStatusIcon(PaymentStatus.LUNAS)}
              Lunas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.statusCounts.LUNAS}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              {getStatusIcon(PaymentStatus.BELUM_BAYAR)}
              Belum Bayar
            </CardTitle>
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
              <SelectItem value={PaymentStatus.BELUM_BAYAR}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(PaymentStatus.BELUM_BAYAR)}
                  Belum Bayar
                </div>
              </SelectItem>
              <SelectItem value={PaymentStatus.MENUNGGU_KONFIRMASI}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(PaymentStatus.MENUNGGU_KONFIRMASI)}
                  Menunggu Konfirmasi
                </div>
              </SelectItem>
              <SelectItem value={PaymentStatus.LUNAS}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(PaymentStatus.LUNAS)}
                  Lunas
                </div>
              </SelectItem>
              <SelectItem value={PaymentStatus.BATAL}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(PaymentStatus.BATAL)}
                  Batal
                </div>
              </SelectItem>
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
          <Button className="w-full md:w-auto">
            <Link className="inline-flex" href="/dashboard/mudhohi/mudhohi-batch-form">
              <ListPlus className="h-4 w-4 mr-2" />
              Batch Input
            </Link>
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden md:inline-flex">Tambah Mudhohi</span>
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
                <AdminQurbanForm
                  tipeHewan={tipeHewan}
                  onSubmit={handleSubmitMudhohi}
                  onCancel={() => setAddDialogOpen(false)}
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
                        {new Date(m.createdAt).toLocaleDateString("id-ID")}
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
                                handleUpdatePaymentStatus({
                                  mudhohiId: m.id,
                                  newStatus: PaymentStatus.MENUNGGU_KONFIRMASI,
                                  amount: m.payment?.dibayarkan,
                                })
                              }
                            >
                              Konfirmasi Pembayaran
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdatePaymentStatus({
                                mudhohiId: m.id,
                                newStatus: PaymentStatus.BATAL
                              })}
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
                              onClick={() => handleUpdatePaymentStatus({
                                mudhohiId: m.id,
                                newStatus: PaymentStatus.BATAL
                              })}
                            >
                              Tolak Pembayaran
                            </Button>
                          </>
                        )}
                        {m.payment?.paymentStatus === PaymentStatus.LUNAS && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdatePaymentStatus({
                                mudhohiId: m.id,
                                newStatus: PaymentStatus.BELUM_BAYAR
                              })}
                          >
                            Batalkan Konfirmasi
                          </Button>
                        )}
                        {m.payment?.paymentStatus === PaymentStatus.BATAL && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdatePaymentStatus({
                              mudhohiId: m.id,
                              newStatus: PaymentStatus.BELUM_BAYAR
                            })}
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
              <p className="text-muted-foreground mb-4">
                {loading ? "Loading..." : "No pengqurban found with the current filters."}
              </p>
              {!loading && (
                <Button variant="outline" onClick={resetFilters}>
                  Reset Filters
                </Button>
              )}
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
                onChange={(e) => {
                  setKodeResi(e.target.value)
                  // Clear validation error when user starts typing
                  if (validationErrors.kodeResi) {
                    setValidationErrors(prev => ({ ...prev, kodeResi: "" }))
                  }
                }}
                placeholder="Masukkan kode resi pembayaran"
                className={validationErrors.kodeResi ? "border-red-500" : ""}
              />
              {validationErrors.kodeResi && (
                <p className="text-sm text-red-500">{validationErrors.kodeResi}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah Dibayarkan</Label>
              <Input
                id="amount"
                type="number"
                value={confirmPaymentAmount}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setConfirmPaymentAmount(value)
                  // Clear validation error when user starts typing
                  if (validationErrors.amount) {
                    setValidationErrors(prev => ({ ...prev, amount: "" }))
                  }
                }}
                placeholder="Masukkan jumlah pembayaran"
                min="1"
                className={validationErrors.amount ? "border-red-500" : ""}
              />
              {validationErrors.amount && (
                <p className="text-sm text-red-500">{validationErrors.amount}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setConfirmPaymentDialogOpen(false)
                setValidationErrors({})
              }}
            >
              Batal
            </Button>
            <Button onClick={handleConfirmPayment} disabled={loading}>
              {loading ? "Processing..." : "Konfirmasi Pembayaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}