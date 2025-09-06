import { NextResponse } from "next/server"
import { hasAccess } from "#@/lib/utils/auth.ts"

export async function middleware(request: Request) {
  const canAccess = await hasAccess("panitia")

  if (!canAccess) {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  return NextResponse.next()
}
