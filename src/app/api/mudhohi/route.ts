import { type NextRequest, NextResponse } from "next/server"
import { getMudhohi, countMudhohi } from "@/services/mudhohi"
import { createMudhohi } from "@/services/mudhohi"
import { revalidatePath } from "next/cache"
import type { PaymentStatus } from "@prisma/client"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")
  const status = searchParams.get('status') as PaymentStatus | null
  const searchTerm = searchParams.get('search') || undefined

  try {
    const data = await getMudhohi(page, pageSize, status || undefined, searchTerm || undefined)
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

