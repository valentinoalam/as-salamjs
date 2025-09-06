import { NextResponse } from "next/server"
import { getQurbanSalesStats } from "#@/lib/server/repositories/keuangan.ts"

export async function GET() {
  try {
    const salesStats = await getQurbanSalesStats()
    return NextResponse.json(salesStats)
  } catch (error) {
    console.error("Error fetching qurban sales stats:", error)
    return NextResponse.json({ error: "Failed to fetch qurban sales stats" }, { status: 500 })
  }
}
