'use client'
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { KeuanganProvider } from '@/contexts/keuangan-context';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUIState } from '@/contexts/ui-state-context';

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

  const {isSidebarOpen, toggleSidebar} = useUIState()
  return (
		<QueryClientProvider client={queryClient}>
      <SidebarProvider open={isSidebarOpen} onOpenChange={toggleSidebar} className="flex w-auto h-screen overflow-hidden relative">
        <KeuanganProvider>
          {children}
        </KeuanganProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </SidebarProvider>
		</QueryClientProvider>
  );
}
