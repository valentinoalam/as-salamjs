'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
interface NextAuthSessionProviderProps {
  children: ReactNode;
  session: Session | null; // Pass the session object type
}
export function NextAuthProvider({ children, session }: NextAuthSessionProviderProps) {
  return (
    <SessionProvider 
      session={session} 
      refetchInterval={15 * 60} 
      refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>);
}