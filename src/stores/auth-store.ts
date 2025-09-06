import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@prisma/client"
import type { AuthUser } from "#@/types/user.ts"

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

  // Multi-role helpers
  hasRole: (role: Role) => boolean
  hasAnyRole: (roles: Role[]) => boolean
  hasAllRoles: (roles: Role[]) => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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

      hasRole: (role: Role) => {
        const { user } = get()
        return user?.roles?.includes(role) ?? false
      },

      hasAnyRole: (roles: Role[]) => {
        const { user } = get()
        return roles.some((role) => user?.roles?.includes(role)) ?? false
      },

      hasAllRoles: (roles: Role[]) => {
        const { user } = get()
        return roles.every((role) => user?.roles?.includes(role)) ?? false
      },

      isAdmin: () => {
        const { user } = get()
        return user?.roles?.includes("ADMIN") ?? false
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessiblePages: state.accessiblePages,
      }),
      onRehydrateStorage: (state) => {
        if (state?.user) {
          // If user data is found in persisted storage, assume ready immediately
          // This runs AFTER the state is set, but before the component renders.
          return (state) => {
            if (state) {
              state.isLoading = false;
            }
          };
        } else {
            // If no user data, keep isLoading as true to wait for next-auth
            // or explicitly set to false if no user is expected.
            return (state) => {
                if (state) {
                    state.isLoading = false; // Or keep true and let useSession handle
                }
            };
        }
      },
    },
    
  ),
)
