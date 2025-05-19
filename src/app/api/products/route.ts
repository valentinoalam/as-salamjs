import { type NextRequest, NextResponse } from "next/server"
import { getProdukHewan } from "@/lib/db"
import type { jenisProduk } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const jenis = searchParams.get("jenis") as jenisProduk | null

    const data = await getProdukHewan(jenis || undefined)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
