import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "next-auth"
import type { Role } from "@prisma/client"

interface AuthUser extends User {
  id: string
  role: Role
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  accessiblePages: string[]

  // Actions
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setAccessiblePages: (pages: string[]) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      accessiblePages: [],

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setAccessiblePages: (pages) => set({ accessiblePages: pages }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          accessiblePages: [],
        }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessiblePages: state.accessiblePages,
      }),
    },
  ),
)
