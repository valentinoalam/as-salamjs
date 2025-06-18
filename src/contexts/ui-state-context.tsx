/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

// Define types for UI state
interface TabState {
  counterInventori: string
  progressSembelih: string
  // Add more tab states as needed
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

interface FormState {
  // Store form values that should persist
  distribusiForm: {
    receivedBy: string
    institusi: string
    distribusiId: string
    jumlahPaket: number
  }
  // Add more form states as needed
}

interface UIStateContextType {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  // Tab states
  tabs: TabState
  setActiveTab: (component: keyof TabState, tabValue: string) => void

  // Pagination states
  pagination: PaginationState
  setPagination: <K extends keyof PaginationState>(key: K, value: PaginationState[K]) => void

  // Form states
  forms: FormState
  updateFormField: <K extends keyof FormState>(formName: K, fieldName: keyof FormState[K], value: any) => void
  resetForm: (formName: keyof FormState) => void
  isHydrated: boolean
}

// Default values
const defaultTabs: TabState = {
  counterInventori: "distribusi",
  progressSembelih: "sapi",
}

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

const defaultSidebar: boolean = true

// Storage keys - centralized for consistency
const STORAGE_KEYS = {
  tabs: "qurban_tabs",
  pagination: "qurban_pagination", 
  forms: "qurban_forms",
  sidebar: "qurban_sidebar"
} as const

// Helper function to safely get from localStorage
const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  // Always return default value during SSR
  if (typeof window === "undefined") {
    return defaultValue
  }

  try {
    const item = window.localStorage.getItem(key)
    return item !== null ? (JSON.parse(item) as T) : defaultValue
  } catch (error) {
    console.error(`Error loading "${key}" from localStorage:`, error)
    return defaultValue
  }
}

// Helper function to safely set to localStorage
const setToLocalStorage = (key: string, value: any) => {
  if (typeof window === "undefined") {
    return
  }
  
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error)
  }
}

// Create context
const UIStateContext = createContext<UIStateContextType>({
  tabs: defaultTabs,
  setActiveTab: () => {},
  pagination: defaultPagination,
  setPagination: () => {},
  forms: defaultForms,
  updateFormField: () => {},
  resetForm: () => {},
  isSidebarOpen: defaultSidebar,
  toggleSidebar: () => {},
  isHydrated: false
})

// Provider component
export const UIStateProvider = ({ children }: { children: ReactNode }) => {
  // Initialize ALL state with default values to ensure SSR/CSR consistency
  const [tabs, setTabs] = useState<TabState>(defaultTabs)
  const [pagination, setPaginationState] = useState<PaginationState>(defaultPagination)
  const [forms, setForms] = useState<FormState>(defaultForms)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(defaultSidebar)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load state from localStorage on mount (client-side only)
  useEffect(() => {
    // Load persisted state from localStorage
    const storedTabs = getFromLocalStorage(STORAGE_KEYS.tabs, defaultTabs)
    const storedPagination = getFromLocalStorage(STORAGE_KEYS.pagination, defaultPagination)
    const storedForms = getFromLocalStorage(STORAGE_KEYS.forms, defaultForms)
    const storedSidebar = getFromLocalStorage(STORAGE_KEYS.sidebar, defaultSidebar)

    // Update state with persisted values
    setTabs(storedTabs)
    setPaginationState(storedPagination)
    setForms(storedForms)
    setIsSidebarOpen(storedSidebar)
    
    // Mark as hydrated
    setIsHydrated(true)
  }, [])

  // Save state to localStorage whenever it changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      setToLocalStorage(STORAGE_KEYS.sidebar, isSidebarOpen)
    }
  }, [isSidebarOpen, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      setToLocalStorage(STORAGE_KEYS.tabs, tabs)
    }
  }, [tabs, isHydrated])
  
  useEffect(() => {
    if (isHydrated) {
      setToLocalStorage(STORAGE_KEYS.pagination, pagination)
    }
  }, [pagination, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      setToLocalStorage(STORAGE_KEYS.forms, forms)
    }
  }, [forms, isHydrated])

  // Tab state handlers
  const setActiveTab = (component: keyof TabState, tabValue: string) => {
    setTabs((prev) => ({
      ...prev,
      [component]: tabValue,
    }))
  }

  // Pagination state handlers
  const setPagination = <K extends keyof PaginationState>(key: K, value: PaginationState[K]) => {
    setPaginationState((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Form state handlers
  const updateFormField = <K extends keyof FormState>(formName: K, fieldName: keyof FormState[K], value: any) => {
    setForms((prev) => ({
      ...prev,
      [formName]: {
        ...prev[formName],
        [fieldName]: value,
      },
    }))
  }

  const resetForm = (formName: keyof FormState) => {
    setForms((prev) => ({
      ...prev,
      [formName]: defaultForms[formName],
    }))
  }

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev)
  }

  return (
    <UIStateContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        tabs,
        setActiveTab,
        pagination,
        setPagination,
        forms,
        updateFormField,
        resetForm,
        isHydrated
      }}
    >
      {children}
    </UIStateContext.Provider>
  )
}

// Custom hook to use the context
export const useUIState = () => {
  const context = useContext(UIStateContext)
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider')
  }
  return context
}