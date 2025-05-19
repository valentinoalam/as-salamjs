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
    distributionId: string
    numberOfPackages: number
  }
  // Add more form states as needed
}

interface UIStateContextType {
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
    distributionId: "",
    numberOfPackages: 1,
  },
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
})

// Provider component
export const UIStateProvider = ({ children }: { children: ReactNode }) => {
  // Initialize state with default values
  const [tabs, setTabs] = useState<TabState>(defaultTabs)
  const [pagination, setPaginationState] = useState<PaginationState>(defaultPagination)
  const [forms, setForms] = useState<FormState>(defaultForms)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Load tabs state
        const savedTabs = localStorage.getItem("qurban_tabs")
        if (savedTabs) {
          setTabs(JSON.parse(savedTabs))
        }

        // Load pagination state
        const savedPagination = localStorage.getItem("qurban_pagination")
        if (savedPagination) {
          setPaginationState(JSON.parse(savedPagination))
        }

        // Load forms state
        const savedForms = localStorage.getItem("qurban_forms")
        if (savedForms) {
          setForms(JSON.parse(savedForms))
        }
      } catch (error) {
        console.error("Error loading UI state from localStorage:", error)
        // If there's an error, use default values
      }

      setIsLoaded(true)
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded) {
      localStorage.setItem("qurban_tabs", JSON.stringify(tabs))
      localStorage.setItem("qurban_pagination", JSON.stringify(pagination))
      localStorage.setItem("qurban_forms", JSON.stringify(forms))
    }
  }, [tabs, pagination, forms, isLoaded])

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

  return (
    <UIStateContext.Provider
      value={{
        tabs,
        setActiveTab,
        pagination,
        setPagination,
        forms,
        updateFormField,
        resetForm,
      }}
    >
      {children}
    </UIStateContext.Provider>
  )
}

// Custom hook to use the context
export const useUIState = () => useContext(UIStateContext)
