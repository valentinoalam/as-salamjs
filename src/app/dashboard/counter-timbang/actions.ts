"use server"

import { addProductLog as dbAddProductLog } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { Counter } from "@prisma/client"

export async function addProductLog(produkId: number, event: string, place: Counter, value: number, note: string) {
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
