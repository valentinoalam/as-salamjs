"use server"

import {
  addProductLog as dbAddProductLog,
  createDistribusi as dbCreateDistribusi,
  updateMudhohiReceived as dbUpdateMudhohiReceived,
  updateErrorLogNote as dbUpdateErrorLogNote,
} from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { Counter } from "@prisma/client"

export async function addProductLog(produkId: number, event: string, place: Counter, value: number, note: string) {
  try {
    await dbAddProductLog(produkId, event, place, value, note)
    revalidatePath("/counter-inventori")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error adding product log:", error)
    return { success: false, error: "Failed to update product" }
  }
}

export async function createDistribusi(penerimaId: string, produkIds: number[], numberOfPackages: number) {
  try {
    await dbCreateDistribusi(penerimaId, produkIds, numberOfPackages)
    revalidatePath("/counter-inventori")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error creating distribusi:", error)
    return { success: false, error: "Failed to create distribusi" }
  }
}

export async function updateMudhohiReceived(animalId: string, received: boolean) {
  try {
    await dbUpdateMudhohiReceived(animalId, received)
    revalidatePath("/counter-inventori")
    revalidatePath("/progres-sembelih")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error updating mudhohi received status:", error)
    return { success: false, error: "Failed to update received status" }
  }
}

export async function updateErrorLogNote(id: number, note: string) {
  try {
    await dbUpdateErrorLogNote(id, note)
    revalidatePath("/counter-inventori")
    return { success: true }
  } catch (error) {
    console.error("Error updating error log note:", error)
    return { success: false, error: "Failed to update note" }
  }
}
