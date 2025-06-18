/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useSocket } from "@/contexts/socket-context"
import {
  type HewanQurban,
  type HewanStatus,
} from "@prisma/client"
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query"
import { Counter } from "@prisma/client"
import { toast } from "@/hooks/use-toast"
import { queryKeys } from "@/lib/tanstack-query/qurban"
import { useUIState } from "./ui-state-context"
import type {
  ErrorLog,
  ProductLogWithProduct,
  ProdukHewan,
  QueryWithToastOptions,
  QurbanContextType,
  Shipment,
  ShipmentProduct,
  TipeHewan,
} from "@/types/qurban"

type PaginationData = {
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

interface ProductLog {
  timestamp: number;
  produkId: number;
  event: "menambahkan" | "memindahkan" | "mengkoreksi";
  place: Counter;
  value: number;
  note?: string;
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

// Provider component
export function QurbanProvider({ children }: {
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const { socket, isConnected } = useSocket()
  const { pagination, setPagination } = useUIState()
  
  // Track pending mutations to avoid race conditions
  const pendingMutations = useRef<Set<string>>(new Set())
  const lastSocketUpdate = useRef<Map<string, number>>(new Map())

  // Debounce socket updates to prevent rapid fire updates
  const socketUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  // Add cleanup in useEffect
  useEffect(() => {
    return () => {
      // Clear all pending timeouts
      socketUpdateTimeouts.current.forEach((timeout) => clearTimeout(timeout))
      socketUpdateTimeouts.current.clear()
      pendingMutations.current.clear()
      lastSocketUpdate.current.clear()
    }
  }, [])
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
      data: HewanQurban[]
      pagination: PaginationData
    }> => {
    const { useGroups, itemsPerGroup, group, pageSize = 10, page = 1, meta = { total: 0, target: 0 } } = params
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
    const totalPages = useGroups 
      ? Math.ceil((itemsPerGroup || 50) / pageSize)
      : Math.ceil(meta.total / pageSize);
    const totalGroups = Math.ceil(meta.total / 50)
    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        pageSize,
        total: meta.total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        currentGroup: useGroups ? group : undefined,
        totalGroups: useGroups ? totalGroups : undefined,
        useGroups,
        itemsPerGroup,
      },
    };
  }
  // const fetchHewanWithCache = async (
  //   type: TipeHewan, 
  //   params: { 
  //     page?: number
  //     pageSize?: number
  //     group?: string
  //     itemsPerGroup?: number
  //     useGroups?: boolean
  //     meta?: {total: number; target: number}
  //   } = {}
  // ): Promise<HewanQurbanResponse> => {
  //   const cacheKey = `hewan-${type}-${params.page || 1}-${params.group || 'all'}`;
  //   const cachedData = getValidCacheData<HewanQurbanResponse>(cacheKey);
  //   if (cachedData) return cachedData;
  //   const result = await fetchHewan(type, params);
  //   setCachedData(cacheKey, result);
  //   return result;
  // };
  const fetchProducts = async (params: any = {}): Promise<ProdukHewan[]> => {
    const url = `/api/products${params.jenis ? `?jenis=${params.jenis}` : ""}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }
  // Cache layer for fetchProducts
  // const fetchProductsWithCache = async (params: any = {}): Promise<ProdukHewan[]> => {
  //   const cacheKey = 'products';
  //   const cachedData = getValidCacheData<ProdukHewan[]>(cacheKey);
  //   if (cachedData) return cachedData;
    
  //   const data = await fetchProducts(params);
  //   setCachedData(cacheKey, data);
  //   return data;
  // };

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
    const url = `/api/hewan/meta${type ? `?jenis=${type}` : ''}`;
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }
// Cache layer for fetchMeta
  // const fetchMetaWithCache = async (type?: string): Promise<any> => {
  //   const cacheKey = `meta-${type || 'all'}`;
  //   // Return cached data if valid
  //   const cachedData = getValidCacheData(cacheKey);
  //   if (cachedData) return cachedData;

  //   const data = await fetchMeta(type);
  //   setCachedData(cacheKey, data);
  //   return data;
  // };

  // Fetch penerima (recipients)
  

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
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 60,
    errorMessage: "Failed to fetch metadata. Please try again.",
  })

  // Get pagination configs based on meta data
  const sapiPaginationConfig = useMemo(
    () => ({
      pageSize: 10,
      useGroups: false,
      itemsPerGroup: 50,
    }),
    [],
  )
    
  const dombaPaginationConfig = useMemo(
    () => ({
      pageSize: 10,
      useGroups: false,
      itemsPerGroup: 50,
    }),
    [],
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
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 60,
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
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 60,
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
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 60,
    errorMessage: "Failed to fetch error logs. Please try again.",
  })

  const shipmentsQuery = useQueryWithToast({
    queryKey: queryKeys.shipments || ["shipments"],
    queryFn: fetchShipments,
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 60,
    errorMessage: "Failed to fetch shipments. Please try again.",
  })
  
  // Helper function to prevent duplicate operations
  const isDuplicateOperation = useCallback((key: string, minInterval = 1000) => {
    const now = Date.now()
    const lastUpdate = lastSocketUpdate.current.get(key)

    if (lastUpdate && now - lastUpdate < minInterval) {
      return true
    }

    lastSocketUpdate.current.set(key, now)
    return false
  }, [])

  // Helper function to debounce socket updates
  const debounceSocketUpdate = useCallback((key: string, callback: () => void, delay = 100) => {
    const existingTimeout = socketUpdateTimeouts.current
    if (existingTimeout.has(key)) {
      clearTimeout(existingTimeout.get(key)!)
    }
    
    const timeout = setTimeout(() => {
      callback()
      existingTimeout.delete(key) // Clean up after execution
    }, delay)
    existingTimeout.set(key, timeout)
  }, [])

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
      const mutationKey = `${data.hewanId}-${data.status}-${Date.now()}`
      if (pendingMutations.current.has(mutationKey)) {
        throw new Error("Duplicate operation detected")
      }
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
        if (socket && isConnected && !isDuplicateOperation(`hewan-${data.hewanId}`)) {
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
        }, 1000)
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
      if (!err.message.includes("Duplicate operation")) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        })
      }
    },
    // Remove onSettled invalidation - rely on socket updates instead
  })

  const updateProductMutation = useMutation({
    mutationFn: async (data: {
      produkId: number
      event: "menambahkan" | "memindahkan" | "mengkoreksi"
      place: Counter
      value: number
      note?: string
    }) => {
      // Validation remains unchanged
      if (!data.produkId || !data.event || !data.value) {
        throw new Error("Missing required fields: produkId, operation, or value");
      }
      
      if (!["menambahkan", "memindahkan", "mengkoreksi"].includes(data.event)) {
        throw new Error("Operasi tidak valid");
      }

      // Deduplication logic
      const operationKey = `product-${data.produkId}-${data.event}-${data.value}`
      if (pendingMutations.current.has(operationKey)) {
        throw new Error("Duplicate operation detected")
      }
      pendingMutations.current.add(operationKey)
      try {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update status");
        }

        return await response.json();
      } finally {
        setTimeout(() => {
          pendingMutations.current.delete(operationKey)
        }, 1000)
      }
    },
    onMutate: async (newProductData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products })

      const newProduct =  {...newProductData, timestamp: Date.now()}
      const previousProducts = queryClient.getQueryData<ProdukHewan[]>(queryKeys.products)
      // Optimistic update
      queryClient.setQueryData<ProdukHewan[]>(queryKeys.products, old => 
        old?.map(product => 
          product.id === newProductData.produkId
            ? applyProductUpdate(product, newProduct)
            : product
        ) || []
      )
      return { previousProducts }
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData<ProdukHewan[]>(queryKeys.products, (old) => {
        if (!old) return [result];
        return old.map(product =>
          product.id === result.id ? result : product
        ) || [];
      });

      // Emit socket event AFTER successful update
      if (socket && isConnected && !isDuplicateOperation(`product-${variables.produkId}`)) {
        socket.emit("update-product", variables)
      }
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update
      if (context?.previousProducts) {
        queryClient.setQueryData(queryKeys.products, context.previousProducts)
      }
      
      toast({
        title: "Error",
        description: "Failed to update product data. Please try again.",
        variant: "destructive",
      })
    },
    onSettled: () => {
      // Invalidate queries to sync with server
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.products || ["products"] 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.productLogs || ["productLogs"] 
      })
      productsQuery.refetch()
    }
  })

  const createShipmentMutation = useMutation({
    mutationFn: async (data: { products: ShipmentProduct[]; note?: string }) => {
      const shipmentKey = `shipment-${Date.now()}`
      if (pendingMutations.current.has(shipmentKey)) {
        throw new Error("Duplicate shipment creation detected")
      }

      pendingMutations.current.add(shipmentKey)
      try {
        const response = await fetch("/api/shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Gagal mencatat pengiriman");
        }

        return await response.json();
      } finally {
        setTimeout(() => {
          pendingMutations.current.delete(shipmentKey)
        }, 1000)
      }
    },
    onMutate: async (newShipmentData) => {

      // Cancel any outgoing refetches for affected queries to prevent data overwrite
      await queryClient.cancelQueries({ queryKey: queryKeys.products });
      await queryClient.cancelQueries({ queryKey: queryKeys.shipments });

      // Snapshot the previous data for rollback
      const previousProducts = queryClient.getQueryData<ProdukHewan[]>(queryKeys.products);
      const previousShipments = queryClient.getQueryData<Shipment[]>(queryKeys.shipments);

      // --- Optimistic Update for Products ---
      // Apply the 'memindahkan' logic optimistically to product quantities
      queryClient.setQueryData<ProdukHewan[]>(queryKeys.products, oldProducts => {
        if (!oldProducts) return []; // Start with empty if no data
        let updatedProducts = [...oldProducts]; // Create a mutable copy for batch updates

        newShipmentData.products.forEach(({ produkId, jumlah }) => {
          updatedProducts = updatedProducts.map(product =>
            applyProductQuantityChange(
              product, 
              produkId, 
              "memindahkan", 
              Counter.TIMBANG, 
              jumlah)
          );
        });
        return updatedProducts;
      });

      // --- Optimistic Update for Shipments ---
      // Create a temporary ID for the new shipment for optimistic display
      // A more robust temporary ID might use a client-side UUID generator.
      const tempShipmentId = Math.round(Date.now() / 1000000);
      const optimisticShipment: Shipment = {
        id: tempShipmentId,
        daftarProdukHewan: newShipmentData.products,
        catatan: newShipmentData.note || "",
        statusPengiriman: 'DIKIRIM', // Optimistic status
        waktuPengiriman: new Date(),
      };
      queryClient.setQueryData<Shipment[]>(queryKeys.shipments, oldShipments => {
        // Optimistically add the new shipment to the list
        return oldShipments ? [...oldShipments, optimisticShipment] : [optimisticShipment];
      });

      // Return context for onError and onSettled callbacks
      return { previousProducts, previousShipments, tempShipmentId };
    },
    onSuccess: (result, variables, context) => {
      // Optionally, replace the optimistic shipment with the actual server data
      // This is beneficial if the server returns the fully formed new shipment object
      queryClient.setQueryData<Shipment[]>(queryKeys.shipments, oldShipments => {
        if (!oldShipments) return [result]; // Should not happen if onMutate ran
        return oldShipments.map(shipment =>
          shipment.id === context?.tempShipmentId ? result : shipment // Replace temp with real data
        );
      });
      if (socket && isConnected && !isDuplicateOperation("new-shipment")) {
        socket.emit("new-shipment", variables)
      }
      toast({
        title: "Pengiriman dicatat",
        description: "Pengiriman Produk dapat segera dikirim ke inventori",
      })
    },
    onError: (err: Error, variables, context) => {
      // Rollback optimistic updates using the context
      if (context?.previousProducts) {
        queryClient.setQueryData<ProdukHewan[]>(queryKeys.products, context.previousProducts);
      }
      if (context?.previousShipments) {
        queryClient.setQueryData<Shipment[]>(queryKeys.shipments, oldShipments => {
          // Remove the optimistically added shipment
          return oldShipments?.filter(s => s.id !== context.tempShipmentId) || [];
        });
      }
      console.error(err)
      if (!err.message.includes("Duplicate")) {
        toast({
          title: "Error",
          description: `Gagal mencatat pengiriman. Coba lagi.${err.message? " " + err.message : ""}`,
          variant: "destructive",
        })
      }
    },
    onSettled: () =>{
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments || ["shipments"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productLogs || ["productLogs"] })
      shipmentsQuery.refetch()
    }
  })

  // Add a new mutation for receiving shipments
  const receiveShipmentMutation = useMutation({
    mutationFn: async (data: {
      shipmentId: number
      receivedProducts: { produkId: number; jumlah: number }[]
    }) => {
      const receiveKey = `receive-${data.shipmentId}`
      if (pendingMutations.current.has(receiveKey)) {
        throw new Error("Duplicate receive operation detected")
      }

      pendingMutations.current.add(receiveKey)

      try {
        const response = await fetch(`/api/shipments/${data.shipmentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.receivedProducts),
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "Failed to receive shipment")
        }
        
        return response.json()
      } finally {
        setTimeout(() => {
          pendingMutations.current.delete(receiveKey)
        }, 1000)
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments })
      queryClient.invalidateQueries({ queryKey: queryKeys.products })
      queryClient.invalidateQueries({ queryKey: queryKeys.productLogs })
      shipmentsQuery.refetch()
    }
  })
  
  const updateErrorLogNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => await updateErrorLogNote({id, note}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errorLogs'] }) // Adjust key as needed
      toast({ title: 'Success', description: 'Error note updated' })
    },
    onError: (error) => {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive',
      })
    },
  })

  // Add receiveShipment to context value
  const receiveShipment = async (shipmentId: number, receivedProducts: { produkId: number; jumlah: number }[]) => {
    return receiveShipmentMutation.mutateAsync({ shipmentId, receivedProducts })
  }

  // const invalidateCache = (key: string) => {
  //   localStorage.removeItem(key);
  // };

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
      if (data.receivedByMdhohi !== undefined) {
        queryClient.invalidateQueries({ queryKey: queryKeys.penerima })
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
    if (isDuplicateOperation("socket-sapi-bulk", 2000)) return

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
            totalPages: Math.ceil((data?.length || 0) / sapiPaginationConfig.pageSize),
            pageSize: sapiPaginationConfig.pageSize,
            total: data?.length || 0,
            hasNext: false,
            hasPrev: false,
          }
        }
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.meta })
    }, 200) // Longer debounce for bulk updates
  }

  const handleDombaDataUpdate = (data: HewanQurban[]) => {
    if (isDuplicateOperation("socket-domba-bulk", 2000)) return

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
            totalPages: Math.ceil((data?.length || 0) / dombaPaginationConfig.pageSize),
            pageSize: dombaPaginationConfig.pageSize,
            total: data?.length || 0,
            hasNext: false,
            hasPrev: false,
          }
        }
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.meta })
    }, 200)
  }

  // Handle product updates with change detection
  const handleProductUpdate = (data: { products: ProdukHewan[] }) => {
    if (isDuplicateOperation("socket-products", 1000)) return
    debounceSocketUpdate('products', () => {
      const currentData = queryClient.getQueryData(queryKeys.products)
      if (currentData && JSON.stringify(currentData) === JSON.stringify(data.products)) {
        return // No changes, skip update
      }

      queryClient.setQueryData(queryKeys.products, data.products)
    })
  }

  // Other socket handlers remain the same but with debouncing
  const handleErrorLogsUpdate = (data: { errorLogs: ErrorLog[] }) => {
    if (isDuplicateOperation("socket-errorLogs", 1000)) return
    debounceSocketUpdate('errorLogs', () => {
      queryClient.setQueryData(queryKeys.errorLogs, data.errorLogs)
    })
  }

  const handleShipmentUpdate = (data: { shipments: Shipment[] }) => {
    if (isDuplicateOperation("socket-shipments", 1000)) return
    debounceSocketUpdate('shipments', () => {
      queryClient.setQueryData(queryKeys.shipments || ["shipments"], data.shipments)
    })
  }  
  
  // Handle product logs updates
  const handleProductLogsUpdate = (data: { productLogs: ProductLogWithProduct[] }) => {
    if (isDuplicateOperation("socket-productLogs", 1000)) return
    debounceSocketUpdate('shipments', () => {
      queryClient.setQueryData(queryKeys.productLogs || ["productLogs"], data.productLogs)
    })
  }

  const handleReconnect = () => {
    console.log('Socket reconnected')
    resetQueries() // Fresh data on reconnect
  }
  const socketEventHandlers = useMemo(() => ({
    'update-hewan': handleHewanUpdate,
    'update-product': handleProductUpdate,
    "products-updated": handleProductUpdate, // Add this line
    "product-updated": (data: ProdukHewan) => {
      // Add this handler
      if (isDuplicateOperation("socket-single-product", 500)) return

      debounceSocketUpdate("single-product", () => {
        queryClient.setQueryData(queryKeys.products, (old: ProdukHewan[] | undefined) => {
          if (!old) return [data]
          return old.map((product) => (product.id === data.id ? data : product))
        })
      })
    },
    'error-logs': handleErrorLogsUpdate,
    'shipment-update': handleShipmentUpdate,
    // 'shipment-received': handleShipmentReceived,
    'sapi-data-updated': handleSapiDataUpdate,
    'domba-data-updated': handleDombaDataUpdate,
    'product-logs-updated': handleProductLogsUpdate,
    "inventory-updated": () => {
      // Add this handler for inventory updates
      if (isDuplicateOperation("socket-inventory", 500)) return

      debounceSocketUpdate("inventory", () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.products })
      })
    },
    "hasil-timbang-updated": () => {
      // Add this handler for timbang updates
      if (isDuplicateOperation("socket-timbang", 500)) return

      debounceSocketUpdate("timbang", () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.products })
      })
    },
    'reconnect': handleReconnect,
  }), [
    queryClient, // Always a dependency for cache interactions
    pagination, // Existing dependency
    // All handlers/functions used inside the useMemo that are defined outside or come from hooks
    handleHewanUpdate,
    handleProductUpdate,
    handleErrorLogsUpdate,
    handleShipmentUpdate,
    handleSapiDataUpdate,
    handleDombaDataUpdate,
    handleProductLogsUpdate,
    handleReconnect,
    isDuplicateOperation, // Custom utility function
    debounceSocketUpdate, // Custom utility function
    queryKeys.products, // Specifically used for invalidateQueries and setQueryData
  ])
  // Set up socket listeners to update the query cache
  useEffect(() => {
    if (!socket) return
        // Remove existing listeners to prevent duplicates
    Object.entries(socketEventHandlers).forEach(([event, handler]) => {
      socket.off(event, handler)
    })
    Object.entries(socketEventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      Object.entries(socketEventHandlers).forEach(([event, handler]) => {
        socket.off(event, handler)
      })
    }
  }, [socket, socketEventHandlers])

  const performanceRef = useRef({
    renderCount: 0,
    lastRender: Date.now()
  })

  useEffect(() => {
    performanceRef.current.renderCount++
    performanceRef.current.lastRender = Date.now()
  })
  
