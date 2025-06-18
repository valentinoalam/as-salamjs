"use server"

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { HewanStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

/**
 * Updates the status of a HewanQurban to DISEMBELIH
 */
export async function markAsSembelih(hewanId: string) {
  const session = await auth()

  // Check authorization
  if (!session || !["ADMIN", "PANITIA_LAPANGAN"].includes(session.user.role)) {
    throw new Error("Unauthorized: You don't have permission to perform this action")
  }

  try {
    // Update the hewan status
    await prisma.hewanQurban.update({
      where: { id: hewanId },
      data: {
        status: HewanStatus.DISEMBELIH,
        slaughteredAt: new Date(),
        slaughteredBy: session.user.id,
      },
    })

    // Revalidate the page to refresh data
    revalidatePath("/dashboard/proses")

    return { success: true }
  } catch (error) {
    console.error("Error marking animal as slaughtered:", error)
    throw new Error("Failed to update animal status")
  }
}

/**
 * Updates the status of a HewanQurban to DICACAH
 */
export async function markAsCacah(hewanId: string, meatPackageCount?: number) {
  const session = await auth()

  // Check authorization
  if (!session || !["ADMIN", "PANITIA_LAPANGAN"].includes(session.user.role)) {
    throw new Error("Unauthorized: You don't have permission to perform this action")
  }

  try {
    // Update the hewan status
    await prisma.hewanQurban.update({
      where: { id: hewanId },
      data: {
        status: HewanStatus.DICACAH,
        processedAt: new Date(),
        processedBy: session.user.id,
        meatPackageCount: meatPackageCount || null,
      },
    })

    // Revalidate the page to refresh data
    revalidatePath("/dashboard/proses")

    return { success: true }
  } catch (error) {
    console.error("Error marking animal as processed:", error)
    throw new Error("Failed to update animal status")
  }
}
