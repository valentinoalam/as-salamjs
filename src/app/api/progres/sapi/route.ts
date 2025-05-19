import { NextResponse } from "next/server"
import { getProgresSapi } from "@/lib/db"

export async function GET() {
  try {
    const data = await getProgresSapi()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching progres sapi:", error)
    return NextResponse.json({ error: "Failed to fetch progres sapi" }, { status: 500 })
  }
}
