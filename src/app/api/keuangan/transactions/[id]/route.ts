import { NextResponse } from "next/server"
import { deleteTransaction } from "#@/lib/server/repositories/keuangan.ts"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await deleteTransaction(params.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
}
