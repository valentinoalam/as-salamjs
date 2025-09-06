import { type NextRequest, NextResponse } from "next/server"
import { getPenerima, createPenerima } from "#@/lib/server/repositories/qurban.ts"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const distribusiId = searchParams.get("distribusiId")
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")

  try {
    const penerima = await getPenerima(distribusiId || undefined, {page, pageSize})
    const total = penerima.length

    return NextResponse.json({
      data: penerima,
      pagination: {
        currentPage: page,
        total,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("GET /api/log-distribusi error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const penerima = await createPenerima(data)

    return NextResponse.json(penerima, { status: 201 });
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to create recipient" },
      { status: 500 }
    );
  }
}