import type { 
  Category, 
  Transaction, 
  Budget, 
  TransactionStats, 
  CategoryDistribution, 
  QurbanSalesStats,
  ChartDataResponse,
  // ProcessedData,
  CategoryFormValues,
  TransactionFormValues,
  BudgetFormValues
} from '@/types/keuangan'
import { TransactionType } from '@prisma/client'
import { useMutation, useQueryClient, type QueryKey, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query'

// Enhanced filter types
type TransactionFilters = {
  type?: TransactionType
  categoryId?: string
  searchTerm?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// API Client Helper
async function apiClient<T>(url: string, config?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...config?.headers,
    },
    ...config,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network response was not ok' }))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

// API endpoints
const API_ENDPOINTS = {
  stats: '/api/keuangan/stats',
  transactions: '/api/keuangan/transactions',
  latestTransactions: '/api/keuangan/transactions/latest',
  categories: '/api/keuangan/categories',
  budgets: '/api/keuangan/budgets',
  overview: '/api/keuangan/overview',
  qurbanSales: '/api/keuangan/qurban-sales',
  weeklySales: '/api/keuangan/weekly-sales',
  uploadReceipt: '/api/keuangan/upload-receipt',
} as const

// API functions
export async function fetchTransactionStats(): Promise<TransactionStats> {
  return apiClient<TransactionStats>(API_ENDPOINTS.stats)
}

export async function fetchTransactions(filters?: {
  type?: TransactionType
  categoryId?: string
  searchTerm?: string
  startDate?: Date
  endDate?: Date
}): Promise<Transaction[]> {
  const params = new URLSearchParams()
  if (filters?.type) params.append("type", filters.type)
  if (filters?.categoryId) params.append("categoryId", filters.categoryId)
  if (filters?.searchTerm) params.append("searchTerm", filters.searchTerm)
  if (filters?.startDate) params.append("startDate", filters.startDate.toISOString())
  if (filters?.endDate) params.append("endDate", filters.endDate.toISOString())

  const url = params.toString() ? `${API_ENDPOINTS.transactions}?${params}` : API_ENDPOINTS.transactions
  return apiClient<Transaction[]>(url)
}

export async function fetchLatestTransactions(): Promise<Transaction[]> {
  return apiClient<Transaction[]>(API_ENDPOINTS.latestTransactions)
}

export async function fetchCategories(): Promise<Category[]> {
  return apiClient<Category[]>(API_ENDPOINTS.categories)
}

export async function fetchBudgets(): Promise<Budget[]> {
  return apiClient<Budget[]>(API_ENDPOINTS.budgets)
}

export async function fetchOverviewData(): Promise<CategoryDistribution[]> {
  return apiClient<CategoryDistribution[]>(API_ENDPOINTS.overview)
}

export async function fetchQurbanSalesStats(): Promise<QurbanSalesStats> {
  return apiClient<QurbanSalesStats>(API_ENDPOINTS.qurbanSales)
}

export async function fetchWeeklyAnimalSales(year?: number): Promise<ChartDataResponse> {
  const params = new URLSearchParams()
  if (year) params.append("year", year.toString())
  const url = params.toString() ? `${API_ENDPOINTS.weeklySales}?${params}` : API_ENDPOINTS.weeklySales
  return apiClient<ChartDataResponse>(url)
}

// Mutation functions
// Generic JSON POST/PUT helper
function jsonRequest<T>(url: string, method: string, data: unknown): Promise<T> {
  return apiClient<T>(url, {
    method,
    body: JSON.stringify(data),
  })
}

// Transaction
export function createTransaction(data: TransactionFormValues) {
  return jsonRequest<{ success: boolean; transactionId?: string; error?: string }>(
    API_ENDPOINTS.transactions,
    "POST",
    data
  )
}

export function deleteTransaction(id: string) {
  return apiClient<{ success: boolean; error?: string }>(
    `${API_ENDPOINTS.transactions}/${id}`,
    { method: "DELETE" }
  )
}

// Upload Receipt (multipart/form-data, skip JSON headers)
export function uploadReceipt(formData: FormData) {
  return apiClient<{ success: boolean; error?: string }>(API_ENDPOINTS.uploadReceipt, {
    method: "POST",
    headers: {}, // override default JSON headers
    body: formData,
  })
}

// Category
export function createCategory(data: CategoryFormValues) {
  return jsonRequest<{ success: boolean; data?: Category; error?: string }>(
    API_ENDPOINTS.categories,
    "POST",
    data
  )
}

export function updateCategory(id: number, data: CategoryFormValues) {
  return jsonRequest<{ success: boolean; data?: Category; error?: string }>(
    `${API_ENDPOINTS.categories}/${id}`,
    "PUT",
    data
  )
}

export function deleteCategory(id: number) {
  return apiClient<{ success: boolean; error?: string }>(
    `${API_ENDPOINTS.categories}/${id}`,
    { method: "DELETE" }
  )
}

// Budget
export function createBudget(data: BudgetFormValues) {
  return jsonRequest<{ success: boolean; data?: Budget; error?: string }>(
    API_ENDPOINTS.budgets,
    "POST",
    data
  )
}

export function updateBudget(id: string, data: BudgetFormValues) {
  return jsonRequest<{ success: boolean; data?: Budget; error?: string }>(
    `${API_ENDPOINTS.budgets}/${id}`,
    "PUT",
    data
  )
}

export function deleteBudget(id: string) {
  return apiClient<{ success: boolean; error?: string }>(
    `${API_ENDPOINTS.budgets}/${id}`,
    { method: "DELETE" }
  )
}

// Query keys
export const QUERY_KEYS = {
  all: ['keuangan'] as const,
  stats: ["keuangan", "stats"] as const,
  transactions: (filters?: TransactionFilters) => 
    [...QUERY_KEYS.all, 'transactions', ...(filters ? [filters] : [])] as const,
  latestTransactions: ["keuangan", "transactions", "latest"] as const,
  categories: ["keuangan", "categories"] as const,
  budgets: ["keuangan", "budgets"] as const,
  qurbanSales: ["keuangan", "qurban-sales"] as const,
  weeklySales: ["keuangan", "weekly-sales"] as const,
}

export const baseQueryOptions = {
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000, // 5 minutes default
  gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
}

// Generic optimized mutation hook
export const useOptimizedMutation = <T, V>(
  mutationFn: (variables: V) => Promise<T>,
  invalidateQueries: QueryKey[] = [],
  options?: Partial<UseMutationOptions<T, Error, V>>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      invalidateQueries.forEach(queryKey => 
        queryClient.invalidateQueries({ queryKey })
      )
      // Call original onSuccess if provided
      if (options?.onSuccess && typeof options.onSuccess === 'function') {
        ;(options.onSuccess)(data, variables, context)
      }
    }, onError: (error, variables, context) => {
      // Enhanced error logging
      console.error('Mutation error:', error)
      
      // Call original onError if provided
      options?.onError?.(error, variables, context)
    },
  })
}

// Enhanced query options with better error handling
export const createQueryOptions = <T>(
  key: QueryKey,
  queryFn: () => Promise<T>,
  options?: Partial<UseQueryOptions<T, Error>>
): UseQueryOptions<T, Error> => ({
  queryKey: key,
  queryFn,
  retry: (failureCount, error) => {
    // Don't retry on 4xx errors
    if (error && 'status' in error && typeof error.status === 'number') {
      return error.status >= 500 && failureCount < 2
    }
    return failureCount < 2
  },
  ...baseQueryOptions,
  ...options,
})
