"use client"

import type React from "react"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useAuthStore } from "@/stores/auth-store"
import { checkAccess } from "@/app/actions"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const { setUser, setLoading, setAccessiblePages, logout } = useAuthStore()

  useEffect(() => {
    if (status === "loading") {
      setLoading(true)
      return
    }

    if (status === "unauthenticated") {
      logout()
      return
    }

    if (status === "authenticated" && session?.user) {
      setUser({
        id: session.user.id!,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
      })

      // Fetch accessible pages
      checkAccess().then((result) => {
        setAccessiblePages(result.accessiblePages)
      })
    }
  }, [session, status, setUser, setLoading, setAccessiblePages, logout])

  return <>{children}</>
}
