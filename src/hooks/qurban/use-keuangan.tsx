/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo, useRef, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { CacheManager, createCachedQueryOptions } from '#@/lib/manager/cache-manager.ts'
import { 
  CACHE_KEYS, 
  CACHE_DURATION 
} from '#@/lib/utils/constants.ts'
import { 
  createBudget, 
  createCategory, 
  createQueryOptions, 
  createTransaction, 
  deleteBudget, 
  deleteCategory, 
  deleteTransaction, 
  fetchBudgets, 
  fetchCategories, 
  fetchQurbanSalesStats, 
  fetchTransactions, 
  fetchTransactionStats, 
  fetchWeeklyAnimalSales, 
  QUERY_KEYS, 
  updateBudget, 
  updateCategory, 
  uploadReceipt, 
  useOptimizedMutation, 
} from '@/lib/tanstack-query/keuangan'
import type { 
  TransactionStats, 
  Category, 
  QurbanSalesStats, 
  ChartDataResponse, 
  Transaction, 
  Budget, 
  ProcessedData, 
  CategoryDistribution, 
  CombinedTransaction,
  CategoryFormValues,
  BudgetFormValues,
  perHewanSalesStat
} from '@/types/keuangan'
import { TransactionType } from '@prisma/client'
import { useClientQuerySync } from '../use-query'

// Filter state interface
interface FilterState {
  searchTerm: string
  typeFilter: TransactionType | "ALL"
  categoryFilter: string
  dateRange: { from?: Date; to?: Date }
}

interface KeuanganStore extends FilterState {
  // Actions
  setSearchTerm: (term: string) => void
  setTypeFilter: (type: TransactionType | "ALL") => void
  setCategoryFilter: (categoryId: string) => void
  setDateRange: (range: { from?: Date; to?: Date }) => void
  resetFilters: () => void
  initializeFilters: () => void
}

// Create Zustand store
const useKeuanganStore = create<KeuanganStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial filter state
    searchTerm: "",
    typeFilter: "ALL" as const,
    categoryFilter: "ALL",
    dateRange: {},

    // Actions
    setSearchTerm: (term: string) => set({ searchTerm: term }),
    setTypeFilter: (type: TransactionType | "ALL") => set({ typeFilter: type }),
    setCategoryFilter: (categoryId: string) => set({ categoryFilter: categoryId }),
    setDateRange: (range: { from?: Date; to?: Date }) => set({ dateRange: range }),
    resetFilters: () => set({
      searchTerm: "",
      typeFilter: "ALL" as const,
      categoryFilter: "ALL",
      dateRange: {}
    }),
    initializeFilters: () => {
      const cached = CacheManager.get<FilterState>(CACHE_KEYS.FILTERS)
      if (cached?.data) {
        set({
          searchTerm: cached.data.searchTerm,
          typeFilter: cached.data.typeFilter,
          categoryFilter: cached.data.categoryFilter,
          dateRange: cached.data.dateRange
        })
      }
    }
  }))
)

