import { QueryClient } from "@tanstack/react-query"

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time of 5 minutes
      staleTime: 5 * 60 * 1000,
      // Retry failed queries 3 times
      retry: 3,
      // Keep cached data for 1 hour
      gcTime: 60 * 60 * 1000,
      // Refetch on window focus or reconnect
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

// Define query keys
export const queryKeys = {
  sapi: ['hewan', 'sapi'] as const,
  domba: ['hewan', 'domba'] as const,
  products: ['products'] as const,
  shipments: ['shipments'] as const,
  productLogs: ['productLogs'] as const,
  errorLogs: ['errorLogs'] as const,
  meta: ['meta'] as const,
}