import { NextResponse } from "next/server"
import { createShipment, getPendingShipments, getAllShipments, countShipments } from "@/services/qurban"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pending = searchParams.get("pending")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")

    if (pending === "true") {
      const pendingShipments = await getPendingShipments()
      return NextResponse.json(pendingShipments)
    } else {
      const [shipments, total] = await Promise.all([getAllShipments(page, pageSize), countShipments()])

      return NextResponse.json({
        shipments,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      })
    }
  } catch (error) {
    console.error("Error fetching shipments:", error)
    return NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
