"use server"

import { revalidatePath } from "next/cache"
import prisma from "#@/lib/server/prisma.ts"
import type { JenisHewan, JenisProduk } from "@prisma/client"
import type { ProdukHewan, TipeHewanWithImages } from "@/types/qurban"

// TipeHewan actions
export async function addTipeHewan(data: {
  nama: string
  icon?: string
  target: number
  harga: number
  hargaKolektif?: number
  note: string
  jenis: JenisHewan
  imageUrls?: string[]
}) {
  try {
    const result = await prisma.tipeHewan.create({
      data: {
        nama: data.nama,
        icon: data.icon,
        target: Number(data.target),
        harga: Number(data.harga),
        hargaKolektif: data.hargaKolektif ? Number(data.hargaKolektif) : null,
        note: data.note,
        jenis: data.jenis,
      },
    })

    // Create image records if provided
    const images = []
    if (data.imageUrls && data.imageUrls.length > 0) {
      const imageRecords = await Promise.all(
        data.imageUrls.map((url) =>
          prisma.image.create({
            data: {
              url,
              alt: `${data.nama} image`,
              relatedId: result.id.toString(),
              relatedType: "TipeHewan",
            },
          }),
        ),
      )
      images.push(...imageRecords.map(img => ({
        id: img.id,
        url: img.url,
        alt: img.alt || `${data.nama} image`
      })))
    }

    const resultWithImages: TipeHewanWithImages = {
      ...result,
      images
    }

    revalidatePath("/dashboard/pengaturan")
    return { success: true, data: resultWithImages }
  } catch (error) {
    console.error("Error adding tipe hewan:", error)
    throw new Error("Failed to add tipe hewan")
  }
}

export async function updateTipeHewan(
  id: number,
  data: {
    nama?: string
    icon?: string
    target?: number
    harga?: number
    hargaKolektif?: number
    note?: string
    jenis?: JenisHewan
    imageUrls?: string[]
  },
) {
  try {
    // Convert string numbers to actual numbers
    const processedData = {
      nama: data.nama,
      icon: data.icon,
      target: data.target !== undefined ? Number(data.target) : undefined,
      harga: data.harga !== undefined ? Number(data.harga) : undefined,
      hargaKolektif: data.hargaKolektif !== undefined ? Number(data.hargaKolektif) : null,
      note: data.note,
      jenis: data.jenis,
    }

    const result = await prisma.tipeHewan.update({
      where: { id },
      data: processedData,
    })

    let images: { id: string; url: string; alt: string }[] = []
    
    // Update images if provided
    if (data.imageUrls !== undefined) {
      // Delete existing images
      await prisma.image.deleteMany({
        where: {
          relatedId: id.toString(),
          relatedType: "TipeHewan",
        },
      })

      // Create new image records
      if (data.imageUrls.length > 0) {
        const imageRecords = await Promise.all(
          data.imageUrls.map((url) =>
            prisma.image.create({
              data: {
                url,
                alt: `${data.nama || "Animal"} image`,
                relatedId: id.toString(),
                relatedType: "TipeHewan",
              },
            }),
          ),
        )
        images = imageRecords.map(img => ({
          id: img.id,
          url: img.url,
          alt: img.alt || `${data.nama || "Animal"} image`
        }))
      }
    } else {
      // If imageUrls not provided, fetch existing images
      const existingImages = await prisma.image.findMany({
        where: {
          relatedId: id.toString(),
          relatedType: "TipeHewan",
        },
        orderBy: { createdAt: "desc" },
      })
      images = existingImages.map(img => ({
        id: img.id,
        url: img.url,
        alt: img.alt || `${result.nama} image`
      }))
    }

    const resultWithImages: TipeHewanWithImages = {
      ...result,
      images
    }

    revalidatePath("/dashboard/pengaturan")
    return { success: true, data: resultWithImages }
  } catch (error) {
    console.error("Error updating tipe hewan:", error)
    throw new Error("Failed to update tipe hewan")
  }
}

export async function deleteTipeHewan(id: number) {
  try {
    // Check if there are any animals using this type
    const animalsUsingType = await prisma.hewanQurban.count({
      where: { tipeId: id },
    })

    if (animalsUsingType > 0) {
      throw new Error("Tidak dapat menghapus tipe hewan yang sedang digunakan oleh hewan qurban")
    }

    // Delete associated images
    await prisma.image.deleteMany({
      where: {
        relatedId: id.toString(),
        relatedType: "TipeHewan",
      },
    })

    await prisma.tipeHewan.delete({
      where: { id },
    })
    revalidatePath("/dashboard/pengaturan")
    return { success: true }
  } catch (error) {
    console.error("Error deleting tipe hewan:", error)
    throw error
  }
}

// ProdukHewan actions
export async function getAllProdukHewan(): Promise<ProdukHewan[]> {
  try {
    return await prisma.produkHewan.findMany({
      orderBy: { nama: "asc" },
    })
  } catch (error) {
    console.error("Error fetching produk hewan:", error)
    throw new Error("Failed to fetch produk hewan")
  }
}

export async function addProdukHewan(data: {
  nama: string
  JenisHewan: JenisHewan
  berat?: number | null
  avgProdPerHewan?: number
  JenisProduk: JenisProduk
  targetPaket?: number
}) {
  try {
    const result = await prisma.produkHewan.create({
      data: {
        ...data,
        avgProdPerHewan: data.avgProdPerHewan || 1,
      },
    })
    revalidatePath("/dashboard/pengaturan")
    return { success: true, data: result }
  } catch (error) {
    console.error("Error adding produk hewan:", error)
    throw new Error("Failed to add produk hewan")
  }
}

export async function updateProdukHewan(
  id: number,
  data: {
    nama: string
    berat?: number | null
    avgProdPerHewan?: number
    target?: number
  },
) {
  try {
    const result = await prisma.produkHewan.update({
      where: { id },
      data,
    })
    revalidatePath("/dashboard/pengaturan")
    return { success: true, data: result }
  } catch (error) {
    console.error("Error updating produk hewan:", error)
    throw new Error("Failed to update produk hewan")
  }
}

export async function deleteProdukHewan(id: number) {
  try {
    // Check if there are any logs using this product
    const logsUsingProduct = await prisma.productLog.count({
      where: { produkId: id },
    })

    if (logsUsingProduct > 0) {
      throw new Error("Tidak dapat menghapus produk hewan yang memiliki riwayat log")
    }

    await prisma.produkHewan.delete({
      where: { id },
    })
    revalidatePath("/dashboard/pengaturan")
    return { success: true }
  } catch (error) {
    console.error("Error deleting produk hewan:", error)
    throw error
  }
}
