import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

// List of protected routes and their required roles
const protectedRoutes = {
  "/dashboard/counter-inventori": ["ADMIN", "PETUGAS_INVENTORY"],
  "/dashboard/counter-timbang": ["ADMIN", "PETUGAS_PENYEMBELIHAN"],
  "/dashboard/progres-sembelih": ["ADMIN", "PETUGAS_PENYEMBELIHAN"],
  "/dashboard/panitia": ["ADMIN"],
  "/dashboard/keuangan": ["ADMIN", "PETUGAS_KEUANGAN"],
  "/dashboard/transactions": ["ADMIN", "PETUGAS_KEUANGAN"],
  "/dashboard/mudhohi": ["ADMIN", "PETUGAS_PENDAFTARAN"],
  "/dashboard/pengaturan": ["ADMIN", "PETUGAS_PENDAFTARAN"],
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Check if the path is protected
  const path = request.nextUrl.pathname

  // If it's the dashboard root and user is not authenticated, redirect to login
  if (path === "/dashboard" && !token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", encodeURI(request.url))
    return NextResponse.redirect(url)
  }

  // If it's a protected route and user is not authenticated, redirect to login
  if (Object.keys(protectedRoutes).some((route) => path.startsWith(route)) && !token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", encodeURI(request.url))
    return NextResponse.redirect(url)
  }

  // If user is authenticated but doesn't have the required role
  if (token && token.role) {
    for (const [route, roles] of Object.entries(protectedRoutes)) {
      if (path.startsWith(route) && !roles.includes(token.role as string)) {
        return NextResponse.redirect(new URL("/dashboard/unauthorized", request.url))
      }
    }
  }
 // Handle Socket.IO polling requests
 if (request.nextUrl.pathname.startsWith("/api/socket")) {
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return response;
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/counter-inventori/:path*",
    "/dashboard/counter-timbang/:path*",
    "/dashboard/progres-sembelih/:path*",
    "/dashboard/panitia/:path*",
    "/dashboard/mudhohi/:path*",
    "/api/socket/:path*"
  ],
}