// ======================== UTILITY FUNCTIONS ========================

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

  const updateErrorLogNote = (data: {
    id: number, note: string
  }) => {
    updateErrorLogNoteMutation.mutate(data)
  }

  const updateProduct = (data: {
    produkId: number
    event: "menambahkan" | "memindahkan" | "mengkoreksi"
    place: Counter
    value: number
    note?: string
  }) => {
    updateProductMutation.mutate(data)
  }
  
  const createShipment = async (products: ShipmentProduct[], note?: string) => {
    return createShipmentMutation.mutateAsync({ products, note })
  }

  const resetQueries = useCallback(() => {
    queryClient.resetQueries()
    // Clear pending mutations and duplicate tracking
    pendingMutations.current.clear()
    lastSocketUpdate.current.clear()
    // Clear socket timeouts
    socketUpdateTimeouts.current.forEach(timeout => clearTimeout(timeout))
    socketUpdateTimeouts.current.clear()
    
    toast({
      title: "Data Reset",
      description: "All data has been refreshed",
      variant: "default",
    })
  }, [queryClient])
  // Create context value
  const contextValue: QurbanContextType = useMemo(() => ({
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
          undefined,
        pageSize: sapiPaginationConfig.pageSize,
        total: metaQuery.data?.sapi.total || 0,
        hasNext: false,
        hasPrev: false,
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
          undefined,
        pageSize: dombaPaginationConfig.pageSize,
        total: metaQuery.data?.domba.total || 0,
        hasNext: false,
        hasPrev: false,
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
    resetQueries,
    updateHewan,
    updateProduct,
    createShipment,
    receiveShipment,
    getProductById,
    getProductsByType,
    getProductLogsByPlace,
    getProductLogsByProduct,
    updateErrorLogNote,
  }), [
    sapiQuery.data,
    dombaQuery.data,
    productsQuery.data,
    productLogsQuery.data,
    errorLogsQuery.data,
    shipmentsQuery.data,
    metaQuery.data,
    resetQueries,
  ])
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

