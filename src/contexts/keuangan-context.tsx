"use client"

import React, { createContext, useContext, useCallback, type ReactNode, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { createBudget, createCategory, createQueryOptions, createTransaction, deleteBudget, deleteCategory, deleteTransaction, fetchBudgets, fetchCategories, fetchLatestTransactions, fetchQurbanSalesStats, fetchTransactions, fetchTransactionStats, fetchWeeklyAnimalSales, QUERY_KEYS, updateBudget, updateCategory, uploadReceipt, useOptimizedMutation, type ApiResponse, type DataQuery } from '@/lib/tanstack-query/keuangan'

// Enhanced Transaction type for combined data
interface CombinedTransaction extends Transaction {
  isQurbanTransaction?: boolean
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
  // Filter state - moved to context for global state management
  const [searchTerm, setSearchTerm] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<TransactionType | "ALL">("ALL")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL")
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({})

  // Data queries
  const statsQuery = useQuery(
    createQueryOptions(
      QUERY_KEYS.stats,
      fetchTransactionStats,
      { initialData: initialData?.stats }
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
      { initialData: initialData?.categories }
    )
  )

  const budgetsQuery = useQuery(
    createQueryOptions(
      QUERY_KEYS.budgets,
      fetchBudgets,
      { initialData: initialData?.budgets }
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
      .map((tipe: { tipeHewanId: any; totalAmount: any; nama: any }) => ({
        id: `qurban-${tipe.tipeHewanId}`,
        amount: tipe.totalAmount,
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
  const overviewData = useMemo((): ProcessedData => {
    if (!allTransactions || allTransactions.length === 0) {
      return {
        pemasukanData: [],
        pengeluaranData: [],
        totalPemasukan: 0,
        totalPengeluaran: 0,
      }
    }
    const totalsByCategoryAndType = new Map<string, number>()

    allTransactions.forEach(transaction => {
      const categoryName = transaction.category?.name
      const type = transaction.type

      if (!categoryName || !type) return

      const key = `${type}:${categoryName}`
      const current = totalsByCategoryAndType.get(key) || 0
      totalsByCategoryAndType.set(key, current + transaction.amount)
    })

    const rawData: CategoryDistribution[] = Array.from(totalsByCategoryAndType.entries())
      .map(([key, value], index) => {
        const [type, name] = key.split(':')
        return {
          name: `${type === 'PENGELUARAN' ? 'Pengeluaran' : 'Pemasukan'} - ${name}`,
          value,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }
      })
      .sort((a, b) => b.value - a.value)
    // Separate income and expense data
    const pemasukanItems = rawData.filter(item => 
      item.name.startsWith('Pemasukan'))
    const pengeluaranItems = rawData.filter(item => 
      item.name.startsWith('Pengeluaran'))

    // Calculate totals
    const totalPemasukan = pemasukanItems.reduce((sum, item) => sum + item.value, 0);
    const totalPengeluaran = pengeluaranItems.reduce((sum, item) => sum + item.value, 0);

    // Format data for charts
    const pemasukanData = pemasukanItems.map(item => ({
      name: item.name.replace('Pemasukan - ', ''),
      value: item.value,
      fill: item.color,
    }));

    const pengeluaranData = pengeluaranItems.map(item => ({
      name: item.name.replace('Pengeluaran - ', ''),
      value: item.value,
      fill: item.color,
    }));

    const pieData = {
      pemasukanData,
      pengeluaranData,
      totalPemasukan,
      totalPengeluaran,
    };
    return pieData
  }, [allTransactions])

  // Apply filters to combined transactions - centralized filtering logic
  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(term) ||
        t.category.name.toLowerCase().includes(term) ||
        t.amount.toString().includes(term)
      )
    }

    // Type filter
    if (typeFilter !== "ALL") {
      filtered = filtered.filter(t => t.type === typeFilter)
    }

    // Category filter
    if (categoryFilter !== "ALL") {
      const categoryId = parseInt(categoryFilter)
      filtered = filtered.filter(t => t.categoryId === categoryId)
    }

    // Date range filter
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date)
        return transactionDate >= dateRange.from! && transactionDate <= dateRange.to!
      })
    } else if (dateRange.from) {
      filtered = filtered.filter(t => new Date(t.date) >= dateRange.from!)
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [allTransactions, searchTerm, typeFilter, categoryFilter, dateRange])

  // Reset filters function
  const resetFilters = useCallback(() => {
    setSearchTerm("")
    setTypeFilter("ALL")
    setCategoryFilter("ALL")
    setDateRange({})
  }, [])

  // Mutations - updated to invalidate stats instead of overview
  const createTransactionMutation = useOptimizedMutation(
    createTransaction,
    [QUERY_KEYS.transactions(), QUERY_KEYS.latestTransactions, QUERY_KEYS.stats]
  )

  const deleteTransactionMutation = useOptimizedMutation(
    deleteTransaction,
    [QUERY_KEYS.transactions(), QUERY_KEYS.latestTransactions, QUERY_KEYS.stats]
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
    if (!allTransactions || !categories) {
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

    allTransactions.forEach(transaction => {
      const category = categoryMap.get(transaction.categoryId) || transaction.category
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
  }, [allTransactions, categories])

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