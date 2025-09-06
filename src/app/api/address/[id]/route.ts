import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, street, city, province, postalCode, country, latitude, longitude, phone, email, isPrimary } = body

    // If this is set as primary, unset other primary addresses
    if (isPrimary) {
      await prisma.address.updateMany({
        where: {
          isPrimary: true,
          id: { not: params.id },
        },
        data: { isPrimary: false },
      })
    }

    const address = await prisma.address.update({
      where: { id: params.id },
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

    return NextResponse.json({ address })
  } catch (error) {
    console.error("Error updating address:", error)
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.address.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting address:", error)
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 })
  }
}
