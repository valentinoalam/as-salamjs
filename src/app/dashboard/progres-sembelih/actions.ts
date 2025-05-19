"use server"

import { updateHewanStatus as dbUpdateHewanStatus, updateMudhohiReceived as dbUpdateMudhohiReceived } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { HewanStatus } from "@prisma/client"

export async function updateHewanStatus(hewanId: string, status: HewanStatus, slaughtered: boolean) {
  try {
    await dbUpdateHewanStatus(hewanId, status, slaughtered)
    revalidatePath("/dashboard/progres-sembelih")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error updating hewan status:", error)
    return { success: false, error: "Failed to update status" }
  }
}

export async function updateMudhohiReceived(hewanId: string, received: boolean) {
  try {
    await dbUpdateMudhohiReceived(hewanId, received)
    revalidatePath("/dashboard/progres-sembelih")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error updating mudhohi received status:", error)
    return { success: false, error: "Failed to update received status" }
  }
}
