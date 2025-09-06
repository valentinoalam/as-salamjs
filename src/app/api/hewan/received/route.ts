import { NextResponse } from "next/server"
import { updateMudhohiReceived } from "#@/lib/server/repositories/qurban.ts"

export async function POST(req: Request) {
  try {
    const { hewanId, received } = await req.json()

    if (!hewanId || received === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await updateMudhohiReceived(hewanId, received)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating received status:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
