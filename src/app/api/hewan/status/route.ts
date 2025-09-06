import { NextResponse } from "next/server"
import { updateHewanStatus } from "#@/lib/server/repositories/qurban.ts"

export async function POST(req: Request) {
  try {
    const { hewanId, status, slaughtered } = await req.json()

    if (!hewanId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await updateHewanStatus(hewanId, status, slaughtered)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating hewan status:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
