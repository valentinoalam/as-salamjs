import { NextResponse } from "next/server"
import { hasAccess } from "@/lib/auth"

export async function middleware(request: Request) {
  const canAccess = await hasAccess("keuangan")

  if (!canAccess) {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  return NextResponse.next()
}
