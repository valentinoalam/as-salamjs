import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "#@/lib/server/prisma.ts"

export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json()

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Settings object is required" }, { status: 400 })
    }

    // Use transaction for bulk update
    const results = await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        }),
      ),
    )

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error bulk updating settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
