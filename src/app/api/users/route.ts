import { type NextRequest, NextResponse } from "next/server"
import { getAllMember, createUser } from "#@/lib/server/repositories/panitia.ts"
import type { Role } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nameFilter = searchParams.get("name") || undefined
    const rolesFilter = searchParams.get("roles")?.split(",") as Role[] | undefined
    const skip = Number.parseInt(searchParams.get("skip") || "0")
    const take = Number.parseInt(searchParams.get("take") || "10")

    const result = await getAllMember(nameFilter, rolesFilter, skip, take)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, urlAvatar, roles } = body

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const result = await createUser({
      name,
      email,
      password,
      urlAvatar,
      roles: roles || ["MEMBER"],
    })

    if (result.success) {
      return NextResponse.json(result.user)
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
