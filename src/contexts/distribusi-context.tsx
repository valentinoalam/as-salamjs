/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useSocket } from "@/contexts/socket-context"
import type { JenisDistribusi } from "@prisma/client"
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"
import { queryKeys } from "@/lib/tanstack-query/qurban"
import { useUIState } from "./ui-state-context"
import { useQurban } from "./qurban-context"
import type {
  Distribusi,
  LogDistribusi,
  Mudhohi,
  Penerima,
  ProdukHewan,
  QueryWithToastOptions,
} from "@/types/qurban"
import type { DistribusiContextType } from "@/types/distribusi"
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

export function useQueryWithToast<TData = unknown, TError = Error>(
  options: QueryWithToastOptions<TData, TError>,
): UseQueryResult<TData, TError> {
  const queryResult = useQuery(options)

  useEffect(() => {
    if (queryResult.isError) {
      toast({
        title: "Error",
        description:
          options.errorMessage ||
          (queryResult.error instanceof Error ? queryResult.error.message : "Something went wrong."),
        variant: "destructive",
      })
    }
  }, [queryResult.isError, queryResult.error, options.errorMessage])

  return queryResult
}

// Create the context
const DistribusiContext = createContext<DistribusiContextType | undefined>(undefined)

// Provider component
export function DistribusiProvider({
  children,
}: {
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const { socket, isConnected } = useSocket()
  const { pagination, setPagination } = useUIState()
  const { productsQuery } = useQurban()

  // Track pending mutations to avoid race conditions and duplicates
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

  // Fetch penerima (recipients)
  const fetchPenerima = async (
    params: {
      distribusiId?: string
      page?: number
      pageSize?: number
    } = {},
  ): Promise<{
    data: Penerima[]
    pagination: PaginationData
  }> => {
    const { distribusiId, page = 1, pageSize = 10 } = params
    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })

    if (distribusiId) {
      searchParams.append("distribusiId", distribusiId)
    }

    const response = await fetch(`/api/penerima?${searchParams.toString()}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return {
      data: result.data || result,
      pagination: result.pagination || {
        currentPage: page,
        totalPages: Math.ceil((result.total || result.length) / pageSize),
        pageSize,
        total: result.total || result.length,
        hasNext: page < Math.ceil((result.total || result.length) / pageSize),
        hasPrev: page > 1,
      },
    }
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
  const fetchMudhohi = async (
    params: {
      page?: number
      pageSize?: number
    } = {},
  ): Promise<{
    data: Mudhohi[]
    pagination: PaginationData
  }> => {
    const { page = 1, pageSize = 10 } = params
    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })

    const response = await fetch(`/api/mudhohi?${searchParams.toString()}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return {
      data: result.data || result,
      pagination: result.pagination || {
        currentPage: page,
        totalPages: Math.ceil((result.total || result.length) / pageSize),
        pageSize,
        total: result.total || result.length,
        hasNext: page < Math.ceil((result.total || result.length) / pageSize),
        hasPrev: page > 1,
      },
    }
  }

  // Set up queries
  const penerimaQuery = useQueryWithToast({
    queryKey: [...queryKeys.penerima, pagination.penerimaPage || 1],
    queryFn: async () =>
      await fetchPenerima({
        page: pagination.penerimaPage || 1,
        pageSize: 10,
      }),
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 60, // Reduced stale time for better real-time updates
    errorMessage: "Failed to fetch penerima data. Please try again.",
  })

  const distribusiQuery = useQueryWithToast({
    queryKey: queryKeys.distribusi,
    queryFn: fetchDistribusi,
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 60, // Reduced stale time
    errorMessage: "Failed to fetch distribusi data. Please try again.",
  })

  const mudhohiQuery = useQueryWithToast({
    queryKey: [...queryKeys.mudhohi, pagination.mudhohiPage || 1],
    queryFn: async () =>
      await fetchMudhohi({
        page: pagination.mudhohiPage || 1,
        pageSize: 10,
      }),
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 60, // Reduced stale time for better real-time updates
    errorMessage: "Failed to fetch mudhohi data. Please try again.",
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
      kuponId?: string;
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
    mutationFn: async ({
      hewanId,
      received,
    }: {
      hewanId: string
      received: boolean
    }) => {
      const updateKey = `mudhohi-${hewanId}-${received}`
      if (pendingMutations.current.has(updateKey)) {
        throw new Error("Duplicate mudhohi update detected")
      }

      pendingMutations.current.add(updateKey)

      try {
        const res = await fetch(`/api/hewan/${hewanId}/received`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ received }),
        })
        if (!res.ok) throw new Error("Failed to update mudhohi status")
        return res.json()
      } finally {
        setTimeout(() => {
          pendingMutations.current.delete(updateKey)
        }, 1000)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mudhohi })
    },
  })

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

  const updateMudhohi = (data: { hewanId: string; received: boolean }) => updateMudhohiReceived.mutate(data)

  const updateKuponReceived = (data: { penerimaId: string; diterima: boolean }) =>
    updateKuponReceivedMutation.mutate(data)

  // Socket event handlers
  const handlePenerimaUpdate = (data: { penerima: Penerima[] }) => {
    if (isDuplicateOperation("socket-penerima", 1000)) return

    debounceSocketUpdate("penerima", () => {
      queryClient.setQueryData(queryKeys.penerima, data.penerima)
    })
  }

  const handleMudhohiUpdate = (data: { mudhohi: Mudhohi[] }) => {
    if (isDuplicateOperation("socket-mudhohi", 1000)) return

    debounceSocketUpdate("mudhohi", () => {
      queryClient.setQueryData(queryKeys.mudhohi, data.mudhohi)
    })
  }

  const handleDistribusiUpdate = (data: { distribusi: Distribusi[] }) => {
    if (isDuplicateOperation("socket-distribusi", 1000)) return

    debounceSocketUpdate("distribusi", () => {
      queryClient.setQueryData(queryKeys.distribusi, data.distribusi)
    })
  }

  const handleReconnect = () => {
    console.log("Socket reconnected - Distribusi Context")
    // Clear duplicate tracking on reconnect
    lastSocketUpdate.current.clear()
    pendingMutations.current.clear()

    // Refetch all distribusi-related queries
    queryClient.invalidateQueries({ queryKey: queryKeys.penerima })
    queryClient.invalidateQueries({ queryKey: queryKeys.distribusi })
    queryClient.invalidateQueries({ queryKey: queryKeys.mudhohi })
  }

  const socketEventHandlers = useMemo(
    () => ({
      "update-mudhohi": handleMudhohiUpdate,
      "update-penerima": handlePenerimaUpdate,
      "update-distribusi": handleDistribusiUpdate,
      reconnect: handleReconnect,
    }),
    [queryClient, pagination],
  )

  // Set up socket listeners to update the query cache
  useEffect(() => {
    if (!socket) return

    // Remove existing listeners to prevent duplicates
    Object.entries(socketEventHandlers).forEach(([event, handler]) => {
      socket.off(event, handler)
    })

    // Add new listeners
    Object.entries(socketEventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      Object.entries(socketEventHandlers).forEach(([event, handler]) => {
        socket.off(event, handler)
      })
    }
  }, [socket, socketEventHandlers])

  // ======================== UTILITY FUNCTIONS ========================
  // Get penerima by jenis (INDIVIDU/KELOMPOK)
  const getPenerimaByJenis = (jenis: JenisDistribusi): Penerima[] => {
    const penerima = penerimaQuery.data?.data
    if (penerima && penerima.length > 0) return penerima.filter((p) => p.jenis === jenis)
      else return []
  }
  // Get available products for group selection
  const getAvailableProducts = useMemo((): ProdukHewan[] => {
    return productsQuery.data?.filter(product =>
      product.diInventori > 0
    ) || []
  }, [productsQuery.data]);

  // Create context value
  const contextValue: DistribusiContextType = useMemo(
    () => ({
      penerimaQuery: {
        data: penerimaQuery.data?.data || [],
        isLoading: penerimaQuery.isLoading,
        isError: penerimaQuery.isError,
        refetch: async (options?: { page?: number; pageSize?: number }) => {
          if (options?.page) {
            setPagination("penerimaPage", options.page)
          }
          return penerimaQuery.refetch()
        },
        pagination: penerimaQuery.data?.pagination || {
          currentPage: pagination.penerimaPage || 1,
          totalPages: 1,
          pageSize: 10,
          total: 0,
          hasNext: false,
          hasPrev: false,
        },
      },
      distribusiQuery: {
        data: distribusiQuery.data || [],
        isLoading: distribusiQuery.isLoading,
        isError: distribusiQuery.isError,
        refetch: distribusiQuery.refetch,
      },
      mudhohiQuery: {
        data: mudhohiQuery.data?.data || [],
        isLoading: mudhohiQuery.isLoading,
        isError: mudhohiQuery.isError,
        refetch: async (options?: { page?: number; pageSize?: number }) => {
          if (options?.page) {
            setPagination("mudhohiPage", options.page)
          }
          return mudhohiQuery.refetch()
        },
        pagination: mudhohiQuery.data?.pagination || {
          currentPage: pagination.mudhohiPage || 1,
          totalPages: 1,
          pageSize: 10,
          total: 0,
          hasNext: false,
          hasPrev: false,
        },
      },
      createDistribusi: (data) => createDistribusiMutation.mutateAsync(data),
      createPenerima: (data) => createPenerimaMutation.mutateAsync(data),
      getLogDistribusiByPenerima: (penerimaId: string) => {
        const logs = queryClient.getQueryData<LogDistribusi[]>(["log-distribusi"]) || []
        return logs.filter((log) => log.penerimaId === penerimaId)
      },
      updateLogDistribusi: (penerimaId, produk) => updateLogDistribusiMutation.mutateAsync({ penerimaId, produk }),
      getPenerimaByJenis,
      getAvailableProducts,
      isConnected,
      updateMudhohi,
      updateKuponReceived,
    }),
    [
      penerimaQuery.data,
      distribusiQuery.data,
      mudhohiQuery.data,
      pagination.mudhohiPage,
      pagination.penerimaPage,
      isConnected,
      productsQuery.data,
    ],
  )

  return <DistribusiContext.Provider value={contextValue}>{children}</DistribusiContext.Provider>
}

// Custom hook to use the context
export function useDistribusi() {
  const context = useContext(DistribusiContext)

  if (context === undefined) {
    throw new Error("useDistribusi must be used within a DistribusiProvider")
  }

  return context
}
