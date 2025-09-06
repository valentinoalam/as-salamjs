import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"
import type { Role } from "@prisma/client"
// List of protected routes and their required roles
const protectedRoutes = {
  "/dashboard/counter-inventori": ["ADMIN", "PETUGAS_INVENTORY"] as const,
  "/dashboard/distribusi": ["ADMIN", "PETUGAS_INVENTORY"] as const,
  "/dashboard/counter-timbang": ["ADMIN", "PETUGAS_TIMBANG"] as const,
  "/dashboard/progres-sembelih": ["ADMIN", "PETUGAS_TIMBANG"] as const,
  "/dashboard/panitia": ["ADMIN"] as const,
  "/dashboard/keuangan": ["ADMIN", "PETUGAS_KEUANGAN"] as const,
  "/dashboard/transactions": ["ADMIN", "PETUGAS_KEUANGAN"] as const,
  "/dashboard/mudhohi": ["ADMIN", "PETUGAS_PENDAFTARAN"] as const,
  "/dashboard/pengaturan": ["ADMIN", "PETUGAS_PENDAFTARAN"] as const,
}

// Routes that require ALL specified roles
const strictRoutes: Record<string, Role[]> = {
  "/dashboard/panitia": ["ADMIN"], // Only admin can access user management
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
  if (token && token.roles) {
    const userRoles = token.roles as Role[]
    for (const [route, requiredRoles] of Object.entries(protectedRoutes)) {
      if (path.startsWith(route)) {
        // Check if it's a strict route (requires ALL roles)
        if (strictRoutes[route]) {
          const hasAllRoles = strictRoutes[route].every((role) => userRoles.includes(role))
          if (!hasAllRoles) {
            return NextResponse.redirect(new URL("/dashboard/unauthorized", request.url))
          }
        } else {
          // Regular route (requires ANY of the roles)
          const hasAnyRole = requiredRoles.some((role) => userRoles.includes(role))
          if (!hasAnyRole) {
            return NextResponse.redirect(new URL("/dashboard/unauthorized", request.url))
          }
        }
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
    "/dashboard/keuangan/:path*",
    "/dashboard/pengaturan/:path*",
    "/api/socket/:path*"
  ],
}
