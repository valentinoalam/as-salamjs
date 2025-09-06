/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import {
  Plus,
  Minus,
  Users,
  Package,
  CheckCircle,
  Clock,
  User,
  Building,
  Phone,
  MapPin,
  Download,
  Trash2,
  Edit,
  Settings,
  Ticket,
  Gift,
  Eye,
  X,
} from "lucide-react"
import { JenisDistribusi, StatusKupon } from "@prisma/client"
import { exportToExcel } from "#@/lib/utils/excel.ts"
import type { Distribusi, Penerima } from "@/types/qurban"
import PengembalianKuponTab from "./kupon-tab"
import JatahMudhohiTab from "./jatah-mudhohi-tab"
import { useDistribusi } from "@/hooks/qurban/use-distribusi"

// Types for the new schema
interface Kupon {
  id: number
  kuponId: string | null
  status: StatusKupon
}

interface DistribusiWithStats {
  id: string
  kategori: string
  target: number
  realisasi: number
  createdAt: Date
  updatedAt: Date
  penerimaList?: PenerimaWithDetails[]
}

interface PenerimaWithDetails {
  id: string
  distribusiId: string
  diterimaOleh?: string | null
  nama?: string | null
  noIdentitas?: string | null
  jenisId?: string | null
  alamat?: string | null
  telepon?: string | null
  createdAt: Date
  keterangan?: string | null
  waktuTerima?: Date | null
  sudahMenerima: boolean
  jenis: JenisDistribusi
  kupon: Kupon[]
  logDistribusi?: {
    id: string
    listProduk: {
      jenisProdukId: number
      jumlahPaket: number
      jenisProduk: {
        id: number
        nama: string
      }
    }[]
  } | null
}

// Add empty state component at the top of the file
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  description: string
  action?: React.ReactNode
}) => (
  <div className="text-center py-12">
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-gray-100 rounded-full p-6">
        <Icon className="h-12 w-12 text-gray-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-500 max-w-md">{description}</p>
      </div>
      {action && <div className="pt-4">{action}</div>}
    </div>
  </div>
)

