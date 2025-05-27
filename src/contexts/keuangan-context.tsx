"use client"

import React, { createContext, useContext, useCallback, type ReactNode, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TransactionType } from '@prisma/client'
import type { 
  Category, 
  Transaction, 
  Budget, 
  TransactionStats, 
  CategoryDistribution, 
  QurbanSalesStats,
  ChartDataResponse,
  ProcessedData,
  CategoryFormValues,
  TransactionFormValues,
  BudgetFormValues
} from '@/types/keuangan'
import { createBudget, createCategory, createQueryOptions, createTransaction, deleteBudget, deleteCategory, deleteTransaction, fetchBudgets, fetchCategories, fetchLatestTransactions, fetchOverviewData, fetchQurbanSalesStats, fetchTransactions, fetchTransactionStats, fetchWeeklyAnimalSales, QUERY_KEYS, updateBudget, updateCategory, uploadReceipt, useOptimizedMutation, type ApiResponse, type DataQuery } from '@/lib/tanstack-query/keuangan'

// Enhanced Transaction type for combined data
interface CombinedTransaction extends Transaction {
  isQurbanTransaction?: boolean
}
// Context interface
interface KeuanganContextType {
  // Data queries with loading and error states
  statsQuery: DataQuery<TransactionStats> 
  transactionsQuery: DataQuery<Transaction[]> 
  // latestTransactions: Transaction[] 
  categoriesQuery: DataQuery<Category[]> 
  budgetsQuery: DataQuery<Budget[]> 
  overviewQuery: DataQuery<CategoryDistribution[]> ,
  qurbanSalesQuery: DataQuery<QurbanSalesStats> ,
  weeklySalesQuery: DataQuery<ChartDataResponse> ,

  // Mutation functions
  createTransaction: (data: TransactionFormValues) => Promise<ApiResponse<string>>
  deleteTransaction: (id: string) => Promise<ApiResponse<void>>
  uploadReceipt: (formData: FormData) => Promise<ApiResponse<void>>
  createCategory: (data: CategoryFormValues) => Promise<ApiResponse<Category>>
  updateCategory: (id: number, data: CategoryFormValues) => Promise<ApiResponse<Category>>
  deleteCategory: (id: number) => Promise<ApiResponse<void>>
  createBudget: (data: BudgetFormValues) => Promise<ApiResponse<Budget>>
  updateBudget: (id: string, data: BudgetFormValues) => Promise<ApiResponse<Budget>>
  deleteBudget: (id: string) => Promise<ApiResponse<void>>

  // Filter and utility functions
  getTransactionsByType: (type: TransactionType) => Transaction[]
  getTransactionsByCategory: (categoryId: number) => Transaction[]
  getTransactionsByDateRange: (startDate: Date, endDate: Date) => Transaction[]
  getCategoriesByType: (type: TransactionType) => Category[]
  getBudgetsByCategory: (categoryId: number) => Budget[]
  processDataForCharts: () => ProcessedData
  getCategoryById: (id: number) => Category | undefined
  getTransactionById: (id: string) => Transaction | undefined
  getBudgetById: (id: string) => Budget | undefined
  
  // Enhanced search and filter functions
  searchTransactions: (searchTerm: string, type?: TransactionType) => Transaction[]
  getFilteredTransactions: (filters: {
    type?: TransactionType
    categoryId?: string
    searchTerm?: string
    startDate?: Date
    endDate?: Date
  }) => Promise<Transaction[]>
  getWeeklyAnimalSalesData: (year?: number, month?: number) => Promise<ChartDataResponse>

  // Stats functions
  calculateCategoryTotal: (categoryId: number, type: TransactionType) => number
  calculateBudgetUsage: (budgetId: string) => { used: number; percentage: number; remaining: number }
  getMonthlyStats: (year: number, month: number) => { income: number; expense: number; balance: number }
}

const KeuanganContext = createContext<KeuanganContextType | undefined>(undefined)

