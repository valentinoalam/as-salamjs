"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { UserQurbanForm } from "@/components/qurban/trx-user/user-qurban-form"
import type { UserQurbanFormValues } from "@/lib/zod/qurban-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TipeHewanWithImages } from "@/types/keuangan"

interface PemesananFormProps {
  tipeHewan: TipeHewanWithImages[]
}

export default function PemesananForm({ tipeHewan }: PemesananFormProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const hewanQurbanMenu = tipeHewan.flatMap(hewan => {
    const options = [{
      nama: hewan.nama,
      icon: hewan.icon,
      image: hewan.images[0],
      harga: hewan.harga,
      note: hewan.note,
      jenis: hewan.jenis,
      originalId: hewan.id,
      isKolektif: false
    }];
    
    
    if (hewan.hargaKolektif) {
      options.push({
        nama: `${hewan.nama} (Kolektif)`,
        icon: hewan.icon,
        image: hewan.images.length > 1? hewan.images[1] : hewan.images[0],
        harga: hewan.hargaKolektif,
        note: hewan.note ? `${hewan.note} - Kolektif` : `${hewan.jenis} Kolektif`,
        jenis: hewan.jenis,
        originalId: hewan.id,
        isKolektif: true
      });
    }
    
    return options;
  });
useEffect(()=>{console.log(tipeHewan)},[tipeHewan])
  const handleSubmit = async (data: Omit<UserQurbanFormValues, 'paymentStatus' | 'createdAt'>) => {
    try {
      const response = await fetch("/api/mudhohi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          data: {
            ...data,
            tipeHewanId: Number.parseInt(data.tipeHewanId),
        }}),
      })
      const result = await response.json();
      if (result.ok && result.success) {
        toast({
          title: "Pemesanan Berhasil",
          description: "Terima kasih atas pemesanan Anda. Silahkan lakukan pembayaran.",
        })
        router.push(`/pemesanan/konfirmasi/${result.data.id}`)
        return { success: true, mudhohiId: result.data.id }
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
      return { success: false, error: "Gagal melakukan pemesanan" }
    }
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserQurbanForm tipeHewan={tipeHewan} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
      </div>
    )
  }
  return (
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-green-400 mb-4">HEWAN QURBAN</h2>
        <p className="text-xl text-green-300 font-medium">Berikut adalah hewan qurban yang kami sediakan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
        {hewanQurbanMenu && hewanQurbanMenu.map((hewan, index) => (
          <Card
            key={index}
            className="w-full max-w-sm bg-white border-2 border-gray-900 overflow-hidden hover:shadow-xl transition-shadow"
          >
            <CardContent className="p-6">
              <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                <Image
                  src={hewan.image.url}
                  alt={hewan.image.alt}
                  fill
                  className="object-cover border-2 border-gray-900"
                />
              </div>
              <h5 className="text-xl font-medium text-green-600 mb-2 mt-5">
                {hewan.icon} {hewan.nama}
              </h5>
              <p className="text-green-600 mb-4">{hewan.note}</p>
              <div className="flex flex-col gap-2">
                <Badge className="bg-yellow-400 text-gray-900 font-bold text-sm w-fit">
                  Rp {hewan.harga.toLocaleString("id-ID")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <Button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-colors"
        >
          Pilih Hewan Qurban
        </Button>
      </div>
    </div>
  )
}
