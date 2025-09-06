import type { CacheEntry } from "#@/lib/DTOs/global.ts";
import { CACHE_KEYS } from "../utils/constants";
import { createQueryOptions } from "../tanstack-query/keuangan";

export class CacheManager {
  private static isClient = typeof window !== 'undefined'

  static get<T>(key: string): CacheEntry<T> | null {
    if (!this.isClient) return null
    
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      return {
        data: parsed.data as T,
        timestamp: parsed.timestamp,
      };
    } catch {
      return null;
    }
  }

  static set<T>(key: string, data: T): void {
    if (!this.isClient) return
    try {
      const cacheItem: CacheEntry<T> = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(key, JSON.stringify(cacheItem))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }

  static isValid(timestamp: number, duration: number): boolean {
    return Date.now() - timestamp < duration
  }

  static remove(key: string): void {
    if (!this.isClient) return
    localStorage.removeItem(key)
  }

  static clear(): void {
    if (!this.isClient) return
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }
}

// Helper function to get cached data or return initial data
export const getCachedOrInitial = <T,>(cacheKey: string, initialValue: T | undefined, duration: number): T | undefined => {
  const cached = CacheManager.get<T>(cacheKey)
  if (cached && CacheManager.isValid(cached.timestamp, duration)) {
    return cached.data
  }
  return initialValue
}

// Custom query options with caching
export const createCachedQueryOptions = <T,>(
  key: readonly unknown[],
  fetcher: () => Promise<T>,
  cacheKey: string,
  cacheDuration: number,
  initialValue?: T
) => {
  const cachedData = getCachedOrInitial(cacheKey, initialValue, cacheDuration)
  
  return createQueryOptions(
    key,
    async () => {
      const result = await fetcher()
      CacheManager.set(cacheKey, result)
      return result
    },
    { 
      initialData: cachedData,
      staleTime: cacheDuration * 0.8, // 80% of cache duration
      gcTime: cacheDuration * 2, // Keep in memory for 2x cache duration
    }
  )
}