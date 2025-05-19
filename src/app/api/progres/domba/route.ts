import { NextResponse } from "next/server"
import { getProgresDomba } from "@/lib/db"

export async function GET() {
  try {
    const data = await getProgresDomba()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching progres domba:", error)
    return NextResponse.json({ error: "Failed to fetch progres domba" }, { status: 500 })
  }
}
