"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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
  getMudhohiList, 
  updateMudhohi, 
  updatePaymentStatus, 
} from "#@/lib/server/repositories/mudhohi.ts"
import { exportToExcel } from "#@/lib/utils/excel.ts"
import { MoreHorizontal, CreditCard, Edit, Eye, CheckCircle, XCircle, Clock, AlertCircle, Search, Plus, RefreshCw, Download, HandCoins, ListPlus, Calendar, Hash, Mail, User, MessageSquare } from "lucide-react"
import { Label } from "@/components/ui/label"
import type { AdminQurbanFormValues } from "@/lib/zod/qurban-form"
import { AdminQurbanForm } from "@/components/qurban/trx-admin/admin-qurban-form"
import Link from "next/link"
import { MudhohiStatsSchema, MudhohiSchema, type MudhohiStats, type PaymentConfirmation, PaymentConfirmationSchema, type SearchFilter, SearchFilterSchema, type Mudhohi, type MudhohiEdit, MudhohiEditSchema } from "@/lib/zod/mudhohi"
import { getMudhohiById } from "@/app/qurban/konfirmasi/[id]/actions"
import { formatAngkaManual, formatDate } from "#@/lib/utils/formatters.ts"
import type { TipeHewan } from "@/types/qurban"
import type { ApiResponse } from "#@/lib/DTOs/global.ts"
import type { PaymentUpdateParams } from "#@/lib/DTOs/mudhohi.ts"

export interface MudhohiManagementProps {
  initialStats: MudhohiStats
  initialMudhohi: Mudhohi[]
  tipeHewan: TipeHewan[]
}

