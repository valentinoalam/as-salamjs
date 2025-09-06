import { NextResponse } from "next/server"
import { getTransactionStats } from "#@/lib/server/repositories/keuangan.ts"

export async function GET() {
  try {
    const stats = await getTransactionStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching transaction stats:", error)
    return NextResponse.json({ error: "Failed to fetch transaction stats" }, { status: 500 })
  }
}
