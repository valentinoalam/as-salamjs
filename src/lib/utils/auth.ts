import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Role } from "@prisma/client"

// Get the current user from the session
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

// Middleware to check if the user has access to a specific page
export async function hasAccess(page: string): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  // Admin has access to everything
  if (user.roles.includes(Role.ADMIN)) {
    return true
  }

  switch (page) {
    case "counter-inventori":
      return user.roles.includes(Role.PETUGAS_INVENTORY)
    case "counter-timbang":
      return user.roles.includes(Role.PETUGAS_TIMBANG)
    case "progres-sembelih":
      return user.roles.includes(Role.PETUGAS_TIMBANG)
    case "dashboard":
      return user.roles.includes(Role.MEMBER)
    case "keuangan":
      return user.roles.includes(Role.PETUGAS_KEUANGAN)
    case "transactions":
    return user.roles.includes(Role.PETUGAS_KEUANGAN)
    case "mudhohi":
      return user.roles.includes(Role.PETUGAS_PENDAFTARAN)
    case "panitia":
      return false // Only admin can access this page
    case "pengaturan":
      return false
    default:
      return true // Public pages
  }
}

export { authOptions }
