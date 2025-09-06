/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useCallback, useEffect, useMemo } from "react"
import type { JenisDistribusi } from "@prisma/client"
import { useMutation } from "@tanstack/react-query"
import { queryKeys } from "@/lib/tanstack-query/qurban"
import type {
  Distribusi,
  LogDistribusi,
  Mudhohi,
  Penerima,
  ProdukHewan,
} from "@/types/qurban"
import { useUIStore } from "@/hooks/qurban/use-stores"
import { useClientQuerySync, useQueryWithToast } from "@/hooks/use-query"
import { useProduct } from "./use-produk"

export function useDistribusi() {
  const { 
    queryClient, 
    socket, 
    isConnected, 
    pendingMutations, 
    lastSocketUpdate, 
    socketUpdateTimeouts } = useClientQuerySync();
  const { pagination, setPagination } = useUIStore()
  const { productsQuery } = useProduct()

  // Fetch penerima (recipients)
  const fetchPenerima = async (
    params: {
      distribusiId?: string
      page?: number
      pageSize?: number
    } = {},
  ) => {
    const { distribusiId, page = 1, pageSize = 10 } = params
    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })

    if (distribusiId) searchParams.append("distribusiId", distribusiId)

    const response = await fetch(`/api/penerima?${searchParams.toString()}`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

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
  const fetchDistribusi = async () => {
    const response = await fetch("/api/distribusi")
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  // Fetch mudhohi (donors)
  const fetchMudhohi = async (
    params: { page?: number; pageSize?: number } = {},
  ) => {
    const { page = 1, pageSize = 10 } = params
    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })

    const response = await fetch(`/api/mudhohi?${searchParams.toString()}`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

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
    queryFn: () => fetchPenerima({
      page: pagination.penerimaPage || 1,
      pageSize: 10,
    }),
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch penerima data",
  })

  const distribusiQuery = useQueryWithToast({
    queryKey: queryKeys.distribusi,
    queryFn: fetchDistribusi,
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch distribusi data",
  })

  const mudhohiQuery = useQueryWithToast({
    queryKey: [...queryKeys.mudhohi, pagination.mudhohiPage || 1],
    queryFn: () => fetchMudhohi({
      page: pagination.mudhohiPage || 1,
      pageSize: 10,
    }),
    staleTime: isConnected ? Infinity : 60,
    errorMessage: "Failed to fetch mudhohi data",
  })

  // Helper functions
  const isDuplicateOperation = useCallback((key: string, minInterval = 1000) => {
    const now = Date.now()
    const lastUpdate = lastSocketUpdate.current.get(key)
    if (lastUpdate && now - lastUpdate < minInterval) return true
    lastSocketUpdate.current.set(key, now)
    return false
  }, [])

  const debounceSocketUpdate = useCallback((
    key: string, 
    callback: () => void, 
    delay = 100
  ) => {
    const existingTimeout = socketUpdateTimeouts.current
    if (existingTimeout.has(key)) clearTimeout(existingTimeout.get(key)!)
    
    const timeout = setTimeout(() => {
      callback()
      existingTimeout.delete(key)
    }, delay)
    
    existingTimeout.set(key, timeout)
  }, [])

  // Mutations
  const createDistribusiMutation = useMutation({
    mutationFn: async (data: { kategori: string; target: number }) => {
      const response = await fetch("/api/distribusi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create distribution")
      }
      
      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.distribusi })
  })

  const createPenerimaMutation = useMutation({
    mutationFn: async (data: {
      distribusiId: string
      nama: string
      diterimaOleh?: string
      noIdentitas?: string
      alamat?: string
      telepon?: string
      keterangan?: string
      jenis: JenisDistribusi
      jumlahKupon?: number
      produkDistribusi: { produkId: number; jumlah: number }[]
    }) => {
      const response = await fetch("/api/penerima", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          produkQurban: JSON.stringify(data.produkDistribusi)
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create recipient")
      }
      
      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.penerima })
  })

  const updateMudhohiReceived = useMutation({
    mutationFn: async ({ hewanId, received }: { hewanId: string; received: boolean }) => {
      const updateKey = `mudhohi-${hewanId}-${received}`
      if (pendingMutations.current.has(updateKey)) 
        throw new Error("Duplicate mudhohi update detected")

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
        setTimeout(() => pendingMutations.current.delete(updateKey), 1000)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mudhohi })
  })

  const updateKuponReceivedMutation = useMutation({
    mutationFn: async ({ penerimaId, diterima }: { penerimaId: string; diterima: boolean }) => {
      const res = await fetch(`/api/penerima/${penerimaId}/received`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diterima }),
      })
      if (!res.ok) throw new Error("Failed to update kupon status")
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.penerima })
  })

  const updateLogDistribusiMutation = useMutation({
    mutationFn: async (data: { penerimaId: string; produk: { produkId: number; jumlah: number }[] }) => {
      const response = await fetch(`/api/penerima/${data.penerimaId}/distribusi`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produkQurban: JSON.stringify(data.produk) }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update distribution log")
      }
      
      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.distribusi })
  })

  // Socket event handlers
  const handlePenerimaUpdate = useCallback((data: { penerima: Penerima[] }) => {
    if (isDuplicateOperation("socket-penerima", 1000)) return
    debounceSocketUpdate("penerima", () => {
      queryClient.setQueryData(queryKeys.penerima, data.penerima)
    })
  }, [debounceSocketUpdate, isDuplicateOperation, queryClient])

  const handleMudhohiUpdate = useCallback((data: { mudhohi: Mudhohi[] }) => {
    if (isDuplicateOperation("socket-mudhohi", 1000)) return
    debounceSocketUpdate("mudhohi", () => {
      queryClient.setQueryData(queryKeys.mudhohi, data.mudhohi)
    })
  }, [debounceSocketUpdate, isDuplicateOperation, queryClient])

  const handleDistribusiUpdate = useCallback((data: { distribusi: Distribusi[] }) => {
    if (isDuplicateOperation("socket-distribusi", 1000)) return
    debounceSocketUpdate("distribusi", () => {
      queryClient.setQueryData(queryKeys.distribusi, data.distribusi)
    })
  }, [debounceSocketUpdate, isDuplicateOperation, queryClient])

  const handleReconnect = useCallback(() => {
    lastSocketUpdate.current.clear()
    pendingMutations.current.clear()
    queryClient.invalidateQueries({ queryKey: queryKeys.penerima })
    queryClient.invalidateQueries({ queryKey: queryKeys.distribusi })
    queryClient.invalidateQueries({ queryKey: queryKeys.mudhohi })
  }, [queryClient])

  // Set up socket listeners
  useEffect(() => {
    if (!socket) return

    const handlers = {
      "update-mudhohi": handleMudhohiUpdate,
      "update-penerima": handlePenerimaUpdate,
      "update-distribusi": handleDistribusiUpdate,
      reconnect: handleReconnect,
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler)
      })
    }
  }, [
    socket, 
    handlePenerimaUpdate, 
    handleMudhohiUpdate, 
    handleDistribusiUpdate, 
    handleReconnect
  ])

  // Utility functions
  const getPenerimaByJenis = useCallback((jenis: JenisDistribusi): Penerima[] => {
    return penerimaQuery.data?.data?.filter((p: Penerima) => p.jenis === jenis) || []
  }, [penerimaQuery.data])

  const getAvailableProducts = useMemo((): ProdukHewan[] => {
    return productsQuery.data?.filter((product: ProdukHewan) => product.diInventori > 0) || []
  }, [productsQuery.data])

  const getLogDistribusiByPenerima = useCallback((penerimaId: string): LogDistribusi[] => {
    const logs = queryClient.getQueryData<LogDistribusi[]>(queryKeys.distribusi) || []
    return logs.filter(log => log.penerimaId === penerimaId)
  }, [queryClient])

  // Return all state and functions
  return {
    // Query states
    penerimaQuery: {
      data: penerimaQuery.data?.data || [],
      isLoading: penerimaQuery.isLoading,
      isError: penerimaQuery.isError,
      pagination: penerimaQuery.data?.pagination || {
        currentPage: pagination.penerimaPage || 1,
        totalPages: 1,
        pageSize: 10,
        total: 0,
        hasNext: false,
        hasPrev: false,
      },
      refetch: async (options?: { page?: number }) => {
        if (options?.page) setPagination("penerimaPage", options.page)
        return penerimaQuery.refetch()
      }
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
      pagination: mudhohiQuery.data?.pagination || {
        currentPage: pagination.mudhohiPage || 1,
        totalPages: 1,
        pageSize: 10,
        total: 0,
        hasNext: false,
        hasPrev: false,
      },
      refetch: async (options?: { page?: number }) => {
        if (options?.page) setPagination("mudhohiPage", options.page)
        return mudhohiQuery.refetch()
      }
    },

    // Mutations
    createDistribusi: createDistribusiMutation.mutateAsync,
    createPenerima: createPenerimaMutation.mutateAsync,
    updateLogDistribusi: (penerimaId: string, produk: { produkId: number; jumlah: number }[]) => 
      updateLogDistribusiMutation.mutateAsync({ penerimaId, produk }),
    updateMudhohi: (data: { hewanId: string; received: boolean }) => 
      updateMudhohiReceived.mutate(data),
    updateKuponReceived: (data: { penerimaId: string; diterima: boolean }) => 
      updateKuponReceivedMutation.mutate(data),

    // Utility functions
    getPenerimaByJenis,
    getAvailableProducts,
    getLogDistribusiByPenerima,
    isConnected
  }
}