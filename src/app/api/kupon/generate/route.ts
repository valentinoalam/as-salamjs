import { NextResponse } from "next/server"
import { prisma } from "#@/lib/server/prisma.ts"

export async function POST(request: Request) {
  try {
    const { totalKupon, kuponPerMudhohi } = await request.json()

    if (!totalKupon || totalKupon <= 0) {
      return NextResponse.json({ error: "Total kupon harus lebih dari 0" }, { status: 400 })
    }

    // Generate coupons
    const coupons = []
    for (let i = 1; i <= totalKupon; i++) {
      coupons.push({
        kuponId: `KPN-${String(i).padStart(4, "0")}`,
        status: "DISIMPAN" as const,
      })
    }

    // Create coupons in database
    await prisma.kupon.createMany({
      data: coupons,
      skipDuplicates: true,
    })

    return NextResponse.json({
      success: true,
      message: `${totalKupon} kupon berhasil dibuat`,
      kuponPerMudhohi,
    })
  } catch (error) {
    console.error("Error generating coupons:", error)
    return NextResponse.json({ error: "Gagal membuat kupon" }, { status: 500 })
  }
}
