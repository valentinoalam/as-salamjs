import type { PaginationConfig } from "#@/lib/DTOs/global.ts"
import { useSettingsStore } from "@/stores/settings-store"
import { useMemo } from "react"

// Memoized version of the pagination config
export const usePaginationConfig = (target: number, total: number): PaginationConfig => {
  const { itemsPerGroup } = useSettingsStore()
  
  return useMemo(() => {
    if (total >= 100) {
      return { 
        useGroups: true, 
        itemsPerGroup,
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
  }, [target, total, itemsPerGroup])
}

// Memoized callback version for Zustand store
export const getPaginationConfig = (target: number, total: number, itemsPerGroup: number): PaginationConfig => {
  if (total >= 100) {
    return { 
      useGroups: true, 
      itemsPerGroup,
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
}