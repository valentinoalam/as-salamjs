import { type NextRequest, NextResponse } from "next/server"
import { getHewanQurban } from "#@/lib/server/repositories/qurban.ts"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const typeParam = searchParams.get("type") || "sapi"
  const type = (typeParam.toLowerCase() as "sapi" | "domba")
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")
  // Parse group parameters
  const group = searchParams.get("group")
  const itemsPerGroup = Number(searchParams.get("itemsPerGroup")) || 50

  if (!type || (type !== "sapi" && type !== "domba")) {
    return NextResponse.json({ error: "Invalid type parameter. Must be 'sapi' or 'domba'." }, { status: 400 })
  }
  try {
    const data = group? 
    await getHewanQurban(type, page, pageSize, group, itemsPerGroup) 
    : await getHewanQurban(type, page, pageSize)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching hewan data:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
