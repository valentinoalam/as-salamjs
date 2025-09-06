"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { PlusCircle, Pencil, Trash2 } from "lucide-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Badge } from "@/components/ui/badge"
import { updateProdukHewan, deleteProdukHewan } from "./actions"
import type { TipeHewan } from "@prisma/client"
import type { ProdukHewan } from "@/types/qurban"
import ProductHewanForm from "@/components/qurban/form/create-produk-hewan-form"
import { ProductSpriteIcon } from "#@/components/product-sprite-img.tsx"
import { ProductSelector } from "#@/components/product-selector.tsx"
import { getProductIllustration } from "#@/lib/product-illustrations.ts"
import { ProdukMapping } from "./product-mapping"

// Zod validation schemas
const produkHewanSchema = z.object({
  nama: z.string().min(1, "Nama produk hewan wajib diisi"),
  berat: z.string().optional(),
  avgProdPerHewan: z.string().optional(),
  jenisProduk: z.string().min(1, "Jenis produk wajib dipilih"),
}).refine((data) => {
  // avgProdPerHewan is required for non-DAGING products
  if (data.jenisProduk !== "DAGING") {
    return data.avgProdPerHewan && data.avgProdPerHewan.trim() !== "" && Number(data.avgProdPerHewan) >= 1
  }
  return true
}, {
  message: "Rata-rata per hewan wajib diisi untuk produk selain daging",
  path: ["avgProdPerHewan"]
})

type ProdukHewanFormData = {
  nama: string
  berat: string
  avgProdPerHewan: string
}

type ValidationErrors = {
  [key: string]: string
}

type ProdukHewanSettingsProps = {
  initialProdukHewan: ProdukHewan[]
  tipeHewan: TipeHewan[]
}

