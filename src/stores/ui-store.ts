/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPaginationConfig } from "#@/hooks/use-pagination.tsx"
import type { PaginationConfig } from "#@/lib/DTOs/global.ts"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { useShallow } from 'zustand/react/shallow'
import { useSettingsStore } from "./settings-store"

interface MetaState {
  sapi: { total: number; target: number; slaughtered: number };
  domba: { total: number; target: number; slaughtered: number };
}
interface PaginationState {
  sapiPage: number
  sapiGroup: string
  dombaPage: number
  dombaGroup: string
  mudhohiPage: number
  penerimaPage: number
  // Add more pagination states as needed
}

interface TabState {
  counterInventori: string
  counterTimbang: string
  progressSembelih: string
  statusHewan: string
  keuangan: string
  pengaturan: string
  // Add more tab states as needed
}

interface FormState {
  // Store form values that should persist
  distribusiForm: {
    receivedBy: string
    institusi: string
    distribusiId: string
    jumlahPaket: number
  }
  // shipmentForm
  // mudhohiForm
  // transactionForm
  // Add more form states as needed
}

interface UIState {
  showRegisterButton: boolean
  tabs: TabState
  forms: FormState
  isHydrated: boolean

  meta: MetaState;
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
  
  sapiPaginationConfig: PaginationConfig
  dombaPaginationConfig: PaginationConfig

  // Theme and preferences
  theme: "light" | "dark" | "system"

  // Actions
  toggleSidebar: () => void
  setActiveTab: (component: keyof TabState, tabValue: string) => void
  setPagination: <K extends keyof PaginationState>(key: K, value: PaginationState[K]) => void
  updateFormField: <K extends keyof FormState>(formName: K, fieldName: keyof FormState[K], value: any) => void
  resetForm: (formName: keyof FormState) => void
  setHydrated: (hydrated: boolean) => void
  setShowRegisterButton: (show: boolean) => void
  setModal: (modal: string, isOpen: boolean) => void
  setSelectedItem: (type: string, id: string | null) => void
  setFilter: (type: string, value: string) => void
  setLoading: (type: string, isLoading: boolean) => void
  setSidebar: (isOpen: boolean) => void
  setMobileMenu: (isOpen: boolean) => void
  setTheme: (theme: "light" | "dark" | "system") => void
  setMeta: (meta: MetaState) => void;
  resetFilters: () => void
  resetSelections: () => void
}

// Default values
const defaultTabs: TabState = {
  counterInventori: "distribusi",
  progressSembelih: "sapi",
  counterTimbang: 'timbang',
  statusHewan: 'sapi',
  keuangan: 'transactions',
  pengaturan: 'tipe-hewan'
}

const defaultMeta: MetaState = {
  sapi: { total: 0, target: 0, slaughtered: 0 },
  domba: { total: 0, target: 0, slaughtered: 0 },
};

const defaultPagination: PaginationState = {
  sapiPage: 1,
  sapiGroup: "A",
  dombaPage: 1,
  dombaGroup: "A",
  mudhohiPage: 1,
  penerimaPage: 1,
}

const defaultForms: FormState = {
  distribusiForm: {
    receivedBy: "",
    institusi: "",
    distribusiId: "",
    jumlahPaket: 1,
  },
}

export const useUIStore = create<UIState>()(
  
  persist(
    (set, get) => {
      const { itemsPerGroup } = useSettingsStore.getState();
      return ({
        // Initial state
        showRegisterButton: true,
        isHydrated: false,
        tabs: defaultTabs,
        meta: defaultMeta,
        pagination: defaultPagination,

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

        forms: defaultForms,

        isSubmitting: false,
        isDeleting: false,

        isSidebarOpen: true,
        isMobileMenuOpen: false,
        setMeta: (meta) => set({ meta }),
        // Add pagination configs
        sapiPaginationConfig: {
          useGroups: false, 
          itemsPerGroup: undefined,
          pageSize: 10
        },
        dombaPaginationConfig: {
          useGroups: true, 
          itemsPerGroup,
          pageSize: 10
        },
        theme: "system",

        // Actions
        setShowRegisterButton: (show) => set({ showRegisterButton: show }),
        toggleSidebar: () =>
          set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

        setActiveTab: (component, tabValue) =>
          set((state) => ({
            tabs: {
              ...state.tabs,
              [component]: tabValue,
            },
          })),
        setPagination: (key, value) =>
          set((state) => ({
            pagination: {
              ...state.pagination,
              [key]: value,
            },
          })),
        updateFormField: (formName, fieldName, value) =>
          set((state) => ({
            forms: {
              ...state.forms,
              [formName]: {
                ...state.forms[formName],
                [fieldName]: value,
              },
            },
          })),

        resetForm: (formName) =>
          set((state) => ({
            forms: {
              ...state.forms,
              [formName]: defaultForms[formName],
            },
          })),

        setHydrated: (hydrated) =>
          set({ isHydrated: hydrated }),

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
      }
    )},
    {
      name: "ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pagination: state.pagination,
        isSidebarOpen: state.isSidebarOpen,
        tabs: state.tabs,
        forms: state.forms,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        // Set hydrated to true after rehydration
        if (state) {
          state.setHydrated(true)
        }
      },
    },
  ),
)

// Optional: Create separate stores for different concerns if needed
export const useTabStore = () => useUIStore(useShallow((state) => ({
  tabs: state.tabs,
  setActiveTab: state.setActiveTab,
})))
export const useMetaStore = () => useUIStore(useShallow((state) => ({
  meta: state.meta,
  setMeta: state.setMeta,
})));
export const usePaginationStore = () => useUIStore(useShallow((state) => ({
  pagination: state.pagination,
  setPagination: state.setPagination,
})))

export const usePaginationConfigStore = () => useUIStore(useShallow((state) => ({
  sapiPaginationConfig: state.sapiPaginationConfig,
  dombaPaginationConfig: state.dombaPaginationConfig,
})))

export const useFormStore = () => useUIStore(useShallow((state) => ({
  forms: state.forms,
  updateFormField: state.updateFormField,
  resetForm: state.resetForm,
})))

export const useSidebarStore = () => useUIStore(useShallow((state) => ({
  isSidebarOpen: state.isSidebarOpen,
  toggleSidebar: state.toggleSidebar,
})))

// Hydration helper hook for Next.js SSR
export const useHydration = () => {
  const isHydrated = useUIStore(useShallow((state) => state.isHydrated))
  
  return isHydrated
}