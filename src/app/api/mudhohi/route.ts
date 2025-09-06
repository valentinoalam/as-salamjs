import { type NextRequest, NextResponse } from "next/server"
import { getMudhohi, countMudhohi } from "#@/lib/server/repositories/mudhohi.ts"
import { createMudhohi } from "#@/lib/server/repositories/createMudhohi.ts"
import { revalidatePath } from "next/cache"
import type { PaymentStatus } from "@prisma/client"
import { getCurrentUser } from "#@/lib/utils/auth.ts"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    // const { searchParams } = new URL(request.url) 
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")
    const status = searchParams.get('status') as PaymentStatus | null
    const searchTerm = searchParams.get('search') || undefined

    const [mudhohi, total] = await Promise.all([
      getMudhohi(page, pageSize, status || undefined, searchTerm || undefined),
      countMudhohi(),
    ])
    // return NextResponse.json(data, {
    //   headers: {
    //     "X-Total-Count": total.toString(),
    //     "X-Total-Pages": Math.ceil(total / pageSize).toString(),
    //   },
    // })
    return NextResponse.json({
      data: mudhohi,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / pageSize),
        pageSize,
        total,
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching mudhohi:", error)
    return NextResponse.json({ error: "Failed to fetch mudhohi data" }, { status: 500 })
  }
}


export async function POST(request: Request) {
  try {
    const data = await request.json()
    const user = await getCurrentUser()
    const userId = user?.id
    // if (!userId) {
    //   return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    // }

    if (!data || !data.nama_pengqurban) {
      return NextResponse.json({ error: "Nama pengqurban is required" }, { status: 400 })
    }

    // Create records in database with transaction
    const result = await createMudhohi({ userId, ...data })
    revalidatePath("/dashboard/mudhohi")
    return NextResponse.json({
      success: result.success,
      message: "Data saved successfully",
      data: result.data,
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error saving mudhohi data:", error)
    return NextResponse.json({ error: error.message || "Failed to save data" }, { status: 500 })
  }
}

