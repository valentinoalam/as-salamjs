import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "#@/lib/server/prisma.ts"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const relatedId = searchParams.get("relatedId")
    const relatedType = searchParams.get("relatedType")

    if (!relatedId || !relatedType) {
      return NextResponse.json({ error: "relatedId and relatedType are required" }, { status: 400 })
    }

    const images = await prisma.image.findMany({
      where: {
        relatedId,
        relatedType,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ images })
  } catch (error) {
    console.error("Error fetching images:", error)
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get("id")

    if (!imageId) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 })
    }

    await prisma.image.delete({
      where: { id: imageId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting image:", error)
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 })
  }
}
