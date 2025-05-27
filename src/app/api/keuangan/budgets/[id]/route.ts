import { NextResponse } from "next/server"
import { updateBudget, deleteBudget } from "@/services/keuangan"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()
    const result = await updateBudget(params.id, data)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating budget:", error)
    return NextResponse.json({ error: "Failed to update budget" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await deleteBudget(params.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting budget:", error)
    return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 })
  }
}
