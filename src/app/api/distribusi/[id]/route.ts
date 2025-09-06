import { NextResponse } from "next/server"
import { prisma } from "#@/lib/server/prisma.ts"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { target } = await request.json()
    const { id } = await params

    if (!target || target <= 0) {
      return NextResponse.json({ error: "Target harus lebih dari 0" }, { status: 400 })
    }

    const updatedDistribusi = await prisma.distribusi.update({
      where: { id },
      data: {
        target,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updatedDistribusi)
  } catch (error) {
    console.error("Error updating distribusi:", error)
    return NextResponse.json({ error: "Gagal memperbarui distribusi" }, { status: 500 })
  }
}
