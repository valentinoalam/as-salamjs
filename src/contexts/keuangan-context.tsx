"use client"

import React, { createContext, useContext, useCallback, type ReactNode, useMemo, useRef, useEffect } from 'react'
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
  BudgetFormValues,
  perHewanSalesStat
} from '@/types/keuangan'
import { createBudget, createCategory, createQueryOptions, createTransaction, deleteBudget, deleteCategory, deleteTransaction, fetchBudgets, fetchCategories, fetchQurbanSalesStats, fetchTransactions, fetchTransactionStats, fetchWeeklyAnimalSales, QUERY_KEYS, updateBudget, updateCategory, uploadReceipt, useOptimizedMutation, type ApiResponse, type DataQuery } from '@/lib/tanstack-query/keuangan'

// Cache keys for localStorage
const CACHE_KEYS = {
  TRANSACTIONS: 'keuangan_transactions',
  CATEGORIES: 'keuangan_categories', 
  BUDGETS: 'keuangan_budgets',
  STATS: 'keuangan_stats',
  QURBAN_SALES: 'keuangan_qurban_sales',
  WEEKLY_SALES: 'keuangan_weekly_sales',
  PROCESSED_OVERVIEW: 'keuangan_processed_overview',
  LAST_FETCH: 'keuangan_last_fetch',
  FILTERS: 'keuangan_filters'
} as const

// Cache duration in milliseconds (5 minutes for dynamic data, 30 minutes for static data)
const CACHE_DURATION = {
  TRANSACTIONS: 5 * 60 * 1000, // 5 minutes
  CATEGORIES: 30 * 60 * 1000,  // 30 minutes
  BUDGETS: 10 * 60 * 1000,     // 10 minutes
  STATS: 5 * 60 * 1000,        // 5 minutes
  QURBAN_SALES: 5 * 60 * 1000, // 5 minutes
} as const

interface CombinedTransaction extends Transaction {
  isQurbanTransaction?: boolean
}

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};
class CacheManager {
  private static isClient = typeof window !== 'undefined'

  static get<T>(key: string): CacheEntry<T> | null {
    if (!this.isClient) return null
    
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      return {
        data: parsed.data as T,
        timestamp: parsed.timestamp,
      };
    } catch {
      return null;
    }
  }

  static set<T>(key: string, data: T): void {
    if (!this.isClient) return
    try {
      const cacheItem: CacheEntry<T> = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(key, JSON.stringify(cacheItem))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }

  static isValid(timestamp: number, duration: number): boolean {
    return Date.now() - timestamp < duration
  }

  static remove(key: string): void {
    if (!this.isClient) return
    localStorage.removeItem(key)
  }

  static clear(): void {
    if (!this.isClient) return
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }
}

