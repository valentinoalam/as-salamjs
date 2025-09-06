import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"

export async function GET() {
  try {
    const addresses = await prisma.address.findMany({
      where: { isActive: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error("Error fetching addresses:", error)
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      street,
      city,
      province,
      postalCode,
      country = "Indonesia",
      latitude,
      longitude,
      phone,
      email,
      isPrimary = false,
    } = body

    // If this is set as primary, unset other primary addresses
    if (isPrimary) {
      await prisma.address.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const address = await prisma.address.create({
      data: {
        name,
        street,
        city,
        province,
        postalCode,
        country,
        latitude: latitude ? Number.parseFloat(latitude) : null,
        longitude: longitude ? Number.parseFloat(longitude) : null,
        phone,
        email,
        isPrimary,
      },
    })

    return NextResponse.json({ address }, { status: 201 })
  } catch (error) {
    console.error("Error creating address:", error)
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 })
  }
}