// Subscribe to filter changes and save to cache
useKeuanganStore.subscribe(
  (state) => ({
    searchTerm: state.searchTerm,
    typeFilter: state.typeFilter,
    categoryFilter: state.categoryFilter,
    dateRange: state.dateRange
  }),
  (filterState) => {
    CacheManager.set(CACHE_KEYS.FILTERS, filterState)
  }
)

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
    
    // Debug: Log all transactions to see what we're working with
    console.log('Processing transactions:', {
      total: allTransactions.length,
      qurbanCount: allTransactions.filter(t => t.isQurbanTransaction).length,
      regularCount: allTransactions.filter(t => !t.isQurbanTransaction).length
    })
    
    // Calculate fresh data
    const categoryTotals = new Map<string, { 
      pemasukan: number; 
      pengeluaran: number; 
      categoryName: string;
      categoryId: number;
      isQurban: boolean;
    }>()
    
    let totalPemasukan = 0
    let totalPengeluaran = 0
    
    allTransactions.forEach((transaction, index) => {
      // Enhanced debugging for problematic transactions
      if (!transaction.type) {
        console.warn(`Transaction ${index} missing type:`, transaction)
        return
      }
      
      if (!transaction.category && !transaction.categoryId) {
        console.warn(`Transaction ${index} missing category:`, transaction)
      }
      
      // Improved category name resolution
      let categoryName: string
      let categoryId: number
      
      if (transaction.category?.name) {
        categoryName = transaction.category.name
        categoryId = transaction.categoryId || transaction.category.id
      } else if (transaction.categoryId) {
        // Fallback: find category from categories array
        const foundCategory = categories.find(c => c.id === transaction.categoryId)
        categoryName = foundCategory?.name || `Category ${transaction.categoryId}`
        categoryId = transaction.categoryId
      } else {
        // Last resort: use a default category
        categoryName = transaction.isQurbanTransaction ? 'Qurban' : 'Unknown'
        categoryId = transaction.categoryId || -1
      }
      
      // Create unique key that includes Qurban status
      const key = transaction.isQurbanTransaction 
        ? `qurban-${categoryId}-${categoryName}`
        : `regular-${categoryId}-${categoryName}`
      
      if (!categoryTotals.has(key)) {
        categoryTotals.set(key, { 
          pemasukan: 0, 
          pengeluaran: 0, 
          categoryName: transaction.isQurbanTransaction ? `${categoryName} (Qurban)` : categoryName,
          categoryId,
          isQurban: !!transaction.isQurbanTransaction
        })
      }
      
      const totals = categoryTotals.get(key)!
      
      // Process based on transaction type
      if (transaction.type === TransactionType.PEMASUKAN) {
        totals.pemasukan += transaction.amount
        totalPemasukan += transaction.amount
      } else if (transaction.type === TransactionType.PENGELUARAN) {
        totals.pengeluaran += transaction.amount
        totalPengeluaran += transaction.amount
      } else {
        console.warn(`Unknown transaction type: ${transaction.type} for transaction:`, transaction)
      }
    })
    
    // Debug: Log category totals
    console.log('Category totals:', Array.from(categoryTotals.entries()))
    
    const colors = CATEGORY_COLORS
    const pemasukanData: CategoryDistribution[] = []
    const pengeluaranData: CategoryDistribution[] = []
    
    let colorIndex = 0
    categoryTotals.forEach(({ pemasukan, pengeluaran, categoryName, isQurban }) => {
      const color = colors[colorIndex % colors.length]
      
      if (pemasukan > 0) {
        pemasukanData.push({ 
          name: categoryName, 
          value: pemasukan, 
          color,
          // Add metadata for better debugging
          metadata: { isQurban }
        })
      }
      if (pengeluaran > 0) {
        pengeluaranData.push({ 
          name: categoryName, 
          value: pengeluaran, 
          color,
          // Add metadata for better debugging
          metadata: { isQurban }
        })
      }
      colorIndex++
    })
    
    const result: ProcessedData = {
      pemasukanData: pemasukanData.sort((a, b) => b.value - a.value),
      pengeluaranData: pengeluaranData.sort((a, b) => b.value - a.value),
      totalPemasukan,
      totalPengeluaran,
      // Add debug info
      debug: {
        totalTransactions: allTransactions.length,
        qurbanTransactions: allTransactions.filter(t => t.isQurbanTransaction).length,
        processedCategories: categoryTotals.size
      }
    }
    
    // Debug: Log final result
    console.log('Final processed data:', {
      pemasukanCount: result.pemasukanData.length,
      pengeluaranCount: result.pengeluaranData.length,
      totalPemasukan: result.totalPemasukan,
      totalPengeluaran: result.totalPengeluaran,
      debug: result.debug
    })
    
    // Cache the result
    CacheManager.set(CACHE_KEYS.PROCESSED_OVERVIEW, result)
    processingRef.current = { transactions: allTransactions, categories, result }
    
    return result
  }, [allTransactions, categories])
}

