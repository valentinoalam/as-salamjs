/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { HewanStatus, type HewanQurban } from "@prisma/client"
import { keepPreviousData, useMutation } from "@tanstack/react-query"
import { queryKeys, qurbanKeys } from "@/lib/tanstack-query/qurban"
import { useClientQuerySync, useQueryWithToast } from "@/hooks/use-query"
import type { FetchResult } from "#@/lib/DTOs/global.ts"
import type { JenisHewanInputDTO } from "#@/lib/DTOs/mudhohi.ts"
import { toast } from "../use-toast"
import { usePaginationConfigStore, usePaginationStore } from "#@/stores/ui-store.ts"
import { useSettingsStore } from "#@/stores/settings-store.ts"

export function useQurban() {
  const { 
    queryClient, 
    socket, 
    isConnected, 
    pendingMutations, 
    lastSocketUpdate, 
    socketUpdateTimeouts,
    isDuplicateOperation,
    debounceSocketUpdate } = useClientQuerySync();
  const { 
    sapiPaginationConfig, 
    dombaPaginationConfig, 
  } = usePaginationConfigStore();
  const { pagination, setPagination } = usePaginationStore()
  const { itemsPerGroup } = useSettingsStore()
  // Fetch functions
  const fetchHewan = async (
    type: JenisHewanInputDTO, 
    params: { 
      page?: number
      pageSize?: number
      group?: string
      itemsPerGroup?: number
      useGroups?: boolean
      meta?: {total: number; target: number}
    } = {}): Promise<FetchResult<HewanQurban>> => {
    const { useGroups, itemsPerGroup: itemsPerGroupParams, group, pageSize = 10, page = 1, meta = { total: 0, target: 0 } } = params
    const searchParams = new URLSearchParams({
      type,
      page: String(page),
      pageSize: String(pageSize),
    });

    if (useGroups) {
      searchParams.append("group", group || "A");
      searchParams.append("itemsPerGroup", String(itemsPerGroupParams));
    }

    const url = `/api/hewan?${searchParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: HewanQurban[] = await response.json();
    let totalPages: number
    let totalGroups: number | undefined
    if (useGroups) {
      // For groups: calculate total groups and pages within current group
      totalGroups = Math.ceil(meta.total / itemsPerGroup)

      // Calculate items in current group
      const currentGroupIndex = group ? group.charCodeAt(0) - 65 : 0 // A=0, B=1, etc.
      const groupStartIndex = currentGroupIndex * itemsPerGroup
          console.log(groupStartIndex)
          console.log("meta.total", meta.total)
      const groupEndIndex = Math.min((currentGroupIndex + 1) * itemsPerGroup, meta.total)
          console.log("groupEndIndex",groupEndIndex)
      const itemsInCurrentGroup = groupEndIndex - groupStartIndex
        console.log("itemsInCurrentGroup",itemsInCurrentGroup)
      totalPages = Math.ceil(itemsInCurrentGroup / pageSize)
      console.log(totalPages)
    } else {
      // For non-grouped: simple pagination
      totalPages = Math.ceil(meta.total / pageSize)
      totalGroups = undefined
    }
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
        totalGroups,
        useGroups,
        itemsPerGroup,
      },
    };
  }

  const fetchMeta = async (type?: string): Promise<any> => {
    const url = `/api/hewan/meta${type ? `?jenis=${type}` : ''}`;
    const response = await fetch(url)
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
        sapi: { 
          total: metaData.sapi.total || 0, 
          target: metaData.sapi.target || 0, 
          slaughtered: metaData.sapi.slaughtered || 0 
        },
        domba: { 
          total: metaData.domba.total || 0, 
          target: metaData.domba.target || 0, 
          slaughtered: metaData.domba.slaughtered || 0
        },
      }
    },
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 60,
    errorMessage: "Failed to fetch metadata. Please try again.",
    cacheKey: "qurban-meta", // Add cache key
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  })
  console.log(metaQuery.data)
  // const sapiQueryKeys = [...queryKeys.sapi, pagination.sapiPage] as const
  // const dombaQueryKeys = [...queryKeys.domba, pagination.dombaGroup, pagination.dombaPage] as const
  // Set up queries
  const sapiQuery = useQueryWithToast({
    queryKey: qurbanKeys.sapi(pagination.sapiPage),
    queryFn: async () => {
      // Use metaQuery.data if available, otherwise fetch fresh metadata
      const sapiMeta = metaQuery.data?.sapi || await fetchMeta().then(meta => meta.sapi);
      
      return fetchHewan("sapi", { 
        page: pagination.sapiPage, 
        pageSize: sapiPaginationConfig.pageSize,
        group: sapiPaginationConfig.useGroups ? pagination.sapiGroup : undefined,
        itemsPerGroup: sapiPaginationConfig.itemsPerGroup,
        useGroups: sapiPaginationConfig.useGroups,
        meta: sapiMeta
      });
    },
    enabled: !!metaQuery.data?.sapi,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: isConnected ? false : 30 * 1000,
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 10 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    errorMessage: "Failed to fetch sapi data. Please try again.",
  })

  const dombaQuery = useQueryWithToast({
    queryKey: qurbanKeys.domba(pagination.dombaGroup, pagination.dombaPage),
    queryFn: async () => {
      // Use metaQuery.data if available, otherwise fetch fresh metadata
      const dombaMeta = metaQuery.data?.domba || await fetchMeta().then(meta => meta.domba);
      
      return fetchHewan("domba", { 
        page: pagination.dombaPage, 
        pageSize: dombaPaginationConfig.pageSize,
        group: dombaPaginationConfig.useGroups ? pagination.dombaGroup : undefined,
        itemsPerGroup: dombaPaginationConfig.itemsPerGroup,
        useGroups: dombaPaginationConfig.useGroups,
        meta: dombaMeta
      });
    },
    enabled: !!metaQuery.data?.domba, // Only fetch when meta is available
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: isConnected ? false : 30 * 1000,
    staleTime: isConnected ? Number.POSITIVE_INFINITY : 10 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    errorMessage: "Failed to fetch domba data. Please try again.",
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
        ? qurbanKeys.sapi(pagination.sapiPage)
        : qurbanKeys.domba(pagination.dombaGroup, pagination.dombaPage);
        
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      // Optimistic update
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data) {
          return old
        }
        return {
          ...old,
          data: old.data.map((item: HewanQurban) =>
            item.hewanId === newHewanData.hewanId ? { ...item, ...newHewanData } : item,
          ),
        }
      })

      return { previousData, queryKey };
    },
    onSuccess: (data, variables, context) => {
      toast({
        title: "Success!",
        description: `Hewan ${data.hewanId} sudah ${data.status.toLowerCase()}`,
        variant: "default",
      });

      queryClient.invalidateQueries({ queryKey: context.queryKey })
      // Only emit socket event if backend succeeded
      if (socket && isConnected && !isDuplicateOperation(`hewan-${data.hewanId}`)) 
        socket.emit("update-hewan", data)
    },
    onError: (err, variables, context) => {
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      if (!err.message.includes("Duplicate operation")) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to update hewan",
          variant: "destructive",
        })
      }
    },
  })

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
    const checkMutationKey = `${data.hewanId}-${data.status}`
    let isClientMutationPending = false;
    for (const key of pendingMutations.current) {
        if (key.startsWith(checkMutationKey)) {
            isClientMutationPending = true;
            break;
        }
    }

    if (isClientMutationPending) { // Or if (pendingMutations.current.some(key => key.startsWith(checkMutationKey)))
      console.log(`Skipping socket update for ${data.hewanId} - client mutation in progress`)
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
      
      const queryKey = data.tipeId === 1 
        ? qurbanKeys.sapi(pagination.sapiPage)
        : qurbanKeys.domba(pagination.dombaGroup, pagination.dombaPage);

      queryClient.setQueryData(queryKey, (old: any) => {   
        if (!old || !old.data){ 
          queryClient.invalidateQueries({ queryKey })
          return old;
        }
        const updatedData = {
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
        return updatedData
      })
    })
  }
  
  // Handle bulk data updates - only when data actually changes
  const handleSapiDataUpdate = (data: HewanQurban[]) => {
    if (isDuplicateOperation("socket-sapi-bulk", 2000)) return

    debounceSocketUpdate('sapi-bulk', () => {
      const sapiQueryKey = qurbanKeys.sapi(pagination.sapiPage);
      
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
            totalPages: Math.ceil((data?.length || metaQuery.data?.sapi.total) / sapiPaginationConfig.pageSize),
            pageSize: sapiPaginationConfig.pageSize,
            total: data?.length || 0,
            hasNext: false,
            hasPrev: false,
          }
        }
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.sapi })
      queryClient.invalidateQueries({ queryKey: queryKeys.meta })
    }, 200) // Longer debounce for bulk updates
  }

  const handleDombaDataUpdate = (data: HewanQurban[]) => {
    if (isDuplicateOperation("socket-domba-bulk", 2000)) return

    debounceSocketUpdate('domba-bulk', () => {
      const dombaQueryKey = qurbanKeys.domba(pagination.dombaGroup, pagination.dombaPage);
      
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
            totalPages: Math.ceil((data?.length || metaQuery.data?.domba.total) / dombaPaginationConfig.pageSize),
            pageSize: dombaPaginationConfig.pageSize,
            total: data?.length || 0,
            hasNext: false,
            hasPrev: false,
          }
        }
      });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.domba })
      queryClient.invalidateQueries({ queryKey: queryKeys.meta })
    }, 200)
  }

  const handleReconnect = () => {
    console.log('Socket reconnected')
    resetQueries() // Fresh data on reconnect
  }
  const socketEventHandlers = useMemo(() => ({
    'update-hewan': handleHewanUpdate,
    'sapi-data-updated': handleSapiDataUpdate,
    'domba-data-updated': handleDombaDataUpdate,
    'reconnect': handleReconnect,
  }), [
    queryClient, // Always a dependency for cache interactions
    pagination.sapiPage,
    pagination.dombaPage,
    pagination.dombaGroup,
    sapiPaginationConfig,
    dombaPaginationConfig,
    pendingMutations,
    isDuplicateOperation,
    debounceSocketUpdate,
    queryKeys.products, // Specifically used for invalidateQueries and setQueryData
  ])
  // Set up socket listeners to update the query cache
  useEffect(() => {
    if (!socket) return
        // Remove existing listeners to prevent duplicates
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

  const performanceRef = useRef({
    renderCount: 0,
    lastRender: Date.now()
  })

  useEffect(() => {
    performanceRef.current.renderCount++
    performanceRef.current.lastRender = Date.now()
  })
  
// ======================== UTILITY FUNCTIONS ========================

  // Action functions
  const updateHewan = useCallback(
    (data: {
      hewanId: string
      status: HewanStatus
      slaughtered?: boolean
      receivedByMdhohi?: boolean
      onInventory?: boolean
      tipeId: number
    }) => {
      updateHewanMutation.mutate(data)
    },
    [updateHewanMutation],
  )

  const resetQueries = useCallback(() => {
    queryClient.clear() // Use clear instead of resetQueries for better performance
    pendingMutations.current.clear()
    lastSocketUpdate.current.clear()
    socketUpdateTimeouts.current.forEach((timeout) => clearTimeout(timeout))
    socketUpdateTimeouts.current.clear()

    toast({
      title: "Data Reset",
      description: "All data has been refreshed",
      variant: "default",
    })
  }, [queryClient, pendingMutations, lastSocketUpdate, socketUpdateTimeouts])


  // Return all state and functions
  return {
    sapiQuery: {
      ...sapiQuery,
      data: sapiQuery.data?.data || [],
      refetch: useCallback(
        async (options?: { page?: number; group?: string }) => {
          if (options?.page) {
            setPagination("sapiPage", options.page || 1)
          }
          if (options?.group && sapiPaginationConfig.useGroups) {
            setPagination("sapiGroup", options.group || "A")
          }
          return sapiQuery.refetch()
        },
        [sapiQuery, setPagination, sapiPaginationConfig.useGroups],
      ),
      pagination: {
        currentPage: sapiQuery.data?.pagination?.currentPage || pagination.sapiPage,
        totalPages: sapiQuery.data?.pagination?.totalPages || 
          Math.ceil((metaQuery.data?.sapi.total || sapiQuery.data?.data.length) / sapiPaginationConfig.pageSize),
        pageSize: sapiQuery.data?.pagination?.pageSize || sapiPaginationConfig.pageSize,
        total: sapiQuery.data?.pagination?.total || metaQuery.data?.sapi.total || 0,
        hasNext: sapiQuery.data?.pagination?.hasNext || false,
        hasPrev: sapiQuery.data?.pagination?.hasPrev || false,
        
        // Group-specific properties
        currentGroup: sapiQuery.data?.pagination?.currentGroup || 
          (sapiPaginationConfig.useGroups ? pagination.sapiGroup : undefined),
        totalGroups: sapiQuery.data?.pagination?.totalGroups || 
          (sapiPaginationConfig.useGroups ? 
            Math.ceil((metaQuery.data?.sapi.total || 0) / (sapiPaginationConfig.itemsPerGroup || itemsPerGroup)) : 
            undefined),
        useGroups: sapiQuery.data?.pagination?.useGroups || sapiPaginationConfig.useGroups,
        itemsPerGroup: sapiQuery.data?.pagination?.itemsPerGroup || sapiPaginationConfig.itemsPerGroup,
      }
    },
    dombaQuery: {
      ...dombaQuery,
      data: dombaQuery.data?.data || [],
      refetch: useCallback(
        async (options?: { page?: number; group?: string }) => {
          if (options?.page) {
            setPagination("dombaPage", options.page || 1)
          }
          if (options?.group && dombaPaginationConfig.useGroups) {
            setPagination("dombaGroup", options.group || "A")
          }
          return dombaQuery.refetch()
        },
        [dombaQuery, setPagination, dombaPaginationConfig.useGroups],
      ),
      pagination: {
        currentPage: dombaQuery.data?.pagination?.currentPage || pagination.dombaPage,
        totalPages: dombaQuery.data?.pagination?.totalPages || 
          Math.ceil((metaQuery.data?.domba.total || dombaQuery.data?.data.length) / dombaPaginationConfig.pageSize),
        pageSize: dombaQuery.data?.pagination?.pageSize || dombaPaginationConfig.pageSize,
        total: dombaQuery.data?.pagination?.total || metaQuery.data?.domba.total || 0,
        hasNext: dombaQuery.data?.pagination?.hasNext || false,
        hasPrev: dombaQuery.data?.pagination?.hasPrev || false,
        
        // Group-specific properties
        currentGroup: dombaQuery.data?.pagination?.currentGroup || 
          (sapiPaginationConfig.useGroups ? pagination.dombaGroup : undefined),
        totalGroups: dombaQuery.data?.pagination?.totalGroups || 
          (dombaPaginationConfig.useGroups ? 
            Math.ceil((metaQuery.data?.domba.total || 0) / (dombaPaginationConfig.itemsPerGroup || itemsPerGroup)) : 
            undefined),
        useGroups: dombaQuery.data?.pagination?.useGroups || dombaPaginationConfig.useGroups,
        itemsPerGroup: dombaQuery.data?.pagination?.itemsPerGroup || dombaPaginationConfig.itemsPerGroup,
      }
    },
    meta: metaQuery.data || {
      sapi: { total: 0, target: 0, slaughtered: 0 },
      domba: { total: 0, target: 0, slaughtered: 0 },
    },
    isConnected,
    resetQueries,
    updateHewan,
  }
}