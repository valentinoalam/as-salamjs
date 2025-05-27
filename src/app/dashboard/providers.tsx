'use client'
import type { ReactNode } from 'react';
import { SocketProvider } from '@/contexts/socket-context';

import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from "@/lib/tanstack-query/qurban"
import { QurbanProvider } from '@/contexts/qurban-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
		<QueryClientProvider client={queryClient}>
			<SocketProvider>
				<QurbanProvider>
					{children}
				</QurbanProvider>
			</SocketProvider>
		</QueryClientProvider>
    </SessionProvider>
  );
}
