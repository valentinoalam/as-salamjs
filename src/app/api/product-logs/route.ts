import { NextResponse } from "next/server"
import prisma from "#@/lib/server/prisma.ts"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const produkId = searchParams.get("produkId")
  const place = searchParams.get("place")
  const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit") as string) : 50

  try {
    const whereClause: any = {}

    if (produkId) {
      whereClause.produkId = Number.parseInt(produkId)
    }

    if (place) {
      whereClause.place = place
    }

    const logs = await prisma.productLog.findMany({
      where: whereClause,
      include: {
        produk: true,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Error fetching product logs:", error)
    return NextResponse.json({ error: "Failed to fetch product logs" }, { status: 500 })
  }
}