interface KeuanganProviderProps {
  children: ReactNode
  initialData?: {
    stats?: TransactionStats
    transactions?: Transaction[]
    latestTransactions?: Transaction[]
    categories?: Category[]
    budgets?: Budget[]
    overviewData?: CategoryDistribution[]
    qurbanSalesStats?: QurbanSalesStats
    weeklyAnimalSales?: ChartDataResponse
  }
}

export function KeuanganProvider({ children, initialData }: KeuanganProviderProps) {
  const queryClient = useQueryClient()

  // Data queries
  const statsQuery = useQuery(
    createQueryOptions(
      QUERY_KEYS.stats,
      fetchTransactionStats,
      { 
        initialData: initialData?.stats,
      }
    )
  )

  const transactionsQuery = useQuery(
    createQueryOptions(
      QUERY_KEYS.transactions(),
      () => fetchTransactions(),
      { initialData: initialData?.transactions }
    )
  )

  const categoriesQuery = useQuery(
    createQueryOptions(
      QUERY_KEYS.categories,
      fetchCategories,
      { 
        initialData: initialData?.categories,
      }
    )
  )

  const budgetsQuery = useQuery(
    createQueryOptions(
      QUERY_KEYS.budgets,
      fetchBudgets,
      { initialData: initialData?.budgets }
    )
  )
  
  
  const overviewQuery = useQuery(
    createQueryOptions(
      QUERY_KEYS.overview,
      fetchOverviewData,
      { initialData: initialData?.overviewData }
    )
  )

  const qurbanSalesQuery = useQuery(
    createQueryOptions(
      QUERY_KEYS.qurbanSales,
      fetchQurbanSalesStats,
      { initialData: initialData?.qurbanSalesStats }
    )
  )

  const weeklySalesQuery = useQuery(
    createQueryOptions(
      QUERY_KEYS.weeklySales,
      () => fetchWeeklyAnimalSales(),
      { initialData: initialData?.weeklyAnimalSales }
    )
  )
  
  const transactions = transactionsQuery.data
  const categories = categoriesQuery.data
  const budgets = budgetsQuery.data
  // Mutations
  // Optimized mutations using useOptimizedMutation
  const createTransactionMutation = useOptimizedMutation(
    createTransaction,
    [QUERY_KEYS.transactions(), QUERY_KEYS.latestTransactions, QUERY_KEYS.stats, QUERY_KEYS.overview]
  )

  const deleteTransactionMutation = useOptimizedMutation(
    deleteTransaction,
    [QUERY_KEYS.transactions(), QUERY_KEYS.latestTransactions, QUERY_KEYS.stats, QUERY_KEYS.overview]
  )

  const uploadReceiptMutation = useOptimizedMutation(uploadReceipt, [])

  const createCategoryMutation = useOptimizedMutation(
    createCategory,
    [QUERY_KEYS.categories]
  )

  const updateCategoryMutation = useOptimizedMutation(
    ({ id, data }: { id: number; data: CategoryFormValues }) => updateCategory(id, data),
    [QUERY_KEYS.categories]
  )

  const deleteCategoryMutation = useOptimizedMutation(
    deleteCategory,
    [QUERY_KEYS.categories, QUERY_KEYS.transactions(), QUERY_KEYS.budgets]
  )

  const createBudgetMutation = useOptimizedMutation(
    createBudget,
    [QUERY_KEYS.budgets]
  )

  const updateBudgetMutation = useOptimizedMutation(
    ({ id, data }: { id: string; data: BudgetFormValues }) => updateBudget(id, data),
    [QUERY_KEYS.budgets]
  )

  const deleteBudgetMutation = useOptimizedMutation(
    deleteBudget,
    [QUERY_KEYS.budgets]
  )

  // Filter functions
  const getTransactionsByType = useCallback(
    (type: TransactionType): Transaction[] => {
      return transactions?.filter((t) => t.type === type) || []
    },
    [transactions]
  )

  const getTransactionsByCategory = useCallback(
    (categoryId: number): Transaction[] => {
      return transactions?.filter((t) => t.categoryId === categoryId) || []
    },
    [transactions]
  )

  const getTransactionsByDateRange = useCallback(
    (startDate: Date, endDate: Date): Transaction[] => {
      return (
        transactions?.filter((t) => {
          const transactionDate = new Date(t.date)
          return transactionDate >= startDate && transactionDate <= endDate
        }) || []
      )
    },
    [transactions]
  )

  const getCategoriesByType = useCallback(
    (type: TransactionType): Category[] => {
      return categories?.filter((c) => c.type === type) || []
    },
    [categories]
  )

  const getBudgetsByCategory = useCallback(
    (categoryId: number): Budget[] => {
      return budgets?.filter((b) => b.categoryId === categoryId) || []
    },
    [budgets]
  )

  // Enhanced search function
  const searchTransactions = useCallback(
    (searchTerm: string, type?: TransactionType): Transaction[] => {
      if (!transactions) return []
      
      const term = searchTerm.toLowerCase()
      return transactions.filter(t => {
        const matchesType = !type || t.type === type
        const matchesSearch = 
          t.description.toLowerCase().includes(term) ||
          t.amount.toString().includes(term)
        
        return matchesType && matchesSearch
      })
    },
    [transactions]
  )
  // Additional filter function for fetching filtered transactions from API
  const getFilteredTransactions = useCallback(
    async (filters: {
      type?: TransactionType
      categoryId?: string
      searchTerm?: string
      startDate?: Date
      endDate?: Date
    }): Promise<Transaction[]> => {
      return fetchTransactions(filters)
    },
    []
  )

  // Additional function for fetching weekly sales data
  const getWeeklyAnimalSalesData = useCallback(
    async (year?: number, month?: number): Promise<ChartDataResponse> => {
      return fetchWeeklyAnimalSales(year, month)
    },
    []
  )

  // Optimized chart data processing with useMemo
  const processDataForCharts = useCallback((): ProcessedData => {
    if (!transactions || !categories) {
      return { 
        pemasukanData: [], 
        pengeluaranData: [], 
        totalPemasukan: 0, 
        totalPengeluaran: 0 
      }
    }

    // Create category map for O(1) lookups
    const categoryMap = new Map(categories.map(c => [c.id, c]))
    
    // Process transactions in a single pass
    const categoryTotals = new Map<string, { 
      pemasukan: number; 
      pengeluaran: number; 
      categoryName: string;
      categoryId: number;
    }>()
    
    let totalPemasukan = 0
    let totalPengeluaran = 0

    transactions.forEach(transaction => {
      const category = categoryMap.get(transaction.categoryId)
      const categoryName = category?.name || 'Unknown'
      const key = `${transaction.categoryId}-${categoryName}`
      
      if (!categoryTotals.has(key)) {
        categoryTotals.set(key, {
          pemasukan: 0, 
          pengeluaran: 0, 
          categoryName,
          categoryId: transaction.categoryId
        })
      }
      
      const totals = categoryTotals.get(key)!
      if (transaction.type === TransactionType.PEMASUKAN) {
        totals.pemasukan += transaction.amount
        totalPemasukan += transaction.amount
      } else {
        totals.pengeluaran += transaction.amount
        totalPengeluaran += transaction.amount
      }
    })

    // Generate chart data
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', 
      '#8dd1e1', '#d084d0', '#87d068', '#ffb347',
      '#ff9999', '#66b3ff', '#99ff99', '#ffcc99'
    ]
    
    const pemasukanData: Array<{ name: string; value: number; fill: string }> = []
    const pengeluaranData: Array<{ name: string; value: number; fill: string }> = []
    
    let colorIndex = 0
    categoryTotals.forEach(({ pemasukan, pengeluaran, categoryName }) => {
      const color = colors[colorIndex % colors.length]
      
      if (pemasukan > 0) {
        pemasukanData.push({ name: categoryName, value: pemasukan, fill: color })
      }
      
      if (pengeluaran > 0) {
        pengeluaranData.push({ name: categoryName, value: pengeluaran, fill: color })
      }
      
      colorIndex++
    })

    return {
      pemasukanData: pemasukanData.sort((a, b) => b.value - a.value),
      pengeluaranData: pengeluaranData.sort((a, b) => b.value - a.value),
      totalPemasukan,
      totalPengeluaran
    }
  }, [transactions, categories])

  // Lookup functions with useMemo for better performance
  const getCategoryById = useMemo(() => {
    const categoryMap = new Map(categories?.map(cat => [cat.id, cat]) || [])
    return (id: number) => categoryMap.get(id)
  }, [categories])

  const getTransactionById = useMemo(() => {
    const transactionMap = new Map(transactions?.map(t => [t.id, t]) || [])
    return (id: string) => transactionMap.get(id)
  }, [transactions])

  const getBudgetById = useMemo(() => {
    const budgetMap = new Map(budgets?.map(b => [b.id, b]) || [])
    return (id: string) => budgetMap.get(id)
  }, [budgets])

  // Stats functions with proper memoization
  const calculateCategoryTotal = useCallback(
    (categoryId: number, type: TransactionType): number => {
      return (
        transactions
          ?.filter((t) => t.categoryId === categoryId && t.type === type)
          .reduce((sum, t) => sum + t.amount, 0) || 0
      )
    },
    [transactions]
  )

  const calculateBudgetUsage = useCallback(
    (budgetId: string): { used: number; percentage: number; remaining: number } => {
      const budget = budgets?.find((b) => b.id === budgetId)
      if (!budget) return { used: 0, percentage: 0, remaining: 0 }

      const relevantTransactions =
        transactions?.filter(
          (t) =>
            t.categoryId === budget.categoryId &&
            new Date(t.date) >= new Date(budget.startDate) &&
            new Date(t.date) <= new Date(budget.endDate) &&
            t.type === budget.category.type,
        ) || []

      const used = relevantTransactions.reduce((sum, t) => sum + t.amount, 0)
      const percentage = budget.amount > 0 ? (used / budget.amount) * 100 : 0
      const remaining = Math.max(budget.amount - used, 0)

      return { used, percentage, remaining }
    },
    [transactions, budgets]
  )

  const getMonthlyStats = useCallback(
    (year: number, month: number): { income: number; expense: number; balance: number } => {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59, 999)

      const monthlyTransactions = getTransactionsByDateRange(startDate, endDate)

      const income = monthlyTransactions
        .filter((t) => t.type === TransactionType.PEMASUKAN)
        .reduce((sum, t) => sum + t.amount, 0)

      const expense = monthlyTransactions
        .filter((t) => t.type === TransactionType.PENGELUARAN)
        .reduce((sum, t) => sum + t.amount, 0)

      return { income, expense, balance: income - expense }
    },
    [getTransactionsByDateRange]
  )

  const contextValue: KeuanganContextType = {
    // Data
    statsQuery,
    transactionsQuery,
    categoriesQuery,
    budgetsQuery,
    overviewQuery,
    qurbanSalesQuery,
    weeklySalesQuery,
    // Mutations
    createTransaction: createTransactionMutation.mutateAsync,
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    uploadReceipt: uploadReceiptMutation.mutateAsync,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: (id: number, data: CategoryFormValues) => updateCategoryMutation.mutateAsync({ id, data }),
    deleteCategory: deleteCategoryMutation.mutateAsync,
    createBudget: createBudgetMutation.mutateAsync,
    updateBudget: (id: string, data: BudgetFormValues) => updateBudgetMutation.mutateAsync({ id, data }),
    deleteBudget: deleteBudgetMutation.mutateAsync,

    // Filter and utility functions
    getTransactionsByType,
    getTransactionsByCategory,
    getTransactionsByDateRange,
    getCategoriesByType,
    getBudgetsByCategory,
    processDataForCharts,
    getCategoryById,
    getTransactionById,
    getBudgetById,

    // Enhanced search and filter functions
    searchTransactions,
    getFilteredTransactions,
    getWeeklyAnimalSalesData,

    // Stats functions
    calculateCategoryTotal,
    calculateBudgetUsage,
    getMonthlyStats,
  }

  return <KeuanganContext.Provider value={contextValue}>{children}</KeuanganContext.Provider>
}

export function useKeuangan() {
  const context = useContext(KeuanganContext)
  if (context === undefined) {
    throw new Error('useKeuangan must be used within a KeuanganProvider')
  }
  return context
}

export type { KeuanganContextType }