// Memoized calculation hook
const useProcessedData = (allTransactions: CombinedTransaction[], categories: Category[]) => {
  const processingRef = useRef<{
    transactions: CombinedTransaction[]
    categories: Category[]
    result: ProcessedData
  } | null>(null)

  return useMemo(() => {
    // Check if we can reuse previous calculation
    if (processingRef.current && 
        processingRef.current.transactions === allTransactions &&
        processingRef.current.categories === categories) {
      return processingRef.current.result
    }

    // Check cache first
    const cached = CacheManager.get<ProcessedData>(CACHE_KEYS.PROCESSED_OVERVIEW)
    if (cached && CacheManager.isValid(cached.timestamp, 10 * 60 * 1000)) { // 10 min cache
      processingRef.current = { transactions: allTransactions, categories, result: cached.data }
      return cached.data
    }

    // Calculate fresh data
    const categoryTotals = new Map<string, { pemasukan: number; pengeluaran: number; categoryName: string }>()
    let totalPemasukan = 0
    let totalPengeluaran = 0

    allTransactions.forEach(transaction => {
      const categoryName = transaction.category?.name || 'Unknown'
      const key = `${transaction.categoryId}-${categoryName}`
      
      if (!categoryTotals.has(key)) {
        categoryTotals.set(key, { pemasukan: 0, pengeluaran: 0, categoryName })
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

    const colors = CATEGORY_COLORS
    const pemasukanData: CategoryDistribution[] = []
    const pengeluaranData: CategoryDistribution[] = []
    
    let colorIndex = 0
    categoryTotals.forEach(({ pemasukan, pengeluaran, categoryName }) => {
      const color = colors[colorIndex % colors.length]
      
      if (pemasukan > 0) {
        pemasukanData.push({ name: categoryName, value: pemasukan, color })
      }
      if (pengeluaran > 0) {
        pengeluaranData.push({ name: categoryName, value: pengeluaran, color })
      }
      colorIndex++
    })

    const result: ProcessedData = {
      pemasukanData: pemasukanData.sort((a, b) => b.value - a.value),
      pengeluaranData: pengeluaranData.sort((a, b) => b.value - a.value),
      totalPemasukan,
      totalPengeluaran
    }

    // Cache the result
    CacheManager.set(CACHE_KEYS.PROCESSED_OVERVIEW, result)
    processingRef.current = { transactions: allTransactions, categories, result }
    
    return result
  }, [allTransactions, categories])
}

// Category colors for overview data
const CATEGORY_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#87d068', '#ffb347', '#ff9999', '#87ceeb'
];

// Context interface
interface KeuanganContextType {
  // Data queries with loading and error states
  statsQuery: DataQuery<TransactionStats> 
  transactionsQuery: DataQuery<Transaction[]> 
  categoriesQuery: DataQuery<Category[]> 
  budgetsQuery: DataQuery<Budget[]> 
  qurbanSalesQuery: DataQuery<QurbanSalesStats>
  weeklySalesQuery: DataQuery<ChartDataResponse>

  // Combined and processed data
  allTransactions: CombinedTransaction[] // Regular + Qurban transactions combined
  filteredTransactions: CombinedTransaction[] // Apply current filters
  overviewData: ProcessedData // Calculated from allTransactions
  
  // Filter state and setters
  searchTerm: string
  typeFilter: TransactionType | "ALL"
  categoryFilter: string
  dateRange: { from?: Date; to?: Date }
  setSearchTerm: (term: string) => void
  setTypeFilter: (type: TransactionType | "ALL") => void
  setCategoryFilter: (categoryId: string) => void
  setDateRange: (range: { from?: Date; to?: Date }) => void
  resetFilters: () => void

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

  // Utility functions
  getCategoriesByType: (type: TransactionType) => Category[]
  getBudgetsByCategory: (categoryId: number) => Budget[]
  processDataForCharts: () => ProcessedData
  getCategoryById: (id: number) => Category | undefined
  getTransactionById: (id: string) => CombinedTransaction | undefined
  getBudgetById: (id: string) => Budget | undefined
  
  // Stats functions
  calculateCategoryTotal: (categoryId: number, type: TransactionType) => number
  calculateBudgetUsage: (budgetId: string) => { used: number; percentage: number; remaining: number }
  getMonthlyStats: (year: number, month: number) => { income: number; expense: number; balance: number }

  // Cache management
  clearCache: () => void
  refreshData: () => Promise<void>
}

const KeuanganContext = createContext<KeuanganContextType | undefined>(undefined)

interface KeuanganProviderProps {
  children: ReactNode
  initialData?: {
    stats?: TransactionStats
    transactions?: Transaction[]
    categories?: Category[]
    budgets?: Budget[]
    qurbanSalesStats?: QurbanSalesStats
    weeklyAnimalSales?: ChartDataResponse
  }
}

export function KeuanganProvider({ children, initialData }: KeuanganProviderProps) {
  const queryClient = useQueryClient()
  // Filter state - moved to context for global state management
  // Load filter state from localStorage
  const [filterState, setFilterState] = React.useState(() => {
    const cached = CacheManager.get<{
      searchTerm: string
      typeFilter: TransactionType | "ALL"
      categoryFilter: string
      dateRange: { from?: Date; to?: Date }
    }>(CACHE_KEYS.FILTERS)
    
    return cached?.data || {
      searchTerm: "",
      typeFilter: "ALL" as const,
      categoryFilter: "ALL",
      dateRange: {}
    }
  })

  // Save filters to localStorage when they change
  useEffect(() => {
    CacheManager.set(CACHE_KEYS.FILTERS, filterState)
  }, [filterState])

  // Helper function to get cached data or return initial data
  const getCachedOrInitial = <T,>(cacheKey: string, initialValue: T | undefined, duration: number): T | undefined => {
    const cached = CacheManager.get<T>(cacheKey)
    if (cached && CacheManager.isValid(cached.timestamp, duration)) {
      return cached.data
    }
    return initialValue
  }

  // Custom query options with caching
  const createCachedQueryOptions = <T,>(
    key: readonly unknown[],
    fetcher: () => Promise<T>,
    cacheKey: string,
    cacheDuration: number,
    initialValue?: T
  ) => {
    const cachedData = getCachedOrInitial(cacheKey, initialValue, cacheDuration)
    
    return createQueryOptions(
      key,
      async () => {
        const result = await fetcher()
        CacheManager.set(cacheKey, result)
        return result
      },
      { 
        initialData: cachedData,
        staleTime: cacheDuration * 0.8, // 80% of cache duration
        gcTime: cacheDuration * 2, // Keep in memory for 2x cache duration
      }
    )
  }
  // Data queries
  const statsQuery = useQuery(
    createCachedQueryOptions(
      QUERY_KEYS.stats,
      fetchTransactionStats,
      CACHE_KEYS.STATS,
      CACHE_DURATION.STATS,
      initialData?.stats
    )
  )

  const transactionsQuery = useQuery(
    createCachedQueryOptions(
      QUERY_KEYS.transactions(),
      () => fetchTransactions(),
      CACHE_KEYS.TRANSACTIONS,
      CACHE_DURATION.TRANSACTIONS,
      initialData?.transactions
    )
  )

  const categoriesQuery = useQuery(
    createCachedQueryOptions(
      QUERY_KEYS.categories,
      fetchCategories,
      CACHE_KEYS.CATEGORIES,
      CACHE_DURATION.CATEGORIES,
      initialData?.categories
    )
  )

  const budgetsQuery = useQuery(
    createCachedQueryOptions(
      QUERY_KEYS.budgets,
      fetchBudgets,
      CACHE_KEYS.BUDGETS,
      CACHE_DURATION.BUDGETS,
      initialData?.budgets
    )
  )

  const qurbanSalesQuery = useQuery(
    createCachedQueryOptions(
      QUERY_KEYS.qurbanSales,
      fetchQurbanSalesStats,
      CACHE_KEYS.QURBAN_SALES,
      CACHE_DURATION.QURBAN_SALES,
      initialData?.qurbanSalesStats
    )
  )

  const weeklySalesQuery = useQuery(
    createCachedQueryOptions(
      QUERY_KEYS.weeklySales,
      () => fetchWeeklyAnimalSales(),
      CACHE_KEYS.WEEKLY_SALES,
      10 * 60 * 1000, // 10 minutes
      initialData?.weeklyAnimalSales
    )
  )
  
  const transactions = transactionsQuery.data
  const categories = categoriesQuery.data
  const budgets = budgetsQuery.data
  const qurbanSales = qurbanSalesQuery.data

  // Combined transactions - merge regular and qurban transactions
  const allTransactions = useMemo((): CombinedTransaction[] => {
    const regularTransactions: CombinedTransaction[] = (transactions || []).map(t => ({
      ...t,
      isQurbanTransaction: false
    }))
    
    if (!qurbanSales?.perTipeHewan) {
      return regularTransactions
    }

    const qurbanCategory: Category = {
      id: 0,
      name: "Penjualan Hewan Qurban",
      type: TransactionType.PEMASUKAN
    }

    // Create transactions for each TipeHewan with sales
    const qurbanTransactions: CombinedTransaction[] = qurbanSales.perTipeHewan
      .filter((tipe: { count: number }) => tipe.count > 0)
      .map((tipe: perHewanSalesStat) => ({
        id: `qurban-${tipe.tipeHewanId}`,
        amount: tipe.currentAmount,
        description: `Penjualan ${tipe.nama}`,
        type: TransactionType.PEMASUKAN,
        categoryId: qurbanCategory?.id || -1,
        category: {
          ...qurbanCategory,
          name: `Qurban - ${tipe.nama}`
        },
        date: new Date(),
        receiptUrl: [],
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        isQurbanTransaction: true
      }))

    // Combine and sort by date (newest first)
    return [...qurbanTransactions, ...regularTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, qurbanSales])

  // Calculate overview data from allTransactions
  const overviewData = useProcessedData(allTransactions, categories || [])

  // Apply filters to combined transactions - centralized filtering logic
  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions]

    // Apply filters efficiently
    if (filterState.searchTerm) {
      const term = filterState.searchTerm.toLowerCase()
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(term) ||
        t.category.name.toLowerCase().includes(term) ||
        t.amount.toString().includes(term)
      )
    }

    if (filterState.typeFilter !== "ALL") {
      filtered = filtered.filter(t => t.type === filterState.typeFilter)
    }

    if (filterState.categoryFilter !== "ALL") {
      const categoryId = parseInt(filterState.categoryFilter)
      filtered = filtered.filter(t => t.categoryId === categoryId)
    }

    if (filterState.dateRange.from && filterState.dateRange.to) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date)
        return transactionDate >= filterState.dateRange.from! && transactionDate <= filterState.dateRange.to!
      })
    } else if (filterState.dateRange.from) {
      filtered = filtered.filter(t => new Date(t.date) >= filterState.dateRange.from!)
    }

    return filtered
  }, [allTransactions, filterState])

  // Filter setters that update the state object
  const setSearchTerm = useCallback((term: string) => {
    setFilterState(prev => ({ ...prev, searchTerm: term }))
  }, [])

  const setTypeFilter = useCallback((type: TransactionType | "ALL") => {
    setFilterState(prev => ({ ...prev, typeFilter: type }))
  }, [])

  const setCategoryFilter = useCallback((categoryId: string) => {
    setFilterState(prev => ({ ...prev, categoryFilter: categoryId }))
  }, [])

  const setDateRange = useCallback((range: { from?: Date; to?: Date }) => {
    setFilterState(prev => ({ ...prev, dateRange: range }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilterState({
      searchTerm: "",
      typeFilter: "ALL",
      categoryFilter: "ALL",
      dateRange: {}
    })
  }, [])

  // Mutations - updated to invalidate stats instead of overview
  const createTransactionMutation = useOptimizedMutation(
    createTransaction,
    [QUERY_KEYS.transactions(), QUERY_KEYS.latestTransactions, QUERY_KEYS.stats],
    {
      onSuccess: () => {
        CacheManager.remove(CACHE_KEYS.TRANSACTIONS)
        CacheManager.remove(CACHE_KEYS.STATS)
        CacheManager.remove(CACHE_KEYS.PROCESSED_OVERVIEW)
      }
    }
  )

  const deleteTransactionMutation = useOptimizedMutation(
    deleteTransaction,
    [QUERY_KEYS.transactions(), QUERY_KEYS.latestTransactions, QUERY_KEYS.stats],
    {
      onSuccess: () => {
        CacheManager.remove(CACHE_KEYS.TRANSACTIONS)
        CacheManager.remove(CACHE_KEYS.STATS)
        CacheManager.remove(CACHE_KEYS.PROCESSED_OVERVIEW)
      }
    }
  )

  const uploadReceiptMutation = useOptimizedMutation(uploadReceipt, [])

  const createCategoryMutation = useOptimizedMutation(
    createCategory,
    [QUERY_KEYS.categories],
    { onSuccess: () => CacheManager.remove(CACHE_KEYS.CATEGORIES) }
  )

  const updateCategoryMutation = useOptimizedMutation(
    ({ id, data }: { id: number; data: CategoryFormValues }) => updateCategory(id, data),
    [QUERY_KEYS.categories],
    { onSuccess: () => CacheManager.remove(CACHE_KEYS.CATEGORIES) }
  )

  const deleteCategoryMutation = useOptimizedMutation(
    deleteCategory,
    [QUERY_KEYS.categories, QUERY_KEYS.transactions(), QUERY_KEYS.budgets],
    {
      onSuccess: () => {
        CacheManager.remove(CACHE_KEYS.CATEGORIES)
        CacheManager.remove(CACHE_KEYS.TRANSACTIONS)
        CacheManager.remove(CACHE_KEYS.BUDGETS)
      }
    }
  )

  const createBudgetMutation = useOptimizedMutation(
    createBudget,
    [QUERY_KEYS.budgets],
    { onSuccess: () => CacheManager.remove(CACHE_KEYS.BUDGETS) }
  )

  const updateBudgetMutation = useOptimizedMutation(
    ({ id, data }: { id: string; data: BudgetFormValues }) => updateBudget(id, data),
    [QUERY_KEYS.budgets],
    { onSuccess: () => CacheManager.remove(CACHE_KEYS.BUDGETS) }
  )

  const deleteBudgetMutation = useOptimizedMutation(
    deleteBudget,
    [QUERY_KEYS.budgets],
    { onSuccess: () => CacheManager.remove(CACHE_KEYS.BUDGETS) }
  )

  // Utility functions - simplified since we use centralized filtering
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

  // Optimized chart data processing using allTransactions
  const processDataForCharts = useCallback((): ProcessedData => {
    return overviewData
  }, [overviewData])

  // Lookup functions with useMemo for better performance
  const getCategoryById = useMemo(() => {
    const categoryMap = new Map(categories?.map(cat => [cat.id, cat]) || [])
    return (id: number) => categoryMap.get(id)
  }, [categories])

  const getTransactionById = useMemo(() => {
    const transactionMap = new Map(allTransactions?.map(t => [t.id, t]) || [])
    return (id: string) => transactionMap.get(id)
  }, [allTransactions])

  const getBudgetById = useMemo(() => {
    const budgetMap = new Map(budgets?.map(b => [b.id, b]) || [])
    return (id: string) => budgetMap.get(id)
  }, [budgets])

  // Stats functions using allTransactions for consistency
  const calculateCategoryTotal = useCallback(
    (categoryId: number, type: TransactionType): number => {
      return (
        allTransactions
          ?.filter((t) => t.categoryId === categoryId && t.type === type)
          .reduce((sum, t) => sum + t.amount, 0) || 0
      )
    },
    [allTransactions]
  )

  const calculateBudgetUsage = useCallback(
    (budgetId: string): { used: number; percentage: number; remaining: number } => {
      const budget = budgets?.find((b) => b.id === budgetId)
      if (!budget) return { used: 0, percentage: 0, remaining: 0 }

      const relevantTransactions =
        allTransactions?.filter(
          (t) =>
            t.categoryId === budget.categoryId &&
            new Date(t.date) >= new Date(budget.startDate) &&
            new Date(t.date) <= new Date(budget.endDate) &&
            t.type === budget.category.type &&
            !t.isQurbanTransaction // Exclude qurban transactions from budget calculations
        ) || []

      const used = relevantTransactions.reduce((sum, t) => sum + t.amount, 0)
      const percentage = budget.amount > 0 ? (used / budget.amount) * 100 : 0
      const remaining = Math.max(budget.amount - used, 0)

      return { used, percentage, remaining }
    },
    [allTransactions, budgets]
  )

  const getMonthlyStats = useCallback(
    (year: number, month: number): { income: number; expense: number; balance: number } => {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59, 999)

      const monthlyTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.date)
        return transactionDate >= startDate && transactionDate <= endDate
      })

      const income = monthlyTransactions
        .filter((t) => t.type === TransactionType.PEMASUKAN)
        .reduce((sum, t) => sum + t.amount, 0)

      const expense = monthlyTransactions
        .filter((t) => t.type === TransactionType.PENGELUARAN)
        .reduce((sum, t) => sum + t.amount, 0)

      return { income, expense, balance: income - expense }
    },
    [allTransactions]
  )

  // Cache management functions
  const clearCache = useCallback(() => {
    CacheManager.clear()
    queryClient.clear()
  }, [queryClient])

  const refreshData = useCallback(async () => {
    CacheManager.clear()
    await queryClient.refetchQueries()
  }, [queryClient])
  const contextValue: KeuanganContextType = {
    // Data queries (removed overviewQuery)
    statsQuery,
    transactionsQuery,
    categoriesQuery,
    budgetsQuery,
    qurbanSalesQuery,
    weeklySalesQuery,

    // Combined and processed data
    allTransactions,
    filteredTransactions,
    overviewData, // Now calculated from allTransactions

    // Filter state and setters
    searchTerm: filterState.searchTerm,
    typeFilter: filterState.typeFilter,
    categoryFilter: filterState.categoryFilter,
    dateRange: filterState.dateRange,
    setSearchTerm,
    setTypeFilter,
    setCategoryFilter,
    setDateRange,
    resetFilters,

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

    // Utility functions
    getCategoriesByType,
    getBudgetsByCategory,
    processDataForCharts,
    getCategoryById,
    getTransactionById,
    getBudgetById,

    // Stats functions
    calculateCategoryTotal,
    calculateBudgetUsage,
    getMonthlyStats,

    // Cache management
    clearCache,
    refreshData,
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

export type { KeuanganContextType, CombinedTransaction }