export default function MudhohiManagement({ 
  initialStats, 
  initialMudhohi, 
  tipeHewan 
}: MudhohiManagementProps) {
  // Validate initial props
  const validatedStats = MudhohiStatsSchema.parse(initialStats)
  const validatedMudhohi = z.array(MudhohiSchema).parse(initialMudhohi)
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Fixed items per page
  const [stats, setStats] = useState<MudhohiStats>(validatedStats)
  const [mudhohi, setMudhohi] = useState<Mudhohi[]>(validatedMudhohi)
  const [loading, setLoading] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL")
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false)

  // Payment confirmation state
  const [paymentData, setPaymentData] = useState<PaymentConfirmation>({
    kodeResi: "",
    amount: 0,
    cara_bayar: CaraBayar.TRANSFER,
  })
  const [kodeResi, setKodeResi] = useState<string>("")
  const [confirmPaymentDialogOpen, setConfirmPaymentDialogOpen] = useState<boolean>(false)
  const [selectedMudhohiId, setSelectedMudhohiId] = useState<string | null>(null)
  const [confirmPaymentAmount, setConfirmPaymentAmount] = useState<number>(0)
  
  // Edit mudhohi state
  const [editMudhohiData, setEditMudhohiData] = useState<MudhohiEdit>({
    nama_pengqurban: "",
    nama_peruntukan: "",
    pesan_khusus: "",
    keterangan: "",
    potong_sendiri: false,
    ambil_daging: false,
  })
  const [editMudhohiDialogOpen, setEditMudhohiDialogOpen] = useState<boolean>(false)
  
  
  // Quick payment state
  const [quickPaymentDialogOpen, setQuickPaymentDialogOpen] = useState<boolean>(false)
  const [quickPaymentData, setQuickPaymentData] = useState<PaymentConfirmation>({
    kodeResi: "",
    amount: 0,
    cara_bayar: CaraBayar.TUNAI,
  })
  
  // View details state
  const [viewDetailsSheetOpen, setViewDetailsSheetOpen] = useState<boolean>(false)
  const [selectedMudhohi, setSelectedMudhohi] = useState<Mudhohi | null>(null)
  

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
  const validateMudhohiEdit = (data: MudhohiEdit): boolean => {
    try {
      MudhohiEditSchema.parse(data)
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

  // Open edit dialog and load mudhohi data
  const openEditMudhohiDialog = async (mudhohiId: string): Promise<void> => {
    try {
      setLoading(true)
      const mudhohi = await getMudhohiById(mudhohiId)
      
      if (mudhohi) {
        setEditMudhohiData({
          nama_pengqurban: mudhohi.nama_pengqurban || "",
          nama_peruntukan: mudhohi.nama_peruntukan || "",
          pesan_khusus: mudhohi.pesan_khusus || "",
          keterangan: mudhohi.keterangan || "",
          potong_sendiri: mudhohi.potong_sendiri,
          ambil_daging: mudhohi.ambil_daging || false,
        })
        setSelectedMudhohiId(mudhohiId)
        setValidationErrors({})
        setEditMudhohiDialogOpen(true)
      }
    } catch (error) {
      console.error("Error loading mudhohi data:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data mudhohi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openConfirmPaymentDialog = (mudhohiId: string, currentAmount: number): void => {
    setSelectedMudhohiId(mudhohiId)
    setConfirmPaymentAmount(currentAmount)
    setKodeResi("")
    setValidationErrors({})
    setConfirmPaymentDialogOpen(true)
  }

  // Open quick payment dialog for direct cash payments
  const openQuickPaymentDialog = (mudhohiId: string): void => {
    setSelectedMudhohiId(mudhohiId)
    setQuickPaymentData({
      kodeResi: "",
      amount: 0,
      cara_bayar: CaraBayar.TUNAI,
    })
    setValidationErrors({})
    setQuickPaymentDialogOpen(true)
  }

  // Open view details sheet
  const openViewDetailsSheet = (mudhohi: Mudhohi): void => {
    setSelectedMudhohi(mudhohi)
    setViewDetailsSheetOpen(true)
  }

  // Handle edit mudhohi submit
  const handleEditMudhohiSubmit = async (): Promise<void> => {
    if (!selectedMudhohiId) return

    const isValid = validateMudhohiEdit(editMudhohiData)
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Silakan perbaiki kesalahan validasi sebelum menyimpan.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const result = await updateMudhohi(selectedMudhohiId, editMudhohiData)

      if (result.success) {
        toast({
          title: "Success",
          description: "Data mudhohi berhasil diperbarui.",
        })

        // Update mudhohi in the list
        setMudhohi((prev) =>
          prev.map((m) =>
            m.id === selectedMudhohiId
              ? {
                  ...m,
                  ...editMudhohiData,
                }
              : m,
          ),
        )

        setEditMudhohiDialogOpen(false)
        setSelectedMudhohiId(null)
      } else {
        throw new Error(result.error || "Failed to update mudhohi")
      }
    } catch (error) {
      console.error("Error updating mudhohi:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal memperbarui data mudhohi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle payment status update
  const handleUpdatePaymentStatus = async ({
    mudhohiId,
    newStatus,
    amount,
    kodeResi,
    caraBayar = CaraBayar.TUNAI,
  }: PaymentUpdateParams): Promise<void> => {
    try {
      const result: ApiResponse = await updatePaymentStatus(
        mudhohiId, 
        {
          status:newStatus, 
          kodeResi, 
          dibayarkan:amount,
          caraBayar
        }
      )

      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Status pembayaran berhasil diperbarui ke ${getStatusLabel(newStatus)}.`,
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
                    cara_bayar: caraBayar || m.payment.cara_bayar,
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
        description: error instanceof Error ? error.message : "Gagal memperbarui status pembayaran",
        variant: "destructive",
      })
    }
  }
  
  // Handle confirm payment from app
  const handleConfirmPayment = (): void => {
    const isValid = validatePaymentConfirmation(paymentData)

    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Silakan perbaiki kesalahan validasi sebelum konfirmasi.",
        variant: "destructive",
      })
      return
    }

    if (selectedMudhohiId) {
      handleUpdatePaymentStatus({
        mudhohiId: selectedMudhohiId,
        newStatus: PaymentStatus.LUNAS,
        amount: paymentData.amount,
        kodeResi: paymentData.kodeResi || undefined,
        caraBayar: paymentData.cara_bayar,
      })
      setConfirmPaymentDialogOpen(false)
      setSelectedMudhohiId(null)
    }
  }

  // Handle quick payment (direct payment to admin)
  const handleQuickPayment = (): void => {
    const isValid = validatePaymentConfirmation(quickPaymentData)

    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Silakan perbaiki kesalahan validasi sebelum konfirmasi.",
        variant: "destructive",
      })
      return
    }

    if (selectedMudhohiId) {
      handleUpdatePaymentStatus({
        mudhohiId: selectedMudhohiId,
        newStatus: PaymentStatus.LUNAS,
        amount: quickPaymentData.amount,
        kodeResi: quickPaymentData.kodeResi || `CASH-${Date.now()}`,
        caraBayar: quickPaymentData.cara_bayar,
      })
      setQuickPaymentDialogOpen(false)
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
      const response = await fetch("/api/mudhohi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          jatahPengqurban: data.jatahPengqurban?.map((p) => Number.parseInt(p)),
          tipeHewanId: Number.parseInt(data.tipeHewanId),
        }),
      });

      const result: ApiResponse = await response.json();

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
          description: result.error || "Gagal menambahkan data pengqurban. Silahkan coba lagi nanti.",
          variant: "destructive",
        })
        return { success: false, error: result.error || "Gagal menambahkan data pengqurban" }
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
        "Ambil Daging": m.ambil_daging ? "Ya" : "Tidak",
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

  // Calculate pagination values
  const totalPages = Math.ceil(filteredMudhohi.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMudhohi = filteredMudhohi.slice(indexOfFirstItem, indexOfLastItem);
  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <SelectItem value={PaymentStatus.DOWN_PAYMENT}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(PaymentStatus.DOWN_PAYMENT)}
                  Down Payment
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
            <Link className="inline-flex" href="/dashboard/mudhohi/mudhohi-bulk-form">
              <ListPlus className="h-4 w-4 mr-2" />
              Bulk Input
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
        {currentMudhohi.length > 0 ? (
          currentMudhohi.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{m.nama_pengqurban || "Unnamed"}</h3>
                      {m.payment && (
                        <div className="bg-gray-50 rounded-lg text-sm">
                          <p className="font-semibold">
                            <span className="font-medium">Total: </span>
                            Rp {formatAngkaManual(m.payment.totalAmount || 0)}
                          </p>
                        </div>
                      )}
                      {m.payment && getStatusBadge(m.payment.paymentStatus)}
                    </div>
                    {m.nama_peruntukan && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Untuk: {m.nama_peruntukan}
                      </p>
                    )}
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-gray-700">
                        <Hash className="w-3 h-3" />
                        <span className="font-medium">Kode:</span> {m.dash_code}
                      </div>
                      <div className="flex items-center gap-1 text-gray-700">
                        <Mail className="w-3 h-3" />
                        <span className="font-medium">Email:</span> {m.user.email || "-"}
                      </div>
                      <div className="flex items-center gap-1 text-gray-700">
                        <Calendar className="w-3 h-3" />
                        <span className="font-medium">Tanggal:</span> {new Date(m.createdAt).toLocaleDateString("id-ID")}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.hewan.map((h) => (
                          <Badge key={h.id} variant="secondary" className="text-xs">
                            {h.tipe.icon} {h.tipe.nama} #{h.hewanId}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.ambil_daging && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                            Ambil Daging
                          </Badge>
                        )}
                        {m.potong_sendiri && (
                          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs">
                            Saksikan Penyembelihan
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-gray-800 font-medium">
                      <MessageSquare className="w-4 h-4" />
                      Pesan & Keterangan
                    </div>
                    {m.pesan_khusus && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="text-xs font-medium text-blue-700 mb-1">Pesan Khusus:</div>
                        <div className="text-sm text-blue-800">{m.pesan_khusus}</div>
                      </div>
                    )}
                    
                    {m.keterangan && (
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <div className="text-xs font-medium text-amber-700 mb-1">Keterangan:</div>
                        <div className="text-sm text-amber-800">{m.keterangan}</div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Tertanggal:</span>{" "}
                      {formatDate(new Date(m.payment?.updatedAt || m.createdAt))}
                    </div>
                    {m.payment && (
                      <>
                        <div className="flex justify-between text-sm space-x-4 items-baseline">
                          <div className="space-x-2">
                            <span className="font-medium text-gray-600">Metode:</span>
                            <span className="font-mono">{m.payment.cara_bayar === CaraBayar.TRANSFER ? "Transfer" : "Tunai"}</span>
                          </div>
                          {m.payment.kodeResi && (
                              <div className="flex justify-start items-baseline space-x-2">
                                <span className="text-gray-600">Kode Resi:</span>
                                <span className="font-mono font-medium text-xs">{m.payment.kodeResi}</span>
                              </div>
                            )}
                        </div>
                        
                        <div className="flex justify-between text-sm space-x-4 items-baseline">
                          <div className="space-x-2">
                            <span className="text-muted-foreground">Jumlah:</span>
                            <span className="font-medium">{m.payment.quantity || m.hewan.length}</span>
                          </div>
                          <div className="space-x-2">
                            <span className="text-muted-foreground">Tipe:</span>
                            <span className="font-medium">{m.payment.isKolektif ? "Kolektif" : "Perhewan"}</span>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Dibayarkan:</span> Rp{" "}
                          {formatAngkaManual(m.payment.dibayarkan)} <span className="text-muted-foreground ml-1 text-xs">dari</span>
                          <span className="text-muted-foreground ml-1">
                            Rp {formatAngkaManual(m.payment.totalAmount || 0)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      {/* Primary action based on payment status */}
                      {m.payment?.paymentStatus === PaymentStatus.BELUM_BAYAR && (
                        <Button
                          size="sm"
                          onClick={() => openQuickPaymentDialog(m.id)}
                          className="flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" />
                          Bayar Langsung
                        </Button>
                      )}
                      
                      {m.payment?.paymentStatus === PaymentStatus.DOWN_PAYMENT && (
                        <Button
                          size="sm"
                          onClick={() => openConfirmPaymentDialog(m.id, m.payment?.dibayarkan || 0)}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Selesaikan
                        </Button>
                      )}
                      
                      {m.payment?.paymentStatus === PaymentStatus.MENUNGGU_KONFIRMASI && (
                        <Button
                          size="sm"
                          onClick={() => openConfirmPaymentDialog(m.id, m.payment?.dibayarkan || 0)}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Terima
                        </Button>
                      )}
                      
                      {m.payment?.paymentStatus === PaymentStatus.LUNAS && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdatePaymentStatus({
                            mudhohiId: m.id,
                            newStatus: PaymentStatus.BELUM_BAYAR,
                            caraBayar: "TRANSFER"
                          })}
                          className="flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Batalkan
                        </Button>
                      )}
                      
                      {m.payment?.paymentStatus === PaymentStatus.BATAL && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdatePaymentStatus({
                            mudhohiId: m.id,
                            newStatus: PaymentStatus.BELUM_BAYAR,
                            caraBayar: "TRANSFER"
                          })}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Aktifkan
                        </Button>
                      )}

                      {/* Secondary actions in dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="px-2">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {/* Payment-specific secondary actions */}
                          {m.payment?.paymentStatus === PaymentStatus.BELUM_BAYAR && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUpdatePaymentStatus({
                                    mudhohiId: m.id,
                                    newStatus: PaymentStatus.MENUNGGU_KONFIRMASI,
                                    amount: m.payment?.dibayarkan,
                                    caraBayar: "TRANSFER"
                                  })
                                }
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Konfirmasi Pembayaran
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdatePaymentStatus({
                                  mudhohiId: m.id,
                                  newStatus: PaymentStatus.BATAL,
                                  caraBayar: "TRANSFER"
                                })}
                                className="text-destructive"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Batalkan
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          {m.payment?.paymentStatus === PaymentStatus.DOWN_PAYMENT && (
                            <>
                              <DropdownMenuItem
                                onClick={() => openQuickPaymentDialog(m.id)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Pembayaran
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          {m.payment?.paymentStatus === PaymentStatus.MENUNGGU_KONFIRMASI && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleUpdatePaymentStatus({
                                  mudhohiId: m.id,
                                  newStatus: PaymentStatus.BATAL,
                                  caraBayar: "TRANSFER"
                                })}
                                className="text-destructive"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Tolak Pembayaran
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          {/* Common actions */}
                          <DropdownMenuItem
                            onClick={() => openEditMudhohiDialog(m.id)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openViewDetailsSheet(m)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Detail
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
                aria-disabled={currentPage <= 1}
                tabIndex={currentPage === 1?  -1 : undefined}
              />
            </PaginationItem>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(page);
                  }}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage + 1);
                }}
                aria-disabled={currentPage >= totalPages}
                tabIndex={currentPage === totalPages ? -1 : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      {/* Payment Confirmation Dialog */}
      <Dialog open={confirmPaymentDialogOpen} onOpenChange={setConfirmPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
            <DialogDescription>Masukkan kode resi dan konfirmasi pembayaran.</DialogDescription>
          </DialogHeader>
          {/* NEW: Payment Summary Section */}
          {selectedMudhohiId && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-2">Detail Pesanan</h4>
              {(() => {
                const mudhohiItem = mudhohi.find(m => m.id === selectedMudhohiId);
                if (!mudhohiItem || !mudhohiItem.payment) return null;
                
                return (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium">Jumlah Hewan:</span>
                      <p>{mudhohiItem.payment.quantity || mudhohiItem.hewan.length}</p>
                    </div>
                    <div>
                      <span className="font-medium">Tipe:</span>
                      <p>{mudhohiItem.payment.isKolektif ? "Kolektif" : "Perorangan"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Total Pembayaran:</span>
                      <p className="font-semibold">
                        Rp {mudhohiItem.payment.totalAmount?.toLocaleString("id-ID") || "0"}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kodeResi">Kode Resi</Label>
              <Input
                id="kodeResi"
                value={kodeResi}
                onChange={(e) => {
                  setKodeResi(e.target.value)
                  setPaymentData(prev => ({ ...prev, kodeResi: e.target.value }))
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
                  setPaymentData(prev => ({ ...prev, amount: value }))
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

      {/* Quick Payment Dialog */}
      <Dialog open={quickPaymentDialogOpen} onOpenChange={setQuickPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran Langsung</DialogTitle>
            <DialogDescription>Proses pembayaran langsung kepada admin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quickAmount">Jumlah Pembayaran</Label>
              <Input
                id="quickAmount"
                type="number"
                value={quickPaymentData.amount}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setQuickPaymentData(prev => ({ ...prev, amount: value }))
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
            <div className="space-y-2">
              <Label htmlFor="quickCaraBayar">Cara Bayar</Label>
              <Select
                value={quickPaymentData.cara_bayar}
                onValueChange={(value) => setQuickPaymentData(prev => ({ ...prev, cara_bayar: value as CaraBayar }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih cara bayar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CaraBayar.TUNAI}>Tunai</SelectItem>
                  <SelectItem value={CaraBayar.TRANSFER}>Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quickKodeResi">Kode Resi (Optional)</Label>
              <Input
                id="quickKodeResi"
                value={quickPaymentData.kodeResi}
                onChange={(e) => {
                  setQuickPaymentData(prev => ({ ...prev, kodeResi: e.target.value }))
                  if (validationErrors.kodeResi) {
                    setValidationErrors(prev => ({ ...prev, kodeResi: "" }))
                  }
                }}
                placeholder="Masukkan kode resi (opsional)"
                className={validationErrors.kodeResi ? "border-red-500" : ""}
              />
              {validationErrors.kodeResi && (
                <p className="text-sm text-red-500">{validationErrors.kodeResi}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setQuickPaymentDialogOpen(false)
                setValidationErrors({})
              }}
            >
              Batal
            </Button>
            <Button onClick={handleQuickPayment} disabled={loading}>
              {loading ? "Processing..." : "Proses Pembayaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mudhohi Dialog */}
      <Dialog open={editMudhohiDialogOpen} onOpenChange={setEditMudhohiDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Data Mudhohi</DialogTitle>
            <DialogDescription>
              Ubah informasi pengqurban sesuai kebutuhan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editNamaPengqurban">Nama Pengqurban</Label>
              <Input
                id="editNamaPengqurban"
                value={editMudhohiData.nama_pengqurban}
                onChange={(e) => {
                  setEditMudhohiData(prev => ({ ...prev, nama_pengqurban: e.target.value }))
                  if (validationErrors.nama_pengqurban) {
                    setValidationErrors(prev => ({ ...prev, nama_pengqurban: "" }))
                  }
                }}
                placeholder="Masukkan nama pengqurban"
                className={validationErrors.nama_pengqurban ? "border-red-500" : ""}
              />
              {validationErrors.nama_pengqurban && (
                <p className="text-sm text-red-500">{validationErrors.nama_pengqurban}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNamaPeruntukan">Nama Peruntukan</Label>
              <Input
                id="editNamaPeruntukan"
                value={editMudhohiData.nama_peruntukan}
                onChange={(e) => {
                  setEditMudhohiData(prev => ({ ...prev, nama_peruntukan: e.target.value }))
                  if (validationErrors.nama_peruntukan) {
                    setValidationErrors(prev => ({ ...prev, nama_peruntukan: "" }))
                  }
                }}
                placeholder="Masukkan nama peruntukan"
                className={validationErrors.nama_peruntukan ? "border-red-500" : ""}
              />
              {validationErrors.nama_peruntukan && (
                <p className="text-sm text-red-500">{validationErrors.nama_peruntukan}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPesanKhusus">Pesan Khusus</Label>
              <Input
                id="editPesanKhusus"
                value={editMudhohiData.pesan_khusus}
                onChange={(e) => {
                  setEditMudhohiData(prev => ({ ...prev, pesan_khusus: e.target.value }))
                  if (validationErrors.pesan_khusus) {
                    setValidationErrors(prev => ({ ...prev, pesan_khusus: "" }))
                  }
                }}
                placeholder="Masukkan pesan khusus"
                className={validationErrors.pesan_khusus ? "border-red-500" : ""}
              />
              {validationErrors.pesan_khusus && (
                <p className="text-sm text-red-500">{validationErrors.pesan_khusus}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editKeterangan">Keterangan</Label>
              <Input
                id="editKeterangan"
                value={editMudhohiData.keterangan}
                onChange={(e) => {
                  setEditMudhohiData(prev => ({ ...prev, keterangan: e.target.value }))
                  if (validationErrors.keterangan) {
                    setValidationErrors(prev => ({ ...prev, keterangan: "" }))
                  }
                }}
                placeholder="Masukkan keterangan"
                className={validationErrors.keterangan ? "border-red-500" : ""}
              />
              {validationErrors.keterangan && (
                <p className="text-sm text-red-500">{validationErrors.keterangan}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editPotongSendiri"
                checked={editMudhohiData.potong_sendiri}
                onChange={(e) => {
                  setEditMudhohiData(prev => ({ ...prev, potong_sendiri: e.target.checked }))
                }}
                className="h-4 w-4"
              />
              <Label htmlFor="editPotongSendiri">Saksikan Penyembelihan</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editMengambilDaging"
                checked={editMudhohiData.ambil_daging}
                onChange={(e) => {
                  setEditMudhohiData(prev => ({ ...prev, ambil_daging: e.target.checked }))
                }}
                className="h-4 w-4"
              />
              <Label htmlFor="editMengambilDaging">Mengambil Daging</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditMudhohiDialogOpen(false)
                setValidationErrors({})
              }}
            >
              Batal
            </Button>
            <Button onClick={handleEditMudhohiSubmit} disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Sheet */}
      <Dialog open={viewDetailsSheetOpen} onOpenChange={setViewDetailsSheetOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pengqurban</DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang pengqurban yang dipilih.
            </DialogDescription>
          </DialogHeader>
          {selectedMudhohi && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Informasi Pengqurban</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Nama Pengqurban:</span>
                      <p className="text-muted-foreground">{selectedMudhohi.nama_pengqurban || "-"}</p>
                    </div>
                    <div>
                      <span className="font-medium">Nama Peruntukan:</span>
                      <p className="text-muted-foreground">{selectedMudhohi.nama_peruntukan || "-"}</p>
                    </div>
                    <div>
                      <span className="font-medium">Kode Dash:</span>
                      <p className="text-muted-foreground">{selectedMudhohi.dash_code}</p>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>
                      <p className="text-muted-foreground">{selectedMudhohi.user.email || "-"}</p>
                    </div>
                    <div>
                      <span className="font-medium">Tanggal Pendaftaran:</span>
                      <p className="text-muted-foreground">
                        {new Date(selectedMudhohi.createdAt).toLocaleDateString("id-ID", {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Status & Preferensi</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Status Pembayaran:</span>
                      <div className="mt-1">
                        {selectedMudhohi.payment && getStatusBadge(selectedMudhohi.payment.paymentStatus)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMudhohi.ambil_daging && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                          Ambil Daging
                        </Badge>
                      )}
                      {selectedMudhohi.potong_sendiri && (
                        <Badge variant="outline" className="bg-teal-100 text-teal-800 border-teal-300">
                          Saksikan Penyembelihan
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              {selectedMudhohi.payment && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Informasi Pembayaran</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="font-medium">Metode Pembayaran:</span>
                      <p className="text-muted-foreground">
                        {selectedMudhohi.payment.cara_bayar === CaraBayar.TRANSFER ? "Transfer" : "Tunai"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Jumlah Dibayarkan:</span>
                      <p className="text-muted-foreground">
                        Rp {selectedMudhohi.payment.dibayarkan.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Kode Resi:</span>
                      <p className="text-muted-foreground">
                        {selectedMudhohi.payment.kodeResi || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hewan Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Hewan Qurban</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMudhohi.hewan.map((h) => (
                    <Badge key={h.id} variant="secondary">
                      {h.tipe.icon} {h.tipe.nama} #{h.hewanId}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Informasi Tambahan</h4>
                <div className="space-y-2">
                  {selectedMudhohi.pesan_khusus && (
                    <div>
                      <span className="font-medium">Pesan Khusus:</span>
                      <p className="text-muted-foreground">{selectedMudhohi.pesan_khusus}</p>
                    </div>
                  )}
                  {selectedMudhohi.keterangan && (
                    <div>
                      <span className="font-medium">Keterangan:</span>
                      <p className="text-muted-foreground">{selectedMudhohi.keterangan}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => openEditMudhohiDialog(selectedMudhohi.id)}
                >
                  Edit Data
                </Button>
                {selectedMudhohi.payment && (
                  <Button
                    variant="outline"
                    onClick={() => openQuickPaymentDialog(selectedMudhohi.id)}
                  >
                    Edit Pembayaran
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setViewDetailsSheetOpen(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
};