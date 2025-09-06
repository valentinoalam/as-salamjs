import { type NextRequest, NextResponse } from "next/server"
import { getProdukHewan, addProductLog } from "#@/lib/server/repositories/qurban.ts"
import type { JenisProduk } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const jenis = searchParams.get("jenis") as JenisProduk | null

    const data = await getProdukHewan(jenis || undefined)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { produkId, event, place, value, note } = await req.json()

    if (!produkId || !event) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await addProductLog(produkId, event, place, value, note)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating hewan status:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
