import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { HewanStatus } from "@prisma/client"

// Define the sequence of statuses for progression
const statusProgression: HewanStatus[] = [
  HewanStatus.TERDAFTAR,
  HewanStatus.TIBA,
  HewanStatus.SEHAT,
  HewanStatus.DISEMBELIH,
  HewanStatus.DICACAH,
]

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session || !["ADMIN", "PANITIA_LAPANGAN"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: You don't have permission to perform this action" },
        { status: 401 },
      )
    }

    // Parse request body
    const body = await request.json()
    const { animalId, targetStatus } = body

    if (!animalId) {
      return NextResponse.json({ success: false, message: "Animal ID is required" }, { status: 400 })
    }

    // Find the animal by animalId
    const hewan = await prisma.hewanQurban.findFirst({
      where: { animalId },
    })

    if (!hewan) {
      return NextResponse.json({ success: false, message: "Hewan tidak ditemukan" }, { status: 404 })
    }

    // Determine the next status
    let nextStatus: HewanStatus

    if (targetStatus) {
      // If a specific target status is provided, use it
      if (!Object.values(HewanStatus).includes(targetStatus)) {
        return NextResponse.json({ success: false, message: "Status tidak valid" }, { status: 400 })
      }
      nextStatus = targetStatus
    } else {
      // Otherwise, progress to the next status in the sequence
      const currentIndex = statusProgression.indexOf(hewan.status)

      if (currentIndex === statusProgression.length - 1) {
        return NextResponse.json({ success: false, message: "Hewan sudah mencapai status akhir" }, { status: 400 })
      }

      nextStatus = statusProgression[currentIndex + 1]
    }

    // Prepare update data
    const updateData: any = { status: nextStatus }

    // Add additional data based on the next status
    if (nextStatus === HewanStatus.DISEMBELIH) {
      updateData.slaughteredAt = new Date()
      updateData.slaughteredBy = session.user.id
    } else if (nextStatus === HewanStatus.DICACAH) {
      updateData.processedAt = new Date()
      updateData.processedBy = session.user.id
      // Default package count if not provided
      updateData.meatPackageCount = body.meatPackageCount || 1
    }

    // Update the animal status
    const updatedHewan = await prisma.hewanQurban.update({
      where: { id: hewan.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: `Status hewan berhasil diperbarui ke ${nextStatus}`,
      data: {
        id: updatedHewan.id,
        animalId: updatedHewan.animalId,
        type: updatedHewan.type,
        status: updatedHewan.status,
        previousStatus: hewan.status,
      },
    })
  } catch (error) {
    console.error("Error updating animal status:", error)
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat memperbarui status hewan" },
      { status: 500 },
    )
  }
}
