import { NextResponse } from "next/server"
import { updateCategory, deleteCategory } from "#@/lib/server/repositories/keuangan.ts"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()
    const {id} = await params
    const result = await updateCategory(Number.parseInt(id), data)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const {id} = await params
    const result = await deleteCategory(Number.parseInt(id))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
