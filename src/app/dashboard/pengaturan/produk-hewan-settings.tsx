"use client"

import type React from "react"

import { useState } from "react"
import { toast } from "sonner"
import { PlusCircle, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { addProdukHewan, updateProdukHewan, deleteProdukHewan } from "./actions"
import type { JenisProduk, TipeHewan } from "@prisma/client"

type ProdukHewan = {
  id: number
  nama: string
  tipeId: number | null
  berat: number | null
  avgProdPerHewan: number
  targetPaket: number
  diTimbang: number
  diInventori: number
  sdhDiserahkan: number
  JenisProduk: JenisProduk
  tipe_hewan: TipeHewan | null
}

type ProdukHewanFormData = {
  nama: string
  tipeId: string
  berat: string
  avgProdPerHewan: string
  JenisProduk: JenisProduk
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
  const [formData, setFormData] = useState<ProdukHewanFormData>({
    nama: "",
    tipeId: "",
    berat: "",
    avgProdPerHewan: "1",
    JenisProduk: "DAGING",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await addProdukHewan({
        nama: formData.nama,
        tipeId: Number.parseInt(formData.tipeId),
        berat: formData.berat ? Number.parseFloat(formData.berat) : null,
        avgProdPerHewan: Number.parseInt(formData.avgProdPerHewan) || 1,
        JenisProduk: formData.JenisProduk,
      })

      if (result.success && result.data) {
        // Need to fetch the updated data with the tipe_hewan relation
        const updatedProduk = {
          ...result.data,
          tipe_hewan: tipeHewan.find((t) => t.id === (result.data as any).tipeId) || null,
        } as ProdukHewan

        setProdukHewan((prev) => [...prev, updatedProduk])
        resetForm()
        setIsAddDialogOpen(false)
        toast.success("Produk hewan berhasil ditambahkan")
      }
    } catch (error) {
      console.error("Error adding produk hewan:", error)
      toast.error("Gagal menambahkan produk hewan")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduk) return

    setLoading(true)

    try {
      const result = await updateProdukHewan(selectedProduk.id, {
        nama: formData.nama,
        tipeId: formData.tipeId ? Number.parseInt(formData.tipeId) : null,
        berat: formData.berat ? Number.parseFloat(formData.berat) : null,
        avgProdPerHewan: Number.parseInt(formData.avgProdPerHewan) || 1,
        JenisProduk: formData.JenisProduk,
      })

      if (result.success && result.data) {
        // Need to update the tipe_hewan relation
        const updatedProduk = {
          ...result.data,
          tipe_hewan: tipeHewan.find((t) => t.id === (result.data as any).tipeId) || null,
        } as ProdukHewan

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
    } catch (error: any) {
      console.error("Error deleting produk hewan:", error)
      toast.error(error.message || "Gagal menghapus produk hewan")
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (produk: ProdukHewan) => {
    setSelectedProduk(produk)
    setFormData({
      nama: produk.nama,
      tipeId: produk.tipeId?.toString() || "",
      berat: produk.berat?.toString() || "",
      avgProdPerHewan: produk.avgProdPerHewan.toString(),
      JenisProduk: produk.JenisProduk,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (produk: ProdukHewan) => {
    setSelectedProduk(produk)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      nama: "",
      tipeId: "",
      berat: "",
      avgProdPerHewan: "1",
      JenisProduk: "DAGING",
    })
  }

  const getJenisProdukLabel = (jenis: string) => {
    switch (jenis) {
      case "DAGING":
        return <Badge>Daging</Badge>
      case "TULANG":
        return <Badge variant="outline">Tulang</Badge>
      case "JEROAN":
        return <Badge variant="secondary">Jeroan</Badge>
      case "KULIT":
        return <Badge variant="destructive">Kulit</Badge>
      default:
        return <Badge variant="outline">{jenis}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Produk Hewan</CardTitle>
          <CardDescription>Kelola produk hewan yang tersedia dalam sistem</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Produk Hewan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <DialogTitle>Tambah Produk Hewan</DialogTitle>
                <DialogDescription>Tambahkan produk hewan baru ke dalam sistem</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nama" className="text-right">
                    Nama
                  </Label>
                  <Input
                    id="nama"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    className="col-span-3"
                    required
                    placeholder="Contoh: Daging Sapi 1kg"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tipeId" className="text-right">
                    Tipe Hewan
                  </Label>
                  <Select value={formData.tipeId} onValueChange={(value) => handleSelectChange("tipeId", value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Pilih tipe hewan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak ada</SelectItem>
                      {tipeHewan.map((tipe) => (
                        <SelectItem key={tipe.id} value={tipe.id.toString()}>
                          {tipe.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="JenisProduk" className="text-right">
                    Jenis Produk
                  </Label>
                  <Select
                    value={formData.JenisProduk}
                    onValueChange={(value) => handleSelectChange("JenisProduk", value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Pilih jenis produk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAGING">Daging</SelectItem>
                      <SelectItem value="TULANG">Tulang</SelectItem>
                      <SelectItem value="JEROAN">Jeroan</SelectItem>
                      <SelectItem value="KULIT">Kulit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="berat" className="text-right">
                    Berat (kg)
                  </Label>
                  <Input
                    id="berat"
                    name="berat"
                    type="number"
                    step="0.01"
                    value={formData.berat}
                    onChange={handleChange}
                    className="col-span-3"
                    placeholder="Opsional"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="avgProdPerHewan" className="text-right">
                    Rata-rata per Hewan
                  </Label>
                  <Input
                    id="avgProdPerHewan"
                    name="avgProdPerHewan"
                    type="number"
                    min="1"
                    value={formData.avgProdPerHewan}
                    onChange={handleChange}
                    className="col-span-3"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
                  Batal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe Hewan</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Berat</TableHead>
                <TableHead>Rata-rata/Hewan</TableHead>
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
                    <TableCell>{produk.id}</TableCell>
                    <TableCell>{produk.nama}</TableCell>
                    <TableCell>{produk.tipe_hewan?.nama || "-"}</TableCell>
                    <TableCell>{getJenisProdukLabel(produk.JenisProduk)}</TableCell>
                    <TableCell>{produk.berat ? `${produk.berat} kg` : "-"}</TableCell>
                    <TableCell>{produk.avgProdPerHewan}</TableCell>
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
                <Label htmlFor="edit-nama" className="text-right">
                  Nama
                </Label>
                <Input
                  id="edit-nama"
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-tipeId" className="text-right">
                  Tipe Hewan
                </Label>
                <Select value={formData.tipeId} onValueChange={(value) => handleSelectChange("tipeId", value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih tipe hewan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada</SelectItem>
                    {tipeHewan.map((tipe) => (
                      <SelectItem key={tipe.id} value={tipe.id.toString()}>
                        {tipe.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-JenisProduk" className="text-right">
                  Jenis Produk
                </Label>
                <Select
                  value={formData.JenisProduk}
                  onValueChange={(value) => handleSelectChange("JenisProduk", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih jenis produk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAGING">Daging</SelectItem>
                    <SelectItem value="TULANG">Tulang</SelectItem>
                    <SelectItem value="JEROAN">Jeroan</SelectItem>
                    <SelectItem value="KULIT">Kulit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-berat" className="text-right">
                  Berat (kg)
                </Label>
                <Input
                  id="edit-berat"
                  name="berat"
                  type="number"
                  step="0.01"
                  value={formData.berat}
                  onChange={handleChange}
                  className="col-span-3"
                  placeholder="Opsional"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-avgProdPerHewan" className="text-right">
                  Rata-rata per Hewan
                </Label>
                <Input
                  id="edit-avgProdPerHewan"
                  name="avgProdPerHewan"
                  type="number"
                  min="1"
                  value={formData.avgProdPerHewan}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                />
              </div>
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
