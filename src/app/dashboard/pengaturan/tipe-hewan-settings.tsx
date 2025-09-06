"use client"

import type React from "react"

import { useState } from "react"
import { toast } from "sonner"
import { PlusCircle, Pencil, Trash2, Image as ImageIcon } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import { addTipeHewan, updateTipeHewan, deleteTipeHewan } from "./actions"
import { formatCurrency } from "#@/lib/utils/formatters.ts"
import { JenisHewan } from "@prisma/client"
import { ImageUpload } from "@/components/ui/image-upload"
import type { TipeHewanWithImages } from "#@/types/qurban.ts"
import Image from "next/image"

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
  initialTipeHewan: TipeHewanWithImages[]
}

export function TipeHewanSettings({ initialTipeHewan }: TipeHewanSettingsProps) {
  const [tipeHewan, setTipeHewan] = useState<TipeHewanWithImages[]>(initialTipeHewan)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedTipeHewan, setSelectedTipeHewan] = useState<TipeHewanWithImages | null>(null)
  const [formData, setFormData] = useState<TipeHewanFormData>({
    nama: "",
    icon: "",
    target: 0,
    harga: 0,
    hargaKolektif: undefined,
    note: "",
    jenis: JenisHewan.SAPI,
  })
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

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
      hargaKolektif: undefined,
      note: "",
      jenis: JenisHewan.SAPI,
    })
    setUploadedImages([])
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
        hargaKolektif: formData.hargaKolektif || undefined,
        note: formData.note,
        jenis: formData.jenis,
        imageUrls: uploadedImages,
      })

      if (result.success && result.data) {
        setTipeHewan((prev) => [...prev, result.data as TipeHewanWithImages])
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
        hargaKolektif: formData.hargaKolektif || undefined,
        note: formData.note,
        jenis: formData.jenis,
        imageUrls: uploadedImages,
      })

      if (result.success && result.data) {
        setTipeHewan((prev) =>
          prev.map((item) => (item.id === selectedTipeHewan.id ? (result.data as TipeHewanWithImages) : item)),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error deleting tipe hewan:", error)
      toast.error(error.message || "Gagal menghapus tipe hewan")
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (tipe: TipeHewanWithImages) => {
    setSelectedTipeHewan(tipe)
    setFormData({
      nama: tipe.nama,
      icon: tipe.icon || "",
      target: tipe.target || 0,
      harga: tipe.harga,
      hargaKolektif: tipe.hargaKolektif || undefined,
      note: tipe.note || "",
      jenis: tipe.jenis,
    })
    setUploadedImages(tipe.images?.map(img => img.url) || [])
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (tipe: TipeHewanWithImages) => {
    setSelectedTipeHewan(tipe)
    setIsDeleteDialogOpen(true)
  }

  const getJenisHewanLabel = (jenis: JenisHewan) => {
    const labels = {
      [JenisHewan.UNTA]: "Unta",
      [JenisHewan.SAPI]: "Sapi",
      [JenisHewan.KAMBING]: "Kambing",
      [JenisHewan.DOMBA]: "Domba",
    }
    return labels[jenis] || jenis
  }

  const getJenisHewanColor = (jenis: JenisHewan) => {
    const colors = {
      [JenisHewan.UNTA]: "bg-orange-100 text-orange-800 border-orange-200",
      [JenisHewan.SAPI]: "bg-blue-100 text-blue-800 border-blue-200",
      [JenisHewan.KAMBING]: "bg-green-100 text-green-800 border-green-200",
      [JenisHewan.DOMBA]: "bg-purple-100 text-purple-800 border-purple-200",
    }
    return colors[jenis] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <div className="space-y-6">
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                        <SelectItem value={JenisHewan.KAMBING}>Kambing</SelectItem>
                        <SelectItem value={JenisHewan.DOMBA}>Domba</SelectItem>
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
                      value={formData.hargaKolektif || ""}
                      onChange={handleChange}
                      className="col-span-3"
                      min={0}
                      placeholder="Opsional"
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
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right mt-2">Gambar</Label>
                    <div className="col-span-3">
                      <ImageUpload
                        relatedId="temp"
                        relatedType="TipeHewan"
                        existingImages={[]}
                        onImagesChange={(images) => {
                          setUploadedImages(images.map((img) => img.url))
                        }}
                        maxFiles={3}
                      />
                    </div>
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
      </Card>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tipeHewan.length === 0 ? (
          <div className="col-span-full">
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Tidak ada data tipe hewan</p>
                <p className="text-sm">Tambahkan tipe hewan baru untuk memulai</p>
              </div>
            </Card>
          </div>
        ) : (
          tipeHewan.map((tipe) => (
            <Card key={tipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                {tipe.images && tipe.images.length > 0 ? (
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    <Image fill
                      src={tipe.images[0].url}
                      alt={tipe.nama}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        img.style.display = 'none'
                        img.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => openEditDialog(tipe)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(tipe)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="absolute top-2 left-2">
                  <Badge className={getJenisHewanColor(tipe.jenis)}>
                    {getJenisHewanLabel(tipe.jenis)}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{tipe.nama}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Target</p>
                      <p className="font-medium">{tipe.target}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Harga</p>
                      <p className="font-medium">{formatCurrency(tipe.harga)}</p>
                    </div>
                  </div>
                  
                  {tipe.hargaKolektif && (
                    <div>
                      <p className="text-sm text-muted-foreground">Harga Kolektif</p>
                      <p className="font-medium text-sm">{formatCurrency(tipe.hargaKolektif)}</p>
                    </div>
                  )}
                  
                  {tipe.note && (
                    <div>
                      <p className="text-sm text-muted-foreground">Catatan</p>
                      <p className="text-sm line-clamp-2">{tipe.note}</p>
                    </div>
                  )}
                  
                  {tipe.images && tipe.images.length > 1 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Gambar Lainnya</p>
                      <div className="flex gap-2 overflow-x-auto">
                        {tipe.images.slice(1).map((image, index) => (
                          <div key={image.id} className="flex-shrink-0">
                            <Image width={64} height={64}
                              src={image.url}
                              alt={`${tipe.nama} ${index + 2}`}
                              className="w-16 h-16 object-cover rounded border"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                    <SelectItem value={JenisHewan.KAMBING}>Kambing</SelectItem>
                    <SelectItem value={JenisHewan.DOMBA}>Domba</SelectItem>
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
                  value={formData.hargaKolektif || ""}
                  onChange={handleChange}
                  className="col-span-3"
                  min={0}
                  placeholder="Opsional"
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
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right mt-2">Gambar</Label>
                <div className="col-span-3">
                  <ImageUpload
                    relatedId={selectedTipeHewan?.id.toString() || "temp"}
                    relatedType="TipeHewan"
                    existingImages={selectedTipeHewan?.images || []}
                    onImagesChange={(images) => {
                      setUploadedImages(images.map((img) => img.url))
                    }}
                    maxFiles={3}
                  />
                </div>
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
            <div className="flex items-center gap-4">
              {selectedTipeHewan?.images && selectedTipeHewan.images.length > 0 && (
                <Image width={64} height={64}
                  src={selectedTipeHewan.images[0].url}
                  alt={selectedTipeHewan.nama}
                  className="w-16 h-16 object-cover rounded border"
                />
              )}
              <div>
                <p className="font-medium">{selectedTipeHewan?.nama}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedTipeHewan && getJenisHewanLabel(selectedTipeHewan.jenis)}
                </p>
              </div>
            </div>
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
    </div>
  )
}