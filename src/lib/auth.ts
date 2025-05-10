import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Role } from "@prisma/client"

// Get the current user from the session
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

// Check if the user has the required role
export async function checkUserRole(requiredRoles: Role[]) {
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  return requiredRoles.includes(user.role as Role)
}

// Middleware to check if the user has access to a specific page
export async function hasAccess(page: string): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  // Admin has access to everything
  if (user.role === Role.ADMIN) {
    return true
  }

  switch (page) {
    case "counter-inventori":
      return user.role === Role.PETUGAS_INVENTORY
    case "counter-timbang":
      return user.role === Role.PETUGAS_PENYEMBELIHAN
    case "progres-sembelih":
      return user.role === Role.PETUGAS_PENYEMBELIHAN
    case "pemesanan":
      return user.role === Role.PETUGAS_PENDAFTARAN
    case "keuangan":
      return user.role === Role.PETUGAS_KEUANGAN
    case "mudhohi":
      return user.role === Role.PETUGAS_PENDAFTARAN
    case "panitia":
      return false // Only admin can access this page
    default:
      return true // Public pages
  }
}
