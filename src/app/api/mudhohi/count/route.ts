import { NextResponse } from "next/server"
import { countMudhohi } from "#@/lib/server/repositories/mudhohi.ts"

export async function GET() {
  try {
    const count = await countMudhohi()
    return NextResponse.json({ count })
  } catch (error) {
    console.error("Error counting mudhohi:", error)
    return NextResponse.json({ error: "Failed to count mudhohi" }, { status: 500 })
  }
}
