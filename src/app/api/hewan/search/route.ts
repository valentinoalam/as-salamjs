import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session || !["ADMIN", "PANITIA_LAPANGAN"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: You don't have permission to perform this action" },
        { status: 401 },
      )
    }

    // Get search term from query parameters
    const searchParams = request.nextUrl.searchParams
    const term = searchParams.get("term")

    if (!term) {
      return NextResponse.json({ success: false, message: "Search term is required" }, { status: 400 })
    }

    // Search for animals by animalId or type
    const animals = await prisma.hewanQurban.findMany({
      where: {
        OR: [{ animalId: { contains: term, mode: "insensitive" } }, { type: { contains: term, mode: "insensitive" } }],
      },
      select: {
        id: true,
        animalId: true,
        type: true,
        status: true,
      },
      orderBy: {
        animalId: "asc",
      },
      take: 20, // Limit results
    })

    return NextResponse.json({
      success: true,
      data: animals,
    })
  } catch (error) {
    console.error("Error searching for animals:", error)
    return NextResponse.json({ success: false, message: "Terjadi kesalahan saat mencari hewan" }, { status: 500 })
  }
}
