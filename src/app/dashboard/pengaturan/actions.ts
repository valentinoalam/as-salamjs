"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import type { JenisHewan, JenisProduk } from "@prisma/client"

// TipeHewan actions
export async function getAllTipeHewan() {
  try {
    return await prisma.tipeHewan.findMany({
      orderBy: { nama: "asc" },
    })
  } catch (error) {
    console.error("Error fetching tipe hewan:", error)
    throw new Error("Failed to fetch tipe hewan")
  }
}

export async function addTipeHewan(data: {
  nama: string
  icon?: string
  target: number
  harga: number
  hargaKolektif?: number
  note: string
  jenis: JenisHewan
}) {
  try {
    const result = await prisma.tipeHewan.create({
      data: {
        ...data,
        target: Number(data.target),
        harga: Number(data.harga),
        hargaKolektif: Number(data.hargaKolektif),
      },
    })
    revalidatePath("/dashboard/pengaturan")
    return { success: true, data: result }
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
  },
) {
  try {
    // Convert string numbers to actual numbers
    const processedData = {
      ...data,
      target: data.target !== undefined ? Number(data.target) : undefined,
      harga: data.harga !== undefined ? Number(data.harga) : undefined,
      hargaKolektif: data.hargaKolektif !== undefined ? Number(data.hargaKolektif) : undefined,
    }

    const result = await prisma.tipeHewan.update({
      where: { id },
      data: processedData,
    })
    revalidatePath("/dashboard/pengaturan")
    return { success: true, data: result }
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

    // Check if there are any products using this type
    const productsUsingType = await prisma.produkHewan.count({
      where: { tipeId: id },
    })

    if (productsUsingType > 0) {
      throw new Error("Tidak dapat menghapus tipe hewan yang sedang digunakan oleh produk")
    }

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
export async function getAllProdukHewan() {
  try {
    return await prisma.produkHewan.findMany({
      include: {
        tipe_hewan: true,
      },
      orderBy: { nama: "asc" },
    })
  } catch (error) {
    console.error("Error fetching produk hewan:", error)
    throw new Error("Failed to fetch produk hewan")
  }
}

export async function addProdukHewan(data: {
  nama: string
  tipeId: number
  berat?: number | null
  avgProdPerHewan?: number
  JenisProduk: JenisProduk
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
    tipeId?: number | null
    berat?: number | null
    avgProdPerHewan?: number
    JenisProduk?: JenisProduk
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
