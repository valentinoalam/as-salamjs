/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QueryWithToastOptions } from "#@/lib/DTOs/global.ts"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { toast } from "./use-toast"
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useSocket } from "@/contexts/socket-context";

// Define the return type of your custom hook
interface ClientQuerySyncState {
  queryClient: QueryClient;
  socket: any; // Use specific socket type if available (e.g., SocketIOClient.Socket)
  isConnected: boolean;
  pendingMutations: React.RefObject<Set<string>>;
  lastSocketUpdate: React.RefObject<Map<string, number>>;
  socketUpdateTimeouts: React.RefObject<Map<string, NodeJS.Timeout>>;
  isDuplicateOperation: (key: string, minInterval?: number) => boolean;
  debounceSocketUpdate: (key: string, callback: () => void, delay?: number) => void
}

export function useClientQuerySync(): ClientQuerySyncState {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();
  // Track pending mutations to avoid race conditions and duplicates
  const pendingMutations = useRef<Set<string>>(new Set());
  const lastSocketUpdate = useRef<Map<string, number>>(new Map());
  // Debounce socket updates to prevent rapid fire updates
  const socketUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

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

  // Cleanup on unmount
  useEffect(() => {
    // Capture the current value of the ref into a local variable
    const currentSocketUpdateTimeouts = socketUpdateTimeouts.current;
    const currentPendingMutations = pendingMutations.current;
    const currentLastSocketUpdate = lastSocketUpdate.current;
    return () => {
      // Use the captured local variable in the cleanup function
      currentSocketUpdateTimeouts.forEach((timeout) => clearTimeout(timeout));
      currentSocketUpdateTimeouts.clear();

      // For other refs, if they are only manipulated within this hook's lifecycle
      // and their cleanup is simple like clearing, it's often fine.
      // But for strictness or complex scenarios, you could do the same for them.
      currentPendingMutations.clear();
      currentLastSocketUpdate.clear();
    };
  }, []); // Empty dependency array ensures cleanup runs only on unmount

  return {
    queryClient,
    socket,
    isConnected,
    pendingMutations,
    lastSocketUpdate,
    socketUpdateTimeouts,
    isDuplicateOperation,
    debounceSocketUpdate
  };
}

export function useQueryWithToast<TData = unknown, TError = Error>(
  options: QueryWithToastOptions<TData, TError>): UseQueryResult<TData, TError> {

  const queryResult = useQuery(options)
  // Error handling
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
