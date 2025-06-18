/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Role } from "@prisma/client"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface PaginationState {
  sapiPage: number
  sapiGroup: string
  dombaPage: number
  dombaGroup: string
}

interface UIState {
  showRegisterButton: boolean
  user: {
    id: string
    name: string | null
    email: string | null
    role: Role | null
    urlAvatar: string | null
  } | null
  setUser: (user: UIState['user']) => void
  setShowRegisterButton: (show: boolean) => void
}

interface UIState {
  // Pagination
  pagination: PaginationState

  // Modals and dialogs
  isAddMudhohiModalOpen: boolean
  isEditMudhohiModalOpen: boolean
  isPaymentModalOpen: boolean
  isDeleteConfirmModalOpen: boolean

  // Selected items
  selectedMudhohiId: string | null
  selectedPaymentId: string | null
  selectedHewanId: string | null

  // Filters and search
  searchQuery: string
  statusFilter: string
  typeFilter: string

  // Loading states
  isSubmitting: boolean
  isDeleting: boolean

  // Sidebar and navigation
  isSidebarOpen: boolean
  isMobileMenuOpen: boolean

  // Theme and preferences
  theme: "light" | "dark" | "system"

  // Actions
  setPagination: (key: keyof PaginationState, value: any) => void
  setModal: (modal: string, isOpen: boolean) => void
  setSelectedItem: (type: string, id: string | null) => void
  setFilter: (type: string, value: string) => void
  setLoading: (type: string, isLoading: boolean) => void
  setSidebar: (isOpen: boolean) => void
  setMobileMenu: (isOpen: boolean) => void
  setTheme: (theme: "light" | "dark" | "system") => void
  resetFilters: () => void
  resetSelections: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      showRegisterButton: true,
      user: null,
      setUser: (user) => set({ user }),
      setShowRegisterButton: (show) => set({ showRegisterButton: show }),
      // Initial state
      pagination: {
        sapiPage: 1,
        sapiGroup: "A",
        dombaPage: 1,
        dombaGroup: "A",
      },

      isAddMudhohiModalOpen: false,
      isEditMudhohiModalOpen: false,
      isPaymentModalOpen: false,
      isDeleteConfirmModalOpen: false,

      selectedMudhohiId: null,
      selectedPaymentId: null,
      selectedHewanId: null,

      searchQuery: "",
      statusFilter: "all",
      typeFilter: "all",

      isSubmitting: false,
      isDeleting: false,

      isSidebarOpen: true,
      isMobileMenuOpen: false,

      theme: "system",

      // Actions
      setPagination: (key, value) =>
        set((state) => ({
          pagination: {
            ...state.pagination,
            [key]: value,
          },
        })),

      setModal: (modal, isOpen) => set({ [`is${modal}ModalOpen`]: isOpen } as any),

      setSelectedItem: (type, id) => set({ [`selected${type}Id`]: id } as any),

      setFilter: (type, value) => set({ [`${type}Filter`]: value } as any),

      setLoading: (type, isLoading) => set({ [`is${type}`]: isLoading } as any),

      setSidebar: (isOpen) => set({ isSidebarOpen: isOpen }),

      setMobileMenu: (isOpen) => set({ isMobileMenuOpen: isOpen }),

      setTheme: (theme) => set({ theme }),

      resetFilters: () =>
        set({
          searchQuery: "",
          statusFilter: "all",
          typeFilter: "all",
        }),

      resetSelections: () =>
        set({
          selectedMudhohiId: null,
          selectedPaymentId: null,
          selectedHewanId: null,
        }),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({
        pagination: state.pagination,
        isSidebarOpen: state.isSidebarOpen,
        theme: state.theme,
      }),
    },
  ),
)
