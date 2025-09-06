import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "#@/lib/server/prisma.ts"

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: { key: "asc" },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value } = await request.json()

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 })
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error("Error updating setting:", error)
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 })
  }
}
