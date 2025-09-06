import { NextRequest, NextResponse } from "next/server"
import { getAnimalSalesByDateRange } from "#@/lib/server/repositories/keuangan.ts"
import moment from "moment-hijri"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") ? Number.parseInt(searchParams.get("year")!) : undefined

    const date = moment(year).iYear(); // Get current Hijri year
    const hijriDate = moment(`${date}-12-10`, 'iYYYY-iMM-iDD');
    const dzulhijjah10 = hijriDate.toDate();

    const startAt = moment(dzulhijjah10).subtract(30, 'days').toDate();
    const weeklyData = await getAnimalSalesByDateRange(startAt, dzulhijjah10)

    return NextResponse.json(weeklyData)
  } catch (error) {
    console.error("Error fetching weekly sales data:", error)
    return NextResponse.json({ error: "Failed to fetch weekly sales data" }, { status: 500 })
  }
}
