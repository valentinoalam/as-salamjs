import type { UseQueryOptions } from "@tanstack/react-query"

export interface Image {
  id: string
  url: string
  transactionId: string
  createdAt: Date
  updatedAt: Date
}

export type PaginationData = {
  currentPage: number
  totalPages: number
  pageSize: number
  total: number
  hasNext: boolean
  hasPrev: boolean
  currentGroup?: string
  totalGroups?: number
  useGroups?: boolean
  itemsPerGroup?: number
}

// Generic API response type
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  mudhohiId?: string
  transactionId?: string
}

export type ApiError = {
  message: string
  status?: number
  code?: string
}

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
};
export interface FetchResult<T> {
  data: T[]
  pagination?: PaginationData
}
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface QueryResult<T> {
  data: T[] | undefined
  pagination?: PaginationData
  isLoading: boolean
  isError: boolean
  isEmpty?: boolean
  message?: string
  error?: Error | null;
  refetch: () => Promise<any>
}

export interface PaginatedQueryResult<T> extends QueryResult<T> {
  pagination: PaginationData
  refetch: (options?: { page?: number; pageSize?: number }) => Promise<any>
}

// Define pagination configuration type
export interface PaginationConfig {
  useGroups: boolean
  itemsPerGroup?: number
  pageSize: number
}

export type PaginationDataOld = PaginationConfig & {
  currentPage: number
  totalPages: number
  currentGroup?: string
  totalGroups?: number
}

export type QueryWithToastOptions<TData = unknown, TError = Error> = 
  UseQueryOptions<TData, TError> & {
    errorMessage?: string
    cacheKey?: string  // Optional cache key
    cacheTTL?: number  // Cache time-to-live in ms (default 5 min)
  }

