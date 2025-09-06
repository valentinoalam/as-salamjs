import { NextResponse } from "next/server"
import prisma from "#@/lib/server/prisma.ts"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = await params.id
    const body = await request.json()

    const updatedPenerima = await prisma.penerima.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(updatedPenerima)
  } catch (error) {
    console.error("Error updating penerima:", error)
    return NextResponse.json({ error: "Failed to update penerima" }, { status: 500 })
  }
}
