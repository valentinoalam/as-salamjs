import { NextResponse } from "next/server"
import { getWeeklyAnimalSales } from "@/services/keuangan"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") ? Number.parseInt(searchParams.get("year")!) : undefined
    const month = searchParams.get("month") ? Number.parseInt(searchParams.get("month")!) : undefined

    const weeklyData = await getWeeklyAnimalSales(year, month)
    return NextResponse.json(weeklyData)
  } catch (error) {
    console.error("Error fetching weekly sales data:", error)
    return NextResponse.json({ error: "Failed to fetch weekly sales data" }, { status: 500 })
  }
}
