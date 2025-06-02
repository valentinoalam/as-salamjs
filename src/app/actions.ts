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
    "dashboard",
    "qurban/pemesanan",
    "dashboard/progres-sembelih",
    "dashboard/counter-timbang",
    "dashboard/counter-inventori",
    "dashboard/panitia",
    "dashboard/mudhohi",
    "dashboard/keuangan",
    "dashboard/transactions"
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
