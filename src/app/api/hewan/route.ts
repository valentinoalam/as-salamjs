import { type NextRequest, NextResponse } from "next/server"
import { getHewanQurban } from "@/lib/db"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = (searchParams.get("type") as "sapi" | "kambing") || "sapi"
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")

  try {
    const data = await getHewanQurban(type, page, pageSize)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching hewan data:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
