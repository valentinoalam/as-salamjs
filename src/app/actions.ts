"use server"
import { getCurrentUser, hasAccess } from "#@/lib/utils/auth.ts"

export async function checkAccess() {
  const user = await getCurrentUser()

  if (!user) {
    return {
      role: null,
      accessiblePages: [],
    }
  }

  const pages = [
    "dashboard",
    "dashboard/progres-sembelih",
    "dashboard/counter-timbang",
    "dashboard/counter-inventori",
    "dashboard/distribusi",
    "dashboard/panitia",
    "dashboard/mudhohi",
    "dashboard/keuangan",
    "dashboard/transactions",
    "dashboard/pengaturan"
  ]

  const accessiblePages = await Promise.all(
    pages.map(async (page) => {
      const canAccess = await hasAccess(page)
      return { page, canAccess }
    }),
  )

  return {
    roles: user.roles,
    accessiblePages: accessiblePages.filter((page) => page.canAccess).map((page) => page.page),
  }
}
