// app/api/auth/session/route.ts
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic' // Ensure dynamic handling

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const response = NextResponse.json(session)
    
    // Set cache control headers
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=600"
    )
    
    return response
  } catch (error) {
    console.error("Session API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}