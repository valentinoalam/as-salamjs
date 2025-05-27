import { NextResponse } from "next/server"
import { updateCategory, deleteCategory } from "@/services/keuangan"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()
    const result = await updateCategory(Number.parseInt(params.id), data)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await deleteCategory(Number.parseInt(params.id))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
