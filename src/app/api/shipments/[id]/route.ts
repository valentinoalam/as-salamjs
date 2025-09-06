import { NextResponse } from "next/server"
import { receiveShipment } from "#@/lib/server/repositories/qurban.ts"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params 
  try {

    const shipmentId = Number.parseInt(id)
    if (isNaN(shipmentId)) {
      return NextResponse.json({ error: "Invalid shipment ID" }, { status: 400 })
    }

    const products = await request.json()
    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: "Invalid products data" }, { status: 400 })
    }

    const result = await receiveShipment(shipmentId, products)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error receiving shipment:", error)
    return NextResponse.json({ error: "Failed to receive shipment" }, { status: 500 })
  }
}
