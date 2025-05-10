import { NextResponse } from "next/server"
import { getProdukHewan } from "@/lib/db"

export async function GET() {
  try {
    const products = await getProdukHewan()
    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
