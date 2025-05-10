"use server"
import { getCurrentUser, hasAccess } from "@/lib/auth"

export async function checkAccess() {
  const user = await getCurrentUser()

  if (!user) {
    return {
      role: null,
      accessiblePages: [],
    }
  }

  const pages = [
    "pemesanan",
    "progres-sembelih",
    "counter-timbang",
    "counter-inventori",
    "panitia",
    "mudhohi",
    "keuangan",
  ]

  const accessiblePages = await Promise.all(
    pages.map(async (page) => {
      const canAccess = await hasAccess(page)
      return { page, canAccess }
    }),
  )

  return {
    role: user.role,
    accessiblePages: accessiblePages.filter((page) => page.canAccess).map((page) => page.page),
  }
}
