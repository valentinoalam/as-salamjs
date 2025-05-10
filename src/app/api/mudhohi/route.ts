import { type NextRequest, NextResponse } from "next/server"
import { getMudhohi, countMudhohi } from "@/lib/db"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")

  try {
    const data = await getMudhohi(page, pageSize)
    const total = await countMudhohi()

    return NextResponse.json(data, {
      headers: {
        "X-Total-Count": total.toString(),
        "X-Total-Pages": Math.ceil(total / pageSize).toString(),
      },
    })
  } catch (error) {
    console.error("Error fetching mudhohi data:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
