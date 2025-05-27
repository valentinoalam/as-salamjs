"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { createCategory, updateCategory, deleteCategory } from "@/services/keuangan"
import type { TransactionCategory, TransactionType } from "@prisma/client"

type Category = {
  id: number
  nama: string
  tipe: TransactionType
  deskripsi?: string
}

type KategoriFormProps = {
  mode: "add" | "edit" | "delete"
  kategori?: Category
  buttonLabel?: string
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  buttonIcon?: React.ReactNode
  onSuccess?: () => void
}

export function KategoriForm({
  mode,
  kategori,
  buttonLabel,
  buttonVariant = "default",
  buttonIcon,
  onSuccess,
}: KategoriFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Category>>(
    kategori || {
      nama: "",
      tipe: "PEMASUKAN",
      deskripsi: "",
    },
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, tipe: value as "PEMASUKAN" | "PENGELUARAN" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === "add") {
        await createCategory(formData as Omit<TransactionCategory, "id">)
        toast.success("Kategori keuangan berhasil ditambahkan")
      } else if (mode === "edit" && kategori) {
        await updateCategory(kategori.id, formData as Omit<TransactionCategory, "id">)
        toast.success("Kategori keuangan berhasil diperbarui")
      } else if (mode === "delete" && kategori) {
        await deleteCategory(kategori.id)
        toast.success("Kategori keuangan berhasil dihapus")
      }

      setOpen(false)
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (error) {
      console.error("Error:", error)
      toast.error("Terjadi kesalahan saat memproses kategori keuangan")
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case "add":
        return "Tambah Kategori Keuangan"
      case "edit":
        return "Edit Kategori Keuangan"
      case "delete":
        return "Hapus Kategori Keuangan"
      default:
        return "Kategori Keuangan"
    }
  }

  const getDescription = () => {
    switch (mode) {
      case "add":
        return "Tambahkan kategori keuangan baru untuk pemasukan atau pengeluaran."
      case "edit":
        return "Edit informasi kategori keuangan yang sudah ada."
      case "delete":
        return "Apakah Anda yakin ingin menghapus kategori keuangan ini? Tindakan ini tidak dapat dibatalkan."
      default:
        return ""
    }
  }

  const getButtonLabel = () => {
    if (buttonLabel) return buttonLabel

    switch (mode) {
      case "add":
        return "Tambah Kategori"
      case "edit":
        return "Edit"
      case "delete":
        return "Hapus"
      default:
        return "Kategori"
    }
  }

  const getButtonIcon = () => {
    if (buttonIcon) return buttonIcon

    switch (mode) {
      case "add":
        return <PlusCircle className="mr-2 h-4 w-4" />
      case "edit":
        return <Pencil className="mr-2 h-4 w-4" />
      case "delete":
        return <Trash2 className="mr-2 h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant}>
          {getButtonIcon()}
          {getButtonLabel()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>{getDescription()}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {mode !== "delete" ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nama" className="text-right">
                    Nama
                  </Label>
                  <Input
                    id="nama"
                    name="nama"
                    value={formData.nama || ""}
                    onChange={handleChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tipe" className="text-right">
                    Tipe
                  </Label>
                  <Select value={formData.tipe} onValueChange={handleSelectChange}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEMASUKAN">Pemasukan</SelectItem>
                      <SelectItem value="PENGELUARAN">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="deskripsi" className="text-right">
                    Deskripsi
                  </Label>
                  <Input
                    id="deskripsi"
                    name="deskripsi"
                    value={formData.deskripsi || ""}
                    onChange={handleChange}
                    className="col-span-3"
                  />
                </div>
              </>
            ) : (
              <p className="py-2 text-center">
                Anda akan menghapus kategori <strong>{kategori?.nama}</strong>. Tindakan ini tidak dapat dibatalkan.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" variant={mode === "delete" ? "destructive" : "default"} disabled={loading}>
              {loading ? "Memproses..." : mode === "add" ? "Tambah" : mode === "edit" ? "Simpan" : "Hapus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
