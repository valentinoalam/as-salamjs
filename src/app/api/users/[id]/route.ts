import { type NextRequest, NextResponse } from "next/server"
import { updateUserRoles, deleteUser } from "#@/lib/server/repositories/panitia.ts"
import type { Role } from "@prisma/client"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { roles } = body

    if (!roles || !Array.isArray(roles)) {
      return NextResponse.json({ error: "Roles array is required" }, { status: 400 })
    }

    const result = await updateUserRoles(params.id, roles as Role[])

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await deleteUser(params.id)

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
