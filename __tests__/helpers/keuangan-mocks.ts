import type { TransactionStats, Transaction, Category } from "@/types/keuangan"
import { TransactionType } from "@prisma/client"

export const createMockStats = (overrides?: Partial<TransactionStats>): TransactionStats => ({
  totalIncome: 50000000,
  totalExpense: 30000000,
  balance: 20000000,
  monthlyIncome: 25000000,
  monthlyExpense: 15000000,
  monthlyBalance: 10000000,
  ...overrides,
})

export const createMockTransaction = (overrides?: Partial<Transaction>): Transaction => ({
  id: "trx_1",
  amount: 25000000,
  description: "Test Transaction",
  type: TransactionType.PEMASUKAN,
  date: new Date("2024-01-01"),
  categoryId: "cat_1",
  category: {
    id: "cat_1",
    name: "Test Category",
    type: TransactionType.PEMASUKAN,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  receiptUrl: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  createdBy: "1",
  isAnimalSale: false,
  tipeHewanId: null,
  ...overrides,
})

export const createMockCategory = (overrides?: Partial<Category>): Category => ({
  id: "cat_1",
  name: "Test Category",
  type: TransactionType.PEMASUKAN,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
})

export const createMockKeuanganContext = (overrides?: any) => ({
  // Data
  stats: createMockStats(),
  transactions: [createMockTransaction()],
  categories: [createMockCategory()],
  budgets: [],
  overviewData: [],
  qurbanSalesStats: {
    currentIncome: 50000000,
    targetIncome: 100000000,
    totalOrders: 10,
    completedOrders: 8,
    perHewanSalesStats: [],
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

  ...overrides,
})

// Mock fetch responses
export const mockFetchResponses = {
  stats: {
    ok: true,
    json: async () => createMockStats(),
  },
  transactions: {
    ok: true,
    json: async () => [createMockTransaction()],
  },
  categories: {
    ok: true,
    json: async () => [createMockCategory()],
  },
  error: {
    ok: false,
    status: 500,
    json: async () => ({ error: "Internal Server Error" }),
  },
}
