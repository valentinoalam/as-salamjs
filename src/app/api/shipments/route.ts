import { NextResponse } from "next/server"
import { createShipment, getPendingShipments, getAllShipments } from "#@/lib/server/repositories/qurban.ts"
import { authOptions } from "#@/lib/utils/auth.ts"
import { getServerSession } from "next-auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pending = searchParams.get("pending")

    if (pending === "true") {
      const pendingShipments = await getPendingShipments()
      return NextResponse.json(pendingShipments)
    } else {
      const shipments = await getAllShipments() // ← Tanpa pagination
      return NextResponse.json(shipments)
    }
  } catch (error) {
    console.error("Error fetching shipments:", error)
    return NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { products, catatan } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Invalid products data" }, { status: 400 })
    }

    const shipment = await createShipment(products, catatan)
    return NextResponse.json(shipment)
  } catch (error) {
    console.error("Error creating shipment:", error)
    return NextResponse.json({ error: "Failed to create shipment" }, { status: 500 })
  }
}