// Create Distribution Category Dialog
const CreateDistribusiDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false)
  const [kategori, setKategori] = useState("")
  const [target, setTarget] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createDistribusi } = useDistribusi()

  const handleSubmit = async () => {
    if (!kategori || target <= 0) {
      toast({
        title: "Validation Error",
        description: "Silakan isi kategori dan target kupon",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createDistribusi({ kategori, target })
      toast({
        title: "Berhasil",
        description: "Kategori distribusi berhasil dibuat",
      })
      setOpen(false)
      setKategori("")
      setTarget(0)
      onSuccess()
    } catch (error) {
      console.error("Error creating distribution:", error)
      toast({
        title: "Error",
        description: "Gagal membuat kategori distribusi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Buat Kategori Distribusi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Buat Kategori Distribusi
          </DialogTitle>
          <DialogDescription>Buat kategori distribusi baru untuk mengorganisir penerima kupon</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Kategori</Label>
            <Input
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              placeholder="Contoh: Pengqurban Sapi, Mustahik, Panitia"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>Target Kupon</Label>
            <Input
              type="number"
              min="1"
              value={target}
              onChange={(e) => setTarget(Number.parseInt(e.target.value) || 0)}
              placeholder="Jumlah target kupon"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Membuat..." : "Buat Kategori"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Create Recipient Dialog
const CreatePenerimaDialog = ({
  distribusiId,
  onSuccess,
}: {
  distribusiId: string
  onSuccess: () => void
}) => {
  const [open, setOpen] = useState(false)
  const [jenis, setJenis] = useState<JenisDistribusi>(JenisDistribusi.INDIVIDU)
  const [nama, setNama] = useState("")
  const [diterimaOleh, setDiterimaOleh] = useState("")
  const [noIdentitas, setNoIdentitas] = useState("")
  const [telepon, setTelepon] = useState("")
  const [alamat, setAlamat] = useState("")
  const [keterangan, setKeterangan] = useState("")
  const [jumlahKupon, setJumlahKupon] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createPenerima } = useDistribusi()

  const handleSubmit = async () => {
    if (!nama || !diterimaOleh) {
      toast({
        title: "Validation Error",
        description: "Nama dan penerima harus diisi",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createPenerima({
        distribusiId,
        nama,
        diterimaOleh,
        noIdentitas: noIdentitas || undefined,
        alamat: alamat || undefined,
        telepon: telepon || undefined,
        keterangan: keterangan || undefined,
        jenis,
        jumlahKupon,
        produkDistribusi: [], // Will be handled separately in distribution log
      })

      toast({
        title: "Berhasil",
        description: "Penerima berhasil ditambahkan",
      })

      // Reset form
      setNama("")
      setDiterimaOleh("")
      setNoIdentitas("")
      setTelepon("")
      setAlamat("")
      setKeterangan("")
      setJumlahKupon(1)
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error("Error creating penerima:", error)
      toast({
        title: "Error",
        description: "Gagal menambahkan penerima",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Penerima
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Tambah Penerima Kupon
          </DialogTitle>
          <DialogDescription>Tambahkan penerima baru untuk kategori distribusi ini</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jenis Penerima</Label>
              <Select value={jenis} onValueChange={(value) => setJenis(value as JenisDistribusi)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={JenisDistribusi.INDIVIDU}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Individu
                    </div>
                  </SelectItem>
                  <SelectItem value={JenisDistribusi.KELOMPOK}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Institusi/Kelompok
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jumlah Kupon</Label>
              <Input
                type="number"
                min="1"
                value={jumlahKupon}
                onChange={(e) => setJumlahKupon(Number.parseInt(e.target.value) || 1)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama {jenis === JenisDistribusi.KELOMPOK ? "Institusi" : "Penerima"} *</Label>
              <Input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder={jenis === JenisDistribusi.KELOMPOK ? "Nama institusi" : "Nama lengkap"}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Diterima Oleh *</Label>
              <Input
                value={diterimaOleh}
                onChange={(e) => setDiterimaOleh(e.target.value)}
                placeholder="Nama penerima aktual"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nomor Identitas</Label>
              <Input
                value={noIdentitas}
                onChange={(e) => setNoIdentitas(e.target.value)}
                placeholder="NIK/KTP/SIM"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="Nomor telepon"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alamat</Label>
            <Input
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Alamat lengkap"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan tambahan"
              className="min-h-[80px] resize-none"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan Penerima"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Distribution Products Dialog
const DistribusiProdukDialog = ({
  penerimaId,
  currentProducts = [],
  onSuccess,
}: {
  penerimaId: string
  currentProducts?: any[]
  onSuccess: () => void
}) => {
  const [open, setOpen] = useState(false)
  const [distribusiProduk, setDistribusiProduk] = useState([{ produkId: 0, jumlah: 1 }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { getAvailableProducts, updateLogDistribusi } = useDistribusi()

  const availableProducts = getAvailableProducts

  useEffect(() => {
    if (currentProducts.length > 0) {
      setDistribusiProduk(currentProducts.map((p) => ({ produkId: p.jenisProdukId, jumlah: p.jumlahPaket })))
    }
  }, [currentProducts])

  const addProduk = () => {
    setDistribusiProduk([...distribusiProduk, { produkId: 0, jumlah: 1 }])
  }

  const removeProduk = (index: number) => {
    if (distribusiProduk.length > 1) {
      setDistribusiProduk(distribusiProduk.filter((_, i) => i !== index))
    }
  }

  const updateProduk = (index: number, field: "produkId" | "jumlah", value: number) => {
    const updated = [...distribusiProduk]
    updated[index][field] = value
    setDistribusiProduk(updated)
  }

  const handleSubmit = async () => {
    const validProducts = distribusiProduk.filter((p) => p.produkId !== 0)
    if (validProducts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Pilih minimal satu produk",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await updateLogDistribusi(penerimaId, validProducts)
      toast({
        title: "Berhasil",
        description: "Distribusi produk berhasil dicatat",
      })
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error("Error updating distribution:", error)
      toast({
        title: "Error",
        description: "Gagal mencatat distribusi produk",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Package className="h-4 w-4 mr-1" />
          {currentProducts.length > 0 ? "Edit Produk" : "Distribusi Produk"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Distribusi Produk
          </DialogTitle>
          <DialogDescription>Pilih produk yang akan didistribusikan kepada penerima</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-base font-medium">Daftar Produk</Label>
            <Button onClick={addProduk} variant="outline" size="sm" disabled={!availableProducts.length}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah Produk
            </Button>
          </div>

          {!availableProducts.length ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800 text-sm">Tidak ada produk yang tersedia untuk didistribusikan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {distribusiProduk.map((item, index) => (
                <div key={index} className="flex gap-3 items-end p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm">Produk</Label>
                    <Select
                      value={item.produkId.toString()}
                      onValueChange={(value) => updateProduk(index, "produkId", Number.parseInt(value))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Produk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-- Pilih Produk --</SelectItem>
                        {availableProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.nama} ({product.diInventori} tersedia)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label className="text-sm">Jumlah</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.jumlah}
                      onChange={(e) => updateProduk(index, "jumlah", Number.parseInt(e.target.value) || 1)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeProduk(index)}
                    disabled={distribusiProduk.length <= 1 || isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !availableProducts.length}>
            {isSubmitting ? "Menyimpan..." : "Simpan Distribusi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Coupon Settings Dialog
const CouponSettingsDialog = () => {
  const [open, setOpen] = useState(false)
  const [totalKupon, setTotalKupon] = useState(0)
  const [kuponPerMudhohi, setKuponPerMudhohi] = useState(2)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGenerateKupon = async () => {
    if (totalKupon <= 0) {
      toast({
        title: "Validation Error",
        description: "Jumlah kupon harus lebih dari 0",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // API call to generate coupons
      const response = await fetch("/api/kupon/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalKupon, kuponPerMudhohi }),
      })

      if (!response.ok) throw new Error("Failed to generate coupons")

      toast({
        title: "Berhasil",
        description: `${totalKupon} kupon berhasil dibuat`,
      })
      setOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal membuat kupon",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-purple-200 text-black hover:bg-purple-50">
          <Settings className="h-4 w-4 mr-2" />
          Pengaturan Kupon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-purple-600" />
            Pengaturan Kupon
          </DialogTitle>
          <DialogDescription>Atur jumlah kupon yang akan dibuat dan didistribusikan</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Total Kupon yang Dibuat</Label>
            <Input
              type="number"
              min="1"
              value={totalKupon}
              onChange={(e) => setTotalKupon(Number.parseInt(e.target.value) || 0)}
              placeholder="Jumlah total kupon"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>Kupon per Mudhohi</Label>
            <Input
              type="number"
              min="1"
              value={kuponPerMudhohi}
              onChange={(e) => setKuponPerMudhohi(Number.parseInt(e.target.value) || 2)}
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500">Setiap mudhohi akan mendapat {kuponPerMudhohi} kupon</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleGenerateKupon} disabled={isSubmitting}>
            {isSubmitting ? "Membuat..." : "Buat Kupon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function DistribusiClient() {
  const { distribusiQuery, penerimaQuery } = useDistribusi()

  const [activeTab, setActiveTab] = useState("distribusi")
  const [selectedDistribusi, setSelectedDistribusi] = useState<string>("")
  const [editingDistribusi, setEditingDistribusi] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<number>(0)

  // Get data from queries
  const distributions = distribusiQuery.data
  const penerima = penerimaQuery.data

  // Handle loading and error states
  if (penerimaQuery.isLoading || distribusiQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    )
  }

  if (penerimaQuery.isError || distribusiQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="bg-red-50 rounded-full p-6 mx-auto mb-4 w-fit">
            <X className="h-12 w-12 text-red-500" />
          </div>
          <p className="text-red-600 font-medium">Gagal memuat data</p>
          <p className="text-gray-500 text-sm mt-1">Silakan refresh halaman atau coba lagi</p>
        </div>
      </div>
    )
  }

  // Filter penerima by selected distribution - FIXED LOGIC
  const filteredPenerima = selectedDistribusi && Array.isArray(penerima)
    ? penerima.filter((p: Penerima) => p.distribusiId === selectedDistribusi) // Changed !== to ===
    : []
  // Get selected distribution details
  const selectedDistribusiData = distributions.find((d: Distribusi) => d.id === selectedDistribusi)

  const handleEditTarget = async (distribusiId: string, newTarget: number) => {
    try {
      const response = await fetch(`/api/distribusi/${distribusiId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: newTarget }),
      })

      if (!response.ok) throw new Error("Failed to update target")

      toast({
        title: "Berhasil",
        description: "Target kupon berhasil diperbarui",
      })

      setEditingDistribusi(null)
      distribusiQuery.refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui target kupon",
        variant: "destructive",
      })
    }
  }

  const handleExportData = (type: string) => {
    let data: any[] = []
    let filename = ""

    switch (type) {
      case "distribusi":
        if (distributions.length === 0) {
          toast({
            title: "Tidak Ada Data",
            description: "Tidak ada data distribusi untuk diekspor",
            variant: "destructive",
          })
          return
        }
        data = distributions.map((dist: Distribusi) => ({
          ID: dist.id,
          Kategori: dist.kategori,
          Target: dist.target,
          Realisasi: dist.realisasi,
          Persentase: `${Math.round((dist.realisasi / dist.target) * 100)}%`,
          "Dibuat Pada": new Date(dist.createdAt).toLocaleDateString("id-ID"),
        }))
        filename = "distribusi_categories"
        break
      case "penerima":
        if (filteredPenerima.length === 0) {
          toast({
            title: "Tidak Ada Data",
            description: "Tidak ada data penerima untuk diekspor",
            variant: "destructive",
          })
          return
        }
        data = filteredPenerima.map((p: Penerima) => ({
          Nama: p.nama || "-",
          "Diterima Oleh": p.diterimaOleh || "-",
          Kategori: selectedDistribusiData?.kategori || "-",
          Jenis: p.jenis,
          "No Identitas": p.noIdentitas || "-",
          Telepon: p.telepon || "-",
          Alamat: p.alamat || "-",
          "Jumlah Kupon": p.jumlahKupon || 0,
          Status: p.sudahMenerima ? "Sudah Menerima" : "Belum Menerima",
          "Dibuat Pada": new Date(p.createdAt).toLocaleDateString("id-ID"),
        }))
        filename = `penerima_${selectedDistribusiData?.kategori || 'data'}`
        break
    }

    if (data.length === 0) return

    exportToExcel(data, filename)
    toast({
      title: "Berhasil",
      description: `Data ${type} berhasil diekspor`,
    })
  }

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Sudah Menerima
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
        <Clock className="h-3 w-3 mr-1" />
        Belum Menerima
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-emerald-100">
            <Package className="h-8 w-8 text-emerald-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Sistem Distribusi Qurban
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Kelola distribusi kupon dan daging qurban dengan sistem yang terintegrasi
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg rounded-full p-1">
              <TabsTrigger
                value="distribusi"
                className="rounded-full px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300"
              >
                <Ticket className="h-4 w-4 mr-2" />
                Distribusi Kupon
              </TabsTrigger>
              <TabsTrigger
                value="kupon"
                className="rounded-full px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300"
              >
                <Package className="h-4 w-4 mr-2" />
                Pengambilan Kupon
              </TabsTrigger>
              <TabsTrigger
                value="mudhohi"
                className="rounded-full px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300"
              >
                <Package className="h-4 w-4 mr-2" />
                Pengambilan Jatah Mudhohi
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Distribusi Tab */}
          <TabsContent value="distribusi" className="space-y-6">
            {/* Kategori Distribusi Table */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Kategori Distribusi
                    </CardTitle>
                    <CardDescription className="text-blue-50">
                      Kelola kategori distribusi dan target kupon
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <CouponSettingsDialog />
                    <CreateDistribusiDialog onSuccess={() => distribusiQuery.refetch()} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {distributions.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Belum Ada Kategori Distribusi"
                    description="Buat kategori distribusi pertama untuk mulai mengelola kupon"
                  />
                ) : (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-700">Kategori</TableHead>
                          <TableHead className="font-semibold text-gray-700">Target Kupon</TableHead>
                          <TableHead className="font-semibold text-gray-700">Realisasi</TableHead>
                          <TableHead className="font-semibold text-gray-700">Progress</TableHead>
                          <TableHead className="font-semibold text-gray-700">Dibuat</TableHead>
                          <TableHead className="font-semibold text-gray-700 w-24">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {distributions.map((dist: Distribusi) => (
                          <TableRow key={dist.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-medium">{dist.kategori}</TableCell>
                            <TableCell>
                              {editingDistribusi === dist.id ? (
                                <div className="flex gap-2 items-center">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={editTarget}
                                    onChange={(e) => setEditTarget(Number.parseInt(e.target.value) || 0)}
                                    className="w-20"
                                  />
                                  <Button size="sm" onClick={() => handleEditTarget(dist.id, editTarget)}>
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingDistribusi(null)}>
                                    ×
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{dist.target}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingDistribusi(dist.id)
                                      setEditTarget(dist.target)
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{dist.realisasi}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.min((dist.realisasi / dist.target) * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600">
                                  {Math.round((dist.realisasi / dist.target) * 100)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {new Date(dist.createdAt).toLocaleDateString("id-ID")}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedDistribusi(dist.id)}
                                className="text-xs"
                              >
                                Kelola
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Penerima Table */}
            {selectedDistribusi && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Daftar Penerima
                      </CardTitle>
                      <CardDescription className="text-emerald-50">
                        Kategori: {distributions.find((d: Distribusi) => d.id === selectedDistribusi)?.kategori}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleExportData("penerima")}
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <CreatePenerimaDialog
                        distribusiId={selectedDistribusi}
                        onSuccess={() => penerimaQuery.refetch()}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {filteredPenerima.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Belum Ada Penerima"
                      description="Tambahkan penerima pertama untuk kategori distribusi ini"
                    />
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold text-gray-700">Nama</TableHead>
                            <TableHead className="font-semibold text-gray-700">Diterima Oleh</TableHead>
                            <TableHead className="font-semibold text-gray-700">Jenis</TableHead>
                            <TableHead className="font-semibold text-gray-700">Kupon</TableHead>
                            <TableHead className="font-semibold text-gray-700">Status</TableHead>
                            <TableHead className="font-semibold text-gray-700">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPenerima.map((p: Penerima) => (
                            <TableRow key={p.id} className="hover:bg-gray-50 transition-colors">
                              <TableCell className="font-medium">{p.nama || "-"}</TableCell>
                              <TableCell>{p.diterimaOleh || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                  {p.jenis}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Ticket className="h-4 w-4 text-purple-600" />
                                  <span>{p.jumlahKupon || 0}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(p.sudahMenerima)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <DistribusiProdukDialog
                                    penerimaId={p.id}
                                    currentProducts={p.logDistribusi?.listProduk || []}
                                    onSuccess={() => penerimaQuery.refetch()}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Kupon Tab */}
          <TabsContent value="kupon" className="space-y-6">
            <PengembalianKuponTab />
          </TabsContent>
          <TabsContent value="mudhohi" className="space-y-6">
            <JatahMudhohiTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
