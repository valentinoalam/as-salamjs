/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import { ProductMappingManager } from "@/components/product-mapping-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface ProdukMappingProps {
  produkHewan: Array<{
    id: number
    nama: string
    jenisProduk?: string | null
    tipe_hewan?: { jenis?: string } | null
  }>
}

export function ProdukMapping({ produkHewan }: ProdukMappingProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateMapping = async (updates: Array<{ productId: string; illustrationId: string | null }>) => {
    setIsUpdating(true)
    try {
      // Here you would call your API to update the product illustrations
      // For now, we'll just simulate the update
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success(`Berhasil memperbarui ${updates.length} pemetaan produk`)
    } catch (error) {
      console.error("Error updating mappings:", error)
      toast.error("Gagal memperbarui pemetaan produk")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pemetaan Ilustrasi Produk</CardTitle>
          <CardDescription>
            Sistem akan secara otomatis memetakan produk hewan dengan ilustrasi yang sesuai berdasarkan nama produk,
            jenis hewan, dan kategori produk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Cara Kerja Pemetaan:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Sistem menganalisis nama produk untuk mendeteksi jenis hewan (Sapi, Domba, Kambing, Unta)</li>
                <li>• Mengidentifikasi kategori produk (Daging, Jeroan, Tulang, Kulit, Kepala, Kaki, dll)</li>
                <li>• Mencocokkan dengan ilustrasi yang tersedia berdasarkan kombinasi jenis hewan dan kategori</li>
                <li>• Memberikan skor kepercayaan untuk setiap pemetaan</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProductMappingManager products={produkHewan} onUpdateMapping={handleUpdateMapping} />
    </div>
  )
}
