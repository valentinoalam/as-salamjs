/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useSocket } from "@/contexts/socket-context"
import {
  JenisDistribusi,
  type HewanQurban,
  type HewanStatus,
  type Mudhohi
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
import { getPaginationConfig, getValidCacheData, setCachedData, type Distribusi, type ErrorLog, type HewanQurbanResponse, type LogDistribusi, type Penerima, type ProductLogWithProduct, type ProdukHewan, type QueryWithToastOptions, type QurbanContextType, type Shipment, type ShipmentProduct, type TipeHewan } from "@/types/qurban"

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
  
  // Debounce socket updates to prevent rapid fire updates
  const socketUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  // Add cleanup in useEffect
  useEffect(() => {
    return () => {
      // Clear all pending timeouts
      socketUpdateTimeouts.current.forEach(timeout => clearTimeout(timeout))
      socketUpdateTimeouts.current.clear()
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
  const fetchHewanWithCache = async (
    type: TipeHewan, 
    params: { 
      page?: number
      pageSize?: number
      group?: string
      itemsPerGroup?: number
      useGroups?: boolean
      meta?: {total: number; target: number}
    } = {}
  ): Promise<HewanQurbanResponse> => {
    const cacheKey = `hewan-${type}-${params.page || 1}-${params.group || 'all'}`;
    const cachedData = getValidCacheData<HewanQurbanResponse>(cacheKey);
    if (cachedData) return cachedData;
    const result = await fetchHewan(type, params);
    setCachedData(cacheKey, result);
    return result;
  };
  const fetchProducts = async (params: any = {}): Promise<ProdukHewan[]> => {
    const url = `/api/products${params.jenis ? `?jenis=${params.jenis}` : ""}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }
  // Cache layer for fetchProducts
  const fetchProductsWithCache = async (params: any = {}): Promise<ProdukHewan[]> => {
    const cacheKey = 'products';
    const cachedData = getValidCacheData<ProdukHewan[]>(cacheKey);
    if (cachedData) return cachedData;
    
    const data = await fetchProducts(params);
    setCachedData(cacheKey, data);
    return data;
  };

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
  const fetchMetaWithCache = async (type?: string): Promise<any> => {
    const cacheKey = `meta-${type || 'all'}`;
    // Return cached data if valid
    const cachedData = getValidCacheData(cacheKey);
    if (cachedData) return cachedData;

    const data = await fetchMeta(type);
    setCachedData(cacheKey, data);
    return data;
  };

  // Fetch penerima (recipients)
  const fetchPenerima = async (): Promise<Penerima[]> => {
    const response = await fetch("/api/penerima")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  // Fetch distribusi (distributions)
  const fetchDistribusi = async (): Promise<Distribusi[]> => {
    const response = await fetch("/api/distribusi")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  // Fetch mudhohi (donors who have taken their qurban)
  const fetchMudhohi = async (): Promise<Mudhohi[]> => {
    const response = await fetch("/api/mudhohi")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  // Query for metadata
  const metaQuery = useQueryWithToast({
    queryKey: queryKeys.meta,
    queryFn: async () => {
      const metaData = await fetchMetaWithCache()
      return {
        sapi: { total: metaData.sapi.total || 0, target: metaData.sapi.target || 0, slaughtered: metaData.sapi.slaughtered || 0 },
        domba: { total: metaData.domba.total || 0, target: metaData.domba.target || 0, slaughtered: metaData.domba.slaughtered || 0 },
      }
    },
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch metadata. Please try again.",
  })

  // Get pagination configs based on meta data
  const sapiPaginationConfig = useMemo(() => 
    getPaginationConfig(
      metaQuery.data?.sapi.target || 0,
      metaQuery.data?.sapi.total || 0
    ),
  [metaQuery.data?.sapi.target, metaQuery.data?.sapi.total]);
    
  const dombaPaginationConfig = useMemo(() => 
    getPaginationConfig(
      metaQuery.data?.domba.target || 0,
      metaQuery.data?.domba.total || 0
    ),
  [metaQuery.data?.domba.target, metaQuery.data?.domba.total]);


  // Set up queries
  const sapiQuery = useQueryWithToast({
    queryKey: [...queryKeys.sapi, pagination.sapiPage, pagination.sapiGroup, sapiPaginationConfig],
    queryFn: async () => await fetchHewanWithCache("sapi", { 
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
    queryFn: async () => await fetchHewanWithCache("domba", { 
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
    queryFn: () => fetchProductsWithCache(),
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

  const penerimaQuery = useQueryWithToast({
    queryKey: queryKeys.penerima,
    queryFn: fetchPenerima,
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch penerima data. Please try again.",
  })

  const distribusiQuery = useQueryWithToast({
    queryKey: queryKeys.distribusi,
    queryFn: fetchDistribusi,
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch distribusi data. Please try again.",
  })

  const mudhohiQuery = useQueryWithToast({
    queryKey: queryKeys.mudhohi,
    queryFn: fetchMudhohi,
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch mudhohi data. Please try again.",
  })
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
       // If it's a critical error, reset everything
      if (err.message.includes('critical') || err.message.includes('sync')) {
        resetQueries()
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
      operation: "menambahkan" | "memindahkan" | "mengkoreksi"
      place: Counter
      value: number
      note?: string
    }) => {
      if (!data.productId || !data.operation || !data.value) {
        throw new Error("Missing required fields: productId, operation, or value");
      }
      // Validasi operasi
      if (!["menambahkan", "memindahkan", "mengkoreksi"].includes(data.operation)) {
        throw new Error("Operasi tidak valid");
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

            // if (newProductData.operation === "menambahkan") {
            //   if (newProductData.place === Counter.PENYEMBELIHAN) {
            //     updatedProduct.diTimbang += newProductData.value
            //   } else if (newProductData.place === Counter.INVENTORY) {
            //     updatedProduct.diInventori += newProductData.value
            //   }
            // } else if (newProductData.operation === "memindahkan") {
            //   if (newProductData.place === Counter.PENYEMBELIHAN) {
            //     updatedProduct.diTimbang = Math.max(0, updatedProduct.diTimbang - newProductData.value)
            //   } else if (newProductData.place === Counter.INVENTORY) {
            //     updatedProduct.diInventori = Math.max(0, updatedProduct.diInventori - newProductData.value)
            //   }
            // } else if (newProductData.operation === "mengkoreksi") {
            //   // Handle correction logic
            //   if (newProductData.place === Counter.PENYEMBELIHAN) {
            //     updatedProduct.diTimbang = newProductData.value
            //   } else if (newProductData.place === Counter.INVENTORY) {
            //     updatedProduct.diInventori = newProductData.value
            //   }
            // }
            // Handle different operation types
            switch (newProductData.operation) {
              case "menambahkan":
                if (newProductData.place === Counter.PENYEMBELIHAN) {
                  updatedProduct.diTimbang += newProductData.value
                } else if (newProductData.place === Counter.INVENTORY) {
                  updatedProduct.diInventori += newProductData.value
                }
                break
                
              case "memindahkan":
                if (newProductData.place === Counter.PENYEMBELIHAN) {
                  updatedProduct.diTimbang = Math.max(0, updatedProduct.diTimbang - newProductData.value)
                } else if (newProductData.place === Counter.INVENTORY) {
                  updatedProduct.diInventori = Math.max(0, updatedProduct.diInventori - newProductData.value)
                }
                break
                
              case "mengkoreksi":
                // Directly set the value for corrections
                if (newProductData.place === Counter.PENYEMBELIHAN) {
                  updatedProduct.diTimbang = newProductData.value
                } else if (newProductData.place === Counter.INVENTORY) {
                  updatedProduct.diInventori = newProductData.value
                }
                break
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
        throw new Error(error.message || "Gagal mencatat pengiriman");
      }
      // Untuk setiap produk dalam shipment, catat operasi "memindahkan"
      data.products.forEach(({ produkId, jumlah }) => {
        updateProduct({
          productId: produkId,
          operation: "memindahkan",
          place: Counter.PENYEMBELIHAN,
          value: jumlah,
          note: `Dipindahkan ke inventori${data.note ? ` - ${data.note}` : ''}`
        });
      });
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

  // Add a new mutation for receiving shipments
  const receiveShipmentMutation = useMutation({
    mutationFn: async (data: {
      shipmentId: number
      receivedProducts: { produkId: number; jumlah: number }[]
    }) => {
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
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments })
      queryClient.invalidateQueries({ queryKey: queryKeys.products })
      queryClient.invalidateQueries({ queryKey: queryKeys.productLogs })
    }
  })
// Create distribution
  const createDistribusiMutation = useMutation({
    mutationFn: async (data: {
      kategori: string;
      target: number;
    }) => {
      const response = await fetch("/api/distribusi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create distribution");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribusi"] });
    }
  });
  
  // Create recipient
  const createPenerimaMutation = useMutation({
    mutationFn: async (data: {
      distribusiId: string;
      nama: string;
      diterimaOleh?: string;
      noIdentitas?: string;
      alamat?: string;
      telepon?: string;
      keterangan?: string;
      jenis: JenisDistribusi;
      noKupon?: string;
      produkDistribusi: { produkId: number; jumlah: number }[];
    }) => {
      const response = await fetch("/api/penerima", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          // Convert products to JSON string for storage
          produkQurban: JSON.stringify(data.produkDistribusi)
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create recipient");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penerima"] });
    }
  });
  const updateMudhohiReceived = useMutation({
    mutationFn: async ({ hewanId, received }: { 
      hewanId: string, 
      received: boolean 
    }) => {
      const res = await fetch(`/api/hewan/${hewanId}/received`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ received }),
      });
      if (!res.ok) throw new Error("Failed to update mudhohi status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.penerima })
    },
  });

  // Update kupon received status
  const updateKuponReceivedMutation = useMutation({
    mutationFn: async ({ penerimaId, diterima }: { 
      penerimaId: string, 
      diterima: boolean 
    }) => {
      const res = await fetch(`/api/penerima/${penerimaId}/received`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diterima }),
      });
      if (!res.ok) throw new Error("Failed to update kupon status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.penerima })
    },
  });
  // Update distribution log
  const updateLogDistribusiMutation = useMutation({
    mutationFn: async (data: {
      penerimaId: string;
      produk: { produkId: number; jumlah: number }[];
    }) => {
      const response = await fetch(`/api/penerima/${data.penerimaId}/distribusi`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produkQurban: JSON.stringify(data.produk)
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update distribution log");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log-distribusi"] });
    }
  });

  // ======================== GROUP PROPOSAL MUTATION ========================
  // const submitGroupProposalMutation = useMutation({
  //   mutationFn: async (data: {
  //     distribusiId: string;
  //     nama: string;
  //     penanggungJawab: string;
  //     produkDistribusi: { produkId: number; jumlah: number }[];
  //     alamat?: string;
  //     telepon?: string;
  //     keterangan?: string;
  //   }) => {
  //     const response = await fetch("/api/penerima", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         ...data,
  //         jenis: JenisDistribusi.KELOMPOK,
  //         noKupon: `GROUP-${Date.now()}` // Generate unique group ID
  //       }),
  //     })
      
  //     if (!response.ok) {
  //       const error = await response.json()
  //       throw new Error(error.message || "Failed to submit group proposal")
  //     }
      
  //     return response.json()
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: queryKeys.penerima })
  //     toast({
  //       title: "Proposal Submitted!",
  //       description: "Group proposal submitted successfully",
  //       variant: "default",
  //     })
  //   },
  //   onError: (err) => {
  //     toast({
  //       title: "Error",
  //       description: err.message || "Failed to submit group proposal. Please try again.",
  //       variant: "destructive",
  //     })
  //   }
  // })
  // Add receiveShipment to context value
  const receiveShipment = async (shipmentId: number, receivedProducts: { produkId: number; jumlah: number }[]) => {
    return receiveShipmentMutation.mutateAsync({ shipmentId, receivedProducts })
  }

  const updateMudhohi = (data: { hewanId: string; received: boolean }) =>
  updateMudhohiReceived.mutate(data)

  const invalidateCache = (key: string) => {
    localStorage.removeItem(key);
  };

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
    invalidateCache(`hewan-sapi-*`);
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
    invalidateCache(`hewan-domba-*`);
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
    invalidateCache('products');
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
    invalidateCache('shipments');
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
  const handlePenerimaUpdate = (data: { penerima: Penerima[] }) => {
    debounceSocketUpdate('penerima', () => {
      queryClient.setQueryData(queryKeys.penerima, data.penerima)
    })
  }
  const updateKuponReceived = (data: { penerimaId: string; diterima: boolean }) =>
  updateKuponReceivedMutation.mutate(data)

  const handleMudhohiUpdate = (data: { mudhohi: Mudhohi[] }) => {
    debounceSocketUpdate('mudhohi', () => {
      queryClient.setQueryData(queryKeys.mudhohi, data.mudhohi)
    })
  }

  // Handle distribusi updates
  const handleDistribusiUpdate = (data: { distribusi: Distribusi[] }) => {
    debounceSocketUpdate('distribusi', () => {
      queryClient.setQueryData(queryKeys.distribusi, data.distribusi)
    })
  }
  const handleReconnect = () => {
    console.log('Socket reconnected')
    resetQueries() // Fresh data on reconnect
  }
  const socketEventHandlers = useMemo(() => ({
    'update-hewan': handleHewanUpdate,
    'update-product': handleProductUpdate,
    'error-logs': handleErrorLogsUpdate,
    'shipment-update': handleShipmentUpdate,
    // 'shipment-received': handleShipmentReceived,
    'sapi-data-updated': handleSapiDataUpdate,
    'domba-data-updated': handleDombaDataUpdate,
    'product-logs-updated': handleProductLogsUpdate,
    'reconnect': handleReconnect,
    'update-mudhohi': handleMudhohiUpdate,
    'update-penerima': handlePenerimaUpdate,
    'update-distribusi': handleDistribusiUpdate,
  }), [
    handleHewanUpdate, 
    handleProductUpdate, 
    handleErrorLogsUpdate, 
    handleShipmentUpdate, 
    handleSapiDataUpdate,
    handleDombaDataUpdate,
    handleProductLogsUpdate,
    handlePenerimaUpdate, 
    handleMudhohiUpdate,
    handleDistribusiUpdate
  ])
  // Set up socket listeners to update the query cache
  useEffect(() => {
    if (!socket) return
    Object.entries(socketEventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      Object.entries(socketEventHandlers).forEach(([event, handler]) => {
        socket.off(event, handler)
      })
    }
  }, [socket, queryClient])

  const performanceRef = useRef({
    renderCount: 0,
    lastRender: Date.now()
  })

  useEffect(() => {
    performanceRef.current.renderCount++
    performanceRef.current.lastRender = Date.now()
  })
  
// ======================== UTILITY FUNCTIONS ========================
  // Get penerima by jenis (INDIVIDU/KELOMPOK)
  const getPenerimaByJenis = (jenis: JenisDistribusi): Penerima[] => {
    const penerima = penerimaQuery.data
    if (penerima && penerima.length > 0) return penerima.filter(p => p.jenis === jenis)
      else return []
  }
  // Get group proposals (pending approval)
  // const getGroupProposals = (): Penerima[] => {
  //   return penerimaQuery.data?.filter(p => 
  //     p.jenis === JenisDistribusi.KELOMPOK && !p.sudahMenerima
  //   ) || []
  // }
  // Get available products for group selection
  const getAvailableProducts = (): ProdukHewan[] => {
    return productsQuery.data?.filter(product => 
      product.diInventori > 0
    ) || []
  }

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
    operation: "menambahkan" | "memindahkan" | "mengkoreksi"
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
    
    // Clear all cache data
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('hewan-') || key.startsWith('products') || key.startsWith('meta-')) {
          localStorage.removeItem(key)
        }
      })
    }
    
    // Clear pending mutations
    pendingMutations.current.clear()
    
    // Clear socket timeouts
    socketUpdateTimeouts.current.forEach(timeout => clearTimeout(timeout))
    socketUpdateTimeouts.current.clear()
    
    toast({
      title: "Data Reset",
      description: "All data has been refreshed",
      variant: "default",
    })
  }, [queryClient, setPagination])
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
    penerimaQuery: {
      data: penerimaQuery.data || [],
      isLoading: penerimaQuery.isLoading,
      isError: penerimaQuery.isError,
      refetch: penerimaQuery.refetch,
    },
    distribusiQuery: {
      data: distribusiQuery.data || [],
      isLoading: distribusiQuery.isLoading,
      isError: distribusiQuery.isError,
      refetch: distribusiQuery.refetch,
    },
    mudhohiQuery: {
      data: mudhohiQuery.data || [],
      isLoading: mudhohiQuery.isLoading,
      isError: mudhohiQuery.isError,
      refetch: mudhohiQuery.refetch,
    },
    meta: metaQuery.data || {
      sapi: { total: 0, target: 0, slaughtered: 0 },
      domba: { total: 0, target: 0, slaughtered: 0 },
    },
    createDistribusi: (data) => createDistribusiMutation.mutateAsync(data),
    createPenerima: (data) => createPenerimaMutation.mutateAsync(data),
    getLogDistribusiByPenerima: (penerimaId) => {
      const logs = queryClient.getQueryData<LogDistribusi[]>(["log-distribusi"]) || [];
      return logs.filter(log => log.penerimaId === penerimaId);
    },
    updateLogDistribusi: (penerimaId, produk) => 
      updateLogDistribusiMutation.mutateAsync({ penerimaId, produk }),
    getPenerimaByJenis,
    getAvailableProducts,
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
    updateMudhohi,
    updateKuponReceived,
  }), [
    sapiQuery.data,
    dombaQuery.data,
    penerimaQuery.data,
    distribusiQuery.data,
    mudhohiQuery.data,
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