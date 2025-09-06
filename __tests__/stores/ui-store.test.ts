/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from "@testing-library/react"
import { useUIStore } from "@/stores/ui-store"

// Mock zustand persist
jest.mock("zustand/middleware", () => ({
  persist: (fn: any) => fn,
}))

describe("UI Store", () => {
  beforeEach(() => {
    // Reset store before each test
    useUIStore.setState({
      pagination: {
        sapiPage: 1,
        sapiGroup: "A",
        dombaPage: 1,
        dombaGroup: "A",
        mudhohiPage: 0,
        penerimaPage: 0
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
    })
  })

  describe("Pagination", () => {
    it("should initialize with default pagination values", () => {
      const { result } = renderHook(() => useUIStore())

      expect(result.current.pagination).toEqual({
        sapiPage: 1,
        sapiGroup: "A",
        dombaPage: 1,
        dombaGroup: "A",
      })
    })

    it("should update sapi page correctly", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setPagination("sapiPage", 3)
      })

      expect(result.current.pagination.sapiPage).toBe(3)
      expect(result.current.pagination.dombaPage).toBe(1) // Should not affect other values
    })

    it("should update sapi group correctly", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setPagination("sapiGroup", "B")
      })

      expect(result.current.pagination.sapiGroup).toBe("B")
      expect(result.current.pagination.sapiPage).toBe(1) // Should not affect other values
    })

    it("should update domba pagination independently", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setPagination("dombaPage", 5)
        result.current.setPagination("dombaGroup", "C")
      })

      expect(result.current.pagination.dombaPage).toBe(5)
      expect(result.current.pagination.dombaGroup).toBe("C")
      expect(result.current.pagination.sapiPage).toBe(1)
      expect(result.current.pagination.sapiGroup).toBe("A")
    })
  })

  describe("Modal States", () => {
    it("should handle modal states correctly", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setModal("AddMudhohi", true)
      })

      expect(result.current.isAddMudhohiModalOpen).toBe(true)

      act(() => {
        result.current.setModal("AddMudhohi", false)
      })

      expect(result.current.isAddMudhohiModalOpen).toBe(false)
    })

    it("should handle multiple modals independently", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setModal("AddMudhohi", true)
        result.current.setModal("Payment", true)
      })

      expect(result.current.isAddMudhohiModalOpen).toBe(true)
      expect(result.current.isPaymentModalOpen).toBe(true)
      expect(result.current.isEditMudhohiModalOpen).toBe(false)
    })
  })

  describe("Selected Items", () => {
    it("should set selected mudhohi ID", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setSelectedItem("Mudhohi", "mudhohi_123")
      })

      expect(result.current.selectedMudhohiId).toBe("mudhohi_123")
    })

    it("should clear selected items", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setSelectedItem("Mudhohi", "mudhohi_123")
        result.current.setSelectedItem("Payment", "payment_456")
      })

      expect(result.current.selectedMudhohiId).toBe("mudhohi_123")
      expect(result.current.selectedPaymentId).toBe("payment_456")

      act(() => {
        result.current.resetSelections()
      })

      expect(result.current.selectedMudhohiId).toBeNull()
      expect(result.current.selectedPaymentId).toBeNull()
      expect(result.current.selectedHewanId).toBeNull()
    })
  })

  describe("Filters", () => {
    it("should set search query", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setFilter("search", "Ahmad")
      })

      expect(result.current.searchQuery).toBe("Ahmad")
    })

    it("should set status filter", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setFilter("status", "LUNAS")
      })

      expect(result.current.statusFilter).toBe("LUNAS")
    })

    it("should reset all filters", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setFilter("search", "Ahmad")
        result.current.setFilter("status", "LUNAS")
        result.current.setFilter("type", "SAPI")
      })

      expect(result.current.searchQuery).toBe("Ahmad")
      expect(result.current.statusFilter).toBe("LUNAS")
      expect(result.current.typeFilter).toBe("SAPI")

      act(() => {
        result.current.resetFilters()
      })

      expect(result.current.searchQuery).toBe("")
      expect(result.current.statusFilter).toBe("all")
      expect(result.current.typeFilter).toBe("all")
    })
  })

  describe("Loading States", () => {
    it("should handle loading states", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setLoading("Submitting", true)
      })

      expect(result.current.isSubmitting).toBe(true)

      act(() => {
        result.current.setLoading("Submitting", false)
      })

      expect(result.current.isSubmitting).toBe(false)
    })
  })

  describe("UI Controls", () => {
    it("should toggle sidebar", () => {
      const { result } = renderHook(() => useUIStore())

      expect(result.current.isSidebarOpen).toBe(true)

      act(() => {
        result.current.setSidebar(false)
      })

      expect(result.current.isSidebarOpen).toBe(false)
    })

    it("should toggle mobile menu", () => {
      const { result } = renderHook(() => useUIStore())

      expect(result.current.isMobileMenuOpen).toBe(false)

      act(() => {
        result.current.setMobileMenu(true)
      })

      expect(result.current.isMobileMenuOpen).toBe(true)
    })

    it("should set theme", () => {
      const { result } = renderHook(() => useUIStore())

      act(() => {
        result.current.setTheme("dark")
      })

      expect(result.current.theme).toBe("dark")
    })
  })
})
