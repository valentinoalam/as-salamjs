"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PaymentStatus, type CaraBayar } from "@prisma/client"
import { randomUUID } from "crypto"
import { generateHewanId } from "@/services/qurban"

export async function getMudhohiStats() {
  const totalMudhohi = await prisma.mudhohi.count()
  const totalHewan = await prisma.hewanQurban.count({
    where: {
      mudhohi: {
        some: {},
      },
    },
  })

  // Count by payment status
  const belumBayar = await prisma.pembayaran.count({
    where: { paymentStatus: PaymentStatus.BELUM_BAYAR },
  })
  const menungguKonfirmasi = await prisma.pembayaran.count({
    where: { paymentStatus: PaymentStatus.MENUNGGU_KONFIRMASI },
  })
  const lunas = await prisma.pembayaran.count({
    where: { paymentStatus: PaymentStatus.LUNAS },
  })
  const batal = await prisma.pembayaran.count({
    where: { paymentStatus: PaymentStatus.BATAL },
  })

  return {
    totalMudhohi,
    totalHewan,
    statusCounts: {
      BELUM_BAYAR: belumBayar,
      MENUNGGU_KONFIRMASI: menungguKonfirmasi,
      LUNAS: lunas,
      BATAL: batal,
    },
  }
}

export async function getMudhohiList(status?: PaymentStatus, searchTerm?: string) {
  const where: any = {}

  if (status) {
    where.payment = {
      paymentStatus: status,
    }
  }

  if (searchTerm) {
    where.OR = [
      { nama_pengqurban: { contains: searchTerm } },
      { nama_peruntukan: { contains: searchTerm } },
      { dash_code: { contains: searchTerm } },
      { user: { email: { contains: searchTerm } } },
    ]
  }

  return await prisma.mudhohi.findMany({
    where,
    include: {
      payment: true,
      hewan: {
        include: {
          tipe: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function updatePaymentStatus(
  mudhohiId: string,
  status: PaymentStatus,
  amount?: number,
  kodeResi?: string,
) {
  try {
    // Check if payment exists
    const payment = await prisma.pembayaran.findUnique({
      where: { mudhohiId },
    })

    if (!payment) {
      return { success: false, error: "Payment not found" }
    }

    // Update payment status
    await prisma.pembayaran.update({
      where: { mudhohiId },
      data: {
        paymentStatus: status,
        dibayarkan: amount !== undefined ? amount : payment.dibayarkan,
        kodeResi: kodeResi !== undefined ? kodeResi : payment.kodeResi,
      },
    })

    revalidatePath("/dashboard/mudhohi")
    return { success: true }
  } catch (error) {
    console.error("Error updating payment status:", error)
    return { success: false, error: "Failed to update payment status" }
  }
}

export async function createMudhohi(data: {
  nama_pengqurban: string
  nama_peruntukan: string
  email: string
  phone: string
  pesan_khusus: string
  keterangan: string
  potong_sendiri: boolean
  mengambilDaging: boolean
  tipeHewanId: number
  cara_bayar: CaraBayar
  paymentStatus: PaymentStatus
  dibayarkan: number
  kodeResi?: string
}) {
  try {
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.nama_pengqurban,
        },
      })
    }

    // Get tipe hewan
    const tipeHewan = await prisma.tipeHewan.findUnique({
      where: { id: data.tipeHewanId },
    })

    if (!tipeHewan) {
      return { success: false, error: "Tipe hewan tidak ditemukan" }
    }

    // Generate dash code
    const dashCode = `QRB-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`

    // Create mudhohi
    const mudhohi = await prisma.mudhohi.create({
      data: {
        userId: user.id,
        paymentId: randomUUID(),
        nama_pengqurban: data.nama_pengqurban,
        nama_peruntukan: data.nama_peruntukan || undefined,
        pesan_khusus: data.pesan_khusus || undefined,
        keterangan: data.keterangan || undefined,
        potong_sendiri: data.potong_sendiri,
        mengambilDaging: data.mengambilDaging,
        ambil_daging: data.mengambilDaging, // For backward compatibility
        dash_code: dashCode,
      },
    })

    // Create pembayaran
    const pembayaran = await prisma.pembayaran.create({
      data: {
        mudhohiId: mudhohi.id,
        cara_bayar: data.cara_bayar,
        paymentStatus: data.paymentStatus,
        dibayarkan: data.dibayarkan,
        kodeResi: data.kodeResi || undefined,
      },
    })

    // Find available hewan or create new one
    let hewan
    const isKolektif = tipeHewan.nama === "Sapi Kolektif"

    if (isKolektif) {
      // For kolektif, find a sapi with available slots or create a new one
      hewan = await prisma.hewanQurban.findFirst({
        where: {
          tipeId: 1, // Sapi
          isKolektif: true,
          slotTersisa: { gt: 0 },
        },
      })

      if (!hewan) {
        // Create a new kolektif sapi with 7 slots
        hewan = await prisma.hewanQurban.create({
          data: {
            tipeId: 1, // Sapi
            hewanId: await generateHewanId(1),
            isKolektif: true,
            slotTersisa: 6, // 7 total, using 1 now
          },
        })
      } else {
        // Update available slots
        await prisma.hewanQurban.update({
          where: { id: hewan.id },
          data: {
            slotTersisa: { decrement: 1 },
          },
        })
      }
    } else {
      // For individual, find an available hewan of the selected type
      hewan = await prisma.hewanQurban.findFirst({
        where: {
          tipeId: data.tipeHewanId,
          isKolektif: false,
          mudhohi: { none: {} }, // No mudhohi assigned yet
        },
      })

      if (!hewan) {
        const tipeId = data.tipeHewanId
        // Create a new hewan
        hewan = await prisma.hewanQurban.create({
          data: {
            tipeId,
            hewanId: await generateHewanId(tipeId),
            isKolektif: false,
          },
        })
      }
    }

    // Connect hewan to mudhohi
    await prisma.mudhohi.update({
      where: { id: mudhohi.id },
      data: {
        hewan: {
          connect: { id: hewan.id },
        },
      },
    })

    revalidatePath("/dashboard/mudhohi")
    return { success: true, mudhohiId: mudhohi.id }
  } catch (error) {
    console.error("Error creating mudhohi:", error)
    return { success: false, error: "Failed to create mudhohi" }
  }
}
