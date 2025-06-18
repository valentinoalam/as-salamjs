import type React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import KeuanganPage from "@/app/dashboard/keuangan/page"
import { useKeuangan } from "@/contexts/keuangan-context"

// Mock the entire keuangan context module
jest.mock("@/contexts/keuangan-context", () => ({
  useKeuangan: jest.fn(),
  KeuanganProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock next-auth
jest.mock("next-auth/react")

// Mock React Query hooks if used directly
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}))

// Mock fetch for API calls
global.fetch = jest.fn()

const mockUseKeuangan = useKeuangan as jest.MockedFunction<typeof useKeuangan>
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Create a test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("Keuangan Page - Detailed Mocking", () => {
  const mockSession = {
    user: {
      id: "1",
      name: "Test User",
      email: "test@example.com",
      role: "ADMIN",
    },
  }

  const defaultKeuanganMock = {
    // Data
    stats: {
      totalIncome: 50000000,
      totalExpense: 30000000,
      balance: 20000000,
      monthlyIncome: 25000000,
      monthlyExpense: 15000000,
      monthlyBalance: 10000000,
    },
    transactions: [
      {
        id: "trx_1",
        amount: 25000000,
        description: "Pembayaran Qurban Sapi",
        type: "PEMASUKAN" as const,
        date: new Date("2024-01-01"),
        categoryId: "cat_1",
        category: {
          id: "cat_1",
          name: "Penjualan Qurban",
          type: "PEMASUKAN" as const,
        },
        receiptUrl: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        createdBy: "1",
        isAnimalSale: true,
        tipeHewanId: 1,
      },
    ],
    categories: [
      {
        id: "cat_1",
        name: "Penjualan Qurban",
        type: "PEMASUKAN" as const,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ],
    budgets: [],
    overviewData: [],
    qurbanSalesStats: {
      currentIncome: 50000000,
      targetIncome: 100000000,
      totalOrders: 10,
      completedOrders: 8,
      perHewanSalesStats: [
        {
          tipeHewan: "Sapi Lokal",
          currentAmount: 25000000,
          targetAmount: 50000000,
          orderCount: 5,
        },
      ],
    },
    weeklyAnimalSales: {
      chartData: [],
      totalSales: 0,
    },

    // Loading states
    isLoadingStats: false,
    isLoadingTransactions: false,
    isLoadingCategories: false,
    isLoadingBudgets: false,
    isLoadingOverview: false,
    isLoadingQurbanSales: false,
    isLoadingWeeklySales: false,

    // Error states
    statsError: null,
    transactionsError: null,
    categoriesError: null,
    budgetsError: null,
    overviewError: null,
    qurbanSalesError: null,
    weeklySalesError: null,

    // Mutation functions
    createTransaction: jest.fn().mockResolvedValue({ success: true }),
    deleteTransaction: jest.fn().mockResolvedValue({ success: true }),
    createCategory: jest.fn().mockResolvedValue({ success: true }),
    updateCategory: jest.fn().mockResolvedValue({ success: true }),
    deleteCategory: jest.fn().mockResolvedValue({ success: true }),
    createBudget: jest.fn().mockResolvedValue({ success: true }),
    updateBudget: jest.fn().mockResolvedValue({ success: true }),
    deleteBudget: jest.fn().mockResolvedValue({ success: true }),

    // Utility functions
    refetchStats: jest.fn(),
    refetchTransactions: jest.fn(),
    refetchCategories: jest.fn(),
    refetchBudgets: jest.fn(),
    refetchOverview: jest.fn(),
    refetchQurbanSales: jest.fn(),
    refetchWeeklySales: jest.fn(),
    refetchAll: jest.fn(),

    // Filter functions
    getTransactionsByType: jest.fn().mockReturnValue([]),
    getTransactionsByCategory: jest.fn().mockReturnValue([]),
    getTransactionsByDateRange: jest.fn().mockReturnValue([]),
    getCategoriesByType: jest.fn().mockReturnValue([]),
    getBudgetsByCategory: jest.fn().mockReturnValue([]),

    // Stats functions
    calculateCategoryTotal: jest.fn().mockReturnValue(0),
    calculateBudgetUsage: jest.fn().mockReturnValue({ used: 0, percentage: 0, remaining: 0 }),
    getMonthlyStats: jest.fn().mockReturnValue({ income: 0, expense: 0, balance: 0 }),
  }

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup default mocks
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
    })

    mockUseKeuangan.mockReturnValue(defaultKeuanganMock)

    // Mock fetch responses
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  })

  describe("Basic Rendering", () => {
    it("should render page with default data", () => {
      render(<KeuanganPage />, { wrapper: createTestWrapper() })

      expect(screen.getByText("Manajemen Keuangan")).toBeInTheDocument()
      expect(screen.getByText("Total Pemasukan")).toBeInTheDocument()
      expect(screen.getByText("Rp 50.000.000")).toBeInTheDocument()
    })

    it("should handle loading states", () => {
      mockUseKeuangan.mockReturnValue({
        ...defaultKeuanganMock,
        isLoadingStats: true,
        stats: undefined,
      })

      render(<KeuanganPage />, { wrapper: createTestWrapper() })

      // Should show loading skeletons
      const loadingElements = screen.getAllByTestId(/loading|skeleton/i)
      expect(loadingElements.length).toBeGreaterThan(0)
    })
  })

  describe("Transaction Operations", () => {
    it("should call createTransaction when form is submitted", async () => {
      const mockCreateTransaction = jest.fn().mockResolvedValue({ success: true })
      mockUseKeuangan.mockReturnValue({
        ...defaultKeuanganMock,
        createTransaction: mockCreateTransaction,
      })

      render(<KeuanganPage />, { wrapper: createTestWrapper() })

      // Simulate form submission (you'll need to adjust based on your actual form)
      const addButton = screen.getByText("Tambah Transaksi")
      fireEvent.click(addButton)

      // Fill form and submit
      // ... form interaction code ...

      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalledWith({
          // expected form data
        })
      })
    })

    it("should handle transaction deletion", async () => {
      const mockDeleteTransaction = jest.fn().mockResolvedValue({ success: true })
      mockUseKeuangan.mockReturnValue({
        ...defaultKeuanganMock,
        deleteTransaction: mockDeleteTransaction,
      })

      render(<KeuanganPage />, { wrapper: createTestWrapper() })

      const deleteButton = screen.getByTestId("delete-transaction-trx_1")
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockDeleteTransaction).toHaveBeenCalledWith("trx_1")
      })
    })
  })

  describe("Error Handling", () => {
    it("should display error when stats fail to load", () => {
      mockUseKeuangan.mockReturnValue({
        ...defaultKeuanganMock,
        statsError: new Error("Failed to load stats"),
        stats: undefined,
      })

      render(<KeuanganPage />, { wrapper: createTestWrapper() })

      expect(screen.getByText(/error|gagal/i)).toBeInTheDocument()
    })

    it("should display error when transactions fail to load", () => {
      mockUseKeuangan.mockReturnValue({
        ...defaultKeuanganMock,
        transactionsError: new Error("Failed to load transactions"),
        transactions: undefined,
      })

      render(<KeuanganPage />, { wrapper: createTestWrapper() })

      expect(screen.getByText(/error|gagal/i)).toBeInTheDocument()
    })
  })

  describe("Filter and Search", () => {
    it("should call filter functions when filters are applied", () => {
      const mockGetTransactionsByType = jest.fn().mockReturnValue([])
      mockUseKeuangan.mockReturnValue({
        ...defaultKeuanganMock,
        getTransactionsByType: mockGetTransactionsByType,
      })

      render(<KeuanganPage />, { wrapper: createTestWrapper() })

      // Simulate filter interaction
      const filterSelect = screen.getByTestId("transaction-type-filter")
      fireEvent.change(filterSelect, { target: { value: "PEMASUKAN" } })

      expect(mockGetTransactionsByType).toHaveBeenCalledWith("PEMASUKAN")
    })
  })

  describe("Refetch Operations", () => {
    it("should call refetch functions when refresh is triggered", () => {
      const mockRefetchAll = jest.fn()
      mockUseKeuangan.mockReturnValue({
        ...defaultKeuanganMock,
        refetchAll: mockRefetchAll,
      })

      render(<KeuanganPage />, { wrapper: createTestWrapper() })

      const refreshButton = screen.getByTestId("refresh-data")
      fireEvent.click(refreshButton)

      expect(mockRefetchAll).toHaveBeenCalled()
    })
  })
})
