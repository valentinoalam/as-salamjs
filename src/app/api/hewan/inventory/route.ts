import { NextResponse } from "next/server"
import { updateHewanInventoryStatus } from "#@/lib/server/repositories/qurban.ts"

export async function POST(req: Request) {
  try {
    const { hewanId, onInventory } = await req.json()

    if (!hewanId || onInventory === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await updateHewanInventoryStatus(hewanId, onInventory)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating inventory status:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
