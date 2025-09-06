/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useCallback, useEffect, useMemo } from "react"
import { Counter } from "@prisma/client"
import { useMutation } from "@tanstack/react-query"
import { queryKeys } from "@/lib/tanstack-query/qurban"
import type { ErrorLog, ErrorLogQueryResult, ProductLogQueryResult, ProductLogWithProduct, ProductQueryResult, ProdukHewan, Shipment, ShipmentProduct, ShipmentQueryResult } from "@/types/qurban"
import { useClientQuerySync, useQueryWithToast } from "@/hooks/use-query"
import { applyProductUpdate, applyProductQuantityChange } from "#@/lib/server/services/products.ts"
import { toast } from "../use-toast"
import type { QueryResult } from "#@/lib/DTOs/global.ts"

export function useProduct() {
  const { 
    queryClient, 
    socket,
    isConnected, 
    pendingMutations, 
    isDuplicateOperation,
    debounceSocketUpdate } = useClientQuerySync()

  // Memoize fetch functions
  const fetchFunctions = useMemo(
    () => ({
      fetchProducts: async (params: any = {}): Promise<ProdukHewan[]> => {
        const { jenis } = params
        const url = `/api/products${jenis ? `?jenis=${jenis}` : ""}`
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      },

      fetchProductLogs: async (
        params: { produkId?: number; place?: Counter } = {},
      ): Promise<ProductLogWithProduct[]> => {
        const searchParams = new URLSearchParams()
        const { produkId, place } = params

        if (produkId) {
          searchParams.append("produkId", produkId.toString())
        }
        if (place) {
          searchParams.append("place", place)
        }

        const url = `/api/product-logs?${searchParams.toString()}`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        return response.json()
      },

      fetchErrorLogs: async (): Promise<ErrorLog[]> => {
        const response = await fetch("/api/error-logs")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      },

      fetchShipments: async (): Promise<Shipment[]> => {
        const response = await fetch("/api/shipments")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      },
    }),
    [],
  )

  // Queries
  const productsQuery: ProductQueryResult = useQueryWithToast({
    queryKey: queryKeys.products,
    queryFn: () => fetchFunctions.fetchProducts(),
    staleTime: isConnected ? 3 * 60 * 1000 : 60 * 1000,
    gcTime: 10 * 60 * 1000,
    errorMessage: "Failed to fetch product data. Please try again.",
    refetchOnWindowFocus: false,
  })

  const productLogsQuery: QueryResult<ProductLogWithProduct> = useQueryWithToast({
    queryKey: queryKeys.productLogs || ["productLogs"],
    queryFn: () => fetchFunctions.fetchProductLogs(),
    staleTime: isConnected ? 60 * 1000 : 30 * 1000,
    gcTime: 5 * 60 * 1000,
    errorMessage: "Failed to fetch product logs. Please try again.",
    refetchOnWindowFocus: false,
  })

  const errorLogsQuery: ErrorLogQueryResult = useQueryWithToast({
    queryKey: queryKeys.errorLogs,
    queryFn: fetchFunctions.fetchErrorLogs,
    staleTime: isConnected ? 2 * 60 * 1000 : 60 * 1000,
    gcTime: 10 * 60 * 1000,
    errorMessage: "Failed to fetch error logs. Please try again.",
    refetchOnWindowFocus: false,
  })

  const shipmentsQuery: ShipmentQueryResult = useQueryWithToast({
    queryKey: queryKeys.shipments || ["shipments"],
    queryFn: fetchFunctions.fetchShipments,
    staleTime: isConnected ? 60 * 1000 : 30 * 1000,
    gcTime: 5 * 60 * 1000,
    errorMessage: "Failed to fetch shipments. Please try again.",
    refetchOnWindowFocus: false,
  })

  // Mutations
  const updateProductMutation = useMutation({
    mutationFn: async (data: {
      produkId: number
      event: "menambahkan" | "memindahkan" | "mengkoreksi"
      place: Counter
      value: number
      note?: string
    }) => {
      if (!data.produkId || !data.event || !data.value) {
        throw new Error("Missing required fields: produkId, operation, or value")
      }

      if (!["menambahkan", "memindahkan", "mengkoreksi"].includes(data.event)) {
        throw new Error("Operasi tidak valid")
      }

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
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "Failed to update status")
        }

        return await response.json()
      } finally {
        setTimeout(() => {
          pendingMutations.current.delete(operationKey)
        }, 1000)
      }
    },
    onMutate: async (newProductData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products })

      const newProduct = { ...newProductData, timestamp: Date.now() }
      const previousProducts = queryClient.getQueryData<ProdukHewan[]>(queryKeys.products)

      queryClient.setQueryData<ProdukHewan[]>(
        queryKeys.products,
        (old) =>
          old?.map((product) =>
            product.id === newProductData.produkId ? applyProductUpdate(product, newProduct) : product,
          ) || [],
      )
      return { previousProducts }
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData<ProdukHewan[]>(queryKeys.products, (old) => {
        if (!old) return [result]
        return old.map((product) => (product.id === result.id ? result : product))
      })

      if (socket && isConnected && !isDuplicateOperation(`product-${variables.produkId}`)) {
        socket.emit("update-product", variables)
      }
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.products || ["products"] 
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.productLogs || ["productLogs"],
        exact: false,
      })
    },
    onError: (err, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(queryKeys.products, context.previousProducts)
      }

      toast({
        title: "Error",
        description: "Failed to update product data. Please try again.",
        variant: "destructive",
      })
    },
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
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "Gagal mencatat pengiriman")
        }

        return await response.json()
      } finally {
        setTimeout(() => {
          pendingMutations.current.delete(shipmentKey)
        }, 1000)
      }
    },
    onMutate: async (newShipmentData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products })
      await queryClient.cancelQueries({ queryKey: queryKeys.shipments })

      const previousProducts = queryClient.getQueryData<ProdukHewan[]>(queryKeys.products)
      const previousShipments = queryClient.getQueryData<Shipment[]>(queryKeys.shipments)

      // Optimistic update for products
      queryClient.setQueryData<ProdukHewan[]>(queryKeys.products, (oldProducts) => {
        if (!oldProducts) return []
        let updatedProducts = [...oldProducts]

        newShipmentData.products.forEach(({ produkId, jumlah }) => {
          updatedProducts = updatedProducts.map((product) =>
            applyProductQuantityChange(product, produkId, "memindahkan", Counter.TIMBANG, jumlah),
          )
        })
        return updatedProducts
      })

      // Optimistic update for shipments
      const tempShipmentId = Math.round(Date.now() / 1000000)
      const optimisticShipment: Shipment = {
        id: tempShipmentId,
        daftarProdukHewan: newShipmentData.products,
        catatan: newShipmentData.note || "",
        statusPengiriman: "DIKIRIM",
        waktuPengiriman: new Date(),
      }

      queryClient.setQueryData<Shipment[]>(queryKeys.shipments, (oldShipments) => {
        return oldShipments ? [...oldShipments, optimisticShipment] : [optimisticShipment]
      })

      return { previousProducts, previousShipments, tempShipmentId }
    },
    onSuccess: (result, variables, context) => {
      queryClient.setQueryData<Shipment[]>(queryKeys.shipments, (oldShipments) => {
        if (!oldShipments) return [result]
        return oldShipments.map((shipment) => (shipment.id === context?.tempShipmentId ? result : shipment))
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments || ["shipments"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productLogs || ["productLogs"] })
      if (socket && isConnected && !isDuplicateOperation("new-shipment")) {
        socket.emit("new-shipment", variables)
      }

      toast({
        title: "Pengiriman dicatat",
        description: "Pengiriman Produk dapat segera dikirim ke inventori",
      })
    },
    onError: (err: Error, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData<ProdukHewan[]>(queryKeys.products, context.previousProducts)
      }
      if (context?.previousShipments) {
        queryClient.setQueryData<Shipment[]>(queryKeys.shipments, context.previousShipments)
      }
// if (context?.previousProducts) {
//         queryClient.setQueryData<ProdukHewan[]>(queryKeys.products, context.previousProducts);
//       }
//       if (context?.previousShipments) {
//         queryClient.setQueryData<Shipment[]>(queryKeys.shipments, oldShipments => {
//           // Remove the optimistically added shipment
//           return oldShipments?.filter(s => s.id !== context.tempShipmentId) || [];
//         });
//       }
      if (!err.message.includes("Duplicate")) {
        toast({
          title: "Error",
          description: `Gagal mencatat pengiriman. Coba lagi.${err.message ? " " + err.message : ""}`,
          variant: "destructive",
        })
      }
    },
  })

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
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string
          return ["shipments", "products", "productLogs"].includes(key)
        },
      })
       // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments })
      queryClient.invalidateQueries({ queryKey: queryKeys.products })
      queryClient.invalidateQueries({ queryKey: queryKeys.productLogs })
    },
  })

  const updateErrorLogNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; selesai?: boolean; note: string }) => {
      const response = await fetch(`/api/error-logs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      })

      if (!response.ok) {
        throw new Error("Failed to update error log note")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.errorLogs })
      toast({ title: "Success", description: "Error note updated" })
    },
    onError: (error) => {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      })
    },
  })

  // Socket event handlers for product data
  const socketEventHandlers = useMemo(() => {
    const handleProductUpdate = (data: { products: ProdukHewan[] }) => {
      if (isDuplicateOperation("socket-products", 500)) return

      debounceSocketUpdate(
        "products",
        () => {
          const currentData = queryClient.getQueryData(queryKeys.products)
          if (currentData && JSON.stringify(currentData) === JSON.stringify(data.products)) {
            return // No changes, skip update
          }
          const products = Array.isArray(data) ? data : "products" in data ? data.products : [data]

          queryClient.setQueryData(queryKeys.products, products)
          queryClient.invalidateQueries({ queryKey: queryKeys.products })
        },
        50,
      )
    }

    // Other socket handlers remain the same but with debouncing
    const handleErrorLogsUpdate = (data: { errorLogs: ErrorLog[] }) => {
      if (isDuplicateOperation("socket-errorLogs", 1000)) return
      debounceSocketUpdate('errorLogs', () => {
        queryClient.setQueryData(queryKeys.errorLogs, data.errorLogs)
        queryClient.invalidateQueries({ queryKey: queryKeys.errorLogs })
      })
    }

    const handleShipmentUpdate = (data: { shipments: Shipment[] }) => {
      if (isDuplicateOperation("socket-shipments", 1000)) return
      debounceSocketUpdate('shipments', () => {
        queryClient.setQueryData(queryKeys.shipments || ["shipments"], data.shipments)
        queryClient.invalidateQueries({ queryKey: queryKeys.shipments || ["shipments"] })
      })
    }  

    // Handle product logs updates
    const handleProductLogsUpdate = (data: { productLogs: ProductLogWithProduct[] }) => {
      if (isDuplicateOperation("socket-productLogs", 1000)) return
      debounceSocketUpdate('productLogs', () => {
        queryClient.setQueryData(queryKeys.productLogs || ["productLogs"], data.productLogs)
        queryClient.invalidateQueries({ queryKey: queryKeys.productLogs || ["productLogs"] })
      })
    }
    return {
      "update-product": handleProductUpdate,
      "products-updated": handleProductUpdate,
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
      "error-logs": handleErrorLogsUpdate,
      "shipment-update": handleShipmentUpdate,
      // 'shipment-received': handleShipmentReceived,
      "product-logs-updated": handleProductLogsUpdate,
      "inventory-updated": () => {
        if (isDuplicateOperation("socket-inventory", 500)) return
        debounceSocketUpdate("inventory", () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.products })
        })
      },
      "hasil-timbang-updated": () => {
        if (isDuplicateOperation("socket-timbang", 500)) return
        debounceSocketUpdate("timbang", () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.products })
        })
      },
      reconnect: () => {
        console.log("Socket reconnected - refreshing product data")
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0] as string
            return ["products", "productLogs", "shipments", "errorLogs"].includes(key)
          },
        })
      },
    }
  }, [queryClient, isDuplicateOperation, debounceSocketUpdate])

  // Set up socket listeners
  useEffect(() => {
    if (!socket) return

    Object.entries(socketEventHandlers).forEach(([event, handler]) => {
      socket.off(event, handler)
      socket.on(event, handler)
    })

    return () => {
      Object.entries(socketEventHandlers).forEach(([event, handler]) => {
        socket.off(event, handler)
      })
    }
  }, [socket, socketEventHandlers])

  // Utility functions
  const getProductById = useCallback(
    (id: number): ProdukHewan | undefined => {
      return productsQuery.data?.find((product) => product.id === id)
    },
    [productsQuery.data],
  )

  const getProductsByType = useCallback(
    (type: "daging" | "all"): ProdukHewan[] => {
      if (type === "all") return productsQuery.data || []

      return productsQuery.data?.filter((product) => product.JenisProduk?.toLowerCase().includes("daging")) || []
    },
    [productsQuery.data],
  )

  const getProductLogsByPlace = useCallback(
    (place: Counter): ProductLogWithProduct[] => {
      return productLogsQuery.data?.filter((log) => log.place === place) || []
    },
    [productLogsQuery.data],
  )

  const getProductLogsByProduct = useCallback(
    (produkId: number): ProductLogWithProduct[] => {
      return productLogsQuery.data?.filter((log) => log.produkId === produkId) || []
    },
    [productLogsQuery.data],
  )

  // Action functions
  const updateProduct = useCallback(
    (data: {
      produkId: number
      event: "menambahkan" | "memindahkan" | "mengkoreksi"
      place: Counter
      value: number
      note?: string
    }) => {
      updateProductMutation.mutate(data)
    },
    [updateProductMutation],
  )

  const createShipment = useCallback(
    async (products: ShipmentProduct[], note?: string) => {
      return createShipmentMutation.mutateAsync({ products, note })
    },
    [createShipmentMutation],
  )

  const receiveShipment = useCallback(
    async (shipmentId: number, receivedProducts: { produkId: number; jumlah: number }[]) => {
      return receiveShipmentMutation.mutateAsync({ shipmentId, receivedProducts })
    },
    [receiveShipmentMutation],
  )

  const updateErrorLogNote = useCallback(
    (data: { id: number; selesai?: boolean; note: string }) => {
      updateErrorLogNoteMutation.mutate(data)
    },
    [updateErrorLogNoteMutation],
  )

  const resetProductQueries = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0] as string
        return ["products", "productLogs", "shipments", "errorLogs"].includes(key)
      },
    })

    // Clear product-related pending mutations
    Array.from(pendingMutations.current).forEach((key) => {
      if (key.includes("product") || key.includes("shipment") || key.includes("error")) {
        pendingMutations.current.delete(key)
      }
    })

    toast({
      title: "Product Data Reset",
      description: "Product data has been refreshed",
      variant: "default",
    })
  }, [queryClient, pendingMutations])

  return {
    // Queries
    productsQuery,
    productLogsQuery: {
      ...productLogsQuery,
      refetch: useCallback(
        async (filters?: { produkId?: number; place?: Counter }) => {
          const queryKey = filters ? [queryKeys.productLogs, filters] : queryKeys.productLogs

          return queryClient.refetchQueries({
            queryKey,
            exact: true,
          })
        },
        [queryClient, queryKeys.productLogs],
      ),
    } as ProductLogQueryResult,
    errorLogsQuery,
    shipmentsQuery,

    // State
    isConnected,

    // Actions
    updateProduct,
    createShipment,
    receiveShipment,
    updateErrorLogNote,
    resetProductQueries,

    // Utility functions
    getProductById,
    getProductsByType,
    getProductLogsByPlace,
    getProductLogsByProduct,

    // Loading states
    isLoadingProducts: productsQuery.isLoading,
    isLoadingProductLogs: productLogsQuery.isLoading,
    isLoadingErrorLogs: errorLogsQuery.isLoading,
    isLoadingShipments: shipmentsQuery.isLoading,
  }
}
