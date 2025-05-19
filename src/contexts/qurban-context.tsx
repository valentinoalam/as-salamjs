"use client"

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import { useSocket } from "@/contexts/socket-context"
import type {
  HewanQurban,
  HewanStatus,
  ProdukHewan,
  ErrorLog,
} from "@prisma/client"
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  QueryClientProvider, 
  type UseQueryResult,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {Counter} from "@prisma/client"
import { toast } from "@/hooks/use-toast"
import { queryClient, queryKeys } from "@/lib/tanstack-query"
import { useUIState } from "./ui-state-context"

export type TipeHewan = "sapi" | "domba" 
// Define pagination configuration type
interface PaginationConfig {
  useGroups: boolean
  itemsPerGroup?: number
  pageSize: number
}
export type PaginationData = 
  PaginationConfig & {
      currentPage: number
      totalPages: number
      currentGroup?: string
      totalGroups?: number
    }
export interface HewanQuery {
  data: HewanQurban[]
  isLoading: boolean
  isError: boolean
  refetch: (options?: { page?: number, group?: string }) => Promise<any>
  pagination: PaginationData
}
// Custom hook for determining pagination configuration
export const usePaginationConfig = (target: number, total: number): PaginationConfig => {
  return useMemo(() => {
    if (total > 100) {
      return { 
        useGroups: true, 
        itemsPerGroup: 50,
        pageSize: 10 
      }
    }
    if (target <= 100 && total <= 50) return { 
      useGroups: false, 
      pageSize: 10 
    }
    if (total > 50 && total <= 60) return { 
      useGroups: false, 
      pageSize: 15 
    }
    if (total > 60 && total <= 100) return { 
      useGroups: false, 
      pageSize: 20 
    }
    return { 
      useGroups: false, 
      pageSize: 10 
    }
  }, [target, total])
}
// Define the shape of our context
interface QurbanContextType {
   // Data states and loading
  sapiQuery: HewanQuery 
  dombaQuery: HewanQuery
  productsQuery: {
    data: ProdukHewan[]
    isLoading: boolean
    isError: boolean
    refetch: () => Promise<any>
  }
  errorLogsQuery: {
    data: ErrorLog[]
    isLoading: boolean
    isError: boolean
    refetch: () => Promise<any>
  }

  // Pagination metadata
  meta: {
    sapi: { total: number; target: number }
    domba: { total: number; target: number }
  }

  // Connection status
  isConnected: boolean

  // Methods for updating data
  updateHewan: (data: {
    hewanId: string
    status: HewanStatus
    slaughtered: boolean
    receivedByMdhohi?: boolean
    onInventory?: boolean
    tipeId: number
  }) => void

  updateProduct: (data: {
    productId: number
    operation: "add" | "decrease"
    place: Counter
    value: number
    note?: string
  }) => void
}

type QueryWithToastOptions<TData, TError> = UseQueryOptions<TData, TError> & {
  errorMessage?: string
}

export function useQueryWithToast<TData = unknown, TError = Error>(
  options: QueryWithToastOptions<TData, TError>
): UseQueryResult<TData, TError> {
  const queryResult = useQuery(options)

  useEffect(() => {
    if (queryResult.isError) {
      toast({
        title: 'Error',
        description:
          options.errorMessage ||
          (queryResult.error instanceof Error
            ? queryResult.error.message
            : 'Something went wrong.'),
        variant: 'destructive',
      })
    }
  }, [queryResult.isError, queryResult.error, options.errorMessage])

  return queryResult
}

// Create the context
const QurbanContext = createContext<QurbanContextType | undefined>(undefined)

// Wrapper component to provide the QueryClient
export function QurbanProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <QurbanProvider>{children}</QurbanProvider>
    </QueryClientProvider>
  )
}

