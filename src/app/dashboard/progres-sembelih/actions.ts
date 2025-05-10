"use server"

import { updateHewanStatus as dbUpdateHewanStatus, updateMudhohiReceived as dbUpdateMudhohiReceived } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { HewanStatus } from "@prisma/client"

export async function updateHewanStatus(animalId: number, status: HewanStatus, slaughtered: boolean) {
  try {
    await dbUpdateHewanStatus(animalId, status, slaughtered)
    revalidatePath("/progres-sembelih")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error updating hewan status:", error)
    return { success: false, error: "Failed to update status" }
  }
}

export async function updateMudhohiReceived(animalId: number, received: boolean) {
  try {
    await dbUpdateMudhohiReceived(animalId, received)
    revalidatePath("/progres-sembelih")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error updating mudhohi received status:", error)
    return { success: false, error: "Failed to update received status" }
  }
}
