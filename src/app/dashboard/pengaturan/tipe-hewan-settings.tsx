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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { addTipeHewan, updateTipeHewan, deleteTipeHewan } from "./actions"
import { formatCurrency } from "@/lib/formatters"
import { JenisHewan, type TipeHewan } from "@prisma/client"

type TipeHewanFormData = {
  nama: string
  icon: string
  target: number
  harga: number
  hargaKolektif?: number
  note: string
  jenis: JenisHewan
}

type TipeHewanSettingsProps = {
  initialTipeHewan: TipeHewan[]
}

export function TipeHewanSettings({ initialTipeHewan }: TipeHewanSettingsProps) {
  const [tipeHewan, setTipeHewan] = useState<TipeHewan[]>(initialTipeHewan)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedTipeHewan, setSelectedTipeHewan] = useState<TipeHewan | null>(null)
  const [formData, setFormData] = useState<TipeHewanFormData>({
    nama: "",
    icon: "",
    target: 0,
    harga: 0,
    hargaKolektif: undefined,
    note: "",
    jenis: JenisHewan.SAPI,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setFormData({
      nama: "",
      icon: "",
      target: 0,
      harga: 0,
      hargaKolektif: 0,
      note: "",
      jenis: JenisHewan.SAPI,
    })
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await addTipeHewan({
        nama: formData.nama,
        icon: formData.icon || undefined,
        target: formData.target,
        harga: formData.harga,
        hargaKolektif: formData.hargaKolektif? formData.hargaKolektif :  undefined,
        note: formData.note,
        jenis: formData.jenis,
      })

      if (result.success && result.data) {
        setTipeHewan((prev) => [...prev, result.data as TipeHewan])
        resetForm()
        setIsAddDialogOpen(false)
        toast.success("Tipe hewan berhasil ditambahkan")
      }
    } catch (error) {
      console.error("Error adding tipe hewan:", error)
      toast.error("Gagal menambahkan tipe hewan")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTipeHewan) return

    setLoading(true)

    try {
      const result = await updateTipeHewan(selectedTipeHewan.id, {
        nama: formData.nama,
        icon: formData.icon || undefined,
        target: formData.target,
        harga: formData.harga,
        hargaKolektif: formData.hargaKolektif? formData.hargaKolektif : undefined,
        note: formData.note,
        jenis: formData.jenis,
      })

      if (result.success && result.data) {
        setTipeHewan((prev) =>
          prev.map((item) => (item.id === selectedTipeHewan.id ? (result.data as TipeHewan) : item)),
        )
        setIsEditDialogOpen(false)
        toast.success("Tipe hewan berhasil diperbarui")
      }
    } catch (error) {
      console.error("Error updating tipe hewan:", error)
      toast.error("Gagal memperbarui tipe hewan")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTipeHewan) return

    setLoading(true)

    try {
      const result = await deleteTipeHewan(selectedTipeHewan.id)

      if (result.success) {
        setTipeHewan((prev) => prev.filter((item) => item.id !== selectedTipeHewan.id))
        setIsDeleteDialogOpen(false)
        toast.success("Tipe hewan berhasil dihapus")
      }
    } catch (error: any) {
      console.error("Error deleting tipe hewan:", error)
      toast.error(error.message || "Gagal menghapus tipe hewan")
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (tipe: TipeHewan) => {
    setSelectedTipeHewan(tipe)
    setFormData({
      nama: tipe.nama,
      icon: tipe.icon || "",
      target: tipe.target,
      harga: tipe.harga,
      hargaKolektif: formData.hargaKolektif? formData.hargaKolektif : undefined,
      note: tipe.note || "",
      jenis: tipe.jenis,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (tipe: TipeHewan) => {
    setSelectedTipeHewan(tipe)
    setIsDeleteDialogOpen(true)
  }

  const getJenisHewanLabel = (jenis: JenisHewan) => {
    const labels = {
      [JenisHewan.UNTA]: "Unta",
      [JenisHewan.SAPI]: "Sapi",
      [JenisHewan.DOMBA]: "Domba",
      [JenisHewan.KAMBING]: "Kambing",
    }
    return labels[jenis] || jenis
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tipe Hewan</CardTitle>
          <CardDescription>Kelola tipe hewan yang tersedia dalam sistem</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Tipe Hewan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <DialogTitle>Tambah Tipe Hewan</DialogTitle>
                <DialogDescription>Tambahkan tipe hewan baru ke dalam sistem</DialogDescription>
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
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="jenis" className="text-right">
                    Jenis Hewan
                  </Label>
                  <Select value={formData.jenis} onValueChange={(value) => handleSelectChange("jenis", value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Pilih jenis hewan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={JenisHewan.UNTA}>Unta</SelectItem>
                      <SelectItem value={JenisHewan.SAPI}>Sapi</SelectItem>
                      <SelectItem value={JenisHewan.DOMBA}>Domba</SelectItem>
                      <SelectItem value={JenisHewan.KAMBING}>Kambing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="icon" className="text-right">
                    Icon
                  </Label>
                  <Input
                    id="icon"
                    name="icon"
                    value={formData.icon}
                    onChange={handleChange}
                    className="col-span-3"
                    placeholder="URL ikon atau nama ikon"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="target" className="text-right">
                    Target
                  </Label>
                  <Input
                    id="target"
                    name="target"
                    type="number"
                    value={formData.target}
                    onChange={handleChange}
                    className="col-span-3"
                    required
                    min={0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="harga" className="text-right">
                    Harga
                  </Label>
                  <Input
                    id="harga"
                    name="harga"
                    type="number"
                    value={formData.harga}
                    onChange={handleChange}
                    className="col-span-3"
                    required
                    min={0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hargaKolektif" className="text-right">
                    Harga Kolektif
                  </Label>
                  <Input
                    id="hargaKolektif"
                    name="hargaKolektif"
                    type="number"
                    value={formData.hargaKolektif}
                    onChange={handleChange}
                    className="col-span-3"
                    required
                    min={0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="note" className="text-right">
                    Catatan
                  </Label>
                  <Textarea
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    className="col-span-3"
                    rows={3}
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
                <TableHead>Jenis</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Harga Kolektif</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tipeHewan.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Tidak ada data tipe hewan
                  </TableCell>
                </TableRow>
              ) : (
                tipeHewan.map((tipe) => (
                  <TableRow key={tipe.id}>
                    <TableCell>{tipe.id}</TableCell>
                    <TableCell>{tipe.nama}</TableCell>
                    <TableCell>{getJenisHewanLabel(tipe.jenis)}</TableCell>
                    <TableCell>{tipe.target}</TableCell>
                    <TableCell>{formatCurrency(tipe.harga)}</TableCell>
                    <TableCell>{tipe.hargaKolektif && formatCurrency(tipe.hargaKolektif)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{tipe.note || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(tipe)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(tipe)}>
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
              <DialogTitle>Edit Tipe Hewan</DialogTitle>
              <DialogDescription>Perbarui informasi tipe hewan</DialogDescription>
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
                <Label htmlFor="edit-jenis" className="text-right">
                  Jenis Hewan
                </Label>
                <Select value={formData.jenis} onValueChange={(value) => handleSelectChange("jenis", value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih jenis hewan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={JenisHewan.UNTA}>Unta</SelectItem>
                    <SelectItem value={JenisHewan.SAPI}>Sapi</SelectItem>
                    <SelectItem value={JenisHewan.DOMBA}>Domba</SelectItem>
                    <SelectItem value={JenisHewan.KAMBING}>Kambing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-icon" className="text-right">
                  Icon
                </Label>
                <Input
                  id="edit-icon"
                  name="icon"
                  value={formData.icon}
                  onChange={handleChange}
                  className="col-span-3"
                  placeholder="URL ikon atau nama ikon"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-target" className="text-right">
                  Target
                </Label>
                <Input
                  id="edit-target"
                  name="target"
                  type="number"
                  value={formData.target}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                  min={0}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-harga" className="text-right">
                  Harga
                </Label>
                <Input
                  id="edit-harga"
                  name="harga"
                  type="number"
                  value={formData.harga}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                  min={0}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-hargaKolektif" className="text-right">
                  Harga Kolektif
                </Label>
                <Input
                  id="edit-hargaKolektif"
                  name="hargaKolektif"
                  type="number"
                  value={formData.hargaKolektif}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                  min={0}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-note" className="text-right">
                  Catatan
                </Label>
                <Textarea
                  id="edit-note"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  className="col-span-3"
                  rows={3}
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
            <DialogTitle>Hapus Tipe Hewan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus tipe hewan ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              Anda akan menghapus tipe hewan: <strong>{selectedTipeHewan?.nama}</strong>
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