// Provider component
export function QurbanProvider({
  children,

}: {
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const { socket, isConnected } = useSocket()
  const { pagination, setPagination } = useUIState()

  // Fetch functions
  const fetchHewan = async (
    type: TipeHewan, 
    params: { 
      page?: number;
      pageSize?: number;
      group?: string;
      itemsPerGroup?: number;
      useGroups?: boolean;
      meta?: {total: number; target: number};
    } = {}): Promise<{
      data: HewanQurban[];
      pagination: {
        currentPage: number;
        totalPages: number;
        currentGroup?: string;
        totalGroups?: number;
      };
    }> => {
    const {useGroups, itemsPerGroup, group, pageSize = 10, page, meta = {total: 0, target: 0}} = params
    const totalPages = useGroups 
      ? Math.ceil((itemsPerGroup || 50) / pageSize)
      : Math.ceil(meta.total / pageSize);
    const totalGroups = Math.ceil(meta.total / 50)
    // Build URL with parameters
    const searchParams = new URLSearchParams({
      type,
      page: String(page),
      pageSize: String(pageSize),
    });

    if (useGroups) {
      searchParams.append("group", group || "1");
      searchParams.append("itemsPerGroup", String(itemsPerGroup));
    }

    const url = `/api/hewan?${searchParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: HewanQurban[] = await response.json();

    return {
      data,
      pagination: {
        currentPage: page || 1,
        totalPages,
        currentGroup: useGroups ? group : undefined,
        totalGroups: useGroups ? totalGroups : undefined
      }
    };
  }

  const fetchProducts = async (params: any = {}): Promise<ProdukHewan[]> => {
    const url = `/api/products${params.jenis ? `?jenis=${params.jenis}` : ""}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  const fetchErrorLogs = async (): Promise<ErrorLog[]> => {
    const response = await fetch('/api/error-logs')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  const fetchMeta = async (type: string): Promise<any> => {
    const response = await fetch(`/api/hewan/meta?type=${type}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  // Query for metadata
  const metaQuery = useQueryWithToast({
    queryKey: queryKeys.meta,
    queryFn: async () => {
      const sapiMeta = await fetchMeta('sapi')
      const dombaMeta = await fetchMeta('domba')
      return {
        sapi: { total: sapiMeta[0].total || 0, target: sapiMeta[0].target || 0 },
        domba: { total: dombaMeta[0].total || 0, target: dombaMeta[0].target || 0 },
      }
    },
    errorMessage: "Failed to fetch metadata. Please try again.",
  })

  // Get pagination configs based on meta data
  const sapiPaginationConfig = usePaginationConfig(
    metaQuery.data?.sapi.target || 0,
    metaQuery.data?.sapi.total || 0
  )
    
  const dombaPaginationConfig = usePaginationConfig(
    metaQuery.data?.domba.target || 0,
    metaQuery.data?.domba.total || 0
  )

  // Set up queries
  const sapiQuery = useQueryWithToast({
    queryKey: [...queryKeys.sapi, pagination.sapiPage, pagination.sapiGroup, sapiPaginationConfig],
    queryFn: async () => await fetchHewan('sapi', { 
      page: pagination.sapiPage, 
      pageSize: sapiPaginationConfig.pageSize,
      group: sapiPaginationConfig.useGroups ? pagination.sapiGroup : undefined,
      itemsPerGroup: sapiPaginationConfig.itemsPerGroup,
      useGroups: sapiPaginationConfig.useGroups,
      meta: metaQuery.data?.sapi
    }),
    errorMessage: 'Failed to fetch sapi data. Please try again.',
  })
  const dombaQuery = useQueryWithToast({
    queryKey: [...queryKeys.domba, pagination.dombaPage, pagination.dombaGroup, dombaPaginationConfig],
    queryFn: async () => await fetchHewan('domba', { 
      page: pagination.dombaPage, 
      pageSize: dombaPaginationConfig.pageSize,
        group: dombaPaginationConfig.useGroups ? pagination.dombaGroup : undefined,
        itemsPerGroup: dombaPaginationConfig.itemsPerGroup,
        useGroups: dombaPaginationConfig.useGroups,
        meta: metaQuery.data?.domba
    }),
    errorMessage: 'Failed to fetch domba data. Please try again.',
  })

  const productsQuery = useQueryWithToast({
    queryKey: queryKeys.products,
    queryFn: () => fetchProducts(),
    errorMessage: 'Failed to fetch product data. Please try again.',
  })

  const errorLogsQuery = useQueryWithToast({
    queryKey: queryKeys.errorLogs,
    queryFn: fetchErrorLogs,
    errorMessage: 'Failed to fetch error logs. Please try again.',
  })

  // Mutations
  const updateHewanMutation = useMutation({
    mutationFn: async (data: {
      hewanId: string
      status: HewanStatus
      slaughtered?: boolean
      receivedByMdhohi?: boolean
      onInventory?: boolean
      tipeId: number
    }) => {
      if (!data.hewanId || !data.status || !data.tipeId) {
        throw new Error("Missing required fields: hewanId, status, or tipeId");
      }
      // Send to backend first
      const response = await fetch("/api/hewan/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }

      await response.json();

      // Emit to socket after success
      if (!socket || !isConnected) {
        throw new Error("Not connected to server");
      }

      return await new Promise((resolve, reject) => {
        // Add timeout handling
        const timeout = setTimeout(() => {
          reject(new Error("Server response timeout"));
        }, 3000); // 3-second timeout

        // Make sure server acknowledges with callback
        socket.emit("update-hewan", data, (response: any) => {
          clearTimeout(timeout);
          console.log("Server response:", response); // Add logging
          
          // Server must return SOME response
          if (response?.error) {
            reject(response.error);
          } else {
            // Resolve with explicit value
            resolve({ success: true, ...response });
          }
        })
      });
    },
    onMutate: async (newHewanData) => {
      const queryKey = newHewanData.tipeId === 1 
        ? [...queryKeys.sapi, pagination.sapiPage, pagination.sapiGroup, sapiPaginationConfig]
        : [...queryKeys.domba, pagination.dombaPage, pagination.dombaGroup, dombaPaginationConfig];
        
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map((item: HewanQurban) =>
            item.hewanId === newHewanData.hewanId
              ? {
                  ...item,
                  status: newHewanData.status,
                  ...(newHewanData.slaughtered !== undefined && { slaughtered: newHewanData.slaughtered }),
                  ...(newHewanData.receivedByMdhohi !== undefined && { receivedByMdhohi: newHewanData.receivedByMdhohi }),
                  ...(newHewanData.onInventory !== undefined && { onInventory: newHewanData.onInventory }),
                }
              : item
          )
        };
      });

      return { previousData, queryKey };
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Hewan updated successfully",
        variant: "default",
      });
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      toast({
        title: "Error",
        description: err.message, //"Failed to update hewan data. Please try again.",
        variant: "destructive",
      });
    },

    onSettled: (data, error, variables) => {
      const { tipeId } = variables;
      const queryKey = tipeId === 1 ? queryKeys.sapi : queryKeys.domba;
      queryClient.invalidateQueries({ queryKey });
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: (data: {
      productId: number
      operation: "add" | "decrease"
      place: Counter
      value: number
      note?: string
    }) => {
      if (!socket || !isConnected) {
        throw new Error("Not connected to server")
      }
      
      return new Promise((resolve, reject) => {
        socket.emit("update-product", data, (response: any) => {
          if (response?.error) {
            reject(response.error)
          } else {
            resolve(response)
          }
        })
      })
    },
    onMutate: async (newProductData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.products })

      // Snapshot the previous value
      const previousProductData = queryClient.getQueryData(queryKeys.products)

      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.products, (old: ProdukHewan[] | []) => {
        if (!old) return []
        return old.map((product) => {
          if (product.id === newProductData.productId) {
            const updatedProduct = { ...product }

            if (newProductData.operation === "add") {
              if (newProductData.place === Counter.PENYEMBELIHAN) {
                updatedProduct.pkgOrigin += newProductData.value
              } else if (newProductData.place === Counter.INVENTORY) {
                updatedProduct.pkgReceived += newProductData.value
              }
            } else if (newProductData.operation === "decrease") {
              if (newProductData.place === Counter.PENYEMBELIHAN) {
                updatedProduct.pkgOrigin = Math.max(0, updatedProduct.pkgOrigin - newProductData.value)
              } else if (newProductData.place === Counter.INVENTORY) {
                updatedProduct.pkgReceived = Math.max(0, updatedProduct.pkgReceived - newProductData.value)
              }
            }

            return updatedProduct
          }
          return product
        })
      })

      // Return the snapshot
      return { previousProductData }
    },
    onError: (err, newProduct, context) => {
      // Roll back to the previous state
      if (context?.previousProductData) {
        queryClient.setQueryData(queryKeys.products, context.previousProductData)
      }
      
      toast({
        title: "Error",
        description: "Failed to update product data. Please try again.",
        variant: "destructive",
      })
    },
    // We don't need onSettled since the WebSocket will handle the update
  })
 
  useEffect(() => {
    if (pagination.sapiPage !== undefined) sapiQuery.refetch();
    if (pagination.dombaPage !== undefined) dombaQuery.refetch();
  }, [pagination.sapiPage, pagination.dombaPage]);
  // Set up socket listeners to update the query cache
  useEffect(() => {
    if (!socket) return

    // Handle hewan updates from WebSocket
    const handleHewanUpdate = (data: {
      hewanId: string
      status?: HewanStatus
      slaughtered?: boolean
      receivedByMdhohi?: boolean
      onInventory?: boolean
      tipeId?: number
    }) => {
      if (data.tipeId === 1 || !data.tipeId) {
        const sapiQueryKey = [...queryKeys.sapi, pagination.sapiPage, pagination.sapiGroup, sapiPaginationConfig];
        queryClient.setQueryData(sapiQueryKey, (old: any) => {
          if (!old || !old.data) {
            console.log("No existing sapi data to update");
            return old;
          }
          
          console.log("Updating sapi data for animal:", data.hewanId);
          return {
            ...old,
            data: old.data.map((item: HewanQurban) =>
              item.hewanId === data.hewanId
                ? {
                    ...item,
                    ...(data.status && { status: data.status }),
                    ...(data.slaughtered !== undefined && { slaughtered: data.slaughtered }),
                    ...(data.receivedByMdhohi !== undefined && { receivedByMdhohi: data.receivedByMdhohi }),
                    ...(data.onInventory !== undefined && { onInventory: data.onInventory }),
                  }
                : item
            )
          }
        })
      }

      if (data.tipeId === 2 || !data.tipeId) {
        const dombaQueryKey = [...queryKeys.domba, pagination.dombaPage, pagination.dombaGroup, dombaPaginationConfig];
        queryClient.setQueryData(dombaQueryKey, (old: any) => {
          if (!old || !old.data) {
            console.log("No existing domba data to update");
            return old;
          }
          
          console.log("Updating domba data for animal:", data.hewanId);
          return {
            ...old,
            data: old.data.map((item: HewanQurban) =>
              item.hewanId === data.hewanId
                ? {
                    ...item,
                    ...(data.status && { status: data.status }),
                    ...(data.slaughtered !== undefined && { slaughtered: data.slaughtered }),
                    ...(data.receivedByMdhohi !== undefined && { receivedByMdhohi: data.receivedByMdhohi }),
                    ...(data.onInventory !== undefined && { onInventory: data.onInventory }),
                  }
                : item
            )
          }
        })
      }
    }

    // Handle bulk data updates
    const handleSapiDataUpdate = (data: HewanQurban[]) => {
      // queryClient.setQueryData(queryKeys.sapi, data)
      const sapiQueryKey = [...queryKeys.sapi, pagination.sapiPage, pagination.sapiGroup, sapiPaginationConfig];
      console.log("Received bulk sapi data update:", data.length, "items");
      queryClient.setQueryData(sapiQueryKey, (old: any) => {
        return {
          data: Array.isArray(data) ? data : [],
          pagination: old?.pagination || {
            currentPage: pagination.sapiPage,
            totalPages: Math.ceil((data?.length || 0) / sapiPaginationConfig.pageSize)
          }
        }
      });
      
      // Also invalidate to ensure UI updates
      queryClient.invalidateQueries({ queryKey: sapiQueryKey });
    }

    const handleDombaDataUpdate = (data: HewanQurban[]) => {
      // queryClient.setQueryData(queryKeys.domba, data)
      const dombaQueryKey = [...queryKeys.domba, pagination.dombaPage, pagination.dombaGroup, dombaPaginationConfig];
      console.log("Received bulk domba data update:", data.length, "items");
      queryClient.setQueryData(dombaQueryKey, (old: any) => {
        return {
          data: Array.isArray(data) ? data : [],
          pagination: old?.pagination || {
            currentPage: pagination.dombaPage,
            totalPages: Math.ceil((data?.length || 0) / dombaPaginationConfig.pageSize)
          }
        }
      });
      
      // Also invalidate to ensure UI updates
      queryClient.invalidateQueries({ queryKey: dombaQueryKey });
    }

    // Handle product updates
    const handleProductUpdate = (data: { products: ProdukHewan[] }) => {
      queryClient.setQueryData(queryKeys.products, data.products)
    }

    // Handle error log updates
    const handleErrorLogsUpdate = (data: { errorLogs: ErrorLog[] }) => {
      queryClient.setQueryData(queryKeys.errorLogs, data.errorLogs)
    }

    // Register socket listeners
    socket.on("update-hewan", handleHewanUpdate)
    socket.on("update-product", handleProductUpdate)
    socket.on("error-logs", handleErrorLogsUpdate)
    socket.on("sapi-data-updated", handleSapiDataUpdate)
    socket.on("domba-data-updated", handleDombaDataUpdate)

    // Clean up on unmount
    return () => {
      socket.off("update-hewan", handleHewanUpdate)
      socket.off("update-product", handleProductUpdate)
      socket.off("error-logs", handleErrorLogsUpdate)
      socket.off("sapi-data-updated", handleSapiDataUpdate)
      socket.off("domba-data-updated", handleDombaDataUpdate)
    }
  }, [socket, queryClient])

  // Expose methods using the mutations
  const updateHewan =  (data: {
    hewanId: string
    status: HewanStatus
    slaughtered?: boolean
    receivedByMdhohi?: boolean
    onInventory?: boolean
    tipeId: number
  }) => {
    updateHewanMutation.mutate(data);
  }

  const updateProduct = (data: {
    productId: number
    operation: "add" | "decrease"
    place: Counter
    value: number
    note?: string
  }) => {
    updateProductMutation.mutate(data)
  }

  // Create context value
  const contextValue: QurbanContextType = {
    sapiQuery: {
      data: sapiQuery.data?.data || [],
      isLoading: sapiQuery.isLoading,
      isError: sapiQuery.isError,
      refetch: async (options?: { page?: number, group?: string }) => {
        if (options?.page) {
          setPagination("sapiPage",  options.page || 1)
        }
        if (options?.group && sapiPaginationConfig.useGroups) {
          setPagination("sapiGroup",  options.group || "A")
        }
        return sapiQuery.refetch()
      },
      pagination: {
        ...sapiPaginationConfig,
        currentPage: pagination.sapiPage,
        totalPages: sapiQuery.data?.pagination?.totalPages || 
          Math.ceil((metaQuery.data?.sapi.total || 0) / sapiPaginationConfig.pageSize),
        currentGroup: sapiPaginationConfig.useGroups ? pagination.sapiGroup : undefined,
        totalGroups: sapiPaginationConfig.useGroups ? 
          Math.ceil((metaQuery.data?.sapi.total || 0) / (sapiPaginationConfig.itemsPerGroup || 50)) : 
          undefined
      }
    },
    dombaQuery: {
      data: dombaQuery.data?.data || [],
      isLoading: dombaQuery.isLoading,
      isError: dombaQuery.isError,
      refetch: async (options?: { page?: number, group?: string }) => {
        if (options?.page) {
          setPagination("dombaPage",  options.page || 1)
        }
        if (options?.group && dombaPaginationConfig.useGroups) {
          setPagination("dombaGroup",  options.group || "A")
        }
        return dombaQuery.refetch()
      },
      pagination: {
        ...dombaPaginationConfig,
        currentPage: pagination.dombaPage,
        totalPages: dombaQuery.data?.pagination?.totalPages || dombaPaginationConfig.useGroups ? 
          Math.ceil((dombaPaginationConfig.itemsPerGroup || 50) / dombaPaginationConfig.pageSize) :
          Math.ceil((metaQuery.data?.domba.total || 0) / dombaPaginationConfig.pageSize),
        currentGroup: dombaPaginationConfig.useGroups ? pagination.dombaGroup : undefined,
        totalGroups: dombaPaginationConfig.useGroups ? 
          Math.ceil((metaQuery.data?.domba.total || 0) / (dombaPaginationConfig.itemsPerGroup || 50)) : 
          undefined
      }
    },
    productsQuery: {
      data: productsQuery.data || [],
      isLoading: productsQuery.isLoading,
      isError: productsQuery.isError,
      refetch: productsQuery.refetch,
    },
    errorLogsQuery: {
      data: errorLogsQuery.data || [],
      isLoading: errorLogsQuery.isLoading,
      isError: errorLogsQuery.isError,
      refetch: errorLogsQuery.refetch,
    },
    meta: metaQuery.data || {
      sapi: { total: 0, target: 0 },
      domba: { total: 0, target: 0 },
    },
    isConnected,
    updateHewan,
    updateProduct,
  }
  return <QurbanContext.Provider value={contextValue}>{children}</QurbanContext.Provider>
}

// Custom hook to use the context
export function useQurban() {
  const context = useContext(QurbanContext)

  if (context === undefined) {
    throw new Error("useQurban must be used within a QurbanProvider")
  }

  return context
}