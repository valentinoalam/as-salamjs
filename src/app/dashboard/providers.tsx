/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'; // For localStorage

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useSidebarStore } from '#@/stores/ui-store.ts';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Default stale time of 5 minutes
        staleTime: 5 * 60 * 1000,
        // Retry failed queries 3 times
        retry: 3,
        // Keep cached data for 1 hour
        gcTime: 60 * 60 * 1000,
        refetchOnMount: false, 
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  })
  // Create a persister for localStorage
  const persister = createAsyncStoragePersister({
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  });

  const {isSidebarOpen, toggleSidebar} = useSidebarStore()
  return (
    <PersistQueryClientProvider 
      client={queryClient}
      persistOptions={{ persister }}
    >
      <SidebarProvider open={isSidebarOpen} onOpenChange={toggleSidebar} className="flex w-auto h-screen overflow-hidden relative">
          {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </SidebarProvider>
		</PersistQueryClientProvider>
  );
}