export function ProdukHewanSettings({ initialProdukHewan, tipeHewan }: ProdukHewanSettingsProps) {
  const [produkHewan, setProdukHewan] = useState<ProdukHewan[]>(initialProdukHewan)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedProduk, setSelectedProduk] = useState<ProdukHewan | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [formData, setFormData] = useState<ProdukHewanFormData>({
    nama: "",
    berat: "",
    avgProdPerHewan: "1",
  })

  const validateForm = (data: ProdukHewanFormData): ValidationErrors => {
    try {
      produkHewanSchema.parse({
        ...data,
        JenisProduk: selectedProduk?.JenisProduk || "DAGING"
      })
      return {}
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationErrors = {}
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message
          }
        })
        return errors
      }
      return {}
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleAddSuccess = (newProduk: ProdukHewan | ProdukHewan[]) => {
    setProdukHewan((prev) => [
      ...prev, 
      ...(Array.isArray(newProduk) ? newProduk : [newProduk]),
    ])
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduk) return

    const errors = validateForm(formData)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setLoading(true)

    try {
      const result = await updateProdukHewan(selectedProduk.id, {
        nama: formData.nama,
        berat: formData.berat ? Number.parseFloat(formData.berat) : null,
        avgProdPerHewan: selectedProduk.JenisProduk === "DAGING" ? 1 : Number.parseInt(formData.avgProdPerHewan) || 1,
      })

      if (result.success && result.data) {
        const updatedProduk = result.data as ProdukHewan

        setProdukHewan((prev) => prev.map((item) => (item.id === selectedProduk.id ? updatedProduk : item)))
        setIsEditDialogOpen(false)
        toast.success("Produk hewan berhasil diperbarui")
      }
    } catch (error) {
      console.error("Error updating produk hewan:", error)
      toast.error("Gagal memperbarui produk hewan")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedProduk) return

    setLoading(true)

    try {
      const result = await deleteProdukHewan(selectedProduk.id)

      if (result.success) {
        setProdukHewan((prev) => prev.filter((item) => item.id !== selectedProduk.id))
        setIsDeleteDialogOpen(false)
        toast.success("Produk hewan berhasil dihapus")
      }
    } catch (error) {
      console.error("Error deleting produk hewan:", error)
      toast.error("Produk hewan telah memiliki riwayat transaksi")
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (produk: ProdukHewan) => {
    setSelectedProduk(produk)
    setFormData({
      nama: produk.nama,
      berat: produk.berat?.toString() || "",
      avgProdPerHewan: produk.JenisProduk === "DAGING" ? "" : produk.avgProdPerHewan!.toString(),
    })
    setValidationErrors({})
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (produk: ProdukHewan) => {
    setSelectedProduk(produk)
    setIsDeleteDialogOpen(true)
  }

  const shouldShowAvgProdPerHewan = selectedProduk?.JenisProduk !== "DAGING"

  return (
    <Card className="w-full p-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Produk Hewan</CardTitle>
          <CardDescription>Kelola produk hewan yang tersedia dalam sistem</CardDescription>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Produk Hewan
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* <TableHead>ID</TableHead> */}
                <TableHead>Nama</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Berat</TableHead>
                <TableHead>Prod perHewan</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produkHewan.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Tidak ada data produk hewan
                  </TableCell>
                </TableRow>
              ) : (
                produkHewan.map((produk) => (
                  <TableRow key={produk.id}>
                    {/* <TableCell>{produk.id}</TableCell> */}
                    <TableCell>{produk.nama}</TableCell>
                    <TableCell className="flex items-center space-x-2">
                      <ProductSpriteIcon
                        productId={produk.nama.toLowerCase().replace(/\s+/g, "-")}
                        size="sm"
                        showTooltip={true}
                        fallbackIcon={<span className="text-xs">📦</span>}
                      />
                      <span>{produk.nama}</span>
                    </TableCell>
                    {/* <TableCell>{produk.JenisHewan || "-"}</TableCell>
                    <TableCell>{getJenisProdukLabel(produk.JenisProduk)}</TableCell> */}
                    <TableCell>{produk.berat ? `${produk.berat} kg` : "-"}</TableCell>
                    <TableCell>{produk.JenisProduk === "DAGING" ? "-" : produk.avgProdPerHewan}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>Target: {produk.targetPaket}</span>
                        <span>Ditimbang: {produk.diTimbang}</span>
                        <span>Di Inventori: {produk.diInventori}</span>
                        <span>Diserahkan: {produk.sdhDiserahkan}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(produk)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(produk)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <ProdukMapping produkHewan={produkHewan} />
      {/* Create Dialog */}
      <ProductHewanForm 
        tipeHewan={tipeHewan}
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleAddSuccess}
      />
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Produk Hewan</DialogTitle>
              <DialogDescription>Perbarui informasi produk hewan</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="illustration" className="text-right">
                  Ilustrasi
                </Label>
                <div className="col-span-3">
                  <ProductSelector
                    onProductSelect={(productId) => {
                      const illustration = getProductIllustration(productId)
                      if (illustration) {
                        setFormData((prev) => ({ ...prev, nama: illustration.name }))
                      }
                    }}
                    selectedProductId={formData.nama.toLowerCase().replace(/\s+/g, "-")}
                    className="max-h-60 overflow-y-auto"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-nama" className="text-right">
                  Nama
                </Label>
                <div className="col-span-3 space-y-1">
                  <Input
                    id="edit-nama"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    className={validationErrors.nama ? "border-red-500" : ""}
                  />
                  {validationErrors.nama && (
                    <p className="text-sm text-red-500">{validationErrors.nama}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-berat" className="text-right">
                  Berat (kg)
                </Label>
                <div className="col-span-3 space-y-1">
                  <Input
                    id="edit-berat"
                    name="berat"
                    type="number"
                    step="0.01"
                    value={formData.berat}
                    onChange={handleChange}
                    placeholder="Opsional"
                    className={validationErrors.berat ? "border-red-500" : ""}
                  />
                  {validationErrors.berat && (
                    <p className="text-sm text-red-500">{validationErrors.berat}</p>
                  )}
                </div>
              </div>
              
              {shouldShowAvgProdPerHewan && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-avgProdPerHewan" className="text-right">
                    Rata-rata per Hewan
                  </Label>
                  <div className="col-span-3 space-y-1">
                    <Input
                      id="edit-avgProdPerHewan"
                      name="avgProdPerHewan"
                      type="number"
                      min="1"
                      value={formData.avgProdPerHewan}
                      onChange={handleChange}
                      className={validationErrors.avgProdPerHewan ? "border-red-500" : ""}
                    />
                    {validationErrors.avgProdPerHewan && (
                      <p className="text-sm text-red-500">{validationErrors.avgProdPerHewan}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Hapus Produk Hewan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus produk hewan ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              Anda akan menghapus produk hewan: <strong>{selectedProduk?.nama}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}