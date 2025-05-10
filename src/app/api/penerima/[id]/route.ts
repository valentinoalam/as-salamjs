import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
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
