import { NextResponse } from "next/server"
import { getDistribution } from "@/lib/db"

export async function GET() {
  try {
    const data = await getDistribution()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching distributions:", error)
    return NextResponse.json({ error: "Failed to fetch distributions" }, { status: 500 })
  }
}
