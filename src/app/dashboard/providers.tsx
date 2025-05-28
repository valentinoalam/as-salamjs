'use client'
import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from "@/lib/tanstack-query/qurban";
import { KeuanganProvider } from '@/contexts/keuangan-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
		<QueryClientProvider client={queryClient}>
			<KeuanganProvider>
				{children}
			</KeuanganProvider>
		</QueryClientProvider>
    </SessionProvider>
  );
}
