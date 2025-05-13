"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { createPemesanan } from "./actions"
import { CaraBayar } from "@prisma/client"

type TipeHewan = {
  id: number
  nama: string
  icon: string | null
  harga: number
  note: string
}

interface PemesananFormProps {
  tipeHewan: TipeHewan[]
}

export default function PemesananForm({ tipeHewan }: PemesananFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nama_pengqurban: "",
    nama_peruntukan: "",
    pesan_khusus: "",
    keterangan: "",
    potong_sendiri: false,
    mengambilDaging: false,
    tipeHewanId: "1", // Default to Sapi
    cara_bayar: CaraBayar.TRANSFER,
    email: "",
    phone: "",
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createPemesanan({
        ...formData,
        tipeHewanId: Number.parseInt(formData.tipeHewanId),
      })

      if (result.success) {
        toast({
          title: "Pemesanan Berhasil",
          description: "Terima kasih atas pemesanan Anda. Silahkan lakukan pembayaran.",
        })
        router.push(`/pemesanan/konfirmasi/${result.mudhohiId}`)
      } else {
        throw new Error(result.error || "Terjadi kesalahan")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: "Gagal melakukan pemesanan. Silahkan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Find selected animal type
  const selectedTipe = tipeHewan.find((tipe) => tipe.id.toString() === formData.tipeHewanId)
  const isKolektif = selectedTipe?.nama === "Sapi Kolektif"

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Form Pemesanan Qurban</CardTitle>
          <CardDescription>Silahkan isi data pemesanan qurban Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Data Pengqurban</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nama_pengqurban">Nama Pengqurban</Label>
                <Input
                  id="nama_pengqurban"
                  value={formData.nama_pengqurban}
                  onChange={(e) => handleChange("nama_pengqurban", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nama_peruntukan">Nama Peruntukan</Label>
                <Input
                  id="nama_peruntukan"
                  value={formData.nama_peruntukan}
                  onChange={(e) => handleChange("nama_peruntukan", e.target.value)}
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
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Pilihan Hewan Qurban</h3>
            <RadioGroup
              value={formData.tipeHewanId}
              onValueChange={(value) => handleChange("tipeHewanId", value)}
              className="space-y-3"
            >
              {tipeHewan.map((tipe) => (
                <div key={tipe.id} className="flex items-start space-x-2 border p-4 rounded-md">
                  <RadioGroupItem value={tipe.id.toString()} id={`tipe-${tipe.id}`} className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor={`tipe-${tipe.id}`} className="font-medium">
                      {tipe.icon} {tipe.nama}
                    </Label>
                    <p className="text-sm text-muted-foreground">{tipe.note}</p>
                    <p className="font-medium">
                      Rp {tipe.harga.toLocaleString("id-ID")}
                      {tipe.nama === "Sapi Kolektif" && " per orang"}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Opsi Tambahan</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mengambilDaging"
                  checked={formData.mengambilDaging}
                  onCheckedChange={(checked) => handleChange("mengambilDaging", checked)}
                />
                <Label htmlFor="mengambilDaging">Saya ingin mengambil daging qurban</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="potong_sendiri"
                  checked={formData.potong_sendiri}
                  onCheckedChange={(checked) => handleChange("potong_sendiri", checked)}
                />
                <Label htmlFor="potong_sendiri">Saya ingin menyaksikan penyembelihan</Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Metode Pembayaran</h3>
            <RadioGroup
              value={formData.cara_bayar}
              onValueChange={(value) => handleChange("cara_bayar", value)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-2 border p-4 rounded-md">
                <RadioGroupItem value={CaraBayar.TRANSFER} id="transfer" className="mt-1" />
                <div className="grid gap-1.5">
                  <Label htmlFor="transfer" className="font-medium">
                    Transfer Bank
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Transfer ke rekening Bank Syariah Indonesia (BSI) 7190671254 a.n. Panitia Qurban
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2 border p-4 rounded-md">
                <RadioGroupItem value={CaraBayar.TUNAI} id="tunai" className="mt-1" />
                <div className="grid gap-1.5">
                  <Label htmlFor="tunai" className="font-medium">
                    Tunai
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Pembayaran tunai dapat dilakukan di sekretariat panitia qurban
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pesan_khusus">Pesan Khusus</Label>
            <Textarea
              id="pesan_khusus"
              value={formData.pesan_khusus}
              onChange={(e) => handleChange("pesan_khusus", e.target.value)}
              placeholder="Pesan khusus untuk panitia (opsional)"
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Total Pembayaran:{" "}
            <span className="font-bold">Rp {selectedTipe ? selectedTipe.harga.toLocaleString("id-ID") : "0"}</span>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Memproses..." : "Pesan Sekarang"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
