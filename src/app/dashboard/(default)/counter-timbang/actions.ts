"use server"

import { addProductLog as dbAddProductLog, createShipment as dbCreateShipment } from "@/services/qurban"
import { revalidatePath } from "next/cache"
import type { Counter } from "@prisma/client"

export async function addProductLog(produkId: number, event: "menambahkan" | "memindahkan" | "mengkoreksi", place: Counter, value: number, note: string) {
  try {
    await dbAddProductLog(produkId, event, place, value, note)
    revalidatePath("/counter-timbang")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error adding product log:", error)
    return { success: false, error: "Failed to update product" }
  }
}

export async function createShipment(products: { produkId: number; jumlah: number }[], catatan?: string) {
  try {
    await dbCreateShipment(products, catatan)
    revalidatePath("/counter-timbang")
    revalidatePath("/counter-inventori")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error creating shipment:", error)
    return { success: false, error: "Failed to create shipment" }
  }
}