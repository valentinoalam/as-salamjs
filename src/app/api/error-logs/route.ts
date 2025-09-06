import { NextResponse } from "next/server"
import { getErrorLogs } from "#@/lib/server/repositories/qurban.ts"

export async function GET() {
  try {
    const errorLogs = await getErrorLogs()
    return NextResponse.json(errorLogs)
  } catch (error) {
    console.error("Error fetching error logs:", error)
    return NextResponse.json({ error: "Failed to fetch error logs" }, { status: 500 })
  }
}
