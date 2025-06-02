/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useSocket } from "@/contexts/socket-context"
import type {
  HewanQurban,
  HewanStatus,
  JenisHewan,
  JenisProduk,
  ProductLog
} from "@prisma/client"
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  QueryClientProvider, 
  type UseQueryResult,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { Counter } from "@prisma/client"
import { toast } from "@/hooks/use-toast"
import { queryClient, queryKeys } from "@/lib/tanstack-query/qurban"
import { useUIState } from "./ui-state-context"

export type ProdukHewan = {
  id: number
  nama: string
  tipeId: number | null
  berat: number | null
  avgProdPerHewan: number
  kumulatif: number
  targetPaket: number
  diTimbang: number
  diInventori: number
  sdhDiserahkan: number
  JenisProduk: JenisProduk
  tipe_hewan?: {
    id: number
    nama: string
    icon: string | null
    jenis: JenisHewan
  } | null
}

// Add ProductLog type
export type ProductLogWithProduct = ProductLog & {
  produk: {
    id: number
    nama: string
  }
}
// Add shipment types
export interface ShipmentProduct {
  produkId: number
  jumlah: number
}

export interface Shipment {
  id: number
  products: ShipmentProduct[]
  note?: string
  createdAt: string
  status: "pending" | "completed"
}
type ErrorLog = {
  id: number
  produkId: number
  event: string
  note: string
  timestamp: Date
  produk: {
    id: number
    nama: string
  }
}

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
        pageSize: 10, 
      }
    }
    if (target <= 100 && total <= 50) return { 
      useGroups: false, 
      pageSize: 10,
    }
    if (total > 50 && total <= 60) return { 
      useGroups: false, 
      pageSize: 15, 
    }
    if (total > 60 && total <= 100) return { 
      useGroups: false, 
      pageSize: 20,
    }
    return { 
      useGroups: false, 
      pageSize: 10,
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
  // Product logs query
  productLogsQuery: {
    data: ProductLogWithProduct[]
    isLoading: boolean
    isError: boolean
    refetch: (options?: { produkId?: number; place?: Counter }) => Promise<any>
  }
  shipmentsQuery: {
    data: Shipment[]
    isLoading: boolean
    isError: boolean
    refetch: () => Promise<any>
  }
  // Pagination metadata
  meta: {
    sapi: { total: number; target: number; slaughtered: number }
    domba: { total: number; target: number; slaughtered: number }
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

  // Shipment methods
  createShipment: (products: ShipmentProduct[], note?: string) => Promise<any | void>
  
  // Utility methods
  getProductById: (id: number) => ProdukHewan | undefined
  getProductsByType: (type: "daging" | "all") => ProdukHewan[]
  getProductLogsByPlace: (place: Counter) => ProductLogWithProduct[]
  getProductLogsByProduct: (produkId: number) => ProductLogWithProduct[]
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
        title: "Error",
        description:
          options.errorMessage ||
          (queryResult.error instanceof Error
            ? queryResult.error.message
            : "Something went wrong."),
        variant: "destructive",
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
  
  // Track pending mutations to avoid race conditions
  const pendingMutations = useRef<Set<string>>(new Set())
  
  // Debounce socket updates to prevent rapid fire updates
  const socketUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Fetch functions
  const fetchHewan = async (
    type: TipeHewan, 
    params: { 
      page?: number
      pageSize?: number
      group?: string
      itemsPerGroup?: number
      useGroups?: boolean
      meta?: {total: number; target: number}
    } = {}): Promise<{
      data: HewanQurban[];
      pagination: {
        currentPage: number
        totalPages: number
        currentGroup?: string
        totalGroups?: number
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

  const fetchProductLogs = async (
    params: { produkId?: number; place?: Counter } = {},
  ): Promise<ProductLogWithProduct[]> => {
    const searchParams = new URLSearchParams()

    if (params.produkId) {
      searchParams.append("produkId", params.produkId.toString())
    }

    if (params.place) {
      searchParams.append("place", params.place)
    }

    const url = `/api/product-logs?${searchParams.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }
  
  const fetchErrorLogs = async (): Promise<ErrorLog[]> => {
    const response = await fetch("/api/error-logs")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  const fetchShipments = async (): Promise<Shipment[]> => {
    const response = await fetch("/api/shipments")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  const fetchMeta = async (type?: string): Promise<any> => {
    const response = await fetch(`/api/hewan/meta?jenis=${type}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  // Query for metadata
  const metaQuery = useQueryWithToast({
    queryKey: queryKeys.meta,
    queryFn: async () => {
      const metaData = await fetchMeta()
      return {
        sapi: { total: metaData.sapi.total || 0, target: metaData.sapi.target || 0, slaughtered: metaData.sapi.slaughtered || 0 },
        domba: { total: metaData.domba.total || 0, target: metaData.domba.target || 0, slaughtered: metaData.domba.slaughtered || 0 },
      }
    },
    staleTime: isConnected ? Infinity : 60,
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
    queryFn: async () => await fetchHewan("sapi", { 
      page: pagination.sapiPage, 
      pageSize: sapiPaginationConfig.pageSize,
      group: sapiPaginationConfig.useGroups ? pagination.sapiGroup : undefined,
      itemsPerGroup: sapiPaginationConfig.itemsPerGroup,
      useGroups: sapiPaginationConfig.useGroups,
      meta: metaQuery.data?.sapi
    }),
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch sapi data. Please try again.",
  })
  const dombaQuery = useQueryWithToast({
    queryKey: [...queryKeys.domba, pagination.dombaPage, pagination.dombaGroup, dombaPaginationConfig],
    queryFn: async () => await fetchHewan("domba", { 
      page: pagination.dombaPage, 
      pageSize: dombaPaginationConfig.pageSize,
        group: dombaPaginationConfig.useGroups ? pagination.dombaGroup : undefined,
        itemsPerGroup: dombaPaginationConfig.itemsPerGroup,
        useGroups: dombaPaginationConfig.useGroups,
        meta: metaQuery.data?.domba
    }),
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch domba data. Please try again.",
  })

  const productsQuery = useQueryWithToast({
    queryKey: queryKeys.products,
    queryFn: () => fetchProducts(),
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch product data. Please try again.",
  })

  // Add product logs query
  const productLogsQuery = useQueryWithToast({
    queryKey: queryKeys.productLogs || ["productLogs"],
    queryFn: () => fetchProductLogs(),
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 60,
    errorMessage: "Failed to fetch product logs. Please try again.",
  })

  const errorLogsQuery = useQueryWithToast({
    queryKey: queryKeys.errorLogs,
    queryFn: fetchErrorLogs,
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch error logs. Please try again.",
  })

  const shipmentsQuery = useQueryWithToast({
    queryKey: queryKeys.shipments || ["shipments"],
    queryFn: fetchShipments,
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch shipments. Please try again.",
  })

  // Helper function to debounce socket updates
  const debounceSocketUpdate = (key: string, callback: () => void, delay = 100) => {
    const existingTimeout = socketUpdateTimeouts.current.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    const timeout = setTimeout(callback, delay)
    socketUpdateTimeouts.current.set(key, timeout)
  }

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

      // Track this mutation to prevent socket race conditions
      const mutationKey = `${data.hewanId}-${data.status}`
      pendingMutations.current.add(mutationKey)

      try {
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

        const result = await response.json()

        // Only emit socket event if backend succeeded
        if (socket && isConnected) {
          return await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Server response timeout"));
            }, 5000);

            socket.emit("update-hewan", data, (response: any) => {
              clearTimeout(timeout);
              if (response?.error) {
                reject(response.error);
              } else {
                resolve({ success: true, ...response });
              }
            })
          });
        }

        return result
      } finally {
        // Remove from pending mutations after a delay to prevent immediate socket conflicts
        setTimeout(() => {
          pendingMutations.current.delete(mutationKey)
        }, 500)
      }
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
    onSuccess: (data, variables) => {
      toast({
        title: "Success!",
        description: "Hewan updated successfully",
        variant: "default",
      });

      // Only invalidate meta if slaughtered status changed
      if (variables.slaughtered !== undefined) {
        queryClient.invalidateQueries({ queryKey: queryKeys.meta })
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
    // Remove onSettled invalidation - rely on socket updates instead
  })

  const updateProductMutation = useMutation({
    mutationFn: async (data: {
      productId: number
      operation: "add" | "decrease"
      place: Counter
      value: number
      note?: string
    }) => {
      if (!data.productId || !data.operation || !data.value) {
        throw new Error("Missing required fields: productId, operation, or value");
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }

      const result = await response.json();

      if (socket && isConnected) {
        return new Promise((resolve, reject) => {
          socket.emit("update-product", data, (response: any) => {
            if (response?.error) {
              reject(response.error)
            } else {
              resolve(response)
            }
          })
        })
      }

      return result
    },
    onMutate: async (newProductData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products })
      const previousProductData = queryClient.getQueryData(queryKeys.products)

      queryClient.setQueryData(queryKeys.products, (old: ProdukHewan[] | []) => {
        if (!old) return []
        return old.map((product) => {
          if (product.id === newProductData.productId) {
            const updatedProduct = { ...product }

            if (newProductData.operation === "add") {
              if (newProductData.place === Counter.PENYEMBELIHAN) {
                updatedProduct.diTimbang += newProductData.value
              } else if (newProductData.place === Counter.INVENTORY) {
                updatedProduct.diInventori += newProductData.value
              }
            } else if (newProductData.operation === "decrease") {
              if (newProductData.place === Counter.PENYEMBELIHAN) {
                updatedProduct.diTimbang = Math.max(0, updatedProduct.diTimbang - newProductData.value)
              } else if (newProductData.place === Counter.INVENTORY) {
                updatedProduct.diInventori = Math.max(0, updatedProduct.diInventori - newProductData.value)
              }
            }

            return updatedProduct
          }
          return product
        })
      })

      return { previousProductData }
    },
    onError: (err, newProduct, context) => {
      if (context?.previousProductData) {
        queryClient.setQueryData(queryKeys.products, context.previousProductData)
      }
      
      toast({
        title: "Error",
        description: "Failed to update product data. Please try again.",
        variant: "destructive",
      })
    },
    // Remove onSettled - rely on socket updates
  })

  const createShipmentMutation = useMutation({
    mutationFn: async (data: { products: ShipmentProduct[]; note?: string }) => {
      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create shipment");
      }

      const result = await response.json();

      if (socket && isConnected) {
        return new Promise((resolve, reject) => {
          socket.emit("new-shipment", { products: data.products, note: data.note }, (response: any) => {
            if (response?.error) {
              reject(response.error)
            } else {
              resolve({ ...result, ...response })
            }
          })
        })
      }

      return result
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Shipment created successfully",
        variant: "default",
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments || ["shipments"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productLogs || ["productLogs"] })
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create shipment. Please try again.",
        variant: "destructive",
      })
    },
  })
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
      // Skip if we have a pending mutation for this animal
      const mutationKey = `${data.hewanId}-${data.status}`
      if (pendingMutations.current.has(mutationKey)) {
        console.log(`Skipping socket update for ${data.hewanId} - mutation in progress`)
        return
      }

      debounceSocketUpdate(`hewan-${data.hewanId}`, () => {
        // If slaughtered status changed, invalidate meta to refresh counts
        if (data.slaughtered !== undefined) {
          queryClient.invalidateQueries({ queryKey: queryKeys.meta })
        }

        if (data.tipeId === 1 || !data.tipeId) {
          const sapiQueryKey = [...queryKeys.sapi, pagination.sapiPage, pagination.sapiGroup, sapiPaginationConfig];
          queryClient.setQueryData(sapiQueryKey, (old: any) => {
            if (!old || !old.data) return old;
            
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
            if (!old || !old.data) return old;
            
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
      })
    }

    // Handle bulk data updates - only when data actually changes
    const handleSapiDataUpdate = (data: HewanQurban[]) => {
      debounceSocketUpdate('sapi-bulk', () => {
        const sapiQueryKey = [...queryKeys.sapi, pagination.sapiPage, pagination.sapiGroup, sapiPaginationConfig];
        
        // Check if data actually changed before updating
        const currentData = queryClient.getQueryData(sapiQueryKey) as any
        if (currentData?.data && JSON.stringify(currentData.data) === JSON.stringify(data)) {
          return // No changes, skip update
        }

        queryClient.setQueryData(sapiQueryKey, (old: any) => {
          return {
            data: Array.isArray(data) ? data : [],
            pagination: old?.pagination || {
              currentPage: pagination.sapiPage,
              totalPages: Math.ceil((data?.length || 0) / sapiPaginationConfig.pageSize)
            }
          }
        });
        
        queryClient.invalidateQueries({ queryKey: queryKeys.meta })
      }, 200) // Longer debounce for bulk updates
    }

    const handleDombaDataUpdate = (data: HewanQurban[]) => {
      debounceSocketUpdate('domba-bulk', () => {
        const dombaQueryKey = [...queryKeys.domba, pagination.dombaPage, pagination.dombaGroup, dombaPaginationConfig];
        
        // Check if data actually changed before updating
        const currentData = queryClient.getQueryData(dombaQueryKey) as any
        if (currentData?.data && JSON.stringify(currentData.data) === JSON.stringify(data)) {
          return // No changes, skip update
        }

        queryClient.setQueryData(dombaQueryKey, (old: any) => {
          return {
            data: Array.isArray(data) ? data : [],
            pagination: old?.pagination || {
              currentPage: pagination.dombaPage,
              totalPages: Math.ceil((data?.length || 0) / dombaPaginationConfig.pageSize)
            }
          }
        });
        
        queryClient.invalidateQueries({ queryKey: queryKeys.meta })
      }, 200)
    }

    // Handle product updates with change detection
    const handleProductUpdate = (data: { products: ProdukHewan[] }) => {
      debounceSocketUpdate('products', () => {
        const currentData = queryClient.getQueryData(queryKeys.products)
        if (currentData && JSON.stringify(currentData) === JSON.stringify(data.products)) {
          return // No changes, skip update
        }

        queryClient.setQueryData(queryKeys.products, data.products)
        queryClient.invalidateQueries({ queryKey: queryKeys.productLogs || ["productLogs"] })
      })
    }

    // Other socket handlers remain the same but with debouncing
    const handleErrorLogsUpdate = (data: { errorLogs: ErrorLog[] }) => {
      debounceSocketUpdate('errorLogs', () => {
        queryClient.setQueryData(queryKeys.errorLogs, data.errorLogs)
      })
    }

    const handleShipmentUpdate = (data: { shipments: Shipment[] }) => {
      debounceSocketUpdate('shipments', () => {
        queryClient.setQueryData(queryKeys.shipments || ["shipments"], data.shipments)
      })
    }  
    
    // Handle product logs updates
    const handleProductLogsUpdate = (data: { productLogs: ProductLogWithProduct[] }) => {
      debounceSocketUpdate('shipments', () => {
        queryClient.setQueryData(queryKeys.productLogs || ["productLogs"], data.productLogs)
      })
    }
    // Register socket listeners
    socket.on("update-hewan", handleHewanUpdate)
    socket.on("update-product", handleProductUpdate)
    socket.on("error-logs", handleErrorLogsUpdate)
    socket.on("shipment-update", handleShipmentUpdate)
    socket.on("sapi-data-updated", handleSapiDataUpdate)
    socket.on("domba-data-updated", handleDombaDataUpdate)
    socket.on("product-logs-updated", handleProductLogsUpdate)
    // Clean up on unmount
    return () => {
      socket.off("update-hewan", handleHewanUpdate)
      socket.off("update-product", handleProductUpdate)
      socket.off("error-logs", handleErrorLogsUpdate)
      socket.off("shipment-update", handleShipmentUpdate)
      socket.off("sapi-data-updated", handleSapiDataUpdate)
      socket.off("domba-data-updated", handleDombaDataUpdate)
      socket.off("product-logs-updated", handleProductLogsUpdate)
    }
  }, [socket, queryClient])

  // Utility functions
  const getProductById = (id: number): ProdukHewan | undefined => {
    return productsQuery.data?.find((product) => product.id === id)
  }

  const getProductsByType = (type: "daging" | "all"): ProdukHewan[] => {
    if (type === "all") return productsQuery.data || []
    
    return productsQuery.data?.filter(product => 
      product.JenisProduk?.toLowerCase().includes("daging")
    ) || []
  }

  // Add utility functions for product logs
  const getProductLogsByPlace = (place: Counter): ProductLogWithProduct[] => {
    return productLogsQuery.data?.filter((log) => log.place === place) || []
  }

  const getProductLogsByProduct = (produkId: number): ProductLogWithProduct[] => {
    return productLogsQuery.data?.filter((log) => log.produkId === produkId) || []
  }
  // Expose methods using the mutations
  const updateHewan = (data: {
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

  const createShipment = async (products: ShipmentProduct[], note?: string) => {
    return createShipmentMutation.mutateAsync({ products, note })
  }
  // Create context value
  const contextValue: QurbanContextType = {
    sapiQuery: {
      data: sapiQuery.data?.data || [],
      isLoading: sapiQuery.isLoading,
      isError: sapiQuery.isError,
      refetch: async (options?: { page?: number, group?: string }) => {
        if (options?.page) {
          setPagination("sapiPage", options.page || 1)
        }
        if (options?.group && sapiPaginationConfig.useGroups) {
          setPagination("sapiGroup", options.group || "A")
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
    productLogsQuery: {
      data: productLogsQuery.data || [],
      isLoading: productLogsQuery.isLoading,
      isError: productLogsQuery.isError,
      refetch: async (filters?: { produkId?: number; place?: Counter }) => {
        // Maintain stable query key when no filters
        const queryKey = filters 
          ? [queryKeys.productLogs, filters]  // Creates ['productLogs', {produkId,place}]
          : queryKeys.productLogs

        return queryClient.refetchQueries({
          queryKey,
          exact: true,
        })
      },
    },
    errorLogsQuery: {
      data: errorLogsQuery.data || [],
      isLoading: errorLogsQuery.isLoading,
      isError: errorLogsQuery.isError,
      refetch: errorLogsQuery.refetch,
    },
    shipmentsQuery: {
      data: shipmentsQuery.data || [],
      isLoading: shipmentsQuery.isLoading,
      isError: shipmentsQuery.isError,
      refetch: shipmentsQuery.refetch,
    },
    meta: metaQuery.data || {
      sapi: { total: 0, target: 0, slaughtered: 0 },
      domba: { total: 0, target: 0, slaughtered: 0 },
    },
    isConnected,
    updateHewan,
    updateProduct,
    createShipment,
    getProductById,
    getProductsByType,
    getProductLogsByPlace,
    getProductLogsByProduct,
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