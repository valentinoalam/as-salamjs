import { NextResponse } from "next/server"
import { getTimbang } from "@/lib/db"

export async function GET() {
  try {
    const data = await getTimbang()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching hasil timbang:", error)
    return NextResponse.json({ error: "Failed to fetch hasil timbang" }, { status: 500 })
  }
}
