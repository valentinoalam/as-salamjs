import { NextResponse } from "next/server"
import { getInventory } from "@/lib/db"

export async function GET() {
  try {
    const data = await getInventory()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}
