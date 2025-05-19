import { Header } from '@/components/dashboard/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { UIStateProvider } from '@/contexts/ui-state-context';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';

import { Providers } from './providers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }


  return (
    <UIStateProvider>
      <Providers>
        <SidebarProvider className="flex w-auto h-screen overflow-hidden relative">
          <AppSidebar className='flex-none' variant='sidebar' collapsible='offcanvas' />
          <div className="flex-1 grow flex flex-col min-w-0 relative">
            <Header />
            <main className="flex flex-1 flex-col overflow-auto gap-4 p-4">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </Providers>
    </UIStateProvider>
  );
}