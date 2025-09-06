/* eslint-disable @typescript-eslint/no-unused-vars */
"use server"

import { prisma } from "@/lib/server/prisma"
import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/email"
import { StatusKupon } from "#@/types/qurban.ts" // Import StatusKupon enum from your types file

// Generate random 6-digit code
function generateRedoCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Updates the status of a coupon.
 * @param kuponId The ID of the coupon to update.
 * @param targetStatus The new status to set for the coupon (e.g., RETURNED, AVAILABLE).
 */
export async function returnCoupon(kuponId: number, targetStatus: StatusKupon) {
  try {
    // Update the Kupon status directly
    await prisma.kupon.update({
      where: { id: kuponId },
      data: {
        status: targetStatus,
        returnedAt: new Date()
        // As per the requirement "coupon doesn't need to know who holding it, the page should just facilitate to track coupon returned no need to know who is the coupon holder",
        // we are NOT updating Penerima.sudahMenerima or Penerima.waktuTerima here.
        // If 'returnedAt' is needed on Kupon model, you would add it to the Kupon schema
        // and update it like: returnedAt: targetStatus === StatusKupon.RETURNED ? new Date() : null,
      },
    })

    revalidatePath("/counter-distribusi")
    return { success: true }
  } catch (error) {
    console.error("Error updating coupon status:", error)
    throw new Error("Failed to update coupon status")
  }
}

export async function distributeMeat(quantity: number) {
  try {
    // Get meat products and distribute proportionally
    const meatProducts = await prisma.produkHewan.findMany({
      where: {
        JenisProduk: "DAGING",
        diInventori: { gt: 0 },
      },
    })

    if (meatProducts.length === 0) {
      throw new Error("No meat products available")
    }

    // Simple distribution: divide equally among available products
    const quantityPerProduct = Math.floor(quantity / meatProducts.length)
    const remainder = quantity % meatProducts.length

    for (let i = 0; i < meatProducts.length; i++) {
      const product = meatProducts[i]
      const distributeAmount = quantityPerProduct + (i < remainder ? 1 : 0)

      if (distributeAmount > 0 && product.diInventori >= distributeAmount) {
        await prisma.produkHewan.update({
          where: { id: product.id },
          data: {
            diInventori: { decrement: distributeAmount },
            sdhDiserahkan: { increment: distributeAmount },
          },
        })
      }
    }

    revalidatePath("/counter-distribusi")
    return { success: true }
  } catch (error) {
    console.error("Error distributing meat:", error)
    throw new Error("Failed to distribute meat")
  }
}

export async function startEvent() {
  try {
    // Check if there's already an active event
    const existingEvent = await prisma.distributionEvent.findFirst({
      where: { isActive: true },
    })

    if (existingEvent) {
      throw new Error("An event is already active")
    }

    await prisma.distributionEvent.create({
      data: {
        isActive: true,
        startTime: new Date(),
      },
    })

    revalidatePath("/counter-distribusi")
    return { success: true }
  } catch (error) {
    console.error("Error starting event:", error)
    throw new Error("Failed to start event")
  }
}

export async function endEvent() {
  try {
    const activeEvent = await prisma.distributionEvent.findFirst({
      where: { isActive: true },
    })

    if (!activeEvent) {
      throw new Error("No active event found")
    }

    await prisma.distributionEvent.update({
      where: { id: activeEvent.id },
      data: {
        isActive: false,
        endTime: new Date(),
      },
    })

    revalidatePath("/counter-distribusi")
    return { success: true }
  } catch (error) {
    console.error("Error ending event:", error)
    throw new Error("Failed to end event")
  }
}

export async function getEventStatus() {
  try {
    const activeEvent = await prisma.distributionEvent.findFirst({
      where: { isActive: true },
    })

    // Count coupons with status RETURNED
    const totalCouponsReturned = await prisma.kupon.count({
      where: { status: StatusKupon.RETURNED },
    })

    const totalMeatDistributed = await prisma.produkHewan.aggregate({
      where: { JenisProduk: "DAGING" },
      _sum: { sdhDiserahkan: true },
    })

    return {
      isActive: !!activeEvent,
      startTime: activeEvent?.startTime || null,
      endTime: activeEvent?.endTime || null,
      totalCouponsReturned,
      totalMeatDistributed: totalMeatDistributed._sum.sdhDiserahkan || 0,
    }
  } catch (error) {
    console.error("Error getting event status:", error)
    return {
      isActive: false,
      startTime: null,
      endTime: null,
      totalCouponsReturned: 0,
      totalMeatDistributed: 0,
    }
  }
}

/**
 * Requests a redo code for a specific coupon.
 * @param kuponId The ID of the coupon for which the redo code is requested.
 */
export async function requestRedoCode(kuponId: number) {
  try {
    const code = generateRedoCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store the redo request, linked to Kupon
    const redoRequest = await prisma.redoRequest.create({
      data: {
        kuponId,
        code,
        expiresAt,
      },
    })

    // Count existing redo requests for this coupon
    const redoCount = await prisma.redoRequest.count({
      where: { kuponId },
    })

    // Send email with code (implement your email service)
    await sendEmail({
      to: process.env.ADMIN_EMAIL || "admin@example.com",
      subject: "Kode Verifikasi Redo - Counter Distribusi",
      text: `Kode verifikasi untuk redo: ${code}\nBerlaku selama 10 menit.\nJumlah redo: ${redoCount}`,
    })

    return { success: true, redoCount }
  } catch (error) {
    console.error("Error requesting redo code:", error)
    throw new Error("Failed to request redo code")
  }
}

/**
 * Verifies a redo code for a specific coupon.
 * @param kuponId The ID of the coupon for which the redo code is being verified.
 * @param code The redo code to verify.
 */
export async function verifyRedoCode(kuponId: number, code: string) {
  try {
    const redoRequest = await prisma.redoRequest.findFirst({
      where: {
        kuponId,
        code,
        expiresAt: { gt: new Date() },
        isUsed: false,
      },
    })

    if (!redoRequest) {
      return false
    }

    // Mark as used
    await prisma.redoRequest.update({
      where: { id: redoRequest.id },
      data: { isUsed: true },
    })

    return true
  } catch (error) {
    console.error("Error verifying redo code:", error)
    return false
  }
}