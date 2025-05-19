"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { type CaraBayar, PaymentStatus } from "@prisma/client"
import { randomUUID } from "crypto"
import { generateHewanId } from "@/lib/hewan"

export async function getTipeHewan() {
  return await prisma.tipeHewan.findMany({
    orderBy: { id: "asc" },
  })
}

export async function createPemesanan(data: {
  nama_pengqurban: string
  nama_peruntukan: string
  pesan_khusus: string
  keterangan: string
  potong_sendiri: boolean
  mengambilDaging: boolean
  tipeHewanId: number
  cara_bayar: CaraBayar
  email: string
  phone: string
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
        paymentStatus: PaymentStatus.BELUM_BAYAR,
        dibayarkan: 0, // Will be updated after payment
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
        // Create a new hewan
        hewan = await prisma.hewanQurban.create({
          data: {
            tipeId: data.tipeHewanId,
            hewanId: await generateHewanId(1),
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

    revalidatePath("/pemesanan")
    return { success: true, mudhohiId: mudhohi.id }
  } catch (error) {
    console.error("Error creating pemesanan:", error)
    return { success: false, error: "Gagal membuat pemesanan" }
  }
}