// Helper function for optimistic updates
function applyProductUpdate(product: ProdukHewan, data: ProductLog): ProdukHewan {
  const updated = { ...product }; // Always work with an immutable copy

  switch (data.event) {
    case "menambahkan":
      // Use if/else for conditional assignments
      if (data.place === Counter.TIMBANG) {
        updated.diTimbang += data.value;
      } else if (data.place === Counter.INVENTORY) {
        updated.diInventori += data.value;
      }
      break;

    case "memindahkan":
      // This part was already correct with if/else
      if (data.place === Counter.TIMBANG) {
        updated.diTimbang = Math.max(0, updated.diTimbang - data.value);
      } else if (data.place === Counter.INVENTORY) { // Added else if for clarity, though `else` works if only two places
        updated.diInventori = Math.max(0, updated.diInventori - data.value);
      }
      break;

    case "mengkoreksi":
      // Use if/else for conditional assignments
      if (data.place === Counter.TIMBANG) {
        updated.diTimbang = data.value;
      } else if (data.place === Counter.INVENTORY) {
        updated.diInventori = data.value;
      }
      break;
  }

  return updated;
}

function applyProductQuantityChange(
  product: ProdukHewan,
  produkId: number, // The ID of the product being targeted
  event: 'memindahkan' | 'menambahkan' | 'mengkoreksi', // Specific events for quantity
  place: Counter, // Where the quantity is being changed
  value: number // The amount of change
): ProdukHewan {
  if (product.id !== produkId) {
    return product; // Only apply update to the matching product
  }
  const updated = { ...product }; // Create an immutable copy

  switch (event) {
    case "memindahkan":
      // Assuming 'memindahkan' from TIMBANG means it goes to INVENTORY
      // This is a crucial assumption based on your original code's logic.
      if (place === Counter.TIMBANG) {
        updated.diTimbang = Math.max(0, updated.diTimbang - value);
        updated.diInventori += value; // Increase inventory as it's moved there
      }
      // Add other 'memindahkan' scenarios if applicable (e.g., between inventory locations)
      break;
    case "menambahkan": // Assuming this means adding to a specific place
      if (place === Counter.TIMBANG) {
        updated.diTimbang += value;
      } else if (place === Counter.INVENTORY) {
        updated.diInventori += value;
      }
      break;
    case "mengkoreksi": // Correcting to an absolute value
      if (place === Counter.TIMBANG) {
        updated.diTimbang = value;
      } else if (place === Counter.INVENTORY) {
        updated.diInventori = value;
      }
      break;
  }
  return updated;
}