// Category colors for overview data
const CATEGORY_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#87d068', '#ffb347', '#ff9999', '#87ceeb',
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F472B6', // Pink-400
  '#A855F7', // Purple
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F87171'  // Red-400
];
export const useFinancialData = (initialData?: {
    stats?: TransactionStats
    transactions?: Transaction[]
    categories?: Category[]
    budgets?: Budget[]
    qurbanSalesStats?: QurbanSalesStats
    weeklyAnimalSales?: ChartDataResponse
  }) => {
  const { queryClient } = useClientQuerySync();
  const invalidateCache = (keys: readonly string[]) => {
    keys.forEach(key => {
      CacheManager.remove(key);
      const keywords = key.split("_")
      const secondWord = keywords.slice(1).join("_")
      const queryKey = [keywords[0], secondWord]
      queryClient.invalidateQueries({ queryKey, exact: false });
    });
  }
  // Initialize Zustand store
  const {
    searchTerm,
    typeFilter,
    categoryFilter,
    dateRange,
    setSearchTerm,
    setTypeFilter,
    setCategoryFilter,
    setDateRange,
    resetFilters,
    initializeFilters
  } = useKeuanganStore()

  // Initialize filters on first load
  useEffect(() => {
    initializeFilters()
  }, [initializeFilters])

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
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(term) ||
        t.category.name.toLowerCase().includes(term) ||
        t.amount.toString().includes(term)
      )
    }

    if (typeFilter !== "ALL") {
      filtered = filtered.filter(t => t.type === typeFilter)
    }

    if (categoryFilter !== "ALL") {
      const categoryId = parseInt(categoryFilter)
      filtered = filtered.filter(t => t.categoryId === categoryId)
    }

    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date)
        return transactionDate >= dateRange.from! && transactionDate <= dateRange.to!
      })
    } else if (dateRange.from) {
      filtered = filtered.filter(t => new Date(t.date) >= dateRange.from!)
    }

    return filtered
  }, [allTransactions, searchTerm, typeFilter, categoryFilter, dateRange])

  // Mutations - updated to invalidate stats instead of overview
  const createTransactionMutation = useOptimizedMutation(
    createTransaction,
    [QUERY_KEYS.transactions(), QUERY_KEYS.latestTransactions, QUERY_KEYS.stats, QUERY_KEYS.budgets],
    {
      onSuccess: () => {
        invalidateCache([CACHE_KEYS.TRANSACTIONS, CACHE_KEYS.STATS, CACHE_KEYS.PROCESSED_OVERVIEW, CACHE_KEYS.BUDGETS])
      }
    }
  )

  const deleteTransactionMutation = useOptimizedMutation(
    deleteTransaction,
    [QUERY_KEYS.transactions(), QUERY_KEYS.latestTransactions, QUERY_KEYS.stats, QUERY_KEYS.budgets],
    {
      onSuccess: () => {
        invalidateCache([CACHE_KEYS.TRANSACTIONS, CACHE_KEYS.STATS, CACHE_KEYS.PROCESSED_OVERVIEW,CACHE_KEYS.BUDGETS])
      }
    }
  )

  const uploadReceiptMutation = useOptimizedMutation(uploadReceipt, [])

  const createCategoryMutation = useOptimizedMutation(
    createCategory,
    [QUERY_KEYS.categories],
    { onSuccess: () => invalidateCache([CACHE_KEYS.CATEGORIES]) }
  )

  const updateCategoryMutation = useOptimizedMutation(
    ({ id, data }: { id: number; data: CategoryFormValues }) => updateCategory(id, data),
    [QUERY_KEYS.categories],
    { onSuccess: () => invalidateCache([CACHE_KEYS.CATEGORIES]) }
  )

  const deleteCategoryMutation = useOptimizedMutation(
    deleteCategory,
    [QUERY_KEYS.categories, QUERY_KEYS.transactions(), QUERY_KEYS.budgets],
    {
      onSuccess: () => {
        invalidateCache([CACHE_KEYS.CATEGORIES, CACHE_KEYS.TRANSACTIONS, CACHE_KEYS.BUDGETS])
        // CacheManager.remove(CACHE_KEYS.CATEGORIES);
        // queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories, exact: false });
      }
    }
  )

  const createBudgetMutation = useOptimizedMutation(
    createBudget,
    [QUERY_KEYS.budgets],
    { onSuccess: () => invalidateCache([CACHE_KEYS.BUDGETS]) }
  )

  const updateBudgetMutation = useOptimizedMutation(
    ({ id, data }: { id: string; data: BudgetFormValues }) => updateBudget(id, data),
    [QUERY_KEYS.budgets],
    { onSuccess: () => invalidateCache([CACHE_KEYS.BUDGETS]) }
  )

  const deleteBudgetMutation = useOptimizedMutation(
    deleteBudget,
    [QUERY_KEYS.budgets],
    { onSuccess: () => invalidateCache([CACHE_KEYS.BUDGETS]) }
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

  return {
    // Data queries
    statsQuery,
    transactionsQuery,
    categoriesQuery,
    budgetsQuery,
    qurbanSalesQuery,
    weeklySalesQuery,

    // Combined and processed data
    allTransactions,
    filteredTransactions,
    overviewData,

    // Filter state and setters (from Zustand)
    searchTerm,
    typeFilter,
    categoryFilter,
    dateRange,
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
}